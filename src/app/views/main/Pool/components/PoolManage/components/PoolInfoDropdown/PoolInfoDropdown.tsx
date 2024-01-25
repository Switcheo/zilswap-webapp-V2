import { Box, BoxProps, Button, Collapse, Divider } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { ArrowDropDownRounded, ArrowDropUpRounded } from "@material-ui/icons";
import { AmountLabel, ContrastBox, KeyValueDisplay, PoolLogo, Text } from "app/components";
import { actions } from "app/store";
import { RootState, TokenInfo, TokenState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { bnOrZero, useNetwork } from "app/utils";
import { BIG_ZERO } from "app/utils/constants";
import cls from "classnames";
import { ZilswapConnector } from "core/zilswap";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

interface Props extends BoxProps {
  token: TokenInfo;
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  buttonWrapper: {
    borderRadius: "12px",
    padding: theme.spacing(1),
  },
  divider: {
    backgroundColor: "rgba(20,155,163,0.3)",
    margin: theme.spacing(1, 0),
  },
  textGreen: {
    marginTop: theme.spacing(0.2),
    color: theme.palette.primary.dark
  },
  arrowIcon: {
    color: theme.palette.label
  }
}));

const PoolInfoDropdown: React.FC<Props> = (props: Props) => {
  const { children, className, token, ...rest } = props;
  const dispatch = useDispatch();
  const classes = useStyles();
  const network = useNetwork();
  const tokenState = useSelector<RootState, TokenState>((state) => state.token);
  const [active, setActive] = useState<boolean>(false);

  const onToggleDropdown = () => {
    setActive(!active);
  };

  const { pool, token0, token1 } = useMemo(() => {
    const pool = ZilswapConnector.getPoolByAddress(token.address);
    const token0 = tokenState.tokens[pool?.token0Address ?? ""];
    const token1 = tokenState.tokens[pool?.token1Address ?? ""];

    return { pool, token0, token1 };
  }, [token.address, tokenState.tokens]);

  const poolShare = bnOrZero(token.balance).div(bnOrZero(pool?.totalSupply));
  const poolShareLabel = poolShare.shiftedBy(2).decimalPlaces(3).toString(10) ?? "";
  const token0Amount = poolShare.times(pool?.token0Reserve ?? BIG_ZERO);
  const token1Amount = poolShare.times(pool?.token1Reserve ?? BIG_ZERO);

  const onGotoAdd = () => {
    dispatch(actions.Pool.select({ pool, network }));
    dispatch(actions.Layout.showPoolType("add"));
  };

  const onGotoRemove = () => {
    dispatch(actions.Pool.select({ pool, network }));
    dispatch(actions.Layout.showPoolType("remove"));
  };

  return (
    <Box {...rest} className={cls(classes.root, className)}>
      <Button variant="text" fullWidth className={classes.buttonWrapper} onClick={onToggleDropdown} disableRipple>
        <Box flex={1} display="flex" alignItems="center">
          <PoolLogo pair={[token0, token1]} tokenAddress={token.address} />
          <Text marginLeft={1}>{token0.symbol} - {token1.symbol}</Text>
          <Box flex={1} />
          {active && <ArrowDropUpRounded className={classes.arrowIcon} />}
          {!active && <ArrowDropDownRounded className={classes.arrowIcon} />}
        </Box>
      </Button>
      <Collapse in={active}>
        <ContrastBox>
          <KeyValueDisplay marginBottom={1.5} kkey={`Your Pool Share (${poolShareLabel}%)`} ValueComponent="span">
            <AmountLabel
              iconStyle="small"
              justifyContent="flex-end"
              marginBottom={1}
              marginTop={-0.5}
              currency={token0.symbol}
              address={token0.address}
              amount={token0Amount}
              compression={token0.decimals} />
            <AmountLabel
              iconStyle="small"
              justifyContent="flex-end"
              currency={token1.symbol}
              address={token1.address}
              amount={token1Amount}
              compression={token1.decimals} />
          </KeyValueDisplay>
          <KeyValueDisplay marginBottom={1.5} kkey="Amplification" ValueComponent="span">
            <Text>
              {pool?.ampBps.shiftedBy(-4).toFormat()}x
            </Text>
          </KeyValueDisplay>

          <Box display="flex" marginTop={3}>
            <Button
              className={classes.buttonWrapper}
              onClick={onGotoAdd}
              variant="contained"
              color="primary"
              fullWidth>
              Add
            </Button>
            <Box margin={1} />
            <Button
              className={classes.buttonWrapper}
              onClick={onGotoRemove}
              component={Link}
              to="/pool"
              variant="contained"
              color="primary"
              fullWidth>
              Remove
            </Button>
          </Box>
        </ContrastBox>
      </Collapse>
      <Divider className={classes.divider} />
    </Box>
  );
};

export default PoolInfoDropdown;
