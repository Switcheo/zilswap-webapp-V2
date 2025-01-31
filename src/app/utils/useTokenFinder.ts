import { toBech32Address } from "@zilliqa-js/crypto";
import { RootState, TokenInfo } from "app/store/types";
import { useCallback } from "react";
import { useSelector } from "react-redux";
import { Blockchain } from "./constants";
import { SimpleMap } from "./types";
import { evmIncludes } from "./xbridge";

const useTokenFinder = () => {
  const tokens = useSelector<RootState, SimpleMap<TokenInfo>>(store => store.token.tokens);

  const tokenFinder = useCallback((address: string, blockchain: Blockchain = Blockchain.Zilliqa): TokenInfo | undefined => {
    address = address.toLowerCase();

    if (blockchain === Blockchain.Zilliqa && !address.startsWith("zil")) {
      address = toBech32Address(address);
    } else if (evmIncludes(blockchain)) {
      address = `${blockchain}--${address}`;
    }

    return tokens[address];
  }, [tokens]);

  return tokenFinder;
};

export default useTokenFinder;
