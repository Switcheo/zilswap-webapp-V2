import BigNumber from "bignumber.js";
import { Task } from "redux-saga";
import { all, call, cancel, delay, fork, put, race, select, take } from "redux-saga/effects";
import { Network } from "zilswap-sdk/lib/constants";

import { actions } from "app/store";
import { TokenInfo } from "app/store/types";
import { Blockchain, bnOrZero, BRIDGEABLE_EVM_CHAINS, BridgeableEvmChains, ETH_ADDRESS, getETHClient, PollIntervals, SimpleMap } from "app/utils";
import erc20Abi from "app/utils/abi/erc20.abi.json";
import { ETHBalances } from "core/ethereum";
import { logger } from "core/utilities";
import { balanceBatchRequest, BatchRequestType, sendBatchRequest, tokenAllowancesBatchRequest, tokenBalanceBatchRequest, ZilswapConnector } from "core/zilswap";
import { ethers } from "ethers";
import { getBlockchain, getTokens, getWallet } from "../selectors";


const fetchZilTokensState = async (network: Network, tokens: SimpleMap<TokenInfo>, address: string | null) => {
  const updates: SimpleMap<TokenInfo> = {};

  try {

    if (!address || Object.values(tokens).length < 1) {
      return updates
    }

    logger("tokens saga", "retrieving zil token balances/allowances");

    const { pools: allPools } = ZilswapConnector.getSDK().getAppState()

    const batchRequests: any[] = [];
    for (const t in tokens) {
      const token = tokens[t];
      if (token.blockchain !== Blockchain.Zilliqa) {
        continue
      }

      if (token.isZil) {
        batchRequests.push(balanceBatchRequest(token, address.replace("0x", "")))
      } else {
        batchRequests.push(tokenBalanceBatchRequest(token, address))
        batchRequests.push(tokenAllowancesBatchRequest(token, address))
      }
    }

    const batchResults = await sendBatchRequest(network, batchRequests)

    batchResults.forEach(r => {
      const { request, result } = r;
      const { token } = request;

      if (!updates[token.address]) {
        updates[token.address] = { ...token }
      }

      const pools = Object.values(allPools).filter(p => (p.token0Address === token.address || p.token1Address === token.address));

      switch (request.type) {
        case BatchRequestType.Balance: {
          let balance: BigNumber | undefined = bnOrZero(result.balance);

          const tokenInfo: Partial<TokenInfo> = {
            ...updates[token.address],
            initialized: true,
            name: "Zilliqa",
            symbol: "ZIL",
            balance,
          };

          updates[token.address] = { ...updates[token.address], ...tokenInfo };
          break;
        }

        case BatchRequestType.TokenBalance: {
          const tokenDetails = ZilswapConnector.getToken(token.address);

          const tokenInfo: Partial<TokenInfo> = {
            initialized: true,
            symbol: tokenDetails?.symbol ?? token.symbol,
            pools: pools,
            pool: token.pool,
            balance: result ? bnOrZero(result.balances[address]) : token.balance,
          };

          updates[token.address] = { ...updates[token.address], ...tokenInfo };
          break;
        }

        case BatchRequestType.TokenAllowance: {
          const allowances = result?.allowances[address]
          if (allowances) {
            updates[token.address] = { ...updates[token.address], allowances };
          }
          break;
        }
      }
    })
    return updates;
  } catch (error) {
    console.error("failed to read zil balances")
    console.error(error);
    return updates;
  }
}


/**
 * This function returns a Promise to return the balance of the specified evm token
 * @param {ethers.Contract} contract the token contract
 * @param {string} address the evm wallet address
 * @param {string} tokenAddress the address of the token
 * @returns {Promise<[string, BigNumber]>}
 */
const fetchEthTokenBalance = async (contract: ethers.Contract, address: string, tokenAddress: string, chain: BridgeableEvmChains): Promise<[string, BigNumber, BridgeableEvmChains]> => {
  return [tokenAddress, new BigNumber((await contract.balanceOf(address)).toString()), chain]
}

