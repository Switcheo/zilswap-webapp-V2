import { Box, BoxProps, CircularProgress, IconButton, Link, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import FailIcon from "@material-ui/icons/CancelOutlined";
import CheckmarkIcon from "@material-ui/icons/CheckOutlined";
import CloseIcon from "@material-ui/icons/CloseOutlined";
import LaunchIcon from '@material-ui/icons/Launch';
import TimeoutIcon from "@material-ui/icons/TimerOutlined";
import { BridgeTx, RootState, TransactionState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { Blockchain, getExplorerLink, truncate, useNetwork } from "app/utils";
import cls from "classnames";
import { SnackbarContent, SnackbarKey, SnackbarProvider } from "notistack";
import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { TxStatus } from "zilswap-sdk";

interface Props extends BoxProps {
  message: string,
  hash: string,
  providerRef: React.MutableRefObject<SnackbarProvider>,
  snackKey: SnackbarKey,
  sourceBlockchain: Blockchain,
}

const useStyles = makeStyles((theme: AppTheme) => ({
  icon: {
    fontSize: "16px",
    color: theme.palette.label,
  },
  snackbar: {
    background: theme.palette.background.default,
    border: theme.palette.border,
    color: theme.palette.label,
    padding: theme.spacing(2),
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    textAlign: "center"
  },
  link: {
    color: theme.palette.label,
  },
  linkIcon: {
    marginLeft: 4,
    verticalAlign: "text-bottom",
  },
}));

const LoadingIcon = () => {
  return (
    <CircularProgress style={{ display: "block" }} size={20} />
  );
};

const NotificationItem = forwardRef<HTMLDivElement, Props>((props, ref) => {
  const { children, message, hash, sourceBlockchain, providerRef, snackKey, className, ...rest } = props;
  const classes = useStyles();
  const network = useNetwork();
  const transactionState = useSelector<RootState, TransactionState>(state => state.transaction);
  const bridgeTxs = useSelector<RootState, BridgeTx[]>(state => state.bridge.bridgeTxs);
  const [txStatus, setTxStatus] = useState<TxStatus | "pending" | "submitted" | undefined>();

  const bridgeTx = useMemo(() => bridgeTxs.find(tx => tx.sourceTxHash?.replace(/^0x/i, "") === hash),[bridgeTxs, hash])

  useEffect(() => {
    if (bridgeTx) {
      setTxStatus(bridgeTx.destinationTxHash ? "confirmed" : "pending")
      return
    }

    const isObservedTx = transactionState.observingTxs.some(tx => tx.hash === hash)
    if (isObservedTx) {
      setTxStatus("pending")
      return
    }

    const submittedTx = transactionState.submittedTxs.find(tx => tx.hash === hash)
    if (!submittedTx) return

    if (submittedTx?.status === "confirmed" && message.toUpperCase() !== "transaction confirmed".toUpperCase()) {
      providerRef.current.closeSnackbar(snackKey);
    } else {
      setTxStatus(submittedTx.status);
    }
  }, [transactionState.submittedTxs, transactionState.observingTxs, bridgeTx, hash, message, providerRef, snackKey])

  const onClickDismiss = () => {
    return () => {
      if (providerRef.current) {
        providerRef.current.closeSnackbar(snackKey);
      }
    };
  };

  const checkMessage = () => {
    if (message.includes("reject")) return "rejected";
    if (message.includes("expire")) return "expired";
  }

  const getTxStatusIcon = () => {
    switch (txStatus || checkMessage()) {
      case 'confirmed':
        return <CheckmarkIcon className={classes.icon} />;
      case 'rejected':
        return <FailIcon className={classes.icon} />;
      case 'expired':
        return <TimeoutIcon className={classes.icon} />;
      case 'pending':
        return <LoadingIcon />;
      default:
        return;
    }
  }

  const getMessage = () => {
    if (!hash || !sourceBlockchain) return message;
    switch (txStatus) {
      case 'confirmed':
        return "Confirmed";
      case 'rejected':
        return "Rejected";
      case 'expired':
        return "Expired";
      case 'pending':
        return "Confirming";
      default:
        return message;
    }
  }

  const getHref = (blockchain = sourceBlockchain, txHash = hash) => {
    switch (blockchain) {
      case Blockchain.Zilliqa: return `https://viewblock.io/zilliqa/tx/${txHash}?network=${network.toLowerCase()}`
      default: return getExplorerLink(txHash.replace(/^(0x)?/i, "0x"), network, blockchain)
    }
  }

  return (
    <SnackbarContent {...rest} ref={ref} className={classes.snackbar}>
      {getTxStatusIcon()}
      <Typography>&nbsp;&nbsp;{getMessage()}&nbsp;</Typography>
      {hash &&
        <Typography>
          <Link
            className={classes.link}
            underline="hover"
            rel="noopener noreferrer"
            target="_blank"
            href={getHref()}>
            {truncate(hash).replace(/^(0x)?/i, "0x")}
            <LaunchIcon className={cls(classes.icon, classes.linkIcon)} />
          </Link>
        </Typography>
      }
      {bridgeTx?.destinationTxHash && (
        <Typography>
          {" "} &gt;{" "}
          <Link
            className={classes.link}
            underline="hover"
            rel="noopener noreferrer"
            target="_blank"
            href={getHref(bridgeTx.dstChain, bridgeTx.destinationTxHash)}>
            {truncate(bridgeTx.destinationTxHash).replace(/^(0x)?/i, "0x")}
            <LaunchIcon className={cls(classes.icon, classes.linkIcon)} />
          </Link>
        </Typography>
      )}
      <Box flexGrow={1} />
      <IconButton size="small" onClick={onClickDismiss()}>
        <CloseIcon className={classes.icon} />
      </IconButton>
    </SnackbarContent>
  );
});

export default NotificationItem;
