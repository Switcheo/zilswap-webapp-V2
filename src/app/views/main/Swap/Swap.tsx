import { Box, IconButton, makeStyles, Typography } from "@material-ui/core";
import AutorenewIcon from '@material-ui/icons/Autorenew';
import BrightnessLowIcon from '@material-ui/icons/BrightnessLowRounded';
import { fromBech32Address } from "@zilliqa-js/crypto";
import { CurrencyInput, FancyButton, Notifications, ProportionSelect, ShowAdvanced } from "app/components";
import MainCard from "app/layouts/MainCard";
import { actions } from "app/store";
import { ExactOfOptions, LayoutState, RootState, SwapFormState, TokenInfo, TokenState, WalletObservedTx, WalletState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { bnOrZero, useAsyncTask, useBlacklistAddress, useNetwork, useToaster } from "app/utils";
import { BIG_ONE, BIG_ZERO, ZIL_ADDRESS } from "app/utils/constants";
import BigNumber from "bignumber.js";
import cls from "classnames";
import { toBasisPoints, ZilswapConnector } from "core/zilswap";
import { ZWAP_TOKEN_CONTRACT } from "core/zilswap/constants";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router";
import { ZILSWAPV2_CONTRACTS } from "zilswap-sdk/lib/constants";
import SwapDetail from "./components/SwapDetail";
import { ReactComponent as SwapSVG } from "./swap_logo.svg";

const initialFormState = {
  inAmount: "0",
  outAmount: "0",
  showRecipientAddress: false,
};

type CalculateAmountProps = {
  exactOf?: ExactOfOptions;
  inToken?: TokenInfo;
  inAmount?: BigNumber;
  outToken?: TokenInfo;
  outAmount?: BigNumber;
};

interface InitTokenProps {
  inToken?: TokenInfo,
  outToken?: TokenInfo
}

const Swap: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props;
  const classes = useStyles();
  const [buttonRotate, setButtonRotate] = useState(false);
  const [calculationError, setCalculationError] = useState<Error | null>(null);
  const [formState, setFormState] = useState<typeof initialFormState>(initialFormState);
  const network = useNetwork();
  const history = useHistory();
  const location = useLocation();
  const swapFormState: SwapFormState = useSelector<RootState, SwapFormState>(store => store.swap);
  const dispatch = useDispatch();
  const tokenState = useSelector<RootState, TokenState>(store => store.token);
  const walletState = useSelector<RootState, WalletState>(store => store.wallet);
  const layoutState = useSelector<RootState, LayoutState>(store => store.layout);
  const [runSwap, loading, error, clearSwapError] = useAsyncTask("swap");
  const [isBlacklisted] = useBlacklistAddress();
  const [runApproveTx, loadingApproveTx, errorApproveTx, clearApproveError] = useAsyncTask("approveTx");
  const queryParams = new URLSearchParams(location.search);
  const [recipientAddrBlacklisted, setRecipientAddrBlacklisted] = useState(false);
  const toaster = useToaster();

  const { path, isInsufficientReserves } = useMemo(() => {
    const { inToken, outToken, inAmount } = swapFormState;
    if (!inToken || !outToken) return {};
    const inAmountUnitless = inAmount.shiftedBy(inToken.decimals);
    const { swapPath, expectedAmount } = ZilswapConnector.findSwapPath(inToken.hash, outToken.hash, inAmountUnitless);

    const [pool, isSameOrder] = swapPath?.slice(-1)?.[0] ?? [];
    const outReserves = isSameOrder ? pool?.token1Reserve : pool?.token0Reserve;

    let isInsufficientReserves = false;
    if (outReserves?.lt(expectedAmount))
      isInsufficientReserves = true;

    return { path: swapPath, expectedAmount, isInsufficientReserves };
  }, [swapFormState]);


  // Use default form
  useEffect(() => {
    if (!swapFormState.forNetwork) return

    // clear form if network changed
    if (swapFormState.forNetwork !== network) {
      setFormState({
        ...formState,
        inAmount: "0",
        outAmount: "0",
      });
      dispatch(actions.Swap.clearForm());

      // revert to zil-zwap default
      history.replace({ search: "" });
    }

    // eslint-disable-next-line
  }, [network]);

  useEffect(() => {
    if (inToken || outToken) {
      return;
    }

    const zwapAddress = ZWAP_TOKEN_CONTRACT[network];
    const queryInput = queryParams.get("tokenIn") ?? ZIL_ADDRESS;
    const queryOutput = queryParams.get("tokenOut") ?? zwapAddress;
    if (queryInput === queryOutput && queryOutput) {
      return;
    }

    // Obtain tokenInfo
    const newInToken = queryInput ? tokenState.tokens[queryInput] : null;
    const newOutToken = queryOutput ? tokenState.tokens[queryOutput] : null;

    initNewToken({
      ...newInToken && {
        inToken: newInToken,
      },

      ...newOutToken && {
        outToken: newOutToken,
      },
    });

    // eslint-disable-next-line
  }, [tokenState.tokens, network]);

  // update query params from state
  useEffect(() => {
    const { inToken, outToken } = swapFormState;

    if (inToken) queryParams.set("tokenIn", inToken.address);
    if (outToken) queryParams.set("tokenOut", outToken.address);

    history.replace({ search: queryParams.toString() });

    // eslint-disable-next-line
  }, [swapFormState.inToken, swapFormState.outToken]);

  // Blacklist recipients
  useEffect(() => {
    const blacklisted = !!swapFormState.recipientAddress ? isBlacklisted(swapFormState.recipientAddress) : false;
    setRecipientAddrBlacklisted(blacklisted)
  }, [swapFormState.recipientAddress, isBlacklisted]);

  const initNewToken = (newTokens: InitTokenProps) => {
    dispatch(actions.Swap.update({
      forNetwork: network,
      ...newTokens,
    }));
  }

  // Function to reverse the swap direction
  const onReverse = async () => {
    setButtonRotate(!buttonRotate);
    const result = calculateAmounts({
      inToken: swapFormState.outToken,
      outToken: swapFormState.inToken,
    });

    if (result.exactOf === "in") {
      onOutAmountChange(result.inAmount.toString(), true)
    } else if (result.exactOf === "out") {
      onInAmountChange(result.outAmount.toString(), true)
    }
  };

  // Used when a percentage is chosen
  const onPercentage = (percentage: number) => {
    const { inToken } = swapFormState;
    if (!inToken) return;

    const balance = bnOrZero(inToken.balance);
    const intendedAmount = balance.times(percentage).decimalPlaces(0);
    const netGasAmount = inToken.isZil ? ZilswapConnector.adjustedForGas(intendedAmount, balance) : intendedAmount;
    onInAmountChange(netGasAmount.shiftedBy(-inToken.decimals).toString());
  };

  const calculateAmounts = (props: CalculateAmountProps = {}) => {
    let _inAmount: BigNumber = props.inAmount ?? swapFormState.inAmount;
    let _outAmount: BigNumber = props.outAmount ?? swapFormState.outAmount;
    const _inToken: TokenInfo | undefined = props.inToken ?? swapFormState.inToken;
    const _outToken: TokenInfo | undefined = props.outToken ?? swapFormState.outToken;
    const _exactOf: ExactOfOptions = props.exactOf ?? swapFormState.exactOf;

    if (!_inToken || !_outToken) return {
      inAmount: _inAmount,
      outAmount: _outAmount,
      inToken: _inToken,
      outToken: _outToken,
      exactOf: _exactOf,
    };

    const srcToken = _exactOf === "in" ? _inToken : _outToken;
    const dstToken = _exactOf === "in" ? _outToken : _inToken;

    const srcAmount = (_exactOf === "in" ? _inAmount : _outAmount).shiftedBy(srcToken.decimals);
    let expectedExchangeRate = BIG_ONE;
    let expectedSlippage = 0;
    let dstAmount = srcAmount;
    let isInsufficientReserves = false;

    try {
      if (srcAmount.abs().gt(0)) {
        const expectedAmount = new BigNumber(ZilswapConnector.getExchangeRate({
          amount: srcAmount.decimalPlaces(0),
          exactOf: _exactOf,
          tokenInID: _inToken!.address,
          tokenOutID: _outToken!.address,
        }))

        if (expectedAmount.isNaN() || expectedAmount.isNegative()) {
          isInsufficientReserves = true;
          expectedExchangeRate = BIG_ZERO;
          expectedSlippage = 0;
          dstAmount = BIG_ZERO;
        } else {
          const expectedAmountUnits = expectedAmount.shiftedBy(-dstToken.decimals);
          const srcAmountUnits = srcAmount.shiftedBy(-srcToken.decimals);
          expectedExchangeRate = expectedAmountUnits.div(srcAmountUnits).pow(_exactOf === "in" ? 1 : -1).abs();
          // expectedSlippage = slippage.shiftedBy(-2).toNumber();

          dstAmount = expectedAmount.shiftedBy(-dstToken?.decimals || 0).decimalPlaces(dstToken?.decimals || 0);
        }
      }
      else {
        expectedExchangeRate = BIG_ZERO;
        dstAmount = BIG_ZERO;
      }
    } catch (err) {
      const typedErr = err as Error
      setCalculationError(typedErr)
      console.error(err)
      expectedExchangeRate = BIG_ZERO;
      dstAmount = BIG_ZERO;
    }


    return {
      inAmount: _inAmount,
      outAmount: _outAmount,
      inToken: _inToken,
      outToken: _outToken,
      exactOf: _exactOf,
      ..._exactOf === "in" && {
        outAmount: dstAmount,
      },
      ..._exactOf === "out" && {
        inAmount: dstAmount,
      },

      isInsufficientReserves,
      expectedExchangeRate,
      expectedSlippage,
    };
  };

  // Calculates the amountIn when user types in amountOut
  const onOutAmountChange = (amount: string = "0", reverseTokens?: boolean) => {
    let outAmount = new BigNumber(amount);
    if (outAmount.isNaN() || outAmount.isNegative() || !outAmount.isFinite()) outAmount = BIG_ZERO;
    const result = calculateAmounts({
      exactOf: "out",
      outAmount,
      ...reverseTokens && {
        inToken: swapFormState.outToken,
        outToken: swapFormState.inToken,
      },
    });
    setFormState({
      ...formState,
      outAmount: amount,
      inAmount: result.inAmount.toString(),
    });
    dispatch(actions.Swap.update({
      forNetwork: network,
      ...result,
    }));
  };
  // Calculates the amountOut when user types in amountIn
  const onInAmountChange = async (amount: string = "0", reverseTokens?: boolean) => {
    let inAmount = new BigNumber(amount);
    if (inAmount.isNaN() || inAmount.isNegative() || !inAmount.isFinite()) inAmount = BIG_ZERO;
    const result = calculateAmounts({
      exactOf: "in",
      inAmount,
      ...reverseTokens && {
        inToken: swapFormState.outToken,
        outToken: swapFormState.inToken,
      },
    });
    setFormState({
      ...formState,
      inAmount: amount,
      outAmount: result.outAmount.toString(),
    });
    dispatch(actions.Swap.update({
      forNetwork: network,
      ...result,
    }));
  };

  // Used when the currency out changes
  const onOutCurrencyChange = (token: TokenInfo) => {
    let { inToken } = swapFormState;
    setCalculationError(null)
    if (swapFormState.inToken?.address === token.address) {
      if (token.isWzil) {
        inToken = tokenState.tokens[ZIL_ADDRESS];
      } else {
        return;
      }
    };
    if (swapFormState.outToken?.address === token.address) return;

    if (!token.isZil && !inToken) {
      inToken = tokenState.tokens[ZIL_ADDRESS];
    }

    if (token.isWzil) {
      inToken = tokenState.tokens[ZIL_ADDRESS];
    }

    const result = calculateAmounts({ inToken, outToken: token });

    setFormState({
      ...formState,
      outAmount: result.outAmount.toString(),
      inAmount: result.inAmount.toString(),
    });

    dispatch(actions.Swap.update({
      forNetwork: network,
      ...result,
    }));
  };
  // Used when the currency in changes
  const onInCurrencyChange = async (token: TokenInfo) => {
    let { outToken } = swapFormState;
    setCalculationError(null)
    if (swapFormState.outToken?.address === token.address) {
      if (token.isWzil) {
        outToken = tokenState.tokens[ZIL_ADDRESS];
      } else {
        return;
      }
    };
    if (swapFormState.inToken?.address === token.address) return;

    if (!token.isZil && !outToken) {
      outToken = tokenState.tokens[ZIL_ADDRESS];
    }

    if (token.isWzil) {
      outToken = tokenState.tokens[ZIL_ADDRESS];
    }

    const result = calculateAmounts({ inToken: token, outToken });

    setFormState({
      ...formState,
      outAmount: result.outAmount.toString(),
      inAmount: result.inAmount.toString(),
    });

    dispatch(actions.Swap.update({
      forNetwork: network,
      ...result,
    }));
  };

  const onSwap = () => {
    const { outToken, inToken, inAmount, outAmount, exactOf, slippage, expiry, recipientAddress } = swapFormState;

    // Checks if the input
    if (isInsufficientReserves) return;
    if (!inToken || !outToken || !path) return;
    if (inAmount.isZero() || outAmount.isZero()) return;
    if (loading) return;

    clearApproveError();

    runSwap(async () => {
      const exactIn = exactOf === "in"
      const amount: BigNumber = exactIn ? inAmount.shiftedBy(inToken.decimals) : outAmount.shiftedBy(outToken.decimals);
      if (amount.isNaN() || !amount.isFinite())
        throw new Error("Invalid input amount");

      const balance: BigNumber = bnOrZero(inToken.balance)

      if (inAmount.shiftedBy(inToken.decimals).gt(balance)) {
        throw new Error(`Insufficient ${inToken.symbol} balance.`)
      }

      ZilswapConnector.setDeadlineBlocks(expiry);

      const observedTx = await ZilswapConnector.swap({
        path: path.map(([pool]) => pool),
        tokenInID: inToken.address,
        amount, exactOf,
        maxAdditionalSlippage: toBasisPoints(slippage).toNumber(),
        ...exactOf === "in" && {
          amountOutMin: outAmount.shiftedBy(outToken.decimals)
        },
        ...exactOf === "out" && {
          amountInMax: inAmount.shiftedBy(inToken.decimals)
        },
        ...formState.showRecipientAddress && {
          recipientAddress,
        },
      });
      const walletObservedTx: WalletObservedTx = {
        ...observedTx,
        address: walletState.wallet?.addressInfo.bech32 || "",
        network,
      };

      dispatch(actions.Transaction.observe({ observedTx: walletObservedTx }));
      toaster("Submitted", { hash: walletObservedTx.hash });
    });
  };

  const onApproveTx = () => {
    if (!swapFormState.inToken) return;
    if (swapFormState.inToken.isZil) return;
    if (swapFormState.inAmount.isZero()) return;
    if (loading) return;

    clearSwapError();

    runApproveTx(async () => {
      const tokenAddress = swapFormState.inToken!.address;
      const tokenAmount = swapFormState.inAmount;
      const observedTx = await ZilswapConnector.approveTokenTransfer({
        tokenAmount: tokenAmount.shiftedBy(swapFormState.inToken!.decimals),
        tokenID: tokenAddress,
        spenderAddress: "",
        network,
      });

      if (!observedTx)
        throw new Error("Transfer allowance already sufficient for specified amount");

      const walletObservedTx: WalletObservedTx = {
        ...observedTx!,
        address: walletState.wallet?.addressInfo.bech32 || "",
        network,
      };
      dispatch(actions.Transaction.observe({ observedTx: walletObservedTx }));
      toaster("Submitted", { hash: walletObservedTx.hash });
    });
  };

  const onDoneEditing = () => {
    setFormState({
      ...formState,
      inAmount: swapFormState.inAmount.toString(),
      outAmount: swapFormState.outAmount.toString(),
    });
  };

  const { outToken, inToken } = swapFormState;
  let showTxApprove = false;
  if (inToken && !inToken?.isZil) {
    const zilswapContractAddress = ZILSWAPV2_CONTRACTS[network];
    const byte20ContractAddress = fromBech32Address(zilswapContractAddress).toLowerCase();
    const unitlessInAmount = swapFormState.inAmount.shiftedBy(swapFormState.inToken!.decimals);
    showTxApprove = bnOrZero(inToken?.allowances?.[byte20ContractAddress]).comparedTo(unitlessInAmount) < 0;
  }

  const toggleAdvanceSetting = () => {
    dispatch(actions.Layout.showAdvancedSetting(!layoutState.showAdvancedSetting));
  }

  // Recalculate Exchange Rate
  const refreshRate = () => {
    onInAmountChange(formState.inAmount);
  }

  return (
    <MainCard {...rest} className={cls(classes.root, className)}>
      <Notifications />
      {!layoutState.showAdvancedSetting && (
        <Box display="flex" flexDirection="column" className={classes.container}>
          <Box display="flex" justifyContent="flex-end" mb={1.5}>
            <IconButton onClick={() => toggleAdvanceSetting()} className={classes.iconButton}>
              <BrightnessLowIcon />
            </IconButton>
            <IconButton onClick={() => refreshRate()} className={classes.iconButton}>
              <AutorenewIcon />
            </IconButton>
          </Box>

          <CurrencyInput
            label="From"
            token={inToken || null}
            amount={formState.inAmount}
            disabled={!inToken}
            dialogOpts={{ noPool: true, wrapZil: outToken?.isWzil && inToken?.isZil }}
            onEditorBlur={onDoneEditing}
            onAmountChange={onInAmountChange}
            onCurrencyChange={onInCurrencyChange} />
          <Box display="flex" justifyContent="flex-end">
            <ProportionSelect size="small" className={classes.proportionSelect} onSelectProp={onPercentage} />
          </Box>
          <Box display="flex" className={classes.swapIconBox}>
            <IconButton
              disabled={!inToken || !outToken}
              onClick={() => onReverse()}
              className={cls(classes.swapButton, { [classes.rotateSwapButton]: buttonRotate })}>
              <SwapSVG className={classes.swapIcon} />
            </IconButton>
          </Box>
          <CurrencyInput
            label="To"
            token={outToken || null}
            amount={formState.outAmount}
            disabled
            dialogOpts={{ noPool: true, wrapZil: inToken?.isWzil }}
            onEditorBlur={onDoneEditing}
            onAmountChange={onOutAmountChange}
            onCurrencyChange={onOutCurrencyChange} />

          <Typography className={classes.errorMessage} color="error">{error?.message || errorApproveTx?.message || calculationError?.message}</Typography>
          {isInsufficientReserves && (
            <Typography color="error">Pool reserve is too small to fulfill desired output.</Typography>
          )}

          {(
            <FancyButton walletRequired
              loading={loading}
              className={classes.actionButton}
              showTxApprove={showTxApprove}
              loadingTxApprove={loadingApproveTx}
              onClickTxApprove={onApproveTx}
              variant="contained"
              color="primary"
              disabled={!inToken || !outToken || recipientAddrBlacklisted || isInsufficientReserves}
              onClick={onSwap}>
              Swap
            </FancyButton>

          )}
          <SwapDetail path={path} pair={[inToken?.address ?? "", outToken?.address ?? ""]} />
        </Box>
      )}
      <ShowAdvanced showAdvanced={layoutState.showAdvancedSetting} />
    </MainCard >
  );
};


