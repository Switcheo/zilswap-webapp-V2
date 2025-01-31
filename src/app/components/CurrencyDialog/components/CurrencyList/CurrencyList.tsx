import { Box, BoxProps, ButtonBase, CircularProgress, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ContrastBox from "app/components/ContrastBox";
import CurrencyLogo from "app/components/CurrencyLogo";
import { RootState, TokenInfo, TokenState, WalletState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { useMoneyFormatter } from "app/utils";
import { BIG_ZERO } from "app/utils/constants";
import { formatSymbol, formatTokenName } from "app/utils/currencies";
import BigNumber from "bignumber.js";
import cls from "classnames";
import { ZilswapConnector, fromBech32Address } from "core/zilswap";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Pool } from "zilswap-sdk";

type CurrencyListProps = BoxProps & {
  tokens: TokenInfo[];
  search: string;
  showContribution?: boolean;
  emptyStateLabel?: string;
  onSelectCurrency: (token: TokenInfo) => void;
  onToggleUserToken: (token: TokenInfo) => void;
  userTokens: string[];
  loading?: boolean;
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  buttonBase: {
    width: "100%",
    marginTop: "2px",
    textAlign: "left",
  },
  currencyBox: {
    padding: "8px 12px 10px 12px",
    marginTop: "0px !important",
    display: "flex",
    alignItems: "center",
    width: "100%",
    backgroundColor: "transparent",
    "&:hover": {
      backgroundColor: theme.palette.currencyInput
    }
  },
  currencyLogo: {
    marginRight: 10
  },
  subtleText: {
    fontStyle: "italic",
    opacity: .5,
  },
  addRemoveFont: {
    fontSize: "10px",
    textDecoration: "underline",
  },
  tokenName: {
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
    maxWidth: 185,
  },
}));

const CurrencyList: React.FC<CurrencyListProps> = (props) => {
  const { children, className, onSelectCurrency, onToggleUserToken, userTokens, emptyStateLabel, showContribution, search, tokens, loading, ...rest } = props;
  const classes = useStyles();
  const [pools, setPools] = useState<{ [index: string]: Pool }>({})
  const tokenState = useSelector<RootState, TokenState>(state => state.token);
  const walletState = useSelector<RootState, WalletState>(state => state.wallet);
  const moneyFormat = useMoneyFormatter({ maxFractionDigits: 12 });

  useEffect(() => {
    const pools = ZilswapConnector.getPools()
    setPools(pools)
  }, [])

  const getTokenBalance = (token: TokenInfo): BigNumber => {
    if (!walletState.wallet) return BIG_ZERO;
    // if (showContribution) {
    //   const contribution = token.pool?.userContribution ?? BIG_ZERO;
    //   return contribution as BigNumber;
    // } else {
    const amount = token.balance;
    if (!amount) return BIG_ZERO;

    return new BigNumber(amount.toString());
    // }
  };
  // const getContributionPercentage = (token: TokenInfo) => {
  //   if (!walletState.wallet) return BIG_ZERO;
  //   return (token.pool?.contributionPercentage ?? BIG_ZERO) as BigNumber;
  // };

  const onSelect = (token: TokenInfo) => {
    onSelectCurrency(token)
  };

  const onAddRemove = (e: React.MouseEvent, token: TokenInfo) => {
    e.stopPropagation();

    onToggleUserToken(token);
  }

  const getLogoAddress = (token: TokenInfo) => {
    return token.logoAddress ?? token.address;
  }

  return (
    <Box {...rest} className={cls(classes.root, className)}>
      {loading && (
        <Box display="flex" justifyContent="center">
          <CircularProgress color="primary" />
        </Box>
      )}
      {!loading && !!tokenState.initialized && search.length > 0 && !tokens.length && (
        <Typography color="error">
          {emptyStateLabel || `No token found for "${search}"`}
        </Typography>
      )}
      {!loading && tokens.map((token, index) => {
        const pool = !token.bridgeFrom && pools[fromBech32Address(token.address).toLowerCase()]
        return (<ButtonBase
          className={classes.buttonBase}
          key={index}
          focusRipple
          onClick={() => onSelect(token)}>
          <ContrastBox className={classes.currencyBox}>
            <CurrencyLogo className={classes.currencyLogo} currency={token.registered && token.symbol} address={getLogoAddress(token)} />
            <Box display="flex" flexDirection="column">
              <Typography variant="h3">{formatSymbol(token)}</Typography>

              <Box display="flex" flexDirection="row">
                {!!token.name && (
                  <Typography className={classes.tokenName} color="textSecondary" variant="body2">
                    {formatTokenName(token)}
                  </Typography>
                )}
                {!token.registered && (
                  <Typography className={classes.addRemoveFont} onClick={(e) => onAddRemove(e, token)}>
                    {userTokens.includes(token.address) ? "Remove" : "Add"}
                  </Typography>
                )}
              </Box>
              {(token.isPoolToken && pool) && (<Box display="flex" flexDirection="row">
                <Typography className={classes.tokenName} color="textSecondary" variant="body2">Amplification: {pool.ampBps.shiftedBy(-4).toFormat()}x</Typography>
              </Box>)}
            </Box>
            <Box flex={1}>
              {!!walletState.wallet && (
                <Typography align="right" variant="h6" component="div">
                  {moneyFormat(getTokenBalance(token), {
                    symbol: formatSymbol(token),
                    maxFractionDigits: showContribution ? 5 : token.decimals,
                    compression: token.decimals,
                    showCurrency: true,
                  })}
                </Typography>
              )}
            </Box>
          </ContrastBox>
        </ButtonBase>)
      })}
    </Box>
  );
};

export default CurrencyList;
