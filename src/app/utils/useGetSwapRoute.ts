import { RootState, TokenInfo, TokenState } from "app/store/types";
import { ZilswapConnector } from "core/zilswap/connector";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Pool } from "zilswap-sdk";

const useGetSwapRoute = (
  pair: [string, string] | undefined,
  path?: [Pool, boolean][] | null | undefined,
) => {
  const tokenState = useSelector<RootState, TokenState>(state => state.token);

  return useMemo(() => {
    if (!path || !pair) {
      return [];
    }

    const [inToken] = pair

    const routeTokens: (TokenInfo | undefined)[] = []
    const inTokenDetails = tokenState.tokens[inToken]

    routeTokens.push(inTokenDetails)

    path.forEach(([pool]) => {
      const lastIndex = routeTokens.length - 1
      const prev = routeTokens[lastIndex]

      const tokenA = pool.token0Address
      const tokenB = pool.token1Address

      if (tokenA !== prev?.address) {
        const tokenADetails = tokenState.tokens[tokenA]
        routeTokens.push(tokenADetails)
      }
      if (tokenB !== prev?.address) {
        const tokenBDetails = tokenState.tokens[tokenB]
        routeTokens.push(tokenBDetails)
      }
    });

    return routeTokens;
  }, [pair, path, ZilswapConnector, tokenState.tokens]); // eslint-disable-line
};

export default useGetSwapRoute;
