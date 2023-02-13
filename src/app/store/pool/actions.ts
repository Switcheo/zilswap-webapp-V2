import { Network, Pool } from "zilswap-sdk";
import { PoolFormState } from "./types";

export enum PoolActionTypes {
  CLEAR = "POOL_CLEAR",
  SELECT = "POOL_SELECT",
  UPDATE = "POOL_UPDATE",
}

export function clear() {
  return {
    type: PoolActionTypes.CLEAR,
  }
}

export interface PoolSelectProps {
  pool: Pool | null;
  network: Network | undefined;
};

export function select(payload: PoolSelectProps) {
  return {
    type: PoolActionTypes.SELECT,
    payload
  }
}

export function update(payload: Partial<PoolFormState>) {
  return {
    type: PoolActionTypes.UPDATE,
    payload
  }
}