const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    padding: theme.spacing(4, 4, 2),
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2, 2, 2),
    },
  },
  swapButton: {
    padding: 0,
    marginTop: -49,
    marginBottom: -15,
    transform: "rotate(0)",
    transition: "transform .5s ease-in-out",
    [theme.breakpoints.down("sm")]: {
      marginTop: -55
    },
    zIndex: 1
  },
  rotateSwapButton: {
    transform: "rotate(180deg)",
  },
  switchIcon: {
    height: 16,
    width: 16,
    marginLeft: 8,
    backgroundColor: theme.palette.type === "dark" ? "#2B4648" : "#E4F1F2",
    borderRadius: 8,
    cursor: "pointer",
    transform: "rotate(0)",
    transition: "transform .5s ease-in-out",
  },
  activeSwitchIcon: {
    transform: "rotate(180deg)",
  },
  inputRow: {
    paddingLeft: 0
  },
  proportionSelect: {
    marginTop: 3,
    marginBottom: 4,
  },
  currencyButton: {
    borderRadius: 0,
    color: theme.palette.text!.primary,
    fontWeight: 600,
    width: 150,
    display: "flex",
    justifyContent: "space-between"
  },
  label: {
    fontSize: "12px",
    lineHeight: "14px",
    fontWeight: "bold",
    letterSpacing: 0,
    marginBottom: theme.spacing(1),
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  keyValueLabel: {
    marginTop: theme.spacing(1),
  },
  exchangeRateLabel: {
    flex: 1,
    marginBottom: theme.spacing(2),
  },
  actionButton: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    height: 46
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
  accordionButton: {
    verticalAlign: "middle",
    paddingBottom: 3,
    cursor: "pointer",
    color: theme.palette.primary.main,
  },
  addAddressButton: {
    borderRadius: 0,
    padding: 0,
    fontSize: "12px",
    "& .MuiButton-label": {
      justifyContent: "flex-start",
    },
  },
  addressLabel: {
    display: "flex",
    alignItems: "center",
  },
  addressInput: {
    marginBottom: theme.spacing(2),
    "& input": {
      padding: "17.5px 14px",
      fontSize: "14px",
    },
  },
  addressError: {
    justifySelf: "flex-end",
    marginLeft: "auto",
  },
  warningText: {
    color: theme.palette.colors.zilliqa.warning,
    "& svg": {
      verticalAlign: "middle",
      fontSize: "inherit",
    },
    paddingBottom: theme.spacing(0.5),
  },
  errorText: {
    color: theme.palette.colors.zilliqa.danger,
    "& svg": {
      verticalAlign: "middle",
      fontSize: "inherit",
    }
  },
  errorMessage: {
    marginTop: theme.spacing(1),
  },
  swapIcon: {
    "& path": {
      fill: theme.palette.icon
    }
  },
  iconButton: {
    color: theme.palette.type === "dark" ? "rgba(222, 255, 255, 0.5)" : "#003340",
    backgroundColor: theme.palette.background.contrast,
    borderRadius: 12,
    padding: 5,
    marginLeft: 5,
  },
  swapIconBox: {
    zIndex: 1,
    justifyContent: "center",
    [theme.breakpoints.down("sm")]: {
      justifyContent: "flex-start"
    },
  }
}));


export default Swap;
