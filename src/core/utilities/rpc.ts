import { Value } from "@zilliqa-js/contract";
import { RPCResponse } from "@zilliqa-js/core";
import { Zilliqa } from "@zilliqa-js/zilliqa";
import { getErrorMessage } from "app/utils";
import { ZilswapConnector } from "core/zilswap";
import { logger } from "./logger";

export class RPCResultError extends Error {
  rpcResponse?: RPCResponse<any, string>;
  constructor(message?: string, response?: RPCResponse<any, string>) {
    super(message);
    this.rpcResponse = response;
  }
};

export class RPCHandler {
  /**
   * Static helper method to parse Zilliqa RPC response.
   *
   * @throws {@link RPCResultError} if `response` is not an object, or if `response.error` is truthy.
   * @param response RPCResponse object returned when executing blockchain transaction with `@zilliqa-js` SDK.
   * @returns RPCResponse.result
   */
  static parseResponse = (response: RPCResponse<any, string>): any => {
    if (typeof response !== "object")
      throw new RPCResultError("cannot parse RPC response", response);

    if (response.error)
      throw new RPCResultError(response.error.message, response);
    if (response.result)
      return response.result;
  };
};

/**
 * Converts `Value[]` array to map of string values.
 * `Value.type` is ignored, all values are returned as string.
 *
 *
 * sample input:
 * ```javascript
 *  [{
 *    name: "address",
 *    type: "ByStr20",
 *    value: "0xbadbeef",
 *  }, {
 *    name: "balance",
 *    type: "UInt28",
 *    value: "100000000",
 *  }]
 * ```
 *
 * output:
 * ```javascript
 *  {
 *    address: "0xbadbeef",
 *    balance: "100000000",
 *  }
 * ```
 *
 * @param params parameters in `Value[]` array representation
 * @returns mapped object representation - refer to sample output
 */
export const zilParamsToMap = (params: Value[]): { [index: string]: any } => {
  const output: { [index: string]: any } = {};
  for (const set of params) output[set.vname] = set.value;
  return output;
};


export const waitForTx = async (txHash: string, maxAttempts: number = 33, interval: number = 1000) => {
  const zilswap = ZilswapConnector.getSDK();
  for (let attempt = 0; attempt < maxAttempts; ++attempt) {
    try {
      logger("waitForTx", txHash);
      // wait 1s before getting tx
      const delay = interval * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      // motivation: bypass faulty zilliqa.provider provided from wallet extensions.
      const rpcEndpoint = (zilswap as any).rpcEndpoint;
      const zilliqa = new Zilliqa(rpcEndpoint)
      return await zilliqa.blockchain.getTransaction(txHash);
    } catch (error) {
      if (getErrorMessage(error) === "Txn Hash not Present")
        continue;
      throw error;
    }
  }

  throw new Error("could not confirm tx");
}
