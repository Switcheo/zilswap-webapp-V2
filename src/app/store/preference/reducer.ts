import { bnOrZero } from "app/utils";
import { PreferenceActionTypes } from "./actions";
import { PreferenceState, PreferenceStateUpdateProps } from "./types";

const LOCAL_STORAGE_KEY_THEME = "zilswap:theme";
const LOCAL_STORAGE_KEY_SLIPPAGE = "zilswap:slippage";
const LOCAL_STORAGE_KEY_TIMEOUT_BLOCK = "zilswap:timeout-block";
const VALID_THEMES = ["dark", "light"];

const savedThemePreference = localStorage.getItem(LOCAL_STORAGE_KEY_THEME);
const initialTheme = savedThemePreference || "dark";

const savedSlippage = localStorage.getItem(LOCAL_STORAGE_KEY_SLIPPAGE);
const initialSlippage = bnOrZero(savedSlippage ?? "50");

const savedTimeoutBlocks = localStorage.getItem(LOCAL_STORAGE_KEY_TIMEOUT_BLOCK);
const initialTimeoutBlocks = bnOrZero(savedTimeoutBlocks ?? 10);

const initialState: PreferenceState = {
  theme: VALID_THEMES.includes(initialTheme) ? initialTheme : "dark",
  slippage: initialSlippage,
  timeoutBlocks: initialTimeoutBlocks.toNumber(),
};

const checkSavePreference = (updatePayload: PreferenceStateUpdateProps) => {
  const { theme, slippage } = updatePayload;
  if (theme) {
    if (VALID_THEMES.includes(theme))
      localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
  }
  if (slippage) {
    localStorage.setItem(LOCAL_STORAGE_KEY_SLIPPAGE, bnOrZero(slippage).toString(10));
  }
};

const reducer = (state: PreferenceState = initialState, action: any) => {
  switch (action.type) {
    case PreferenceActionTypes.UPDATE:
      checkSavePreference(action.payload);
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  };
}

export default reducer;
