import { Box, Divider, InputLabel, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { ToggleButton, ToggleButtonGroup } from "@material-ui/lab";
import { fromBech32Address, toBech32Address } from "@zilliqa-js/crypto";
import { CurrencyInput, FancyButton, ProportionSelect } from "app/components";
import { actions } from "app/store";
import { PoolFormState, PoolInfo, RootState, TokenInfo, TokenState, WalletObservedTx, WalletState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { bnOrZero, useAsyncTask, useNetwork, useToaster } from "app/utils";
import { BIG_ONE, BIG_ZERO } from "app/utils/constants";
import BigNumber from "bignumber.js";
import clsx from "clsx";
import { ZilswapConnector } from "core/zilswap";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ZILSWAPV2_CONTRACTS } from "zilswap-sdk/lib/constants";
import PoolIcon from "../PoolIcon";


const initialFormState = {
  exactIn: false,

  tokenAAddress: "",
  tokenBAddress: "",

  ampValue: "10000",

  tokenAAmount: BIG_ZERO,
  tokenBAmount: BIG_ZERO,

  tokenAInput: "0",
  tokenBInput: "0",
};

const PoolDeposit: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { className, ...rest } = props;
  const classes = useStyles();
  const [formState, setFormState] = useState<typeof initialFormState>(initialFormState);
  const [currencyDialogOverride, setCurrencyDialogOverride] = useState<boolean>(false);
  const [runAddLiquidity, loadingAddLiquidity, error, clearPoolError] = useAsyncTask("poolAddLiquidity");
  const [runCreatePool, loadingCreatePool, errorCreatePool, clearCreatePoolError] = useAsyncTask("createPool");
  const [runApproveTx, loadingApproveTx, errorApproveTx, clearApproveError] = useAsyncTask("approveTx");
  const dispatch = useDispatch();
  const network = useNetwork();
  const poolFormState = useSelector<RootState, PoolFormState>(state => state.pool);
  const slippage = useSelector<RootState, BigNumber>(state => state.preference.slippage);
  const timeoutBlocks = useSelector<RootState, number>(state => state.preference.timeoutBlocks);
  const tokenState = useSelector<RootState, TokenState>(state => state.token);
  const walletState = useSelector<RootState, WalletState>(state => state.wallet);
  // const formatMoney = useMoneyFormatter({ showCurrency: true, maxFractionDigits: 6 });
  const toaster = useToaster();

  const byte20ContractAddress = fromBech32Address(ZILSWAPV2_CONTRACTS[network]).toLowerCase();

  useEffect(() => {
    const pool = poolFormState.pool;
    if (pool && !formState.tokenAAddress && !formState.tokenBAddress) {
      setFormState(state => ({
        ...state,
        tokenAAddress: pool.token0Address,
        tokenBAddress: pool.token1Address,
      }))
    }
  }, [poolFormState.pool, formState.tokenBAddress, formState.tokenAAddress])

  const findPool = useCallback((tokenAAddress, tokenBAddress, ampValue) => {
    const tokenA = tokenState.tokens[tokenAAddress] ?? null;
    const tokenB = tokenState.tokens[tokenBAddress] ?? null;

    let poolInfo: PoolInfo | null = null;
    if (tokenA && tokenB) {
      const pool = tokenA.pools.find(p =>
        ((p.token0Address === tokenA.address && p.token1Address === tokenB.address) || (p.token1Address === tokenA.address && p.token0Address === tokenB.address))
        && p.ampBps.eq(ampValue)
      )

      if (pool) {

        const token0 = tokenState.tokens[pool.token0Address];
        const token1 = tokenState.tokens[pool.token1Address];

        poolInfo = {
          pool,
          token0, token1,
        };
      } else { }
    }

    const poolReversed = poolInfo && poolInfo?.token0 === tokenB;
    const token0 = poolInfo?.token0 ?? tokenA;
    const token1 = poolInfo?.token1 ?? tokenB;

    return { tokenA, tokenB, token0, token1, poolInfo, poolReversed };
  }, [tokenState])

  const {
    token0,
    tokenA, tokenB,
    existingPool, poolReversed,
  } = useMemo(() => {
    const { token0, token1, tokenA, tokenB, poolInfo, poolReversed } = findPool(formState.tokenAAddress, formState.tokenBAddress, formState.ampValue);

    return { token0, token1, tokenA, tokenB, existingPool: poolInfo, poolReversed };
  }, [findPool, formState.tokenAAddress, formState.tokenBAddress, formState.ampValue]);

  useEffect(() => {
    if (!poolFormState.forNetwork) return

    // clear form if network changed
    if (poolFormState.forNetwork !== network) {
      setFormState({ ...initialFormState });
      dispatch(actions.Pool.clear());
    }
  }, [network, dispatch, setFormState, poolFormState.forNetwork]);

  const approveRequired: { tokenA?: TokenInfo, tokenB?: TokenInfo } | null = useMemo(() => {
    if (!walletState.wallet) return null;
    const tokenAAllowance = bnOrZero(tokenA?.allowances?.[byte20ContractAddress]);
    const tokenBAllowance = bnOrZero(tokenB?.allowances?.[byte20ContractAddress]);

    const tokenAAmount = formState.tokenAAmount;
    const tokenBAmount = formState.tokenBAmount;

    if (tokenAAllowance.gte(tokenAAmount) && tokenBAllowance.gte(tokenBAmount))
      return null;

    return {
      tokenA: tokenAAllowance.lt(tokenAAmount) ? tokenA : undefined,
      tokenB: tokenBAllowance.lt(tokenBAmount) ? tokenB : undefined,
    };
  }, [formState.tokenAAmount, formState.tokenBAmount, tokenA, tokenB, walletState.wallet, byte20ContractAddress]);

  const onPercentage = (token: TokenInfo, percentage: number) => {
    const balance = new BigNumber(token.balance?.toString() || 0);
    const intendedAmount = balance.times(percentage).decimalPlaces(0);
    onAmountChange(token, intendedAmount.shiftedBy(-token.decimals).toString());
  };

  const onTokenChange = (index: "0" | "1", token: TokenInfo) => {
    const otherKey = index === "0" ? "tokenBAddress" : "tokenAAddress"
    if (token.address === formState[otherKey]) {
      setFormState(state => ({
        ...state,
        tokenAAddress: state.tokenBAddress,
        tokenBAddress: state.tokenAAddress,
        exactIn: !state.exactIn,
        tokenAInput: state.tokenBInput,
        tokenBInput: state.tokenAInput,
        tokenAAmount: state.tokenBAmount,
        tokenBAmount: state.tokenAAmount,
      }));

      dispatch(actions.Pool.update({
        token0Amount: poolFormState.token1Amount,
        token1Amount: poolFormState.token0Amount,
      }))
      return;
    };


    const key = index === "0" ? "tokenAAddress" : "tokenBAddress";
    const { poolInfo } = findPool(token.address, formState[otherKey], formState.ampValue);
    let { tokenAAmount, tokenBAmount, exactIn } = formState;
    const otherToken = tokenState[formState[otherKey]];

    if (!otherToken) {
      setFormState(state => ({
        ...state,
        [key]: token.address,
      }));
      return;
    }

    const [tokenA, tokenB] = index === "0" ? [token, otherToken] : [otherToken, token];
    const tokenADecimals = tokenA ? -tokenA.decimals : 0
    const tokenBDecimals = tokenB ? -tokenB.decimals : 0

    if (poolInfo) {
      const poolRatio = ZilswapConnector.getPoolRatio(poolInfo.pool, poolReversed ? "1to0" : "0to1");
      if (exactIn) {
        tokenBAmount = tokenAAmount.times(poolRatio).dp(0);
      } else {
        tokenAAmount = tokenBAmount.times(poolRatio).dp(0);
      }
    } else {
      tokenAAmount = BIG_ZERO;
      tokenBAmount = BIG_ZERO;
    }

    setFormState(state => ({
      ...state,
      [key]: token.address,
      tokenAInput: tokenAAmount.shiftedBy(tokenADecimals).toString(10),
      tokenBInput: tokenBAmount.shiftedBy(tokenBDecimals).toString(10),
      tokenAAmount,
      tokenBAmount,
    }));
  };

  const onAmountChange = (token: TokenInfo, input: string = "0") => {
    const tokenAmountRaw = bnOrZero(input).shiftedBy(token.decimals).dp(0);
    const exactIn = token === tokenA;
    const tokenADecimals = tokenA ? -tokenA.decimals : 0
    const tokenBDecimals = tokenB ? -tokenB?.decimals : 0

    let otherAmountRaw: BigNumber | null = null;
    if (existingPool && existingPool.pool.token0Reserve.gt(0)) {
      const poolRatio = ZilswapConnector.getPoolRatio(existingPool.pool, token === token0 ? "1to0" : "0to1");
      otherAmountRaw = tokenAmountRaw.times(poolRatio);
    }

    if (exactIn) {
      setFormState(state => ({
        ...state,
        exactIn,
        tokenAInput: input,
        tokenAAmount: tokenAmountRaw,
        tokenBInput: bnOrZero(otherAmountRaw ?? state.tokenBAmount).shiftedBy(tokenBDecimals).toString(10),
        tokenBAmount: bnOrZero(otherAmountRaw ?? state.tokenBAmount),
      }));
    } else {
      setFormState(state => ({
        ...state,
        exactIn,
        tokenAInput: bnOrZero(otherAmountRaw ?? state.tokenAAmount).shiftedBy(tokenADecimals).toString(10),
        tokenAAmount: bnOrZero(otherAmountRaw ?? state.tokenAAmount),
        tokenBInput: input,
        tokenBAmount: tokenAmountRaw,
      }));
    }

    dispatch(actions.Pool.update({
      token0Amount: (token0 === token ? tokenAmountRaw : otherAmountRaw) ?? undefined,
      token1Amount: (token0 === token ? otherAmountRaw : tokenAmountRaw) ?? undefined,
    }))
  };

  const onAmpChange = (evt: React.MouseEvent, value: string) => {
    setFormState(state => ({
      ...state,
      ampValue: value,
    }))
  }

  const onCreatePool = () => {
    if (!tokenA || !tokenB || !formState.ampValue) return;
    clearApproveError();
    clearPoolError();

    runCreatePool(async () => {
      const observedTx = await ZilswapConnector.deployPool(tokenA.address, tokenB.address, formState.ampValue);
      const confirmedTx = await ZilswapConnector.confirmTx(observedTx.hash);
      const response = await ZilswapConnector.getSDK().zilliqa.blockchain.getContractAddressFromTransactionID(confirmedTx.hash);
      const addPoolTx = await ZilswapConnector.addPool(toBech32Address(`0x${response.result!}`));

      const walletObservedTx: WalletObservedTx = {
        ...addPoolTx,
        address: walletState.wallet?.addressInfo.bech32 || "",
        network,
      };
      dispatch(actions.Transaction.observe({ observedTx: walletObservedTx }));
      toaster("Submitted", { hash: walletObservedTx.hash });
    });
  }

  const onAddLiquidity = () => {
    if (formState.tokenAAmount.isZero()) return;
    if (formState.tokenBAmount.isZero()) return;
    if (!existingPool) return;
    if (loading) return;

    clearApproveError();
    clearCreatePoolError();

    runAddLiquidity(async () => {
      const { tokenAAmount, tokenBAmount } = formState;
      const poolReversed = existingPool && existingPool?.token0.address !== tokenA?.address;
      const [token0Amount, token1Amount] = poolReversed ? [tokenBAmount, tokenAAmount] : [tokenAAmount, tokenBAmount];
      const tokenABalance = bnOrZero(tokenA?.balance);
      const tokenBBalance = bnOrZero(tokenB?.balance);

      if (tokenAAmount.gt(tokenABalance)) {
        throw new Error(`Insufficient ${tokenA.symbol} balance.`)
      }
      if (tokenBAmount.gt(tokenBBalance)) {
        throw new Error(`Insufficient ${tokenB.symbol} balance.`)
      }

      ZilswapConnector.setDeadlineBlocks(timeoutBlocks);
      const slippageFactor = BIG_ONE.minus(slippage.shiftedBy(-4));

      const observedTx = await ZilswapConnector.addLiquidity({
        pool: existingPool.pool,
        amount0Desired: token0Amount.dp(0),
        amount1Desired: token1Amount.dp(0),
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

  const onApproveTx = () => {
    if (loading || loadingApproveTx) return;

    clearPoolError();


    runApproveTx(async () => {
      const token = approveRequired?.tokenA ?? approveRequired?.tokenB;
      if (!token) return;

      const addTokenAmount = token === token0 ? poolFormState.token0Amount : poolFormState.token1Amount;
      const approveAmount = addTokenAmount.minus(bnOrZero(token.allowances?.[byte20ContractAddress]));

      const observedTx = await ZilswapConnector.approveTokenTransfer({
        tokenAmount: approveAmount,
        tokenID: token.address,
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

  const onDoneEditing = () => {
    const tokenADecimals = tokenA ? -tokenA.decimals : 0
    const tokenBDecimals = tokenB ? -tokenB.decimals : 0
    setFormState(state => ({
      ...state,
      tokenAInput: state.tokenAAmount.shiftedBy(tokenADecimals).toString(10),
      tokenBInput: state.tokenBAmount.shiftedBy(tokenBDecimals).toString(10),
    }));

    const { tokenAAmount, tokenBAmount } = formState;
    dispatch(actions.Pool.update({
      token0Amount: token0 === tokenA ? tokenAAmount : tokenBAmount,
      token1Amount: token0 === tokenA ? tokenBAmount : tokenAAmount,
    }))
  };

  const loading = loadingAddLiquidity || loadingApproveTx || loadingCreatePool
  const isCreatePool = !approveRequired?.tokenA && !approveRequired?.tokenB && !existingPool && tokenA && tokenB;

  return (
    <Box display="flex" flexDirection="column" {...rest} className={clsx(classes.root, className)}>
      <Box className={classes.container}>
        <CurrencyInput
          label="Deposit"
          token={tokenA}
          dialogOpts={{ noPool: true }}
          showCurrencyDialog={currencyDialogOverride}
          onCloseDialog={() => setCurrencyDialogOverride(false)}
          amount={formState.tokenAInput}
          disabled={!tokenA}
          onEditorBlur={onDoneEditing}
          onAmountChange={(input) => onAmountChange(tokenA, input)}
          onCurrencyChange={(token) => onTokenChange("0", token)}
          allowNewToken
        />

        <Box display="flex" justifyContent="flex-end">
          <ProportionSelect
            color="primary"
            size="small"
            className={classes.proportionSelect}
            disabled={!tokenA}
            onSelectProp={(value) => onPercentage(tokenA, value)} />
        </Box>

        <Box display="flex" className={classes.poolIconBox}>
          <PoolIcon type="plus" className={classes.poolIcon} />
        </Box>

        <CurrencyInput
          label="Deposit"
          token={tokenB}
          dialogOpts={{ noPool: true }}
          showCurrencyDialog={currencyDialogOverride}
          onCloseDialog={() => setCurrencyDialogOverride(false)}
          amount={formState.tokenBInput}
          disabled={!tokenB}
          onEditorBlur={onDoneEditing}
          onAmountChange={(input) => onAmountChange(tokenB, input)}
          onCurrencyChange={(token) => onTokenChange("1", token)}
          allowNewToken
        />

        <Box display="flex" justifyContent="flex-end">
          <ProportionSelect
            color="primary"
            size="small"
            className={classes.proportionSelect}
            disabled={!tokenB}
            onSelectProp={(value) => onPercentage(tokenB, value)} />
        </Box>

        <Divider />

        <Box mt={1}>
          <InputLabel>Amplification Factor</InputLabel>
          <ToggleButtonGroup
            exclusive
            className={classes.buttonGroup}
            value={formState.ampValue}
            onChange={onAmpChange}
          >
            <ToggleButton value="10000"
              className={clsx(classes.percentageButton, { [classes.selectedButton]: formState.ampValue === "10000" })}
            >
              <Typography>1x</Typography>
            </ToggleButton>
            <ToggleButton value="20000"
              className={clsx(classes.percentageButton, { [classes.selectedButton]: formState.ampValue === "20000" })}
            >
              <Typography>2x</Typography>
            </ToggleButton>
            <ToggleButton value="50000"
              className={clsx(classes.percentageButton, { [classes.selectedButton]: formState.ampValue === "50000" })}
            >
              <Typography>5x</Typography>
            </ToggleButton>
            <ToggleButton value="100000"
              className={clsx(classes.percentageButton, { [classes.selectedButton]: formState.ampValue === "100000" })}
            >
              <Typography>10x</Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Typography color="error" className={classes.errorMessage}>{error?.message ?? errorApproveTx?.message ?? errorCreatePool?.message}</Typography>


        {!isCreatePool && (
          <FancyButton
            loading={loading}
            walletRequired
            showTxApprove={!!approveRequired?.tokenA || !!approveRequired?.tokenB}
            loadingTxApprove={loadingApproveTx}
            onClickTxApprove={onApproveTx}
            approveText={`Unlock ${approveRequired?.tokenA?.symbol ?? approveRequired?.tokenB?.symbol}`}
            className={classes.actionButton}
            variant="contained"
            color="primary"
            onClick={onAddLiquidity}>
            Add Liquidity
          </FancyButton>
        )}

        {isCreatePool && (
          <FancyButton
            loading={loading}
            walletRequired
            className={classes.actionButton}
            variant="contained"
            color="primary"
            onClick={onCreatePool}>
            Create Pool
          </FancyButton>
        )}
        {/* <PoolDetail poolInfo={poolInfo} /> */}
      </Box>
    </Box >
  );
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    padding: theme.spacing(0, 4, 2),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(0, 2, 2),
    },
  },
  proportionSelect: {
    marginTop: 3,
    marginBottom: 4,
  },
  actionButton: {
    flex: 1,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    height: 46
  },
  approveBtnContainer: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  keyValueLabel: {
    marginTop: theme.spacing(1),
  },
  svg: {
    alignSelf: "center"
  },
  errorMessage: {
    marginTop: theme.spacing(1),
  },
  primaryColor: {
    color: theme.palette.primary.main
  },
  poolIcon: {
    margin: 12,
    marginTop: -30,
    marginBottom: 0,
    [theme.breakpoints.down("sm")]: {
      marginTop: -33
    },
  },
  poolIconBox: {
    justifyContent: "center",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    },
  },
  buttonGroup: {
    display: "flex",
  },
  percentageButton: {
    borderRadius: 5,
    padding: '3px 7px',
    flex: 1,
    color: theme.palette.type === "dark" ? "rgba(222, 255, 255, 0.5)" : "#003340",
    backgroundColor: theme.palette.background!.contrast,
    border: "1px solid transparent",
    borderColor: "transparent",
    margin: '4px 5px',
    [theme.breakpoints.down("sm")]: {
      padding: '6px 7px',
    },
  },
  selectedButton: {
    borderColor: theme.palette.type === "dark" ? "rgba(222, 255, 255, 0.5)" : "#003340",
  },
}));

export default PoolDeposit;
