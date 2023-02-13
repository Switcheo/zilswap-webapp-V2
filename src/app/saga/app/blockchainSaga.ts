import { Channel, channel, EventChannel, eventChannel } from 'redux-saga';
import { call, cancelled, fork, put, select, take, takeEvery } from 'redux-saga/effects';
import { AppState, ObservedTx, TxReceipt, TxStatus, ZilSwapV2 } from 'zilswap-sdk';

import { actions } from 'app/store';
import { ChainInitAction } from 'app/store/blockchain/actions';
import { StatsActionTypes } from 'app/store/stats/actions';
import { TokenInfo, Transaction } from 'app/store/types';
import {
  BridgeWalletAction,
  WalletAction,
  WalletActionTypes
} from 'app/store/wallet/actions';
import { SimpleMap } from 'app/utils';
import {
  BoltXNetworkMap,
  RPCEndpoints, WZIL_TOKEN_CONTRACT, ZIL_ADDRESS
} from 'app/utils/constants';
import { detachedToast } from 'app/utils/useToaster';
import { Blockchain } from 'carbon-js-sdk';
import { logger } from 'core/utilities';
import { getConnectedBoltX } from 'core/utilities/boltx';
import {
  PoolTransaction,
  PoolTransactionResult,
  ZAPStats
} from 'core/utilities/zap-stats';
import { getConnectedZilPay } from 'core/utilities/zilpay';
import {
  ConnectedWallet, connectWalletBoltX,
  connectWalletZilPay, WalletConnectType
} from 'core/wallet';
import { ConnectedBridgeWallet } from 'core/wallet/ConnectedBridgeWallet';
import { fromBech32Address, ZilswapConnector } from 'core/zilswap';
import { ZWAP_TOKEN_CONTRACT } from 'core/zilswap/constants';
import { getBlockchain, getTransactions, getWallet } from '../selectors';

const getProviderOrKeyFromWallet = (wallet: ConnectedWallet | null) => {
  if (!wallet) return null;

  switch (wallet.type) {
    case WalletConnectType.PrivateKey:
      return wallet.addressInfo.privateKey;
    case WalletConnectType.Zeeves:
    case WalletConnectType.ZilPay:
    case WalletConnectType.BoltX:
      return wallet.provider;
    case WalletConnectType.Moonlet:
      throw new Error('moonlet support under development');
    default:
      throw new Error('unknown wallet connector');
  }
};

const zilPayObserver = (zilPay: any) => {
  return eventChannel<ConnectedWallet>(emitter => {
    const accountObserver = zilPay.wallet.observableAccount();
    const networkObserver = zilPay.wallet.observableNetwork();

    accountObserver.subscribe(async (account: any) => {
      logger(`Zilpay account changed to: ${account.bech32}`);
      const walletResult = await connectWalletZilPay(zilPay);
      if (walletResult?.wallet) {
        emitter(walletResult.wallet);
      }
    });

    networkObserver.subscribe(async (net: string) => {
      logger(`Zilpay network changed to: ${net}`);
      const walletResult = await connectWalletZilPay(zilPay);
      if (walletResult?.wallet) {
        emitter(walletResult.wallet);
      }
    });

    logger('registered zilpay observer');

    return () => {
      logger('deregistered zilpay observer');
      accountObserver.unsubscribe();
      networkObserver.unsubscribe();
    };
  });
};

const boltXObserver = (boltX: any) => {
  return eventChannel<ConnectedWallet>(emitter => {
    const accountSubscription = async (account: any) => {
      if (account) {
        logger(`BoltX account changed to: ${account.bech32}`);
        const walletResult = await connectWalletBoltX(boltX);
        if (walletResult?.wallet) {
          emitter(walletResult.wallet);
        }
      } else {
        logger(`BoltX disconnected`);
        put(
          actions.Blockchain.initialize({
            wallet: null,
            network: BoltXNetworkMap[boltX.zilliqa.wallet.net],
          })
        );
      }
    };

    const networkSubscription = async (net: string) => {
      logger(`BoltX network changed to: ${net}`);
      const walletResult = await connectWalletBoltX(boltX);
      if (walletResult?.wallet) {
        emitter(walletResult.wallet);
      }
    };

    const { ACCOUNT_CHANGED, NETWORK_CHANGED } = boltX.zilliqa.wallet.events;
    boltX.zilliqa.wallet.on(ACCOUNT_CHANGED, accountSubscription);
    boltX.zilliqa.wallet.on(NETWORK_CHANGED, networkSubscription);
    logger('registered boltX observer');

    return () => {
      logger('deregistered boltX observer');
      boltX.zilliqa.wallet.off(ACCOUNT_CHANGED, accountSubscription);
      boltX.zilliqa.wallet.off(NETWORK_CHANGED, networkSubscription);
    };
  });
};

