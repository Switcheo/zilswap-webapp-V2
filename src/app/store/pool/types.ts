import BigNumber from "bignumber.js";
import { Network, Pool } from "zilswap-sdk";

export interface PoolFormState {
  token0Amount: BigNumber;
  token1Amount: BigNumber;

  pool: Pool | null;

  ampBps: BigNumber;

  forNetwork: Network | null,
}
