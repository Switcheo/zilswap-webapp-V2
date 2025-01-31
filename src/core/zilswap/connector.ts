import { BIG_ZERO } from "app/utils/constants";
import BigNumber from "bignumber.js";
import { ObservedTx, Pool, TokenDetails, ZilSwapV2 } from "zilswap-sdk";
import { Network, ZILSWAPV2_CONTRACTS } from "zilswap-sdk/lib/constants";

import { getErrorMessage } from "app/utils";
import { logger } from "core/utilities";
import { ConnectedWallet } from "core/wallet/ConnectedWallet";
import { fromBech32Address } from "./reexport";

export interface ConnectProps {
  wallet: ConnectedWallet;
  network: Network;
  observedTxs?: ObservedTx[];
};
export interface InitProps {
  network?: Network;
};

interface ConnectorCallProps {
  suppressLogs?: boolean;
};

export interface ExchangeRateQueryProps extends ConnectorCallProps {
  exactOf: "in" | "out";
  tokenInID: string;
  tokenOutID: string;
  amount: BigNumber;
};

export interface ApproveTxProps {
  tokenID: string;
  tokenAmount: BigNumber;
  spenderAddress: string;
  network: Network;
};

export interface AddLiquidityProps {
  pool: Pool;
  amount0Desired: BigNumber;
  amount1Desired: BigNumber;
  amount0Min: BigNumber;
  amount1Min: BigNumber;
  vReserveAllowanceBps?: BigNumber
};

export interface RemoveLiquidityProps {
  pool: Pool;
  liquidity: BigNumber;
  amount0Min: BigNumber;
  amount1Min: BigNumber;
};

export type SwapProps = {
  path: Pool[];
  tokenInID: string;
  exactOf: "in" | "out";
  amount: BigNumber;
  maxAdditionalSlippage?: number;
  recipientAddress?: string;
  amountOutMin?: BigNumber;
  amountInMax?: BigNumber;
};

export interface ContributeZILOProps {
  address: string;
  amount: BigNumber;
};

export interface ClaimZILOProps {
  address: string;
};

export interface TokenContractBalancesState {
  [index: string]: string;
}

export interface TokenContractAllowancesState {
  [index: string]: TokenContractBalancesState;
}

let zilswapV2: ZilSwapV2 | null = null

/**
 * Checks transaction receipt for error, and throw the top level exception
 * if any.
 *
 * @param txReceipt `@zilliqa-js` blockchain transaction receipt
 */
const handleObservedTx = (observedTx: ObservedTx) => {
  // // @ts-ignore
  // if (txReceipt.exceptions?.length) {
  //   // @ts-ignore
  //   throw txReceipt.exceptions[0];
  // }
};


export class ZilswapConnector {
  static setSDK = (sdk: ZilSwapV2 | null) => {
    zilswapV2 = sdk
  }

  static getSDK = (): ZilSwapV2 => {
    if (!zilswapV2) throw new Error('not initialized');

    return zilswapV2
  }

  static getCurrentBlock = () => {
    if (!zilswapV2) throw new Error('not initialized');
    return zilswapV2.getCurrentBlock()
  }

