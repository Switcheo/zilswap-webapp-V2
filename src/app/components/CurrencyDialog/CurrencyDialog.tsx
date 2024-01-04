import { Box, CircularProgress, DialogContent, DialogProps, IconButton, InputAdornment, makeStyles, OutlinedInput } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/CloseOutlined";
import { DialogModal } from "app/components";
import { actions } from "app/store";
import { RootState, TokenInfo, TokenState, WalletState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { hexToRGBA, useTaskSubscriber, useAsyncTask } from "app/utils";
import { HIDE_SWAP_TOKEN_OVERRIDE, LoadingKeys } from "app/utils/constants";
import BigNumber from "bignumber.js";
import { Blockchain } from "carbon-js-sdk";
import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CurrencyList } from "./components";
import { ZilliqaValidate, ZilswapConnector } from "core/zilswap"
import { ZilDataValue } from "core/utilities/viewblock";
import { zilParamsToMap } from "core/utilities";
import { add } from "app/store/token/actions";


export type CurrencyListType = "zil" | "ark-zil" | "bridge-zil" | "bridge-eth";

export interface CurrencyDialogProps extends DialogProps {
  onSelectCurrency: (token: TokenInfo) => void;
  poolOnly?: boolean,
  noPool?: boolean,
  wrapZil?: boolean,
  token?: TokenInfo | null;
  allowNewToken?: boolean;
  tokensWithPoolsOnly?: boolean;
  tokenList: CurrencyListType;
};

