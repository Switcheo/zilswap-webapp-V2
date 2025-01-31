import { Network } from "zilswap-sdk/lib/constants";

export enum CarbonNetwork {
  MainNet = "mainnet",
  TestNet = "testnet",
  DevNet = "devnet",
  LocalHost = "localhost"
}

export const netCarbonToZil = (network: CarbonNetwork): Network => {
  switch (network) {
    case CarbonNetwork.MainNet: return Network.MainNet;
    default: return Network.TestNet;
  }
}

export const netZilToCarbon = (network: Network): CarbonNetwork => {
  switch (network) {
    case Network.MainNet: return CarbonNetwork.MainNet;
    default: return CarbonNetwork.DevNet;
  }
}

export const getZilChainId = (network: Network) => {
  switch (network) {
    case Network.MainNet: return 1;
    case Network.TestNet: return 333;
    default: return 222;
  }
}
