import React from "react";
import { Box, BoxProps } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import cls from "classnames";
import { AppTheme } from "app/theme/types";
import CurrencyLogo from "../CurrencyLogo";
import { TokenInfo } from "app/store/types";

interface Props extends BoxProps {
  pair: [TokenInfo, TokenInfo];
  tokenAddress: string;
  noOverlap?: boolean;
  noBg?: boolean;
}

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    display: "flex",
    flexDirection: "row-reverse",
  },
  poolIcon: {
    borderRadius: '50%',
    backgroundColor: theme.palette.type === "dark" ? "#303637" : "#F7FAFA",
    padding: 4
  },
  baseIcon: {
    marginLeft: -10,
  },
}));
const PoolLogo: React.FC<Props> = (props: Props) => {
  const { children, className, pair, tokenAddress, noOverlap = false, noBg, ...rest } = props;
  const [quote, base] = pair
  const classes = useStyles();

  return (
    <Box {...rest} className={cls(classes.root, className)}>
      <CurrencyLogo className={cls({ [classes.poolIcon]: !noBg, [classes.baseIcon]: !noOverlap })} currency={base.symbol} address={base.address} />
      <CurrencyLogo className={cls({ [classes.poolIcon]: !noBg })} currency={quote.symbol} address={quote.address} />
    </Box>
  );
};

export default PoolLogo;
