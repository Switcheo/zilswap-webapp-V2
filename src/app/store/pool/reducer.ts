import { BIG_ZERO } from "app/utils";
import { PoolActionTypes, PoolSelectProps } from "./actions";
import { PoolFormState } from "./types";

const initialState: PoolFormState = {
  forNetwork: null,

  pool: null,

  ampBps: BIG_ZERO,
  token0Amount: BIG_ZERO,
  token1Amount: BIG_ZERO,
}

const reducer = (state: PoolFormState = initialState, action: any) => {
  const { payload } = action;

  switch (action.type) {

    case PoolActionTypes.CLEAR:
      return { ...initialState };

    case PoolActionTypes.SELECT:
      const selectProps: PoolSelectProps = payload;
      return {
        ...state,
        pool: selectProps.pool,
        forNetwork: selectProps.network || null,
      };

    case PoolActionTypes.UPDATE:
      return { ...state, ...payload };

    default:
      return state;
  }
}

export default reducer;
