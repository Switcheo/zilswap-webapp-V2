import { Box, Button, InputAdornment, InputLabel, OutlinedInput, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { CurrencyLogo } from 'app/components';
import CurrencyDialog from 'app/components/CurrencyDialog';
import { TokenInfo } from 'app/store/types';
import { AppTheme } from 'app/theme/types';
import { BIG_ZERO, CurrencyListType, hexToRGBA, useMoneyFormatter } from 'app/utils';
import { formatSymbol } from 'app/utils/currencies';
import BigNumber from 'bignumber.js';
import cls from 'classnames';
import { ZilswapConnector } from 'core/zilswap';
import React, { useMemo, useState } from 'react';
import { CurrencyDialogProps } from '../CurrencyDialog/CurrencyDialog';


export interface CurrencyInputProps extends React.HTMLAttributes<HTMLFormElement> {
  label?: string;
  inputClassName?: string;
  token: TokenInfo | null;
  amount: string;
  tokenList?: CurrencyListType;
  showCurrencyDialog?: boolean;
  fixedToken?: boolean;
  disabled?: boolean;
  hideBalance?: boolean;
  showMaxButton?: boolean;
  highestBid?: BigNumber;
  dialogOpts?: Partial<CurrencyDialogProps>;
  legacyZil?: boolean;
  overrideBalance?: BigNumber;
  balanceLabel?: string;
  allowNewToken?: boolean;
  tokensWithPoolsOnly?: boolean;
  showAmplification?: boolean;

  onCurrencyChange?: (token: TokenInfo) => void;
  onAmountChange?: (value: string) => void;
  onEditorBlur?: () => void;
  onCloseDialog?: () => void;
  onSelectMax?: () => void;
  onEnterKeyPress?: () => void;
}

const CurrencyInput: React.FC<CurrencyInputProps> = (props: CurrencyInputProps) => {
  const {
    children,
    inputClassName,
    className,
    label,
    fixedToken,
    amount,
    disabled,
    showCurrencyDialog: showDialogOverride,
    onCloseDialog: onCloseDialogListener,
    hideBalance,
    dialogOpts = {},
    onAmountChange,
    onCurrencyChange,
    token,
    onEditorBlur,
    onSelectMax,
    showMaxButton,
    onEnterKeyPress,
    tokenList = 'zil',
    legacyZil = false,
    overrideBalance,
    balanceLabel = 'Balance',
    allowNewToken,
    tokensWithPoolsOnly,
    showAmplification,
  } = props;
  const classes = useStyles();
  const moneyFormat = useMoneyFormatter({ maxFractionDigits: 5 });
  const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  // const poolToken = useSelector<RootState, TokenInfo | null>(state => state.pool.token);

  // const userPoolTokenPercent = poolToken?.pool?.contributionPercentage.shiftedBy(-2);
  // const inPoolAmount = poolToken?.pool?.token1Reserve.times(userPoolTokenPercent || 0);

  // const formatOpts: MoneyFormatterOptions = {
  //   compression: poolToken?.decimals,
  // };

  const ampFactor = useMemo(() => {
    if (!token || !token?.isPoolToken) return
    const pool = ZilswapConnector.getPoolByAddress(token.address)
    return pool?.ampBps ?? BIG_ZERO
  }, [token])

  const {
    tokenBalance,
  } = useMemo(() => {
    const tokenBalance = token?.balance ?? BIG_ZERO;
    return {
      tokenBalance,
    };
  }, [token?.balance]);

  const onCurrencySelect = (token: TokenInfo) => {
    if (typeof onCurrencyChange === 'function') onCurrencyChange(token);
    setShowCurrencyDialog(false);
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof onAmountChange === 'function') onAmountChange(event.target.value);
  };

  const onCloseDialog = () => {
    setShowCurrencyDialog(false);
    if (typeof onCloseDialogListener === 'function') onCloseDialogListener();
  };

  const clearPlaceholder = () => {
    if (amount === '0' && typeof onAmountChange === 'function') onAmountChange('');
  };

  const onSubmitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (onEnterKeyPress) {
      onEnterKeyPress();
    }
  };

  return (
    <form
      className={cls(classes.form, className)}
      noValidate
      autoComplete="off"
      onSubmit={onSubmitHandler}
    >
      {label && <InputLabel className={cls(classes.label)}>{label}</InputLabel>}

      {!hideBalance && (
        <Typography className={cls(classes.balance)} variant="body1">
          {balanceLabel}:{' '}
          {tokenBalance
            ? moneyFormat(tokenBalance, {
              symbol: token?.symbol,
              compression: token?.decimals,
              showCurrency: false,
            })
            : overrideBalance
              ? overrideBalance.toString()
              : '-'}
        </Typography>
      )}

      <OutlinedInput
        className={cls(classes.inputRow, {
          [classes.inputRowNoLabel]: !label,
          [inputClassName!]: !!inputClassName,
        })}
        placeholder={'0'}
        value={amount.toString()}
        onChange={onChange}
        onFocus={clearPlaceholder}
        onBlur={onEditorBlur}
        disabled={disabled}
        type="number"
        inputProps={{ 
          min: '0', 
          className: classes.input,
          onKeyDown: (e) => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault(),
        }}
        endAdornment={
          <InputAdornment className={classes.endAdornment} position="end">
            {fixedToken ? (
              legacyZil ? (
                <Box display="flex">
                  {showMaxButton && (
                    <Button
                      className={classes.maxButton}
                      disabled={disabled}
                      onClick={onSelectMax}
                      disableRipple
                    >
                      <Typography>MAX</Typography>
                    </Button>
                  )}
                  <Box py={'4px'} px={'16px'} className={classes.currencyButton}>
                    <Box display="flex" alignItems="center">
                      <CurrencyLogo
                        legacy="true"
                        currency={token?.symbol}
                        address={token?.logoAddress ?? token?.address}
                        blockchain={token?.blockchain}
                        className={classes.currencyLogo}
                      />
                      <Typography variant="button" className={classes.currencyText}>
                        ZIL
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box py={'4px'} px={'16px'} className={classes.currencyButton}>
                  <Box display="flex" alignItems="center">
                    <CurrencyLogo
                      currency={token?.symbol}
                      address={token?.logoAddress ?? token?.address}
                      blockchain={token?.blockchain}
                      className={classes.currencyLogo}
                    />
                    <Typography variant="button" className={classes.currencyText}>
                      {token?.symbol}
                    </Typography>
                  </Box>
                </Box>
              )
            ) : (
              <Box display="flex">
                {showMaxButton && (
                  <Button
                    className={classes.maxButton}
                    disabled={disabled}
                    onClick={onSelectMax}
                    disableRipple
                  >
                    <Typography>MAX</Typography>
                  </Button>
                )}
                <Button
                  disableRipple
                  className={classes.currencyButton}
                  onClick={() => setShowCurrencyDialog(true)}
                >
                  <Box display="flex" alignItems="center">
                    {token && (
                      <CurrencyLogo
                        currency={token.registered && token.symbol}
                        blockchain={token?.blockchain}
                        address={token?.logoAddress ?? token?.address}
                        className={classes.currencyLogo}
                      />
                    )}
                    <Typography variant="button" className={classes.currencyText}>
                      {formatSymbol(token) && (
                        <Box component="span" ml={1} display="flex" flexDirection="column" textAlign="right">
                          {formatSymbol(token)}
                          {showAmplification && (<Typography color="textSecondary" variant="body2" component="span">
                            Amplification: {ampFactor?.shiftedBy(-4).toFormat()}x
                          </Typography>)}
                        </Box>
                      )}
                      {!formatSymbol(token) && (
                        <Box component="span" ml={1}>
                          Select Token
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  <ExpandMoreIcon className={classes.expandIcon} />
                </Button>
              </Box>
            )}
          </InputAdornment>
        }
      />
      {children}
      <CurrencyDialog
        {...dialogOpts}
        token={token}
        tokenList={tokenList}
        open={showCurrencyDialog || showDialogOverride || false}
        onSelectCurrency={onCurrencySelect}
        onClose={onCloseDialog}
        allowNewToken={allowNewToken}
        tokensWithPoolsOnly={tokensWithPoolsOnly}
      />
    </form>
  );
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {},
  form: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  inputRow: {
    paddingLeft: 0,
    backgroundColor: theme.palette.currencyInput,
    border: 0,
  },
  input: {
    textAlign: 'left',
    '&.Mui-disabled': {
      color: theme.palette.type === 'light' ? '#003340' : '#DEFFFF',
      opacity: 0.6
    },
  },
  inputRowNoLabel: {
    '& .MuiInputBase-input': {
      padding: '14px 18px 12px',
    },
    '& .MuiButtonBase-root': {
      padding: '14px 18px 12px 5px',
    },
  },
  label: {
    position: 'absolute',
    color: theme.palette.text?.primary,
    left: 20,
    top: 12,
    zIndex: 1,
  },
  balance: {
    position: 'absolute',
    color: theme.palette.text?.primary,
    right: 20,
    top: 12,
    zIndex: 1,
  },
  endAdornment: {
    height: 'auto',
    maxHeight: 'none',
  },
  currencyButton: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'Avenir Next',
    fontWeight: 'bold',
    borderRadius: 12,
    padding: '30px 18px 8px 5px',
    color: theme.palette.text?.primary,
    '& .MuiButton-label': {
      padding: theme.spacing(0.75),
    },
    '&:hover': {
      backgroundColor: 'transparent',
      '& .MuiButton-label': {
        backgroundColor:
          theme.palette.type === 'dark'
            ? 'rgba(222, 255, 255, 0.08)'
            : 'rgba(0, 51, 64, 0.05)',
        borderRadius: 12,
      },
    },
  },
  currencyText: {
    fontSize: 20,
  },
  currencyLogo: {
    marginRight: theme.spacing(1),
    '& svg': {
      display: 'block',
    },
  },
  expandIcon: {
    marginLeft: theme.spacing(1),
    color: theme.palette.text?.primary,
  },
  maxButton: {
    display: 'flex',
    padding: '34px 0px 12px 5px',
    color: theme.palette.type === 'dark' ? '#003340' : '#DEFFFF',
    '& .MuiButton-label': {
      width: 'inherit',
      padding: '2px 4px',
      backgroundColor: `rgba${hexToRGBA(
        theme.palette.type === 'dark' ? '#00FFB0' : '#003340',
        0.75
      )}`,
      borderRadius: 5,
      '& .MuiTypography-root': {
        fontWeight: 'bold',
      },
      '&:hover': {
        backgroundColor: `rgba${hexToRGBA(
          theme.palette.type === 'dark' ? '#00FFB0' : '#003340',
          0.5
        )}`,
      },
    },
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '&.Mui-disabled': {
      color: theme.palette.type === 'dark' ? '#003340' : '#DEFFFF',
      '& .MuiButton-label': {
        backgroundColor: `rgba${hexToRGBA(
          theme.palette.type === 'dark' ? '#00FFB0' : '#003340',
          0.4
        )}`,
      },
    },
  },
  bidDialog: {
    '& .MuiInputBase-input': {
      padding: '56px 18px 12px!important',
    },
    '& .MuiButtonBase-root': {
      padding: '56px 18px 12px 5px',
    },
  },

  legacy: {
    width: 30,
    height: 30,
    display: 'flex',
    borderRadius: 14,
    padding: 2,
  },
  legacySvg: {
    maxWidth: '100%',
    width: 'unset',
    height: 'unset',
    flex: 1,
  },
}));

export default CurrencyInput;