const web3Observer = (wallet: ConnectedBridgeWallet) => {
  return eventChannel<ConnectedBridgeWallet>(emitter => {
    const provider = wallet.provider;
    provider.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length > 0) {
        emitter({
          provider: provider,
          address: accounts[0],
          chainId: wallet.chainId,
        });
      }
    });

    provider.on('chainChanged', (chainId: number) => {
      emitter({
        provider: provider,
        address: wallet.address,
        chainId: chainId,
      });
    });

    logger('registered web3 observer');

    return () => {
      logger('deregistered web3 observer');
    };
  });
};

type TxObservedPayload = { tx: ObservedTx; status: TxStatus; receipt?: TxReceipt };
const txObserver = (channel: Channel<TxObservedPayload>) => {
  return (tx: ObservedTx, status: TxStatus, receipt?: TxReceipt) => {
    logger('tx observed', tx);
    channel.put({ tx, status, receipt });
  };
};

function* txObserved(payload: TxObservedPayload) {
  logger('tx observed action', payload);
  const { tx, status, receipt } = payload;

  yield put(
    actions.Transaction.update({ hash: tx.hash, status: status, txReceipt: receipt })
  );

  detachedToast(`Transaction ${status ? status : 'confirmed'}`, { hash: tx.hash });

  // refetch all token states if updated TX is currently recorded within state
  const { transactions } = getTransactions(yield select());
  if (transactions.find((transaction: Transaction) => transaction.hash === tx.hash)) {
    yield put(actions.Token.refetchState());
  }
}

type StateChangeObservedPayload = {  };
function* stateChangeObserved(payload: StateChangeObservedPayload) {

}

function* initialize(
  action: ChainInitAction,
  txChannel: Channel<TxObservedPayload>,
  stateChannel: Channel<StateChangeObservedPayload>
) {
  let sdk: ZilSwapV2 | null = null;
  try {
    yield put(actions.Layout.addBackgroundLoading('initChain', 'INIT_CHAIN'));
    yield put(actions.Wallet.update({ wallet: null }));

    const { network, wallet } = action.payload;
    const providerOrKey = getProviderOrKeyFromWallet(wallet);
    const { observingTxs } = getTransactions(yield select());
    const { network: prevNetwork } = getBlockchain(yield select());

    logger('init chain zilswap sdk', network, providerOrKey);
    sdk = new ZilSwapV2(network, providerOrKey ?? undefined, {
      rpcEndpoint: RPCEndpoints[network],
    });

    yield call([sdk, sdk.initialize], txObserver(txChannel), observingTxs);
    logger('zilswap sdk initialized');

    console.log("xx sdk", sdk)
    ZilswapConnector.setSDK(sdk);

    logger('init chain load tokens');
    // load tokens
    const appState: AppState = yield call([sdk, sdk.getAppState]);
    const { pools: allPools, tokens: zilswapTokens } = appState;
    const tokens: SimpleMap<TokenInfo> = Object.values(zilswapTokens!).reduce(
      (acc, tkn) => {
        const pools = Object.values(allPools).filter(p => (p.token0Address === tkn.address || p.token1Address === tkn.address));
        const byStr20Address = fromBech32Address(tkn.address).toLowerCase();
        const isPoolToken = !!allPools[byStr20Address];
        const isHuny = tkn.address === 'zil1m3m5jqqcaemtefnlk795qpw59daukra8prc43e';
        const token: TokenInfo = {
          initialized: false,
          // registered: tkn.registered,
          // whitelisted: tkn.whitelisted,
          registered: true,
          whitelisted: false,
          isWzil: tkn.address === WZIL_TOKEN_CONTRACT[network],
          isZil: tkn.address === ZIL_ADDRESS,
          isZwap: tkn.address === ZWAP_TOKEN_CONTRACT[network],
          isPoolToken,
          address: tkn.address,
          hash: byStr20Address,
          decimals: tkn.decimals,
          symbol: isHuny ? tkn.symbol.toUpperCase() : tkn.symbol,
          name: tkn.name,
          balance: undefined,
          allowances: {},
          pool: pools?.[0],
          pools,
          blockchain: Blockchain.Zilliqa,
        };
        acc[tkn.address] = token;
        return acc;
      },
      {} as SimpleMap<TokenInfo>
    );

    logger('init chain set tokens', tokens);
    yield put(actions.Token.init({ tokens }));
    yield put(actions.Wallet.update({ wallet }));

    if (network !== prevNetwork) {
      yield put(actions.Blockchain.setNetwork(network));
    }

    yield put(actions.Stats.reloadPoolTx());

    logger('init chain refetch state');
    yield put(actions.Token.refetchState());
    yield put(actions.Blockchain.initialized());
  } catch (err) {
    console.error(err);
    sdk = yield call(teardown, sdk);
  } finally {
    yield put(actions.Layout.removeBackgroundLoading('INIT_CHAIN'));
  }
  return sdk;
}

