import { PoolInfo, TokenInfo, TokenState } from "app/store/types";
import BigNumber from "bignumber.js";
import { BIG_ZERO } from "./constants";
import { bnOrZero, tryGetBech32Address } from "./strings";

export const valueCalculators = {
  pool: (prices: { [index: string]: BigNumber }, poolInfo?: PoolInfo, poolToken?: TokenInfo) => {
    if (!poolInfo || !poolToken) return BIG_ZERO;
    const { token0, token1 } = poolInfo;

    const token0Price = prices[token0.address] ?? BIG_ZERO;
    const token1Price = prices[token1.address] ?? BIG_ZERO;

    const totalToken0Value = poolInfo.pool.token0Reserve.shiftedBy(-token0.decimals).times(token0Price) ?? BIG_ZERO;
    const totalToken1Value = poolInfo.pool.token1Reserve.shiftedBy(-token1.decimals).times(token1Price) ?? BIG_ZERO;

    const share = bnOrZero(poolToken.balance).div(poolInfo.pool.totalSupply);

    return share.times(totalToken0Value.plus(totalToken1Value));
  },

  amount: (prices: { [index: string]: BigNumber }, token: TokenInfo, amount: BigNumber) => {
    if (!token) return BIG_ZERO;
    const tokenPrice = prices[token.address] ?? BIG_ZERO;
    const tokenValue = amount.shiftedBy(-token.decimals).times(tokenPrice) ?? BIG_ZERO;
    return tokenValue;
  },

  usd: (tokenState: TokenState, bech32Address: string, rawAmount: string) => {
    const token = tokenState.tokens[tryGetBech32Address(bech32Address) ?? ""]
    if (!token) return BIG_ZERO
    return valueCalculators.amount(tokenState.prices, token, new BigNumber(rawAmount))
  }
};

const useValueCalculators = () => {
  return valueCalculators;
};

export default useValueCalculators;
