import { Blockchain, BridgeableChains } from "app/utils";
import BigNumber from "bignumber.js";
import { Network } from "zilswap-sdk/lib/constants";
import { HTTP } from "../utilities/http";
import { EthRpcUrl } from "./providers";

export interface CoinGeckoPriceResult {
	[index: string]: BigNumber;
};

interface GetETHBalanceProps {
  network: Network
  walletAddress: string
  chain?: BridgeableChains
};

/**
 * Ethereum Web3 balances API abstraction object
 */
export class ETHBalances {
  static getClient = (network: Network, chain?: BridgeableChains): HTTP<{ root: string }> => {
    let url: string = EthRpcUrl[chain ?? Blockchain.Ethereum]

    return new HTTP(url, { root: '' })
  }
  static getETHBalance = async ({ network, walletAddress, chain }: GetETHBalanceProps): Promise<BigNumber> => {
    const client = ETHBalances.getClient(network, chain)
    const response = await client.post({
      url: client.path("root"), data: {
        id: "1",
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [walletAddress, 'latest'],
      }
    }).then(res => res.json())
    return new BigNumber(response.result)
  }
}
