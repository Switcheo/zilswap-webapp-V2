import { Box, CircularProgress, IconButton, makeStyles, Tooltip } from "@material-ui/core"
import { ArrowBack } from "@material-ui/icons"
import { CurrencyLogo, FancyButton, HelpInfo, KeyValueDisplay, Text } from "app/components"
import { actions } from "app/store"
import { BridgeableToken, BridgeFormState, BridgeState, BridgeTx } from "app/store/bridge/types"
import { RootState, TokenInfo } from "app/store/types"
import { AppTheme } from "app/theme/types"
import { BIG_ZERO, Blockchain, bnOrZero, BridgeableEvmChains, CHAIN_NAMES, ChainConfig, chainConfigs, DISABLE_ZILBRIDGE, ETH_ADDRESS, fgBridgeTransfer, fgGetFees, getETHClient, hexToRGBA, isBlacklistedBridgeDenoms, SimpleMap, trimValue, truncate, useAsyncTask, useNetwork, useToaster } from "app/utils"
import erc20Abi from "app/utils/abi/erc20.abi.json"
import ChainLogo from 'app/views/bridge/NewBridge/components/ChainLogo/ChainLogo'
import TransactionDetail from "app/views/bridge/TransactionDetail"
import BigNumber from "bignumber.js"
import cls from "classnames"
import { logger } from "core/utilities"
import { ConnectedBridgeWallet } from "core/wallet/ConnectedBridgeWallet"
import dayjs from "dayjs"
import { ethers } from "ethers"
import { useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Network } from "zilswap-sdk"
import { ReactComponent as WavyLine } from "../../wavy-line.svg"

