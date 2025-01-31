import { BridgeableTokenMapping, RootState } from "app/store/types";
import { BridgeableChains, useTokenFinder } from "app/utils";
import { useMemo } from "react";
import { useSelector } from "react-redux";

const useBridgeableTokenFinder = () => {
  const bridgeableTokens = useSelector<RootState, BridgeableTokenMapping>(store => store.bridge.tokens);
  const tokenFinder = useTokenFinder();

  const bridgeableTokenFinder = useMemo(() => {
    return (address: string, blockchain: BridgeableChains) => {
      const bridgeableToken = bridgeableTokens.filter(token => token.tokenAddress === address && token.blockchain === blockchain)[0];
      return tokenFinder(bridgeableToken?.tokenAddress, blockchain)
    }
  }, [bridgeableTokens, tokenFinder]);

  return bridgeableTokenFinder;
};

export default useBridgeableTokenFinder;
