
import { ConnectedWallet } from "core/wallet";
import { ContractState } from "zilswap-sdk";
import { Network } from "zilswap-sdk/lib/constants";

export interface BlockchainState {
  ready: boolean
  network: Network
  tokens: {}
  contracts: {
    zilswap: ContractState,
  }
};

export type ChainInitProps = {
  wallet: ConnectedWallet | null
  network: Network
};
