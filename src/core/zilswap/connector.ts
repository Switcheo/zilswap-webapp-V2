import { BIG_ZERO, ZIL_ADDRESS } from "app/utils/constants";
import BigNumber from "bignumber.js";
import { ObservedTx, TokenDetails, ZilSwapV2 } from "zilswap-sdk";
import { Network } from "zilswap-sdk/lib/constants";

import { logger } from "core/utilities";
import { ConnectedWallet } from "core/wallet/ConnectedWallet";
import { Pool } from "zilswap-sdk/lib";

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
  spenderAddress?: string
};

export interface AddLiquidityProps {
  tokenAID: string;
  tokenBID: string;
  poolID: string;
  amountADesiredStr: string;
  amountBDesiredStr: string;
  amountAMinStr: string;
  amountBMinStr: string;
  reserve_ratio_allowance: number
};

export interface RemoveLiquidityProps {
  tokenAID: string;
  tokenBID: string;
  poolID: string;
  liquidityStr: string;
  amountAMinStr: string;
  amountBMinStr: string;
};

export interface SwapProps {
  exactOf: "in" | "out";
  tokenInID: string;
  tokenOutID: string;
  amount: BigNumber;
  amountInMax?: BigNumber;
  amountOutMin?: BigNumber;
  maxAdditionalSlippage?: number;
  recipientAddress?: string;
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
  // @ts-ignore
  if (txReceipt.exceptions?.length) {
    // @ts-ignore
    throw txReceipt.exceptions[0];
  }
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

  static getTokenPools = (tokenAID: string) => {
    if (!zilswapV2) throw new Error('not initialized');

    const tokenPools = zilswapV2.getTokenPools()
    return tokenPools![tokenAID]
  };

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
    const observedTx = await zilswapV2.approveTokenTransferIfRequired(props.tokenID, props.tokenAmount, props.spenderAddress!);
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

    if (exactIn) {
      // getOutputForExactInput
      return (queryFunction(
        props.tokenInID,
        props.tokenOutID,
        props.amount.toString(),
        '0' // arbitrary number just to obtain the output
      ))
    } else {
      // getInputForExactOutput
      return (queryFunction(
        props.tokenInID,
        props.tokenOutID,
        props.amount.toString(),
        '100000000000000000000000000000000000000' // arbitrary number just to obtain the input
      ))
    }
  }

  static deployAndAddPool = async (token0ID: string, token1ID: string, initAmpBps: string) => {
    if (!zilswapV2) throw new Error('not initialized');
    await zilswapV2.deployAndAddPool(token0ID, token1ID, initAmpBps)
  }

  static deployPool = async (token0ID: string, token1ID: string, initAmpBps: string) => {
    if (!zilswapV2) throw new Error('not initialized');
    await zilswapV2.deployPool(token0ID, token1ID, initAmpBps)
  }

  static addPool = async (poolID: string) => {
    if (!zilswapV2) throw new Error('not initialized');
    await zilswapV2.addPool(poolID)
  }

  // Applies for both AddLiquidity and AddLiquidityZIL
  static addLiquidity = async (props: AddLiquidityProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    logger(props.tokenAID)
    logger(props.tokenBID)
    logger(props.poolID)
    logger(props.amountADesiredStr)
    logger(props.amountBDesiredStr)
    logger(props.amountAMinStr)
    logger(props.amountBMinStr)
    logger(props.reserve_ratio_allowance)

    let observedTx: ObservedTx;
    if (props.tokenBID === ZIL_ADDRESS) {
      // zil-zrc2 pair
      observedTx = await zilswapV2.addLiquidity(
        props.tokenAID,
        props.tokenBID,
        props.poolID,
        props.amountADesiredStr,
        props.amountBDesiredStr,
        props.amountAMinStr,
        props.amountBMinStr,
        props.reserve_ratio_allowance
      );
    }
    else {
      // zrc2-zrc2 pair
      observedTx = await zilswapV2.addLiquidityZIL(
        props.tokenAID,
        props.poolID,
        props.amountADesiredStr,
        props.amountBDesiredStr,
        props.amountAMinStr,
        props.amountBMinStr,
        props.reserve_ratio_allowance
      );

    }
    handleObservedTx(observedTx!);

    return observedTx!;
  };

  static removeLiquidity = async (props: RemoveLiquidityProps) => {
    if (!zilswapV2) throw new Error('not initialized');
    logger(props.tokenAID);
    logger(props.tokenBID);
    logger(props.poolID);
    logger(props.liquidityStr);
    logger(props.amountAMinStr);
    logger(props.amountBMinStr);

    let observedTx: ObservedTx;
    if (props.tokenBID === ZIL_ADDRESS) {
      // zil-zrc2 pair
      observedTx = await zilswapV2.removeLiquidity(
        props.tokenAID,
        props.tokenBID,
        props.poolID,
        props.liquidityStr,
        props.amountAMinStr,
        props.amountBMinStr
      );
    } else {
      // zrc2-zrc2 pair
      observedTx = await zilswapV2.removeLiquidityZIL(
        props.tokenAID,
        props.poolID,
        props.liquidityStr,
        props.amountAMinStr,
        props.amountBMinStr
      );
    }

    handleObservedTx(observedTx!);

    return observedTx!;
  };

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

    const { exactOf, tokenInID, tokenOutID, amount, amountInMax, amountOutMin, maxAdditionalSlippage, recipientAddress } = props

    // Check if the transaction involves ZIL
    let isZilIn = tokenInID === ZIL_ADDRESS
    let isZilOut = tokenOutID === ZIL_ADDRESS

    // TODO: proper token blacklist
    if (tokenOutID === "zil13c62revrh5h3rd6u0mlt9zckyvppsknt55qr3u")
      throw new Error("Suspected malicious token detected, swap disabled");

    logger(exactOf);
    logger(tokenInID);
    logger(tokenOutID);
    logger(amount.toString());
    logger(maxAdditionalSlippage);
    logger(recipientAddress);

    let observedTx: ObservedTx;
    switch (props.exactOf) {
      case "in":
        if (isZilIn) {
          observedTx = await zilswapV2.swapExactZILForTokens(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        }
        else if (isZilOut) {
          observedTx = await zilswapV2.swapExactTokensForZIL(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        }
        else if (!isZilIn && !isZilOut) {
          observedTx = await zilswapV2.swapExactTokensForTokens(tokenInID, tokenOutID, amount.toString(), amountOutMin!.toString(), maxAdditionalSlippage)
        }
        break;
      case "out":
        if (isZilIn) {
          observedTx = await zilswapV2.swapZILForExactTokens(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        }
        else if (isZilOut) {
          observedTx = await zilswapV2.swapTokensForExactZIL(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        }
        else if (!isZilIn && !isZilOut) {
          observedTx = await zilswapV2.swapTokensForExactTokens(tokenInID, tokenOutID, amountInMax!.toString(), amount.toString(), maxAdditionalSlippage)
        }
        break;
      default:
        throw new Error("Invalid swap")
    }

    handleObservedTx(observedTx!);

    return observedTx!;
  };
}