  static confirmTx = async (txHash: string, maxAttempts = 100, interval = 5000) => {
    const sdk = ZilswapConnector.getSDK();
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const tx = await sdk.zilliqa.blockchain.getTransaction(txHash);
        if (tx.isConfirmed()) return tx;
      } catch (error) {
        if (getErrorMessage(error) !== "Txn Hash not Present") 
          throw error;
      } finally {
        await new Promise(res => setTimeout(res, interval));
      }
    }

    throw new Error("cannot confirm transaction");
  }

  /**
   * Get the pool of the provided token, or `null` if pool does not yet
   * exist on the contract.
   *
   * @returns the pool instance
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  // static getPool = (tokenID: string): Pool | null => {
  //   if (!zilswap) throw new Error('not initialized');
  //   return zilswap.getPool(tokenID);
  // };

  static getPool = (token0Address: string, token1Address: string, ampBps: BigNumber) => {
    if (!zilswapV2) throw new Error('not initialized');

    const pools = zilswapV2.getPools();
    return Object.values(pools).find(p => p.token1Address === token1Address && p.token0Address === token0Address && p.ampBps.eq(ampBps));
  }

  static getPoolByAddress = (poolAddress: string): Pool | null => {
    if (!zilswapV2) throw new Error('not initialized');
    const pools = zilswapV2.getPools();
    return pools[fromBech32Address(poolAddress).toLowerCase()] ?? null;
  }

  static getPools = () => {
    if (!zilswapV2) throw new Error('not initialized');
    const pools = zilswapV2.getPools();
    return pools
  }

  /**
   *
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static setDeadlineBlocks = (blocks: number) => {
    if (!zilswapV2) throw new Error('not initialized');
    return zilswapV2.setDeadlineBlocks(blocks);
  };

  /**
  *
  * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
  */
  static approveTokenTransfer = async (props: ApproveTxProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    logger(props.tokenID);
    logger(props.tokenAmount.toString());
    logger(props.spenderAddress);
    const spenderAddress = props.spenderAddress ? props.spenderAddress : ZILSWAPV2_CONTRACTS[props.network].toLowerCase()
    const observedTx = await zilswapV2.approveTokenTransferIfRequired(props.tokenID, props.tokenAmount, spenderAddress);
    if (observedTx)
      handleObservedTx(observedTx);

    return observedTx;
  };

  static getToken = (tokenID: string): TokenDetails | undefined => {
    if (!zilswapV2) return undefined

    const tokens = zilswapV2.getTokens();
    if (tokens![tokenID]) { return tokens![tokenID] }
    return undefined
  }

  /**
   *
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  // Used when token In is zil
  static adjustedForGas = (intendedAmount: BigNumber, balance?: BigNumber): BigNumber => {
    if (!zilswapV2) throw new Error('not initialized');
    if (!balance) balance = new BigNumber(intendedAmount);
    const gasLimit = zilswapV2._txParams.gasLimit.toString();
    const netGasAmount = BigNumber.min(BigNumber.max(balance.minus(gasLimit), BIG_ZERO), intendedAmount);
    return netGasAmount;
  };

  // Calculates the estimated amountIn and amountOut depending on which token is given in exact
  static getExchangeRate = (props: ExchangeRateQueryProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    const exactIn = props.exactOf === "in"
    const queryFunction = exactIn ?
      zilswapV2.getOutputForExactInput.bind(zilswapV2) : zilswapV2.getInputForExactOutput.bind(zilswapV2);

    if (!props.suppressLogs) {
      logger(props.exactOf);
      logger(props.tokenInID);
      logger(props.tokenOutID);
      logger(props.amount.toString());
    }

    return queryFunction(
      props.tokenInID,
      props.tokenOutID,
      props.amount.toString(),
    ) ?? "0";
  }

  static getPoolRatio = (pool: Pool, direction: "0to1" | "1to0"): BigNumber => {
    const reserves = [pool.token0Reserve, pool.token1Reserve];
    if (direction === "1to0") reserves.reverse();
    return reserves[0].dividedBy(reserves[1])
  }

  // static deployAndAddPool = async (token0ID: string, token1ID: string, initAmpBps: string) => {
  //   if (!zilswapV2) throw new Error('not initialized');
  //   await zilswapV2.deployAndAddPool(token0ID, token1ID, initAmpBps)
  // }

  static deployPool = async (token0ID: string, token1ID: string, initAmpBps: string) => {
    if (!zilswapV2) throw new Error('not initialized');
    const observedTx = await zilswapV2.deployPool(token0ID, token1ID, initAmpBps);
    handleObservedTx(observedTx!);
    return observedTx;
  }

  static addPool = async (poolID: string) => {
    if (!zilswapV2) throw new Error('not initialized');
    return await zilswapV2.addPool(poolID)
  }

  static getVReserveBound = (pool: Pool, allowanceBps: BigNumber) => {
    const { token0vReserve, token1vReserve } = pool;
    if (token0vReserve.isZero() || token1vReserve.isZero()) {
      return { vReserveMin: new BigNumber(0).toString(), vReserveMax: new BigNumber(0).toString() }
    }
    const q112 = new BigNumber(2).pow(112)
    const allowanceFactor = allowanceBps.shiftedBy(-4).plus(1);
    const vReserveMin = token1vReserve.div(token0vReserve).times(q112).div(allowanceFactor).dp(0);
    const vReserveMax = token1vReserve.div(token0vReserve).times(q112).times(allowanceFactor).dp(0);
    return { vReserveMin, vReserveMax }
  }

  // Applies for both AddLiquidity and AddLiquidityZIL
  static addLiquidity = async (props: AddLiquidityProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    logger(props.pool)
    logger(props.amount0Desired.toString(10))
    logger(props.amount1Desired.toString(10))
    logger(props.amount0Min.toString(10))
    logger(props.amount1Min.toString(10))
    logger(props.vReserveAllowanceBps?.toString(10))

    const vBounds = ZilswapConnector.getVReserveBound(props.pool, props.vReserveAllowanceBps ?? new BigNumber(500));

    const observedTx = await zilswapV2.addLiquidity(
      props.pool.token0Address,
      props.pool.token1Address,
      props.pool.poolAddress,
      props.amount0Desired.toString(10),
      props.amount1Desired.toString(10),
      props.amount0Min.toString(10),
      props.amount1Min.toString(10),
      vBounds.vReserveMin.toString(10),
      vBounds.vReserveMax.toString(10),
    );
    handleObservedTx(observedTx!);

    return observedTx!;
  };

  static removeLiquidity = async (props: RemoveLiquidityProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    logger(props.pool);
    logger(props.liquidity.toString(10));
    logger(props.amount0Min.toString(10));
    logger(props.amount1Min.toString(10));

    const observedTx = await zilswapV2.removeLiquidity(
      props.pool.token0Address,
      props.pool.token1Address,
      props.pool.poolAddress,
      props.liquidity.toString(10),
      props.amount0Min.toString(10),
      props.amount1Min.toString(10),
    );

    handleObservedTx(observedTx!);

    return observedTx!;
  };

  static findSwapPath = (inTokenAddress: string, outTokenAddress: string, tokenInAmount: BigNumber) => {
    const result = ZilswapConnector.getSDK().findSwapPathIn([], inTokenAddress, outTokenAddress, tokenInAmount, 3);
    return result;
  }

  /**
   * Abstraction for Zilswap SDK functions
   * `swapWithExactInput` and `swapWithExactOutput`
   *
   * "in" refers to the transfer of value *into* Zilswap contract
   * "out" refers to the transfer of value *out* of Zilswap contract
   *
   * @param exactOf  "in" | "out" - used to determine with exact swap function to use.
   * @param tokenInID string
   * @param tokenOutID string
   * @param amount BigNumber
   * @param maxAdditionalSlippage number?
   * @see zilswap-sdk documentation
   *
   * @throws "not initialized" if `ZilswapConnector.setSDK` has not been called.
   */
  static swap = async (props: SwapProps) => {
    if (!zilswapV2) throw new Error('not initialized');

    // Check if the transaction involves ZIL
    // let isZilIn = tokenInID === ZIL_ADDRESS
    // let isZilOut = tokenOutID === ZIL_ADDRESS

    logger(props.exactOf);
    logger(props.tokenInID);
    logger(props.amount.toString(10));
    logger(props.amountInMax?.toString(10));
    logger(props.amountOutMin?.toString(10));
    logger(props.maxAdditionalSlippage);
    logger(props.recipientAddress);

    let observedTx: ObservedTx;
    switch (props.exactOf) {
      case "in":
        observedTx = await zilswapV2.swapExactTokensForTokens(props.path, props.tokenInID, props.amount?.toString(10) ?? "0", props.amountOutMin?.toString(10) ?? "0", props.maxAdditionalSlippage)
        // if (isZilIn) {
        //   observedTx = await zilswapV2.swapExactZILForTokens(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        // }
        // else if (isZilOut) {
        //   observedTx = await zilswapV2.swapExactTokensForZIL(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        // }
        // else if (!isZilIn && !isZilOut) {
        //   observedTx = await zilswapV2.swapExactTokensForTokens(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        // }
        break;
      case "out":
        observedTx = await zilswapV2.swapTokensForExactTokens(props.path, props.tokenInID, props.amount?.toString(10) ?? "0", props.amountInMax?.toString(10) ?? "0", props.maxAdditionalSlippage)
        // if (isZilIn) {
        //   observedTx = await zilswapV2.swapZILForExactTokens(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        // }
        // else if (isZilOut) {
        //   observedTx = await zilswapV2.swapTokensForExactZIL(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        // }
        // else if (!isZilIn && !isZilOut) {
        //   observedTx = await zilswapV2.swapTokensForExactTokens(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        // }
        break;
      default:
        throw new Error("Invalid swap")
    }

    handleObservedTx(observedTx!);

    return observedTx!;
  };

  static getContract = async (address: string) => {
    const contract = await zilswapV2?.getContract(address)
    return contract
  }

}