const fetchEthTokensState = async (network: Network, tokens: SimpleMap<TokenInfo>, address: string | null) => {
  const updates: SimpleMap<TokenInfo> = {};

  try {
    if (!address || Object.values(tokens).length < 1) {
      return updates
    }

    logger("tokens saga", "retrieving evm token balances/allowances");

    // get mainnet eth balance
    const balance = await ETHBalances.getETHBalance({ network, walletAddress: address })
    updates[Blockchain.Ethereum + "--" + ETH_ADDRESS] = {
      ...tokens[Blockchain.Ethereum + "--" + ETH_ADDRESS],
      address: ETH_ADDRESS,
      initialized: true,
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      blockchain: Blockchain.Ethereum,
      balance,
    }

    // get polygon matic balance
    const polygonBalance = await ETHBalances.getETHBalance({ network, walletAddress: address, chain: Blockchain.Polygon })
    updates[Blockchain.Polygon + "--" + ETH_ADDRESS] = {
      ...tokens[Blockchain.Polygon + "--" + ETH_ADDRESS],
      address: ETH_ADDRESS,
      initialized: true,
      name: "Matic",
      symbol: "MATIC",
      decimals: 18,
      blockchain: Blockchain.Polygon,
      balance: polygonBalance,
    }

    // get bsc bnb balance
    const bscBalance = await ETHBalances.getETHBalance({ network, walletAddress: address, chain: Blockchain.BinanceSmartChain })
    updates[Blockchain.BinanceSmartChain + "--" + ETH_ADDRESS] = {
      ...tokens[Blockchain.BinanceSmartChain + "--" + ETH_ADDRESS],
      address: ETH_ADDRESS,
      initialized: true,
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
      blockchain: Blockchain.BinanceSmartChain,
      balance: bscBalance,
    }

    // get arb balance
    const arbBalance = await ETHBalances.getETHBalance({ network, walletAddress: address, chain: Blockchain.Arbitrum })
    updates[Blockchain.Arbitrum + "--" + ETH_ADDRESS] = {
      ...tokens[Blockchain.Arbitrum + "--" + ETH_ADDRESS],
      address: ETH_ADDRESS,
      initialized: true,
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
      blockchain: Blockchain.Arbitrum,
      balance: arbBalance,
    }

    // get zil balance
    const zilBalance = await ETHBalances.getETHBalance({ network, walletAddress: address, chain: Blockchain.Zilliqa })
    updates[Blockchain.Zilliqa + "--" + ETH_ADDRESS] = {
      ...tokens[Blockchain.Zilliqa + "--" + ETH_ADDRESS],
      address: ETH_ADDRESS,
      initialized: true,
      name: "ZIL",
      symbol: "ZIL",
      decimals: 18,
      blockchain: Blockchain.Zilliqa,
      balance: zilBalance,
    }

    const fetchBalancePromises: Promise<[string, BigNumber, BridgeableEvmChains]>[] = [] //iterable of token balance Promises to be resolved concurrently later
    for (const evmChain of BRIDGEABLE_EVM_CHAINS) {
      const tokenAddresses = Object.values(tokens).filter(t => t.bridgeFrom === evmChain && t.address !== ETH_ADDRESS).map(t => t.address)
      if (!tokenAddresses.length) continue;

      const provider = getETHClient(evmChain, Network.MainNet);

      for (const tokenAddress of tokenAddresses) {
        const assetContract: ethers.Contract = new ethers.Contract(tokenAddress, erc20Abi, provider)
        fetchBalancePromises.push(fetchEthTokenBalance(assetContract, address, tokenAddress, evmChain))
      }
    }

    /**
     * resolve Promises concurrently instead of sequential looping and continues 
     * fetching balance even if one of the Promise fails/rejects
     */
    const balances = await Promise.allSettled(fetchBalancePromises)

    balances.filter(result => 'value' in result) as PromiseFulfilledResult<[string, BigNumber, BridgeableEvmChains]>[] //filter for resolved Promises
    balances.forEach(result => {
      if (result.status === "rejected") return
      const [address, balance, chain] = result.value
      updates[chain + "--" + address] = {
        ...tokens[chain + "--" + address],
        initialized: true,
        balance,
      }
    })
  } catch (error) {
    console.error(error)
    console.error("failed to read evm balances")
    return updates;
  }

  return updates
}

function* updateTokensState() {
  logger("tokens saga", "called updateTokensState")
  const { wallet, bridgeWallets } = getWallet(yield select());
  const { tokens } = getTokens(yield select());
  const { network } = getBlockchain(yield select());

  const zilAddress = wallet ? wallet.addressInfo.byte20.toLowerCase() : null;
  const ethAddress = bridgeWallets.eth ? bridgeWallets.eth.address : null;

  const [resultZil, resultEth]: [SimpleMap<TokenInfo>, SimpleMap<TokenInfo>] = yield all([
    call(fetchZilTokensState, network, tokens, zilAddress),
    call(fetchEthTokensState, network, tokens, ethAddress)
  ])

  yield put(actions.Token.updateAll({ ...resultZil, ...resultEth }));
}

function* watchRefetchTokensState() {
  let lastTask: Task | null = null
  while (true) {
    yield race({
      poll: delay(PollIntervals.TokenState), // refetch at least once every N seconds
      refetch: take(actions.Token.TokenActionTypes.TOKEN_REFETCH_STATE),
    });
    if (lastTask) {
      yield cancel(lastTask)
    }
    lastTask = yield fork(updateTokensState)
  }
}

export default function* tokensSaga() {
  logger("init tokens saga");
  yield fork(watchRefetchTokensState);
}