function* watchReloadPoolTx() {
  while (true) {
    try {
      yield take(StatsActionTypes.RELOAD_POOL_TX);
      const { wallet } = getWallet(yield select());
      const { network } = getBlockchain(yield select());
      if (wallet) {
        const result: PoolTransactionResult = yield call(ZAPStats.getPoolTransactions, {
          network: network,
          address: wallet.addressInfo.bech32,
          per_page: 50,
        });
        const transactions: Transaction[] = result.records.map((tx: PoolTransaction) => ({
          hash: tx.transaction_hash,
          status: 'confirmed',
        }));

        yield put(actions.Transaction.init({ transactions }));
      } else {
        yield put(actions.Transaction.init({ transactions: [] }));
      }
    } catch (err) {
      console.error(err);
      // set to empty transactions when zap api failed
      yield put(actions.Transaction.init({ transactions: [] }));
    }
  }
}

function* teardown(sdk: ZilSwapV2 | null) {
  if (sdk) {
    yield call([sdk, sdk.teardown]);
    ZilswapConnector.setSDK(null);
  }
  return null;
}

function* watchInitialize() {
  const txChannel: Channel<TxObservedPayload> = channel();
  const stateChannel: Channel<StateChangeObservedPayload> = channel();
  let sdk: ZilSwapV2 | null = null;
  try {
    yield takeEvery(txChannel, txObserved);
    yield takeEvery(stateChannel, stateChangeObserved);

    while (true) {
      const action: ChainInitAction = yield take(
        actions.Blockchain.BlockchainActionTypes.CHAIN_INIT
      );
      sdk = yield call(teardown, sdk);
      sdk = yield call(initialize, action, txChannel, stateChannel);
    }
  } finally {
    txChannel.close();
    stateChannel.close();
  }
}

function* watchZilPay() {
  let chan;
  while (true) {
    try {
      const action: WalletAction = yield take(WalletActionTypes.WALLET_UPDATE);
      if (action.payload.wallet?.type === WalletConnectType.ZilPay) {
        logger('starting to watch zilpay');
        const zilPay = (yield call(getConnectedZilPay)) as unknown as any;
        chan = (yield call(zilPayObserver, zilPay)) as EventChannel<ConnectedWallet>;
        break;
      }
    } catch (e) {
      console.warn('Watch Zilpay failed, will automatically retry on reconnect. Error:');
      console.warn(e);
    }
  }
  try {
    while (true) {
      const newWallet = (yield take(chan)) as ConnectedWallet;
      const { wallet: oldWallet } = getWallet(yield select());
      if (oldWallet?.type !== WalletConnectType.ZilPay) continue;
      if (
        newWallet.addressInfo.bech32 === oldWallet?.addressInfo.bech32 &&
        newWallet.network === oldWallet.network
      )
        continue;
      yield put(
        actions.Blockchain.initialize({ wallet: newWallet, network: newWallet.network })
      );
    }
  } finally {
    if (yield cancelled()) {
      chan.close();
    }
  }
}

function* watchBoltX() {
  let chan;
  while (true) {
    try {
      const action: WalletAction = yield take(WalletActionTypes.WALLET_UPDATE);
      if (action.payload.wallet?.type === WalletConnectType.BoltX) {
        logger('starting to watch boltx');
        const boltX = (yield call(getConnectedBoltX)) as unknown as any;
        chan = (yield call(boltXObserver, boltX)) as EventChannel<ConnectedWallet>;
        break;
      }
    } catch (e) {
      console.warn('Watch BoltX failed, will automatically retry on reconnect. Error:');
      console.warn(e);
    }
  }
  try {
    while (true) {
      const newWallet = (yield take(chan)) as ConnectedWallet;
      const { wallet: oldWallet } = getWallet(yield select());
      if (oldWallet?.type !== WalletConnectType.BoltX) continue;
      if (
        newWallet.addressInfo.bech32 === oldWallet?.addressInfo.bech32 &&
        newWallet.network === oldWallet.network
      )
        continue;
      yield put(
        actions.Blockchain.initialize({ wallet: newWallet, network: newWallet.network })
      );
    }
  } finally {
    if (yield cancelled()) {
      chan.close();
    }
  }
}

function* watchWeb3() {
  let chan;
  while (true) {
    try {
      const action: BridgeWalletAction = yield take(WalletActionTypes.SET_BRIDGE_WALLET);
      if (action.payload.wallet) {
        logger('starting to watch web3');
        chan = (yield call(
          web3Observer,
          action.payload.wallet
        )) as EventChannel<ConnectedBridgeWallet>;
        break;
      }
    } catch (e) {
      console.warn('Watch web3 failed, will automatically retry to reconnect. Error:');
      console.warn(e);
    }
  }
  try {
    while (true) {
      const newWallet = (yield take(chan)) as ConnectedBridgeWallet;
      yield put(
        actions.Wallet.setBridgeWallet({
          blockchain: Blockchain.Ethereum,
          wallet: newWallet,
        })
      );
    }
  } finally {
    if (yield cancelled()) {
      chan.close();
    }
  }
}

export default function* blockchainSaga() {
  logger('init blockchain saga');
  yield fork(watchInitialize);
  yield fork(watchReloadPoolTx);
  yield fork(watchZilPay);
  yield fork(watchBoltX);
  yield fork(watchWeb3);
  yield put(actions.Blockchain.ready());
}
