import { SimpleMap } from "app/utils";
import BigNumber from "bignumber.js";
import { Pool } from "zilswap-sdk";

export type TokenUSDValues = {
  balance: BigNumber;
  poolLiquidity: BigNumber;
  rewardsPerSecond: BigNumber;
};

export type TokenInfo = {
  initialized: boolean;
  isWzil: boolean;
  isZil: boolean;
  isZwap: boolean;
  isPoolToken: boolean;
  registered: boolean;
  whitelisted: boolean;
  symbol: string;
  name?: string;
  decimals: number;
  address: string;
  hash: string;
  balance?: BigNumber;

  // @deprecated
  pool?: Pool;

  pools: Pool[];
  allowances?: { [index: string]: string };
  blockchain: Blockchain;
};

export interface PoolInfo {
  token0: TokenInfo;
  token1: TokenInfo;
  pool: Pool;
}

export interface TokenState {
  initialized: boolean,
  prices: SimpleMap<BigNumber>,
  tokens: SimpleMap<TokenInfo>,
  values: SimpleMap<TokenUSDValues>,
  userSavedTokens: string[],
};

export interface TokenUpdateProps extends Partial<TokenInfo> {
  address: string;
};

export interface TokenUpdateAllProps {
  [index: string]: TokenUpdateProps;
};

export interface TokenInitProps {
  tokens: { [index: string]: TokenInfo };
};
export interface TokenAddProps {
  token: TokenInfo;
};

export interface UpdatePriceProps {
  [index: string]: BigNumber;
};

export interface UpdateUSDValuesProps {
  [index: string]: TokenUSDValues;
};
