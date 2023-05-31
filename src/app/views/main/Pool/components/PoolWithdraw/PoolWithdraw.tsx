
import { Box, Button, Divider, IconButton, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { ArrowBack } from "@material-ui/icons";
import BrightnessLowIcon from '@material-ui/icons/BrightnessLowRounded';
import ViewHeadlineIcon from '@material-ui/icons/ViewHeadline';
import { ContrastBox, CurrencyInput, CurrencyLogo, FancyButton, KeyValueDisplay, ProportionSelect, Text } from "app/components";
import { actions } from "app/store";
import { LayoutState, PoolFormState, PoolInfo, RootState, TokenInfo, TokenState, WalletObservedTx, WalletState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { bnOrZero, hexToRGBA, useAsyncTask, useMoneyFormatter, useNetwork, useToaster } from "app/utils";
import { BIG_ONE, BIG_ZERO } from "app/utils/constants";
import { MoneyFormatterOptions } from "app/utils/useMoneyFormatter";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { fromBech32Address, ZilswapConnector } from "core/zilswap";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ZILSWAPV2_CONTRACTS } from "zilswap-sdk/lib/constants";

const initialFormState = {
  exactIn: false,

  poolAddress: "",

  tokenInput: "0",
  tokenAmount: BIG_ZERO,
};

const PoolWithdraw: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props;
  const classes = useStyles();
  const dispatch = useDispatch();
  const [formState, setFormState] = useState<typeof initialFormState>(initialFormState);
  const [currencyDialogOverride, setCurrencyDialogOverride] = useState<boolean>(false);
  const [runRemoveLiquidity, loading, removeError, clearPoolError] = useAsyncTask("poolRemoveLiquidity");
  const [runApproveTx, loadingApproveTx, errorApproveTx, clearApproveError] = useAsyncTask("approveTx");
  const network = useNetwork();
  const poolFormState = useSelector<RootState, PoolFormState>(state => state.pool);
  const walletState = useSelector<RootState, WalletState>(state => state.wallet);
  const slippage = useSelector<RootState, BigNumber>(state => state.preference.slippage);
  const timeoutBlocks = useSelector<RootState, number>(state => state.preference.timeoutBlocks);
  const layoutState = useSelector<RootState, LayoutState>(state => state.layout);
  const formatMoney = useMoneyFormatter({ showCurrency: true, maxFractionDigits: 6 });
  const tokenState = useSelector<RootState, TokenState>(state => state.token);

  const toaster = useToaster();

  const byte20ContractAddress = fromBech32Address(ZILSWAPV2_CONTRACTS[network]).toLowerCase();

  useEffect(() => {
    const pool = poolFormState.pool;
    if (pool && !formState.poolAddress) {
      setFormState(state => ({
        ...state,
        poolAddress: pool.poolAddress,
      }))
    }
  }, [poolFormState.pool, formState.poolAddress])

  const findPool = useCallback((poolAddress) => {

    let poolInfo: PoolInfo | null = null;
    if (poolAddress) {
      const pool = ZilswapConnector.getPoolByAddress(poolAddress);
      if (pool) {
        const token0 = tokenState.tokens[pool.token0Address];
        const token1 = tokenState.tokens[pool.token1Address];

        poolInfo = {
          pool,
          token0, token1,
        };
      } else { }
    }

    const token0 = poolInfo?.token0;
    const token1 = poolInfo?.token1;

    return { token0, token1, poolInfo };
  }, [tokenState])

  const {
    poolToken,
    token0, token1,
    poolInfo, maxAmount,
  } = useMemo(() => {
    const { token0, token1, poolInfo } = findPool(formState.poolAddress);
    const poolToken = tokenState.tokens[poolInfo?.pool.poolAddress ?? ""];

    const maxAmount = bnOrZero(poolToken?.balance).dp(0)

    return { poolToken, token0, token1, poolInfo, maxAmount };
  }, [findPool, formState.poolAddress, tokenState.tokens]);

  const {
    token0Amount, token1Amount,
  } = useMemo(() => {
    let [token0Amount, token1Amount] = [BIG_ZERO, BIG_ZERO];
    if (!poolInfo?.pool.totalSupply.gt(0)) return { token0Amount, token1Amount };
    const removeShare = BigNumber.min(formState.tokenAmount.div(poolInfo.pool.totalSupply), 1);
    token0Amount = removeShare.times(poolInfo.pool.token0Reserve);
    token1Amount = removeShare.times(poolInfo.pool.token1Reserve);
    return { token0Amount, token1Amount }
  }, [poolInfo?.pool, formState.tokenAmount]);

  const approveRequired: boolean = useMemo(() => {
    if (!walletState.wallet) return false;
    const tokenAllowance = bnOrZero(poolToken?.allowances?.[byte20ContractAddress]);
    return tokenAllowance.lt(formState.tokenAmount);
  }, [byte20ContractAddress, walletState.wallet, poolToken, formState.tokenAmount]);

  const formatPoolOpts: MoneyFormatterOptions = {
    symbol: poolToken?.symbol,
    compression: poolToken?.decimals,
  }
  const format0Opts: MoneyFormatterOptions = {
    symbol: token0?.symbol,
    compression: token0?.decimals,
  };
  const format1Opts: MoneyFormatterOptions = {
    symbol: token1?.symbol,
    compression: token1?.decimals,
  };

  useEffect(() => {
    if (poolToken && currencyDialogOverride) {
      setCurrencyDialogOverride(false);
    }
  }, [poolToken, currencyDialogOverride]);

  useEffect(() => {
    if (!poolFormState.forNetwork) return

    // clear form if network changed
    if (poolFormState.forNetwork !== network) {
      setFormState({ ...initialFormState })
      dispatch(actions.Pool.clear());
    }

    // eslint-disable-next-line
  }, [network]);

  const onPercentage = (percentage: number) => {
    const amount = bnOrZero(poolToken?.balance).times(percentage).dp(0);
    setFormState(state => ({
      ...state,
      tokenAmount: amount,
      tokenInput: amount.shiftedBy(-(poolToken.decimals ?? 0)).toString(10),
    }))
  };

  const onAmountChange = (inputAmount: string = "0") => {
    const tokenAmount = bnOrZero(inputAmount).shiftedBy(poolToken?.decimals ?? 0).dp(0);
    setFormState(state => ({
      ...state,
      tokenAmount,
      tokenInput: inputAmount,
    }))
  };

  const onCurrencyChange = (token: TokenInfo) => {
    setFormState(state => ({
      ...initialFormState,
      poolAddress: token.address,
    }))
  }

  const onApproveTx = () => {
    if (loading || loadingApproveTx) return;

    clearApproveError();
    clearPoolError();

    runApproveTx(async () => {
      if (!approveRequired || !poolToken) return;

      const approveAmount = formState.tokenAmount.minus(bnOrZero(poolToken.allowances?.[byte20ContractAddress]));

      const observedTx = await ZilswapConnector.approveTokenTransfer({
        tokenAmount: approveAmount,
        tokenID: poolToken.address,
        spenderAddress: byte20ContractAddress,
        network,
      });
      const walletObservedTx: WalletObservedTx = {
        ...observedTx!,
        address: walletState.wallet?.addressInfo.bech32 || "",
        network,
      };

      if (!observedTx)
        throw new Error("Allowance already sufficient for specified amount");
      dispatch(actions.Transaction.observe({ observedTx: walletObservedTx }));
      toaster("Submitted", { hash: walletObservedTx.hash });
    });
  };

  const onRemoveLiquidity = () => {
    if (formState.tokenAmount.isZero()) return;
    if (!poolInfo?.pool || !poolToken) return;
    if (loading) return;

    clearApproveError();
    clearPoolError();

    runRemoveLiquidity(async () => {
      const { tokenAmount } = formState;

      const tokenBalance = bnOrZero(poolToken.balance);

      if (tokenAmount.gt(tokenBalance)) {
        throw new Error(`Insufficient ${poolToken.symbol} balance.`)
      }

      ZilswapConnector.setDeadlineBlocks(timeoutBlocks);

      const slippageFactor = BIG_ONE.minus(slippage.shiftedBy(-4));
      const observedTx = await ZilswapConnector.removeLiquidity({
        pool: poolInfo.pool,
        liquidity: tokenAmount,
        amount0Min: token0Amount.times(slippageFactor).dp(0),
        amount1Min: token1Amount.times(slippageFactor).dp(0),
      });
      const walletObservedTx: WalletObservedTx = {
        ...observedTx,
        address: walletState.wallet?.addressInfo.bech32 || "",
        network,
      };

      // const pool = existingPool.pool;
      // const updatedPool = ZilswapConnector.getPool(pool.tokenAAddress, pool.tokenBAddress, pool.ampBps);
      // dispatch(actions.Token.update({
      //   address: tokenAddress,
      //   pool: updatedPool,
      // }));
      dispatch(actions.Transaction.observe({ observedTx: walletObservedTx }));
      toaster("Submitted", { hash: walletObservedTx.hash });
    });
  };

  const onBack = () => {
    dispatch(actions.Layout.showPoolType("manage"));
  };

  const onDoneEditing = () => {
    const decimals = poolToken?.decimals ?? 0;
    setFormState(state => {
      const amount = BigNumber.min(state.tokenAmount, maxAmount);
      return {
        ...state,
        tokenAmount: amount,
        tokenInput: amount.shiftedBy(-decimals).toString(10),
      }
    });
  };

  const toggleAdvancedSetting = () => {
    dispatch(actions.Layout.showAdvancedSetting(!layoutState.showAdvancedSetting));
  }

  const error = errorApproveTx ?? removeError;

  return (
    <Box display="flex" flexDirection="column"  {...rest} className={clsx(classes.root, className)}>
      <Box className={classes.container}>
        <Box display="flex" justifyContent="space-between" alignItems="center" marginY={4}>
          <Button variant="text" onClick={onBack} className={classes.backButton}>
            <ArrowBack />
            <Text variant="h4" marginLeft={1}>Remove Liquidity</Text>
          </Button>

          <IconButton onClick={() => toggleAdvancedSetting()} className={classes.iconButton}>
            <BrightnessLowIcon />
          </IconButton>
        </Box>

        <CurrencyInput
          showCurrencyDialog={currencyDialogOverride}
          onCloseDialog={() => setCurrencyDialogOverride(false)}
          label="Withdraw Token"
          token={poolToken}
          amount={formState.tokenInput}
          disabled={!poolToken}
          onEditorBlur={onDoneEditing}
          onAmountChange={onAmountChange}
          onCurrencyChange={onCurrencyChange}
          dialogOpts={{
            poolOnly: true,
          }} />

        <Box display="flex" justifyContent="flex-end">
          <ProportionSelect
            color="primary"
            size="small"
            className={classes.proportionSelect}
            onSelectProp={onPercentage} />
        </Box>

        <Text align="center" marginTop={1} className={classes.header}>You Receive</Text>

        <Box marginTop={1.5} display="flex" bgcolor="background.contrast" padding={0.5} borderRadius={12} position="relative">
          <Box className={classes.box} display="flex" flexDirection="column" alignItems="start" flex={1} borderRadius={12}>
            <Box py={"4px"} px={"16px"}>
              <Box display="flex" alignItems="flex-end" mt={1} mb={1}>
                <CurrencyLogo currency={token0?.symbol} address={token0?.address} />
                <Typography className={classes.token}>{token0?.symbol}</Typography>

              </Box>
              <Typography className={classes.previewAmount}>
                {formatMoney(token0Amount, format0Opts)}
              </Typography>
            </Box>
          </Box>
          <ViewHeadlineIcon className={classes.viewIcon} />
          <Box className={classes.box} display="flex" flexDirection="column" alignItems="start" flex={1} borderRadius={12}>
            <Box py={"4px"} px={"16px"}>
              <Box display="flex" alignItems="flex-end" mt={1} mb={1}>
                <CurrencyLogo currency={token1?.symbol} address={token1?.address} />
                <Typography className={classes.token}>{token1?.symbol}</Typography>
              </Box>
              <Typography className={classes.previewAmount}>
                ≈ {formatMoney(token1Amount, format1Opts)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Typography className={classes.errorMessage} color="error">{error?.message}</Typography>

        <FancyButton walletRequired
          loading={loading}
          showTxApprove={approveRequired}
          loadingTxApprove={loadingApproveTx}
          onClickTxApprove={onApproveTx}
          className={classes.actionButton}
          variant="contained"
          color="primary"
          onClick={onRemoveLiquidity}>
          Remove Liquidity
        </FancyButton>
        {/* <PoolDetail className={classes.poolDetails} token={poolToken || undefined} /> */}
      </Box>

      {!!layoutState.showAdvancedSetting && !!poolToken && (
        <>
          <ContrastBox className={classes.showAdvanced}>
            {/* <Typography className={classes.text} variant="body2">
              You are removing{" "}
              <strong>{formatMoney(poolFormState.removeZilAmount, zilFormatOpts)} + {formatMoney(poolFormState.removeTokenAmount, formatOpts)}</strong>
            from the liquidity pool.{" "}
              <strong>(~{formatMoney(poolFormState.removeTokenAmount, { ...formatOpts, showCurrency: true })} Pool Token)</strong>
            </Typography> */}

            <Divider className={classes.divider} />

            <KeyValueDisplay mt={"22px"} kkey={"Current Total Supply"}>
              {formatMoney(poolInfo?.pool.totalSupply, formatPoolOpts)} Pool Token
            </KeyValueDisplay>
            <KeyValueDisplay mt={"8px"} kkey={"Each Pool Token Value"}>
              {formatMoney(new BigNumber(1).times(poolToken?.pool?.exchangeRate || 0), format0Opts)}
              {" "}+{" "}
              {formatMoney(new BigNumber(1).shiftedBy(poolToken?.decimals || 0), format1Opts)}
            </KeyValueDisplay>

            <Divider className={classes.divider} />
          </ContrastBox>
        </>
      )}
    </Box>
  );
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    padding: theme.spacing(0, 4, 0),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(0, 2, 0),
    },
  },
  proportionSelect: {
    marginTop: 3,
    marginBottom: 4,
  },
  input: {
    marginTop: 12,
    marginBottom: 20
  },
  svg: {
    alignSelf: "center",
    marginBottom: 12
  },
  actionButton: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    height: 46
  },
  backButton: {
    borderRadius: 12,
    marginLeft: theme.spacing(-2),
    color: theme.palette.text?.primary
  },
  readOnly: {
    textAlign: "left",
    color: theme.palette.text?.primary,
    padding: theme.spacing(1.5, 2.5),
  },
  previewAmount: {
    fontSize: 22,
    lineHeight: "24px",
    fontWeight: "bold",
    [theme.breakpoints.down("md")]: {
      fontSize: 20,
    },
    color: theme.palette.primary.dark,
    marginBottom: theme.spacing(1)
  },
  keyValueLabel: {
    marginTop: theme.spacing(1),
  },
  poolDetails: {
    marginBottom: theme.spacing(2),
  },
  advanceDetails: {
    marginBottom: theme.spacing(2),
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    color: theme.palette.text!.secondary,
    cursor: "pointer"
  },
  primaryColor: {
    color: theme.palette.primary.main
  },
  showAdvanced: {
    padding: theme.spacing(2.5, 8),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2.5, 2),
    },
  },
  text: {
    fontWeight: 400,
    letterSpacing: 0
  },
  divider: {
    marginTop: theme.spacing(2),
    // marginBottom: theme.spacing(2),
    backgroundColor: `rgba${hexToRGBA(theme.palette.primary.main, 0.3)}`
  },
  errorMessage: {
    marginTop: theme.spacing(1),
  },
  label: {
    color: theme.palette.primary.contrastText,
  },
  iconButton: {
    color: theme.palette?.label,
    backgroundColor: theme.palette?.currencyInput,
    borderRadius: 12,
    padding: 5,
    marginLeft: 5,
  },
  viewIcon: {
    color: theme.palette.type === "dark" ? "#00FFB0" : `rgba${hexToRGBA("#003340", 0.5)}`,
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: "-12px",
    marginTop: "-12px"
  },
  box: {
    backgroundColor: theme.palette?.currencyInput,
    border: `3px solid rgba${hexToRGBA("#00FFB0", 0.2)}`,
    margin: "2px",
  },
  currencyText: {
    fontSize: 20,
  },
  header: {
    fontSize: 16
  },
  token: {
    fontSize: 22,
    lineHeight: "24px",
    [theme.breakpoints.down("md")]: {
      fontSize: 20,
    },
    marginLeft: 4
  }
}));

export default PoolWithdraw;
