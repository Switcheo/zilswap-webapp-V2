import { Box, BoxProps, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CurrencyLogo } from "app/components";
import { AppTheme } from "app/theme/types";
import cls from "classnames";
import React, { useMemo } from "react";
import { Pool, TokenDetails } from "zilswap-sdk";
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';
import { ZilswapConnector } from "core/zilswap/connector";
import { fromBech32Address } from "@zilliqa-js/zilliqa";


export interface SwapDetailProps extends BoxProps {
  path?: [Pool, boolean][] | null | undefined;
  pair: [string, string];
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  textColoured: {
    color: theme.palette.primary.dark
  },
  textWrapper: {
    color: theme.palette.label
  },
  helpInfo: {
    marginBottom: theme.spacing(0.4)
  },
  switchIcon: {
    height: 14,
    width: 14,
    backgroundColor: theme.palette.type === "dark" ? "#2B4648" : "#E4F1F2",
    marginLeft: 8,
    borderRadius: "50%",
    cursor: "pointer",
    transform: "rotate(0)",
    transition: "transform .5s ease-in-out",
    verticalAlign: "middle",
    marginBottom: theme.spacing(0.4),
    "& path": {
      fill: theme.palette.label,
    },
    "&:hover": {
      "& path": {
        fill: theme.palette.primary.dark,
      }
    }
  },
  activeSwitchIcon: {
    transform: "rotate(180deg)",
  },
  routeBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rightArrowIcon: {
    fontSize: 15,
    margin: "0 5px",
  },
  currencyLogo: {
    marginRight: "2px",
  },
}));
const SwapDetail: React.FC<SwapDetailProps> = (props: SwapDetailProps) => {
  const { children, className, path, pair, ...rest } = props;
  const [inToken, outToken] = pair
  const classes = useStyles();

  const route = useMemo(() => {
    if (!path || !pair) {
      return [];
    }

    const tokens: (TokenDetails | undefined)[] = [];
    let middleToken = ""

    path.forEach(([pool]) => {
      const token0 = pool.token0Address;
      const token1 = pool.token1Address;

      if (token0 !== inToken && token0 !== outToken) {
        middleToken = token0
      }
      if (token1 !== inToken && token1 !== outToken) {
        middleToken = token1
      }
    });

    const inTokenDetails = ZilswapConnector.getToken(fromBech32Address(inToken).toLowerCase())
    const outTokenDetails = ZilswapConnector.getToken(fromBech32Address(outToken).toLowerCase())

    if (middleToken === "") {
      tokens.push(inTokenDetails)
      tokens.push(outTokenDetails)
    } else {
      const middleTokenDetails = ZilswapConnector.getToken(fromBech32Address(middleToken).toLowerCase())
      tokens.push(inTokenDetails)
      tokens.push(middleTokenDetails)
      tokens.push(outTokenDetails)
    }

    return tokens;
  }, [pair, path, ZilswapConnector]); // eslint-disable-line

  // const { inAmount, inToken, outAmount, outToken, expectedExchangeRate, expectedSlippage } = useSelector<RootState, SwapFormState>(store => store.swap);
  // const moneyFormat = useMoneyFormatter({ maxFractionDigits: 5, showCurrency: true });
  // const [reversedRate, setReversedRate] = useState(false);

  // const getMinimumValue = () => {
  //   if (outAmount.isEqualTo(0)) return <span className={classes.textWrapper}>-</span>;

  //   return (
  //     <span className={classes.textWrapper}><span className={classes.textColoured}>{moneyFormat(outAmount, { maxFractionDigits: outToken?.decimals })}</span> {outToken?.symbol}</span>
  //   )
  // };

  // const getPriceImpact = () => {
  //   if (!expectedSlippage) return <span className={classes.textWrapper}>-</span>;

  //   return (
  //     <span className={classes.textWrapper}><span className={classes.textColoured}>{moneyFormat((expectedSlippage || 0) * 100)}%</span></span>
  //   )
  // }

  // const getFeeValue = () => {
  //   if (inAmount.isEqualTo(0)) return <span className={classes.textWrapper}>-</span>;

  //   return (
  //     <span className={classes.textWrapper}><span className={classes.textColoured}>≈ {moneyFormat(inAmount.multipliedBy(0.003))} {inToken?.symbol}</span></span>
  //   )
  // };

  // const getExchangeRateValue = () => {
  //   if (!(inToken && outToken)) return <span className={classes.textWrapper}>-</span>;

  //   let exchangeRate = expectedExchangeRate || BIG_ZERO;

  //   let src = inToken, dst = outToken;

  //   if (reversedRate) {
  //     dst = inToken;
  //     src = outToken;
  //   }

  //   // if (exchangeRate.eq(0)) {
  //   //   try {
  //   //     const rateResult = ZilswapConnector.getExchangeRate({
  //   //       amount: BIG_ONE.shiftedBy(src!.decimals),
  //   //       exactOf: reversedRate ? "out" : "in",
  //   //       tokenInID: inToken!.address,
  //   //       tokenOutID: outToken!.address,
  //   //     });
  //   //     if (!rateResult.expectedAmount.isNaN() && !rateResult.expectedAmount.isNegative())
  //   //       exchangeRate = rateResult.expectedAmount.shiftedBy(-dst!.decimals).pow(reversedRate ? -1 : 1);
  //   //   } catch (e) {
  //   //     exchangeRate = BIG_ZERO;
  //   //   }
  //   // }

  //   const shouldReverseRate = reversedRate && !exchangeRate.isZero();


  //   return (
  //     <span className={classes.textWrapper}>1 {src?.symbol || ""} = <span className={classes.textColoured}>{moneyFormat(exchangeRate.pow(shouldReverseRate ? -1 : 1))}</span> {dst?.symbol}</span>
  //   )
  // };

  if (!path?.length) return null;

  return (
    <Box {...rest} className={cls(classes.root, className)}>
      <Box className={classes.routeBox}>
        <Typography variant="body1">Route</Typography>
        <Box display="flex" alignItems="center">
          {
            route.map((token, index) => {
              return (
                <>
                  <CurrencyLogo className={classes.currencyLogo} currency={token?.symbol} address={token?.address}  />
                  <Typography variant="body1">{token?.symbol}</Typography>
                  {index !== route.length - 1 && (
                    <ArrowForwardIosIcon className={classes.rightArrowIcon} />
                  )}
                </>
              )
            })
          }
        </Box>
      </Box>
      {/* <KeyValueDisplay kkey={"Price"} mb="8px">
        {getExchangeRateValue()}
        { " " }
        <SwapHorizontalCircleIcon onClick={() => setReversedRate(!reversedRate)}
          className={cls(classes.switchIcon, {
            [classes.activeSwitchIcon]: reversedRate,
          })} />
      </KeyValueDisplay>              
      <KeyValueDisplay kkey={"Min. Received"} mb="8px">{getMinimumValue()} <HelpInfo className={classes.helpInfo} placement="top" title={<span>Minimum amount you will receive for this swap.<br />Note: Your transaction will be reverted if there is large, unfavorable price movements prior to confirmation.</span>} /></KeyValueDisplay>
      <KeyValueDisplay kkey={"Price Impact"} mb="8px">{getPriceImpact()} <HelpInfo className={classes.helpInfo} placement="top" title="Difference between the market price and estimated price due to amount swapped." /></KeyValueDisplay>
      <KeyValueDisplay kkey={"Estimated Fee"} mb="8px">{getFeeValue()} <HelpInfo className={classes.helpInfo} placement="top" title="Liquidity providers will receive 0.3% of this trade." /></KeyValueDisplay> */}
    </Box>
  );
};

export default SwapDetail;