const CurrencyDialog: React.FC<CurrencyDialogProps> = (props: CurrencyDialogProps) => {
  const { className, onSelectCurrency, poolOnly = false, noPool = false, tokenList, open, token, onClose, wrapZil, allowNewToken, tokensWithPoolsOnly } = props;
  const classes = useStyles();
  const [search, setSearch] = useState("");
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [error, setError] = useState<Error | undefined>();
  const [loadingConnectWallet] = useTaskSubscriber(...LoadingKeys.connectWallet);
  const dispatch = useDispatch();

  const tokenState = useSelector<RootState, TokenState>(state => state.token);
  const walletState = useSelector<RootState, WalletState>(state => state.wallet);

  const [runFetchContract, loading] = useAsyncTask("fetchTokenContract", (e) => { setError(e) });

  useEffect(() => {
    if (!tokenState.tokens) return setTokens([]);
    const sortFn = (lhs: TokenInfo, rhs: TokenInfo) => {
      if (!walletState.wallet) return 0;
      if (lhs.isZil) return -1;
      if (rhs.isZil) return 1;
      const difference = new BigNumber(rhs.balance?.toString() || 0).comparedTo(lhs.balance?.toString() || 0);
      return difference !== 0 ? difference : lhs.symbol.localeCompare(rhs.symbol);
    };
    let tokens = Object.values(tokenState.tokens);

    if (tokensWithPoolsOnly) {
      tokens = tokens.filter((tkn) => tkn.pools.length > 0)
    }
    if (tokenList === 'zil') {
      tokens = tokens.filter(t => t.blockchain === Blockchain.Zilliqa)
    }

    setTokens(tokens.sort(sortFn));

    if (wrapZil) {
      tokens = tokens.filter(t => t.isZil || t.isWzil);
      setTokens(tokens);
    }

    if (token && !tokens.find(t => t.address === token.address) && tokens.length > 0)
      onSelectCurrency(tokens[0]);
  }, [tokenState.tokens, walletState.wallet, tokenList, wrapZil, token, onSelectCurrency, tokensWithPoolsOnly]);

  const onToggleUserToken = (token: TokenInfo) => {
    if (!tokenState.userSavedTokens.includes(token.address)) setSearch("");
    dispatch(actions.Token.updateUserSavedTokens(token.address))
  };

  const fetchNewToken = (address: string) => {
    runFetchContract(async () => {
      const contract = await ZilswapConnector.getContract(address)
      const init: ZilDataValue[] = await contract?.getInit()
      const initMap = zilParamsToMap(init)
      const newToken: TokenInfo = {
        initialized: false,
        isWzil: false,
        isZil: false,
        isZwap: false,
        isPoolToken: false,
        registered: true,
        whitelisted: false,
        symbol: initMap.symbol ?? "",
        name: initMap.name,
        decimals: parseInt(initMap.decimals ?? 12),
        address: address.toLowerCase(),
        hash: initMap._this_address,
        pools: [],
        blockchain: Blockchain.Zilliqa,
      }

      if (!tokenState.tokens[address]) {
        dispatch(add({ token: newToken }))
        setTimeout(() => { dispatch(actions.Token.refetchState()) })
      }
    })
  }

  const filteredTokens = useMemo(() => {
    const filterSearch = (token: TokenInfo): boolean => {
      const searchTerm = search.toLowerCase().trim();
      if (!token.isPoolToken && poolOnly === true) return false;
      if (token.isPoolToken && noPool === true) return false;
      if (searchTerm === "" && !tokenState.userSavedTokens.includes(token.address) && !token.registered) return false;
      if (HIDE_SWAP_TOKEN_OVERRIDE.includes(token.address)) return false;

      if (!token.registered && !tokenState.userSavedTokens.includes(token.address)) {
        return token.address.toLowerCase() === searchTerm;
      }

      return token.address.toLowerCase() === searchTerm ||
        (typeof token.name === "string" && token.name?.toLowerCase().includes(searchTerm)) ||
        token.symbol.toLowerCase().includes(searchTerm);
    };

    return tokens.filter(filterSearch);
  }, [tokens, search, poolOnly, noPool, tokenState.userSavedTokens]);

  useEffect(() => {
    if (allowNewToken) {
      const searchTerm = search.toLowerCase().trim();
      const isValidZilAddress = ZilliqaValidate.isAddress(searchTerm) || ZilliqaValidate.isBech32(searchTerm)
      if (filteredTokens.length === 0 && isValidZilAddress && !error && !loading && !tokenState.tokens[searchTerm]) {
        fetchNewToken(searchTerm)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTokens, loading, tokenState.tokens, error, allowNewToken])

  const handleOnChangeInput = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setSearch(e.target.value)
    if (error) {
      setError(undefined)
    }
  }

  return (
    <DialogModal header="Select Token" open={open} onClose={onClose} className={clsx(classes.root, className)}>
      <DialogContent className={classes.dialogContent}>
        {!loadingConnectWallet && (
          <OutlinedInput
            placeholder="Search name or enter address"
            value={search}
            fullWidth
            classes={{ input: classes.inputText }}
            className={classes.input}
            onChange={handleOnChangeInput}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <CloseIcon className={classes.closeIcon} />
                </IconButton>
              </InputAdornment>
            }
          />
        )}
        {(loadingConnectWallet || !tokenState.initialized) && (
          <Box display="flex" justifyContent="center">
            <CircularProgress color="primary" />
          </Box>
        )}

        <Box className={classes.currenciesContainer}>
          <CurrencyList
            tokens={filteredTokens}
            search={search}
            emptyStateLabel="No token found."
            userTokens={tokenState.userSavedTokens}
            onToggleUserToken={onToggleUserToken}
            onSelectCurrency={onSelectCurrency}
            className={clsx(classes.currencies)}
            loading={loading} />
        </Box>
      </DialogContent>
    </DialogModal>
  )
}

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    width: "100%",
    maxWidth: 650,
    [theme.breakpoints.down("sm")]: {
      maxWidth: 520,
    },
    [theme.breakpoints.down("xs")]: {
      maxWidth: '100%',
      padding: '16px',
    },
    "& .MuiPaper-root": {
      width: "100%",
    },
    "& .MuiDialogTitle-root": {
      backgroundColor: theme.palette.type === "dark" ? "#12222C" : "#F6FFFC"
    },
  },
  input: {
    backgroundColor: theme.palette.type === "dark" ? "#0D1B24" : "#D4FFF2",
    marginBottom: 20,
    borderColor: theme.palette.type === "dark" ? "#29475A" : "#D4FFF2",
    '&.Mui-focused': {
      borderColor: theme.palette.primary.dark,
      caretColor: theme.palette.primary.dark,
    },
  },
  inputText: {
    fontSize: '16px!important',
    [theme.breakpoints.down("xs")]: {
      fontSize: "16px!important"
    },
    padding: "18.5px 14px!important",
  },
  currenciesContainer: {
    maxHeight: 460,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    '&::-webkit-scrollbar': {
      width: '0.4rem'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: `rgba${hexToRGBA(theme.palette.text!.primary!, 0.1)}`,
      borderRadius: 12
    }
  },
  currenciesHeader: {
    justifyContent: "left",
    borderRadius: 0,
    margin: theme.spacing(1, 0, .5),
  },
  currencies: {
    maxHeight: "1000000px",
  },
  currenciesHidden: {
    maxHeight: "0px",
    overflow: "hidden",
  },
  dialogContent: {
    backgroundColor: theme.palette.type === "dark" ? "#12222C" : "#F6FFFC",
    borderBottom: theme.palette.border,
    borderLeft: theme.palette.border,
    borderRight: theme.palette.border,
    borderRadius: "0 0 12px 12px",
    paddingTop: '24px',
    [theme.breakpoints.down("sm")]: {
      paddingTop: '0px',
    },
  },
  closeIcon: {
    color: theme.palette.primary.main,
  },
}));

export default CurrencyDialog;
