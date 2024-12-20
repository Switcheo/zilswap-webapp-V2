import dayjs from "dayjs";
import { LayoutActionTypes } from "./actions";
import { LayoutState, LoadingTask } from "./types";

const initial_state: LayoutState = {
  showWalletDialog: false,
  showCreatePool: false,
  showAdvancedSetting: false,
  showNetworkSwitchDialog: false,
  showTransactionDialog: false,
  showTransferConfirmation: false,
  showMnemonicDialog: false,
  showResumeTransferDialog: false,
  showBuyNftDialog: false,
  showBidNftDialog: false,
  showCancelSellNftDialog: false,
  expandNavDrawer: false,
  liquidityEarnHidden: false,
  notification: undefined,
  showPoolType: "add",
  loadingTasks: {},
  tasksRegistry: {},
};

const reducer = (state: LayoutState = initial_state, action: any): LayoutState => {
  let loadingTask: LoadingTask | null = null, taskName;
  switch (action.type) {
    case LayoutActionTypes.TOGGLE_SHOW_WALLET:
      return {
        ...state,
        showWalletDialog: !action.override ? !state.showWalletDialog : action.override === "open",
      };
    case LayoutActionTypes.SHOW_POOL_TYPE:
      return {
        ...state,
        showPoolType: action.poolType,
      };
    case LayoutActionTypes.SHOW_ADVANCED_SETTING:
      return {
        ...state,
        showAdvancedSetting: action.show,
      };
    case LayoutActionTypes.SHOW_TRANSFER_CONFIRMATION:
      return {
        ...state,
        showTransferConfirmation: action.show,
      };
    case LayoutActionTypes.TOGGLE_SHOW_NETWORK_SWITCH:
      return {
        ...state,
        showNetworkSwitchDialog: !action.override ? !state.showTransactionDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_TRANSACTIONS:
      return {
        ...state,
        showTransactionDialog: !action.override ? !state.showTransactionDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_CREATE_POOL:
      return {
        ...state,
        showCreatePool: !action.override ? !state.showWalletDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_MNEMONIC:
      return {
        ...state,
        showMnemonicDialog: !action.override ? !state.showMnemonicDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_RESUME_TRANSFER:
      return {
        ...state,
        showResumeTransferDialog: !action.override ? !state.showResumeTransferDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_BUY_NFT:
      return {
        ...state,
        showBuyNftDialog: !action.override ? !state.showBuyNftDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_BID_NFT:
      return {
        ...state,
        showBidNftDialog: !action.override ? !state.showBidNftDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_SHOW_CANCEL_SELL_NFT:
      return {
        ...state,
        showCancelSellNftDialog: !action.override ? !state.showCancelSellNftDialog : action.override === "open",
      };
    case LayoutActionTypes.TOGGLE_EXPAND_NAV_DRAWER:
      return {
        ...state,
        expandNavDrawer: !action.override ? !state.expandNavDrawer : action.override === "open",
      };
    case LayoutActionTypes.HIDE_LIQUIDITY_EARN:
      return {
        ...state,
        liquidityEarnHidden: action.hide === undefined ? true : action.hide,
      };

    case LayoutActionTypes.ADD_BACKGROUND_LOADING:
      return {
        ...state,
        loadingTasks: {
          ...state.loadingTasks,
          [action.name]: {
            ...(state.loadingTasks[action.name] || {}),
            [action.uuid]: dayjs(),
          },
        },
        tasksRegistry: {
          ...state.tasksRegistry,
          [action.uuid]: action.name,
        },
      };
    case LayoutActionTypes.REMOVE_BACKGROUND_LOADING:
      taskName = state.tasksRegistry[action.uuid];
      if (!taskName)
        return state;
      loadingTask = state.loadingTasks[taskName];
      if (!loadingTask || !loadingTask[action.uuid])
        return state;

      delete loadingTask[action.uuid];
      if (!Object.keys(loadingTask).length)
        delete state.loadingTasks[taskName];
      delete state.tasksRegistry[action.uuid];
      return {
        ...state,
        loadingTasks: {
          ...state.loadingTasks,
        },
        tasksRegistry: {
          ...state.tasksRegistry,
        },
      };
    default:
      return state;
  };
}

export default reducer;
