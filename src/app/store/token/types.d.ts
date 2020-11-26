import { ConnectedWallet } from "core/wallet/wallet";
import { BN } from "@zilliqa-js/util";
import BigNumber from "bignumber.js";
import { Pool } from "zilswap-sdk";

export type TokenBalanceMap = {
  [index: string]: BigNumber;
};

export type TokenInfo = {
  initialized: boolean;
  initBalance: boolean;
  dirty: boolean;
  loading?: boolean;
  isZil: boolean;
  whitelisted: boolean;
  listPriority?: number;
  symbol: string;
  name?: string;
  decimals: number;
  address: string;
  balance?: BigNumber;
  balances?: TokenBalanceMap;
  pool?: Pool;
  allowances?: { [index: string]: string },
};

export interface TokenState {
  initialized: boolean,
  tokens: { [index: string]: TokenInfo },
};

export interface TokenUpdateProps extends Partial<TokenInfo> {
  address: string;
};

export interface TokenInitProps {
  tokens: { [index: string]: TokenInfo };
};
export interface TokenAddProps {
  token: TokenInfo;
};
