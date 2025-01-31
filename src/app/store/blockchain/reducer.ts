import { LocalStorageKeys } from "app/utils/constants";
import { Network } from "zilswap-sdk/lib/constants";
import { BlockchainActionTypes } from "./actions";
import { BlockchainState } from "./types";

// const storedNetworkString = localStorage.getItem(LocalStorageKeys.Network);
// const networks: { [index: string]: Network | undefined } = Network;
const storedNetwork = Network.MainNet // networks[storedNetworkString || ""] || DefaultFallbackNetwork;

const initial_state: BlockchainState = {
  ready: false,
  network: storedNetwork,
  tokens: {},
  contracts: {
    zilswap: {
      balances: {},
      output_after_fee: '9700',
      pools: {},
      total_contributions: {},
    },
  }
};

const reducer = (state: BlockchainState = initial_state, action: any) => {
  switch (action.type) {
    case BlockchainActionTypes.READY:
      return { ...state, ready: true }
    case BlockchainActionTypes.SET_NETWORK:
      const { network } = action
      localStorage.setItem(LocalStorageKeys.Network, network);
      return {
        ...state,
        network,
    };
    default:
      return state;
  };
}

export default reducer;
