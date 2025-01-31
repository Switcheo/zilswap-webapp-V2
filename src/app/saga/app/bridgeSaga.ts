import { ethers, Transaction as EthTransaction } from "ethers"
import { cancelled, put, select, takeEvery, takeLatest } from "redux-saga/effects"

import { BridgeTx, RootState } from "app/store/types"

import AppStore from "app/store"
import { addBridgeTx, BridgeActionTypes, updateForm } from "app/store/bridge/actions"
import { Blockchain, bnOrZero, BridgeableChains, chainConfigs, fgGetFees, getETHClient } from "app/utils"
import abiChainGateway from "app/utils/abi/gateway.abi.json"
import abiTokenManager from "app/utils/abi/token-manager.abi.json"
import { logger } from "core/utilities"
import dayjs from "dayjs"
import { Network } from "zilswap-sdk"


export enum Status {
  NotStarted,
  // DepositApproved,
  DepositTxStarted,
  DepositTxConfirmed,
  WithdrawTxStarted,
  WithdrawTxConfirmed,
}

export interface EthTransactionResponse extends EthTransaction {
  confirmations?: number
}

const gatewayInterface = new ethers.utils.Interface(abiChainGateway);
const tokenManagerInterface = new ethers.utils.Interface(abiTokenManager);
const filterListeners: Partial<Record<Blockchain, [ethers.EventFilter, EventListener]>> = {}

const handleDispatchEvent: ((chain: Blockchain, network: Network) => ethers.providers.Listener) = (chain, network) => async (event) => {
  const result = gatewayInterface.decodeEventLog("Dispatched", event.data, event.topics)

  const state = AppStore.getState()

  const pendingChainTxs = state.bridge.bridgeTxs.filter(tx => tx.dstChain === chain && !tx.destinationTxHash)
  const evmProvider = getETHClient(chain, network)

  if (!pendingChainTxs.length && filterListeners[chain]) {
    const [filter, listener] = filterListeners[chain]
    delete filterListeners[chain]
    evmProvider.removeListener(filter, listener)
    return
  }

  const txReceipt = await evmProvider.getTransactionReceipt(event.transactionHash)
  const withdrawEventLog = txReceipt.logs.find(e => e.address === result.target && e.topics[0] === tokenManagerInterface.getEventTopic("WithdrawnFromLockProxy"))
  if (!withdrawEventLog) {
    console.log(event.transactionHash, txReceipt.logs)
    throw new Error("unable to find withdraw event from tx")
  }
  const withdrawEvent = tokenManagerInterface.decodeEventLog("WithdrawnFromLockProxy", withdrawEventLog.data, withdrawEventLog.topics)

  const sourceChain = Object.entries(chainConfigs[network]).find(([, chainConfig]) => chainConfig.chainId === result.sourceChainId?.toNumber())?.[0]
  const confirmedTx = pendingChainTxs.find(tx =>
    tx.dstAddr === withdrawEvent.receipient.toLowerCase()
    && tx.srcChain === sourceChain &&
    tx.dstToken === withdrawEvent.token.toLowerCase()
  )
  if (confirmedTx) {
    confirmedTx.destinationTxHash = event.transactionHash
    confirmedTx.destinationTxConfirmedAt = dayjs()
    AppStore.dispatch(addBridgeTx([confirmedTx]));
  }

  if (!pendingChainTxs.length && filterListeners[chain]) {
    const evmProvider = getETHClient(chain, network)
    const [filter, listener] = filterListeners[chain]
    delete filterListeners[chain]
    evmProvider.removeListener(filter, listener)
    return
  }
}

interface AddBridgeTxAction {
  type: BridgeActionTypes.ADD_BRIDGE_TXS
  payload: BridgeTx[]
}
function addBridgeTxWatcher(action: AddBridgeTxAction) {
  const [bridgeTx] = action.payload;

  // listener already active, no-op
  if (filterListeners[bridgeTx.dstChain]) return;

  try {
    const dstChainConfig = chainConfigs[bridgeTx.network]?.[bridgeTx.dstChain as BridgeableChains]
    if (!dstChainConfig) throw new Error("unable to retrieve chain config")

    const gatewayContractAddress = dstChainConfig.chainGatewayAddress
    const evmProvider = getETHClient(bridgeTx.dstChain, bridgeTx.network)
    const gatewayContract = new ethers.Contract(gatewayContractAddress, abiChainGateway, evmProvider)

    const filter = gatewayContract.filters.Dispatched(null, null, null)

    const listener = handleDispatchEvent(bridgeTx.dstChain, bridgeTx.network)
    evmProvider.addListener(filter, listener)
  } catch (error) {
    console.error("failed to add dst event listener")
    console.error(error)
  }
}

function* watchWithdrawFee() {
  const state: RootState = yield select()
  const asset = state.bridge.formState.token
  if (!asset) return
  const withdrawFee = state.bridge.formState.withdrawFee
  if (withdrawFee[asset.blockchain]?.[asset.tokenAddress]) return
  const provider = getETHClient(asset.blockchain, state.bridge.formState.forNetwork ?? Network.MainNet)
  const tknMngrContract = new ethers.Contract(asset.tokenManagerAddress, [fgGetFees], provider);
  const feeAmt = yield tknMngrContract.getFees()

  if (cancelled()) return
  if (!withdrawFee[asset.blockchain]) withdrawFee[asset.blockchain] = {}
  withdrawFee[asset.blockchain]![asset.tokenAddress] = bnOrZero(feeAmt.toString())
  yield put(updateForm({ withdrawFee }))
}

export default function* bridgeSaga() {
  logger("init bridge saga")
  yield takeEvery(BridgeActionTypes.ADD_BRIDGE_TXS, addBridgeTxWatcher)
  yield takeLatest(BridgeActionTypes.UPDATE_FORM, watchWithdrawFee)
}