const ConfirmTransfer = (props: any) => {
  const { showTransfer } = props
  const classes = useStyles()
  const dispatch = useDispatch()
  const toaster = useToaster()
  const network = useNetwork()

  const ethWallet = useSelector<RootState, ConnectedBridgeWallet | null>(state => state.wallet.bridgeWallets.eth)
  const bridgeState = useSelector<RootState, BridgeState>(state => state.bridge)
  const tokens = useSelector<RootState, SimpleMap<TokenInfo>>(state => state.token.tokens)
  const bridgeFormState = useSelector<RootState, BridgeFormState>(state => state.bridge.formState)
  const bridgeToken = useSelector<RootState, BridgeableToken | undefined>(state => state.bridge.formState.token)

  const [tokenApproval, setTokenApproval] = useState<boolean>(false)
  const [approvalHash, setApprovalHash] = useState<string>("")

  const pendingBridgeTx = bridgeState.activeBridgeTx

  const [runConfirmTransfer, loadingConfirm] = useAsyncTask("confirmTransfer", (error) => toaster(error.message, { overridePersist: false }))

  const { toBlockchain, fromBlockchain, withdrawFee } = bridgeFormState

  const canNavigateBack = useMemo(() => !pendingBridgeTx, [pendingBridgeTx])

  const fromToken = useMemo(() => {
    if (!bridgeToken) return
    return tokens[`${bridgeToken.blockchain}--${bridgeToken.tokenAddress}`];
  }, [bridgeToken, tokens])

  const { fromChainName, toChainName } = useMemo(() => {
    return {
      fromChainName: CHAIN_NAMES[bridgeFormState.fromBlockchain],
      toChainName: CHAIN_NAMES[bridgeFormState.toBlockchain],
    }
  }, [bridgeFormState.fromBlockchain, bridgeFormState.toBlockchain])

  const isBlacklistedDenom = useMemo(() => {
    return isBlacklistedBridgeDenoms(bridgeToken?.tokenAddress ?? '')
  }, [bridgeToken?.tokenAddress])

  const transferFee = useMemo(() => withdrawFee[fromBlockchain]?.[fromToken?.address], [withdrawFee, fromBlockchain, fromToken])

  if (!showTransfer) return null

  // returns true if asset is native coin, false otherwise
  const isNativeAsset = (asset: BridgeableToken) => {
    return (asset.tokenAddress === ETH_ADDRESS)
  }

  const isApprovalRequired = async (asset: BridgeableToken) => {
    return !isNativeAsset(asset)
  }

  /**
    * Bridge the asset from Ethereum chain
    * returns the txn hash if bridge txn is successful, otherwise return null
    * @param asset         details of the asset being bridged; retrieved from carbon
    */
  async function bridgeAsset(asset: BridgeableToken) {
    if (!fromToken || !bridgeFormState.sourceAddress || !bridgeFormState.destAddress) {
      return
    }

    const ethersProvider = new ethers.providers.Web3Provider(ethWallet?.provider)
    const signer: ethers.Signer = ethersProvider.getSigner()

    const provider = getETHClient(asset.blockchain as BridgeableEvmChains, Network.MainNet)
    const tknContract = new ethers.Contract(asset.tokenAddress, erc20Abi, provider);

    const amount = bridgeFormState.transferAmount
    const ethAddress = await signer.getAddress()
    const depositAmt = amount.shiftedBy(asset.decimals)

    // approve token
    const approvalRequired = await isApprovalRequired(asset)
    if (approvalRequired) {
      const allowanceResult = await tknContract.allowance(ethAddress, asset.tokenManagerAddress);
      const allowance = new BigNumber(allowanceResult.toString());
      if (allowance.lt(depositAmt)) {
        toaster(`Approval needed (${fromBlockchain.toUpperCase()})`, { overridePersist: false })
        const amount = depositAmt.minus(allowance);
        const approveTx = await tknContract.connect(signer).approve(asset.tokenManagerAddress, amount.toString(10))

        logger("approve tx", approveTx.hash)
        toaster(`Submitted: (${fromBlockchain.toUpperCase()} - ERC20 Approval)`, { hash: approveTx.hash!.replace(/^0x/i, ""), sourceBlockchain: fromBlockchain })
        setApprovalHash(approveTx.hash!)
        const txReceipt = await ethersProvider.waitForTransaction(approveTx.hash!)

        // token approval success
        if (approveTx !== undefined && txReceipt?.status === 1) {
          setTokenApproval(true)
        } else {
          setTokenApproval(false)
        }
      }
    } else {
      setTokenApproval(true)
    }

    toaster(`Bridging asset (${fromBlockchain.toUpperCase()})`, { overridePersist: false });

    const tknMngrContract = new ethers.Contract(asset.tokenManagerAddress, [fgBridgeTransfer, fgGetFees], provider);
    const feeAmt = await tknMngrContract.getFees();
    const remoteChain: ChainConfig = chainConfigs[network][toBlockchain]!;
    const value = asset.tokenAddress === ETH_ADDRESS ? depositAmt.plus(feeAmt.toString()) : bnOrZero(feeAmt.toString())
    const bridgeTx = await tknMngrContract.connect(signer).transfer(asset.tokenAddress, remoteChain.chainId, bridgeFormState.destAddress, depositAmt.toString(10), {
      value: value.toString(10),
    })

    if (!bridgeTx) {
      return
    }

    toaster(`Submitted: (${fromBlockchain.toUpperCase()} - Bridge Asset)`, { sourceBlockchain: fromBlockchain, hash: bridgeTx.hash!.replace(/^0x/i, "") })
    logger("bridge tx", bridgeTx.hash!)

    return bridgeTx.hash
  }

  const onConfirm = async () => {
    runConfirmTransfer(async () => {
      if (!bridgeToken) return;

      const sourceTxHash = await bridgeAsset(bridgeToken);
      const { destAddress, sourceAddress } = bridgeFormState
      if (!destAddress || !sourceAddress || !bridgeToken || !fromToken) return

      const xbridgeFee = withdrawFee[fromBlockchain]?.[bridgeToken.tokenAddress]
      const bridgeTx: BridgeTx = {
        dstAddr: destAddress.toLowerCase(),
        srcAddr: sourceAddress.toLowerCase(),
        dstChain: toBlockchain,
        srcChain: fromBlockchain,
        network: network,
        srcToken: bridgeToken.tokenAddress,
        dstToken: bridgeToken.chains[toBlockchain],
        sourceTxHash: sourceTxHash,
        inputAmount: bridgeFormState.transferAmount,
        withdrawFee: xbridgeFee ?? BIG_ZERO,
        sourceDispatchedAt: dayjs(),
      }

      dispatch(actions.Bridge.addBridgeTx([bridgeTx]))
      dispatch(actions.Layout.showTransferConfirmation(false))
    })
  }

  const conductAnotherTransfer = () => {
    dispatch(actions.Layout.showTransferConfirmation(false))
  }

  const navigateBack = () => {
    dispatch(actions.Layout.showTransferConfirmation(false))
  }

  const formatAddress = (address: string | undefined | null, chain: Blockchain) => {
    if (!address) return ""
    return truncate(address, 5, 4)
  }

  if (!pendingBridgeTx) {
    return (
      <Box className={cls(classes.root, classes.container)}>
        {canNavigateBack && (
          <IconButton onClick={() => navigateBack()} className={classes.backButton}>
            <ArrowBack />
          </IconButton>
        )}

        <Box display="flex" flexDirection="column" alignItems="center">
          <Text variant="h2">Confirm Transfer</Text>

          <Text variant="h4" margin={0.5} align="center">
            Please review your transaction carefully.
          </Text>

          <Text color="textSecondary" align="center">
            Transactions are non-reversible once they are processed.
          </Text>
        </Box>

        <Box className={classes.box} bgcolor="background.contrast">
          <Tooltip title={bridgeFormState.transferAmount.toString()}>
            <Box className={classes.transferBox}>
              <Text>Transferring</Text>
              <Text variant="h2" className={classes.amount}>
                {trimValue(bridgeFormState.transferAmount.toString(10))}
                <CurrencyLogo className={classes.token} currency={fromToken?.symbol} address={fromToken?.logoAddress ?? fromToken?.address} blockchain={fromToken?.blockchain} />
                {fromToken?.symbol}
              </Text>
            </Box>
          </Tooltip>

          <Box mt={2} display="flex" justifyContent="space-between" position="relative">
            <Box className={classes.networkBox} flex={1}>
              <Text variant="h4" color="textSecondary">From</Text>
              <Box display="flex" flex={1} alignItems="center" justifyContent="center" mt={1.5} mb={1.5}>
                <ChainLogo chain={bridgeState.formState.fromBlockchain} />
              </Box>
              <Text variant="h4" className={classes.chainName}>{fromChainName}</Text>
              <Text variant="button" className={classes.walletAddress}>{formatAddress(bridgeState.formState.sourceAddress, fromBlockchain)}</Text>
            </Box>
            <Box flex={0.2} />
            <WavyLine className={classes.wavyLine} />
            <Box className={classes.networkBox} flex={1}>
              <Text variant="h4" color="textSecondary">To</Text>
              <Box display="flex" flex={1} alignItems="center" justifyContent="center" mt={1.5} mb={1.5}>
                <ChainLogo chain={bridgeState.formState.toBlockchain} />
              </Box>
              <Text variant="h4" className={classes.chainName}>{toChainName}</Text>
              <Text variant="button" className={classes.walletAddress}>{formatAddress(bridgeState.formState.destAddress, toBlockchain)}</Text>
            </Box>
          </Box>
        </Box>

        <Box marginTop={3} marginBottom={0.5} px={2}>
          {/* <KeyValueDisplay kkey={<strong>Estimated Total Fees</strong>} mb="8px">
            ~ <span className={classes.textColoured}>${withdrawFee?.value.toFixed(2) || 0}</span>
            <HelpInfo className={classes.helpInfo} placement="top" title="Estimated total fees to be incurred for this transfer (in USD). Please note that the fees will be deducted from the amount that is being transferred out of the network and you will receive less tokens as a result." />
          </KeyValueDisplay> */}
          <KeyValueDisplay kkey={<span>&nbsp; • &nbsp;{toChainName} Txn Fee</span>} mb="8px">
            <span className={classes.textColoured}>{transferFee?.shiftedBy(-18).toFixed(5) ?? "-"}</span>
            {" "}
            {chainConfigs[network]?.[fromBlockchain as Blockchain]?.nativeTokenSymbol}
            <HelpInfo className={classes.helpInfo} placement="top" title="Estimated network fees incurred to pay the relayer." />
          </KeyValueDisplay>
          <KeyValueDisplay kkey="Estimated Transfer Time" mb="8px"><span className={classes.textColoured}>&lt; 30</span> Minutes<HelpInfo className={classes.helpInfo} placement="top" title="Estimated time for the completion of this transfer." /></KeyValueDisplay>
        </Box>

        <FancyButton
          disabled={!!DISABLE_ZILBRIDGE || isBlacklistedDenom || loadingConfirm || !!pendingBridgeTx}
          onClick={onConfirm}
          variant="contained"
          color="primary"
          className={classes.actionButton}>
          {loadingConfirm &&
            <CircularProgress size={20} className={classes.progress} />
          }
          {bridgeState.formState.fromBlockchain === Blockchain.Zilliqa
            ? `Confirm (ZIL -> ${bridgeState.formState.toBlockchain.toUpperCase()})`
            : `Confirm (${bridgeState.formState.fromBlockchain.toUpperCase()} -> ZIL)`
          }
        </FancyButton>
      </Box>
    )
  } else {
    return (
      <TransactionDetail onBack={canNavigateBack ? navigateBack : undefined} onNewTransfer={conductAnotherTransfer} currentTx={pendingBridgeTx} approvalHash={approvalHash} tokenApproval={tokenApproval} />
    )
  }
}

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    "& .MuiAccordionSummary-root": {
      display: "inline-flex"
    },
    "& .MuiAccordionSummary-root.Mui-expanded": {
      minHeight: "48px"
    },
    "& .MuiAccordionDetails-root": {
      padding: "0px 16px 16px",
      display: "inherit"
    },
    "& .MuiAccordionSummary-content.Mui-expanded": {
      margin: 0
    }
  },
  container: {
    padding: theme.spacing(2, 4, 0),
    maxWidth: 488,
    margin: "0 auto",
    boxShadow: theme.palette.mainBoxShadow,
    borderRadius: 12,
    background: theme.palette.type === "dark" ? "linear-gradient(#13222C, #002A34)" : "#F6FFFC",
    border: theme.palette.border,
    [theme.breakpoints.down("sm")]: {
      maxWidth: 450,
      padding: theme.spacing(2, 2, 0),
    }
  },
  actionButton: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    height: 46
  },
  backButton: {
    marginLeft: theme.spacing(-1),
    color: theme.palette.text?.secondary,
    padding: "6px"
  },
  box: {
    marginTop: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    padding: theme.spacing(1.5)
  },
  amount: {
    display: "inline-flex",
    marginTop: theme.spacing(1)
  },
  token: {
    margin: theme.spacing(0, 1)
  },
  transferBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: theme.palette.type === "dark" ? `rgba${hexToRGBA("#DEFFFF", 0.1)}` : `rgba${hexToRGBA("#003340", 0.05)}`,
    padding: theme.spacing(1),
    overflow: "auto",
  },
  networkBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(1)
  },
  label: {
    color: theme.palette.label
  },
  textColoured: {
    color: theme.palette.primary.dark
  },
  helpInfo: {
    verticalAlign: "text-top!important"
  },
  approvedHelpInfo: {
    verticalAlign: "top!important",
  },
  textWarning: {
    color: theme.palette.warning.main
  },
  textSuccess: {
    color: theme.palette.primary.dark
  },
  successIcon: {
    verticalAlign: "middle",
    marginBottom: theme.spacing(0.7)
  },
  dropDownIcon: {
    color: theme.palette.primary.light
  },
  accordion: {
    borderRadius: "12px",
    boxShadow: "none",
    border: "none",
    backgroundColor: theme.palette.type === "dark" ? `rgba${hexToRGBA("#DEFFFF", 0.1)}` : `rgba${hexToRGBA("#003340", 0.05)}`,
    "& .MuiIconButton-root": {
      padding: 0,
      marginRight: 0
    }
  },
  checkIcon: {
    fontSize: "1rem",
    verticalAlign: "sub",
    color: theme.palette.primary.light,
  },
  wavyLine: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: "-70px",
    marginTop: "-40px",
    width: "140px",
    [theme.breakpoints.down("xs")]: {
      width: "100px",
      marginLeft: "-50px",
    },
  },
  chainName: {
    [theme.breakpoints.down("xs")]: {
      fontSize: "12px"
    },
  },
  walletAddress: {
    [theme.breakpoints.down("xs")]: {
      fontSize: "12px"
    },
  },
  progress: {
    color: "rgba(255,255,255,.5)",
    marginRight: theme.spacing(1)
  },
}))

export default ConfirmTransfer
