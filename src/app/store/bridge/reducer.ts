import { Blockchain, DataCoder, bnOrZero } from "app/utils";
import { BridgeableChains, LocalStorageKeys } from "app/utils/constants";
import BigNumber from "bignumber.js";
import { logger } from "core/utilities";
import { Network } from "zilswap-sdk/lib/constants";
import { BridgeActionTypes } from "./actions";
import { BridgeState, BridgeTx, BridgeableTokenMapping, UpdateBridgeBalance } from "./types";

export const BridgeTxEncoder: DataCoder<BridgeTx> = {
  encode: (tx: BridgeTx): object => {
    return {
      srcChain: tx.srcChain,
      dstChain: tx.dstChain,
      network: tx.network,
      srcAddr: tx.srcAddr,
      dstAddr: tx.dstAddr,
      srcToken: tx.srcToken,
      dstToken: tx.dstToken,
      withdrawFee: tx.withdrawFee.toString(10),
      inputAmount: tx.inputAmount.toString(10),
      approveTxHash: tx.approveTxHash,
      sourceTxHash: tx.sourceTxHash,
      depositTxConfirmedAt: DataCoder.encodeDayjs(tx.depositTxConfirmedAt),
      destinationTxHash: tx.destinationTxHash,
      destinationTxConfirmedAt: DataCoder.encodeDayjs(tx.destinationTxConfirmedAt),
      dismissedAt: DataCoder.encodeDayjs(tx.dismissedAt),
      sourceDispatchedAt: DataCoder.encodeDayjs(tx.sourceDispatchedAt),
      sourceConfirmations: tx.sourceConfirmations,
    };
  },

  decode: (data: any): BridgeTx => {
    const object = data;
    return {
      srcChain: object.srcChain,
      dstChain: object.dstChain,
      network: object.network ?? Network.TestNet,
      srcAddr: object.srcAddr,
      dstAddr: object.dstAddr,
      srcToken: object.srcToken,
      dstToken: object.dstToken,
      withdrawFee: bnOrZero(object.withdrawFee),
      inputAmount: bnOrZero(object.inputAmount),
      approveTxHash: object.approveTxHash,
      sourceTxHash: object.sourceTxHash,
      depositTxConfirmedAt: DataCoder.decodeDayjs(object.depositTxConfirmedAt),
      destinationTxHash: object.destinationTxHash,
      destinationTxConfirmedAt: DataCoder.decodeDayjs(object.destinationTxConfirmedAt),
      dismissedAt: DataCoder.decodeDayjs(object.dismissedAt),
      sourceDispatchedAt: DataCoder.decodeDayjs(object.sourceDispatchedAt),
      sourceConfirmations: object.sourceConfirmations,
    }
  }
}

const loadedBridgeTxsData = localStorage.getItem(LocalStorageKeys.BridgeTxs);
let loadedBridgeTxs: BridgeTx[] = [];
try {
  if (loadedBridgeTxsData) {
    const savedTxs: object[] = JSON.parse(loadedBridgeTxsData);
    loadedBridgeTxs = savedTxs.map(BridgeTxEncoder.decode);
    logger("loadedBridgeTxs", loadedBridgeTxs);
  }
} catch (error) {
  console.error(error);
  loadedBridgeTxs = [];
}

const initial_state: BridgeState = {
  bridgeTxs: loadedBridgeTxs,

  tokens: [],

  formState: {
    transferAmount: new BigNumber(0),
    fromBlockchain: Blockchain.BinanceSmartChain,
    toBlockchain: Blockchain.Zilliqa,

    isInsufficientReserves: false,
    forNetwork: null,

    withdrawFee: {},
  }
}

const reducer = (state: BridgeState = initial_state, action: any) => {
  const { payload } = action;

  switch (action.type) {

    case BridgeActionTypes.SET_TOKENS:
      const tokens: BridgeableTokenMapping = payload;
      let token = state.formState.token;
      if (!token) {

        const fromBlockchain = state.formState.fromBlockchain as BridgeableChains;
        const firstToken = tokens.find(token => token.blockchain === fromBlockchain);
        token = tokens?.find(bridgeToken => bridgeToken.tokenAddress.startsWith("zil") && bridgeToken.blockchain === fromBlockchain) ?? firstToken;

        state.formState = {
          ...state.formState,
          token,
        };
      }

      return {
        ...state,
        tokens: payload,
      };

    case BridgeActionTypes.UPDATE_TOKEN_BALANCES:
      const updateBalanceProps: UpdateBridgeBalance[] = payload;
      const newTokensState: BridgeableTokenMapping = state.tokens.slice()
      updateBalanceProps.forEach(k => {
        const index = state.tokens.findIndex(token => token.blockchain === k.chain && token.tokenAddress === k.tokenAddress)
        if (index > 0) {
          newTokensState[index].balance = k.balance
        }
      })
      return {
        ...state,
        tokens: newTokensState,
      };

    case BridgeActionTypes.ADD_BRIDGE_TXS:
      const uniqueTxs: Record<string, BridgeTx> = {};

      // reconstruct txs to force component re-render.
      const newTxs: BridgeTx[] = payload.map((tx: BridgeTx) => ({ ...tx }));
      for (const tx of [...state.bridgeTxs, ...newTxs]) {
        const sourceTxHash = tx.sourceTxHash!
        uniqueTxs[sourceTxHash] = {
          ...state.bridgeTxs.find(tx => tx.sourceTxHash === sourceTxHash),
          ...tx,
        };
      }

      const newBridgeTxs = Object.values(uniqueTxs);
      // saveBridgeTxs(newBridgeTxs);

      // const activeBridgeTx = findActiveBridgeTx(newBridgeTxs);
      return {
        ...state,
        bridgeTxs: newBridgeTxs,
      };
    case BridgeActionTypes.DISMISS_TX: {
      const removeTxHashes = payload.map(tx => tx.sourceTxHash)
      return {
        ...state,
        bridgeTxs: state.bridgeTxs.filter(tx => !removeTxHashes.includes(tx.sourceTxHash)),
      };
    }

    case BridgeActionTypes.SET_PREVIEW_BRIDGE_TX:
      const previewBridgeTx = action.payload;
      return {
        ...state,
        previewBridgeTx,
      };

    case BridgeActionTypes.UPDATE_FORM:
      return {
        ...state,
        formState: {
          ...state.formState,
          ...payload,
        }
      };

    case BridgeActionTypes.UPDATE_FEE:
      return {
        ...state,
        formState: {
          ...state.formState,
          withdrawFee: payload,
        }
      };

    default:
      return state;
  }
}

export default reducer;
