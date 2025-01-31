import { combineReducers } from "redux";

import blockchain from "./blockchain/reducer";
import bridge from "./bridge/reducer";
import layout from "./layout/reducer";
import pool from "./pool/reducer";
import preference from "./preference/reducer";
import rewards from "./rewards/reducer";
import stats from "./stats/reducer";
import swap from "./swap/reducer";
import token from "./token/reducer";
import transaction from "./transaction/reducer";
import wallet from "./wallet/reducer";

export default combineReducers({
  preference, bridge, wallet, layout, stats, swap, token, pool, rewards, transaction, blockchain
});
