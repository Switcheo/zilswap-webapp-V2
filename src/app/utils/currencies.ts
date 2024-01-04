import { TokenInfo } from "app/store/types";
import { TOKEN_NAME_OVERRIDE, TOKEN_SYMBOLS } from "./constants";

export const formatSymbol = (token?: TokenInfo | null) => {
  if ((token?.symbol ?? '').includes(".ZWAPv2LP")) {
    const symbol = (token?.symbol ?? '').replace(".ZWAPv2LP", "")
    return TOKEN_SYMBOLS[symbol] ?? symbol
  }

  return TOKEN_SYMBOLS[token?.symbol ?? ""] ?? token?.symbol
};
export const formatTokenName = (token?: TokenInfo | null) => TOKEN_NAME_OVERRIDE[token?.address ?? ""] ?? token?.name;
