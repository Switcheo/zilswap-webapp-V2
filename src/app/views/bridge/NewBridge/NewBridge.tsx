import { Box, Button, FormControl, InputLabel, MenuItem, OutlinedInput, Select, Tooltip, useMediaQuery, useTheme } from "@material-ui/core"
import { makeStyles } from "@material-ui/core/styles"
import { fromBech32Address, toBech32Address } from "@zilliqa-js/crypto"
import { CurrencyInput, Text } from 'app/components'
import NetworkSwitchDialog from "app/components/NetworkSwitchDialog"
import BridgeCard from "app/layouts/BridgeCard"
import { actions } from "app/store"
import { BridgeableToken, BridgeFormState, BridgeState } from 'app/store/bridge/types'
import { LayoutState, RootState, TokenInfo } from "app/store/types"
import { AppTheme } from "app/theme/types"
import { Blockchain, bnOrZero, getETHClient, getEvmChainIDs, hexToRGBA, SimpleMap, useAsyncTask, useNetwork } from "app/utils"
import { BIG_ZERO, BRIDGEABLE_EVM_CHAINS, CHAIN_NAMES, CurrencyListType, DISABLE_ZILBRIDGE, isBlacklistedBridgeDenoms } from "app/utils/constants"
import BigNumber from 'bignumber.js'
import cls from "classnames"
import { providerOptions } from "core/ethereum"
import { ConnectedBridgeWallet } from "core/wallet/ConnectedBridgeWallet"
import { ethers } from "ethers"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory, useLocation } from "react-router-dom"
import Web3Modal from 'web3modal'
import { Network } from "zilswap-sdk/lib/constants"
import { ConnectButton } from "./components"
import ChainLogo from './components/ChainLogo/ChainLogo'
import ConfirmTransfer from './components/ConfirmTransfer'
import ConnectETHPopper from './components/ConnectETHPopper'
import { BridgeParamConstants } from "./components/constants"
import { ReactComponent as WarningIcon } from "./warning.svg"
import { ReactComponent as WavyLine } from "./wavy-line.svg"

const initialFormState = {
  sourceAddress: '',
  destAddress: '',
  transferAmount: '0',
}

const BridgeView: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props: any) => {
  const { children, className, ...rest } = props
  const classes = useStyles()
  const dispatch = useDispatch()
  const network = useNetwork()
  const history = useHistory()
  const location = useLocation()
  const bridgeWallet = useSelector<RootState, ConnectedBridgeWallet | null>(state => state.wallet.bridgeWallets[Blockchain.Ethereum]) // eth wallet
  const bridgeState = useSelector<RootState, BridgeState>(store => store.bridge)
  const tokens = useSelector<RootState, SimpleMap<TokenInfo>>(store => store.token.tokens)
  const bridgeFormState = useSelector<RootState, BridgeFormState>(store => store.bridge.formState)
  const [formState, setFormState] = useState<typeof initialFormState>({
    sourceAddress: bridgeFormState.sourceAddress || "",
    destAddress: bridgeFormState.destAddress || "",
    transferAmount: bridgeFormState.transferAmount.toString() || "0"
  })
  const layoutState = useSelector<RootState, LayoutState>(store => store.layout)
  const [runLoadGasPrice] = useAsyncTask("loadGasPrice")
  const [disconnectMenu, setDisconnectMenu] = useState<any>()
  const [gasPrice, setGasPrice] = useState<BigNumber | undefined>()
  const disconnectSrcButtonRef = useRef(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true })

  const queryParams = new URLSearchParams(location.search)

  const tokenList: CurrencyListType = useMemo(() => {
    return `bridge-${bridgeFormState.fromBlockchain}` as CurrencyListType
  }, [bridgeFormState.fromBlockchain])

  const { token: bridgeToken, fromBlockchain, toBlockchain } = bridgeFormState

  const destToken = useMemo(() => {
    if (bridgeToken) {
      return bridgeState.tokens.find(token => token.tokenAddress === bridgeToken.chains[toBlockchain])
    }
  }, [bridgeState.tokens, bridgeToken, toBlockchain])

  // update state from param
  useEffect(() => {
    let queryTokenAddress = queryParams.get("token")

    if (!queryTokenAddress || !bridgeState.tokens) return

    let queryToken

    if (queryTokenAddress.startsWith("zil")) {
      try {
        queryTokenAddress = fromBech32Address(queryTokenAddress).toLowerCase()
      } catch {
        return
      }
    }
    queryTokenAddress = queryTokenAddress.replace(/^0x/, '')

    const bridgeTokens = bridgeState.tokens.filter(token => token.blockchain === fromBlockchain)

    bridgeTokens.forEach(token => {
      if (token.tokenAddress === queryTokenAddress) {
        queryToken = token
        return
      } else if (destToken?.tokenAddress === queryTokenAddress) {
        queryToken = bridgeState.tokens.find(token => token.tokenAddress === queryTokenAddress && token.blockchain === toBlockchain)
        swapBridgeChains()
        return
      }
    })

    if (queryToken) {
      dispatch(actions.Bridge.updateForm({
        token: queryToken
      }))
    }

    // eslint-disable-next-line
  }, [bridgeState.tokens])

  // update param from state
  useEffect(() => {
    if (!bridgeToken) {
      return
    }

    let tokenAddress = bridgeToken.tokenAddress

    if (fromBlockchain === Blockchain.Zilliqa) {
      tokenAddress = toBech32Address(tokenAddress).toLowerCase()
    }

    queryParams.set("token", tokenAddress)
    history.replace({ search: queryParams.toString() })

    // eslint-disable-next-line
  }, [bridgeToken])


  useEffect(() => {
    runLoadGasPrice(async () => {
      if (!fromBlockchain) return

      const gasPrice = await getETHClient(fromBlockchain, network).getGasPrice()
      setGasPrice(new BigNumber(gasPrice.toString()))
    })

  }, [runLoadGasPrice, fromBlockchain, network])

  const fromToken = useMemo(() => {
    if (!bridgeToken) return
    return tokens[`${bridgeToken.blockchain}--${bridgeToken.tokenAddress}`];
  }, [bridgeToken, tokens])

  useEffect(() => {
    const bridgeTx = bridgeState.activeBridgeTx

    if (bridgeTx) {
      if (!layoutState.showTransferConfirmation) {
        dispatch(actions.Layout.showTransferConfirmation())
      }

      const bridgeTokens = bridgeState.tokens.filter(token => token.blockchain === bridgeTx.srcChain)
      const bridgeToken = bridgeTokens.find(token => token.tokenAddress === bridgeTx.srcToken)

      dispatch(actions.Bridge.updateForm({
        destAddress: bridgeTx.dstAddr,
        sourceAddress: bridgeTx.srcAddr,
        fromBlockchain: bridgeTx.srcChain,
        toBlockchain: bridgeTx.dstChain,
        forNetwork: network,
        token: bridgeToken,
      }))
    }
  }, [bridgeState.activeBridgeTx, bridgeState.tokens, layoutState, network, dispatch])

  const setSourceAddress = (address: string) => {

    setFormState(prevState => ({
      ...prevState,
      sourceAddress: address
    }))
    dispatch(actions.Bridge.updateForm({
      sourceAddress: address
    }))
  }

  const setDestAddress = (address: string) => {
    setFormState(prevState => ({
      ...prevState,
      destAddress: address
    }))
    dispatch(actions.Bridge.updateForm({
      destAddress: address
    }))
  }

  const onFromBlockchainChange = (e: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
    if (e.target.value === Blockchain.Zilliqa) {
      dispatch(actions.Bridge.updateForm({
        fromBlockchain: Blockchain.Zilliqa,
        toBlockchain: Blockchain.BinanceSmartChain,
      }))
    } else if (BRIDGEABLE_EVM_CHAINS.includes(e.target.value)) {
      dispatch(actions.Bridge.updateForm({
        fromBlockchain: e.target.value,
        toBlockchain: Blockchain.Zilliqa,
      }))
    }
  }

  const onToBlockchainChange = (e: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
    if (e.target.value === Blockchain.Zilliqa) {
      dispatch(actions.Bridge.updateForm({
        fromBlockchain: Blockchain.BinanceSmartChain,
        toBlockchain: Blockchain.Zilliqa,
      }))
    } else if (BRIDGEABLE_EVM_CHAINS.includes(e.target.value)) {
      dispatch(actions.Bridge.updateForm({
        fromBlockchain: Blockchain.Zilliqa,
        toBlockchain: e.target.value,
      }))
    }
  }

  const onClickConnectETH = async () => {
    const web3Modal = new Web3Modal({
      cacheProvider: false,
      disableInjectedProvider: false,
      network: network === Network.MainNet ? 'mainnet' : 'testnet',
      providerOptions
    })

    const provider = await web3Modal.connect()
    const ethersProvider = new ethers.providers.Web3Provider(provider)
    const signer = ethersProvider.getSigner()
    const ethAddress = await signer.getAddress()
    const chainId = (await ethersProvider.getNetwork()).chainId

    setSourceAddress(ethAddress)
    if (!bridgeFormState.destAddress)
      setDestAddress(ethAddress)

    dispatch(actions.Wallet.setBridgeWallet({ blockchain: Blockchain.Ethereum, wallet: { provider: provider, address: ethAddress, chainId: chainId } }))
    dispatch(actions.Token.refetchState())
  }

  const onTransferAmountChange = (rawAmount: string = "0") => {
    let transferAmount = new BigNumber(rawAmount).decimalPlaces(fromToken?.decimals ?? 0)
    if (transferAmount.isNaN() || transferAmount.isNegative() || !transferAmount.isFinite()) transferAmount = BIG_ZERO

    setFormState({
      ...formState,
      transferAmount: rawAmount,
    })

    dispatch(actions.Bridge.updateForm({
      forNetwork: network,
      transferAmount,
    }))
  }

  const onEndEditTransferAmount = () => {
    setFormState({
      ...formState,
      transferAmount: bridgeFormState.transferAmount.toString(10),
    })
  }

  const onCurrencyChange = (token: TokenInfo) => {
    const tokenAddress = token.address.toLowerCase()
    const bridgeToken = bridgeState.tokens.find(bridgeToken => bridgeToken.tokenAddress === tokenAddress && bridgeToken.blockchain === fromBlockchain)

    if (bridgeFormState.token && bridgeFormState.token === bridgeToken) return

    dispatch(actions.Bridge.updateForm({
      forNetwork: network,
      token: bridgeToken
    }))
  }

  const swapBridgeChains = () => {

    const counterPartyToken = bridgeFormState.token ? bridgeState.tokens.find(t => t.chains[fromBlockchain] && t.symbol === bridgeFormState.token!.symbol) : undefined

    dispatch(actions.Bridge.updateForm({
      fromBlockchain: toBlockchain,
      toBlockchain: fromBlockchain,

      token: counterPartyToken,
    }))

    // clear query param
    history.replace({ search: "" })
  }

  const showTransfer = () => {
    if (!(
      (Array.from(getEvmChainIDs(network).values()).includes(Number(bridgeWallet?.chainId))) ||
      (Array.from(getEvmChainIDs(network).values()).includes(Number(bridgeWallet?.chainId)))
    )) {
      dispatch(actions.Layout.toggleShowNetworkSwitch("open"))
      return
    }

    dispatch(actions.Layout.showTransferConfirmation(!layoutState.showTransferConfirmation))
  }

  const onConnectSrcWallet = () => {
    // if connected, open menu
    if (bridgeFormState.sourceAddress && bridgeWallet) {
      setDisconnectMenu(disconnectSrcButtonRef)
    } else {
      return onClickConnectETH()
    }
  }

  const onDisconnectEthWallet = (clear?: boolean) => {
    let disconnectForm = {}
    if (toBlockchain === Blockchain.Zilliqa) {
      disconnectForm = {
        sourceAddress: undefined,
        token: undefined,
      }
    } else {
      disconnectForm = {
        destAddress: undefined,
        token: undefined,
      }
    }
    const web3Modal = new Web3Modal({
      cacheProvider: true,
      disableInjectedProvider: false,
      network: "testnet",
      providerOptions
    })
    if (clear) {
      web3Modal.clearCachedProvider()
    }
    setDisconnectMenu(null)
    dispatch(actions.Bridge.updateForm(disconnectForm))
    dispatch(actions.Wallet.setBridgeWallet({ blockchain: Blockchain.Ethereum, wallet: null }))
  }

  const isSubmitEnabled = useMemo(() => {
    if (!formState.sourceAddress || !formState.destAddress)
      return false
    if (bridgeFormState.transferAmount.isZero())
      return false
    if (!fromToken)
      return false
    if (fromToken && bridgeFormState.transferAmount.isGreaterThan(bnOrZero(fromToken.balance).shiftedBy(-fromToken.decimals)))
      return false
    if (isMobile)
      return false

    return true
  }, [formState, bridgeFormState.transferAmount, fromToken, isMobile])

  // returns true if asset is native coin, false otherwise
  const isNativeAsset = (asset: BridgeableToken) => {
    const zeroAddress = "0000000000000000000000000000000000000000"
    return (asset.tokenAddress === zeroAddress)
  }

  const adjustedForGas = (balance: BigNumber, blockchain: Blockchain) => {
    if (blockchain === Blockchain.Zilliqa) {
      const gasPrice = new BigNumber(`${BridgeParamConstants.ZIL_GAS_PRICE}`)
      const gasLimit = new BigNumber(`${BridgeParamConstants.ZIL_GAS_LIMIT}`)

      return balance.minus(gasPrice.multipliedBy(gasLimit))
    } else {
      const gasPriceGwei = new BigNumber(ethers.utils.formatUnits((gasPrice ?? new BigNumber(65)).toString(10), "gwei"))
      const gasLimit = new BigNumber(`${blockchain === Blockchain.Ethereum ? BridgeParamConstants.ETH_GAS_LIMIT : BridgeParamConstants.ARBITRUM_GAS_LIMIT}`)

      return balance.minus(gasPriceGwei.multipliedBy(gasLimit))
    }
  }

  const onSelectMax = async () => {
    if (!fromToken) return

    let balance = bnOrZero(fromToken.balance)
    const asset = bridgeState.tokens.find(t => t.tokenAddress === fromToken.hash)

    if (!asset) return

    // Check if gas fees need to be deducted
    if (isNativeAsset(asset) && CHAIN_NAMES[fromToken.blockchain] === fromBlockchain) {
      balance = adjustedForGas(balance, fromToken.blockchain)
    }

    setFormState({
      ...formState,
      transferAmount: balance.decimalPlaces(0).shiftedBy(-fromToken.decimals).toString(),
    })

    dispatch(actions.Bridge.updateForm({
      forNetwork: network,
      transferAmount: balance.decimalPlaces(0).shiftedBy(-fromToken.decimals),
    }))
  }

  const isBlacklistedDenom = useMemo(() => {
    return isBlacklistedBridgeDenoms(bridgeToken?.tokenAddress ?? '')
  }, [bridgeToken?.tokenAddress])

  const onEnterKeyPress = () => {
    if (isSubmitEnabled) {
      showTransfer()
    }
  }

  return (
    <BridgeCard {...rest} className={cls(classes.root, className)}>
      {!layoutState.showTransferConfirmation && (
        <Box display="flex" flexDirection="column" className={classes.container}>
          <Text variant="h2" align="center" marginTop={2}>
            Zil<span className={classes.textColoured}>Bridge</span>
          </Text>
          <Text margin={1} align="center" color="textSecondary" className={classes.textSpacing}>
            <Tooltip placement="bottom" arrow title="Universal Cross-Chain Bridge">
              <span>
                Powered by Zilliqa
                {" "}
                <a href="https://github.com/Zilliqa/xbridge" target="_blank" rel="noreferrer">UCCB</a>
              </span>
            </Tooltip>
          </Text>

          {(Boolean(DISABLE_ZILBRIDGE) || isBlacklistedDenom) && (
            <Box className={classes.errorBox}>
              <WarningIcon className={classes.warningIcon} />
              <Text>
                Bridge is disabled.
                Follow us on <a href="https://twitter.com/ZilSwap" target="_blank" rel="noreferrer">twitter</a> for updates.
              </Text>
            </Box>
          )}

          <Box mt={2} mb={2} display="flex" justifyContent="space-between" position="relative">
            <Box className={classes.box} bgcolor="background.contrast">
              <Text variant="h4" align="center">From</Text>
              <Box display="flex" flex={1} alignItems="center" justifyContent="center" mt={1.5} mb={1.5}>
                <ChainLogo chain={fromBlockchain} />
              </Box>
              <Box display="flex" justifyContent="center">
                <FormControl variant="outlined" className={classes.formControl}>
                  <Select
                    MenuProps={{ classes: { paper: classes.selectMenu } }}
                    value={fromBlockchain}
                    onChange={onFromBlockchainChange}
                    label=""
                  >
                    <MenuItem value={Blockchain.Zilliqa}>Zilliqa</MenuItem>
                    <MenuItem value={Blockchain.Ethereum}>Ethereum</MenuItem>
                    <MenuItem value={Blockchain.Arbitrum}>Arbitrum</MenuItem>
                    <MenuItem value={Blockchain.BinanceSmartChain}>BSC</MenuItem>
                    <MenuItem value={Blockchain.Polygon}>Polygon</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box flex={0.3} />
            <WavyLine className={classes.wavyLine} onClick={swapBridgeChains} />
            <Box className={classes.box} bgcolor="background.contrast">

              <Text variant="h4" align="center">To</Text>

              <Box display="flex" flex={1} alignItems="center" justifyContent="center" mt={1.5} mb={1.5}>
                <ChainLogo chain={toBlockchain} />
              </Box>
              <Box display="flex" justifyContent="center">
                <FormControl variant="outlined" className={classes.formControl}>
                  <Select
                    MenuProps={{ classes: { paper: classes.selectMenu } }}
                    value={toBlockchain}
                    onChange={onToBlockchainChange}
                    label=""
                  >
                    <MenuItem value={Blockchain.Ethereum}>Ethereum</MenuItem>
                    <MenuItem value={Blockchain.Zilliqa}>Zilliqa</MenuItem>
                    <MenuItem value={Blockchain.Arbitrum}>Arbitrum</MenuItem>
                    <MenuItem value={Blockchain.BinanceSmartChain}>BSC</MenuItem>
                    <MenuItem value={Blockchain.Polygon}>Polygon</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Box>

          <ConnectButton
            className={classes.connectButton}
            innerRef={disconnectSrcButtonRef}
            chain={fromBlockchain}
            address={bridgeFormState.sourceAddress || ''}
            onClick={onConnectSrcWallet}
          />

          <CurrencyInput
            label="Transfer Amount"
            disabled={!bridgeFormState.sourceAddress}
            token={fromToken ?? null}
            amount={formState.transferAmount}
            onEditorBlur={onEndEditTransferAmount}
            onAmountChange={onTransferAmountChange}
            onCurrencyChange={onCurrencyChange}
            tokenList={tokenList}
            onSelectMax={onSelectMax}
            showMaxButton={true}
            onEnterKeyPress={onEnterKeyPress}
          />

          <div className={classes.inputContainer}>
            <InputLabel className={cls(classes.label)}>Recipient</InputLabel>
            <OutlinedInput
              readOnly
              value={formState.destAddress ?? formState.sourceAddress}
              className={classes.inputRow}
            // onChange={onChange}
            // onFocus={clearPlaceholder}
            // onBlur={onEditorBlur}
            />
          </div>

          <Button
            onClick={showTransfer}
            disabled={!isSubmitEnabled || DISABLE_ZILBRIDGE || isBlacklistedDenom}
            className={classes.actionButton}
            color="primary"
            variant="contained">
            {bridgeFormState.transferAmount.isZero()
              ? "Enter Amount"
              : !fromToken
                ? "Select Token"
                : "Head to Confirmation"
            }
          </Button>
        </Box>
      )}
      <NetworkSwitchDialog />
      <ConfirmTransfer showTransfer={layoutState.showTransferConfirmation} />
      <ConnectETHPopper
        open={!!disconnectMenu}
        anchorEl={disconnectMenu?.current}
        className={classes.priority}
        onChangeWallet={() => { onDisconnectEthWallet(true); onClickConnectETH() }}
        onDisconnectEth={() => onDisconnectEthWallet()}
        onClickaway={() => setDisconnectMenu(undefined)}
      />

    </BridgeCard >
  )
}

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
  },
  container: {
    maxWidth: 488,
    margin: "0 auto",
    boxShadow: theme.palette.mainBoxShadow,
    borderRadius: 12,
    background: theme.palette.type === "dark" ? "linear-gradient(#13222C, #002A34)" : "#F6FFFC",
    border: theme.palette.border,
    [theme.breakpoints.down("sm")]: {
      maxWidth: 450,
      padding: theme.spacing(2, 2, 0),
    },
    padding: theme.spacing(4, 4, 0),
    marginBottom: 12
  },
  actionButton: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(4),
    height: 46
  },
  connectButton: {
    marginTop: 0,
    marginBottom: theme.spacing(2),
  },
  connectedWalletButton: {
    backgroundColor: "transparent",
    border: `1px solid ${theme.palette.type === "dark" ? `rgba${hexToRGBA("#DEFFFF", 0.1)}` : "#D2E5DF"}`,
    "&:hover": {
      backgroundColor: theme.palette.label
    }
  },
  textColoured: {
    color: theme.palette.primary.dark
  },
  textSpacing: {
    letterSpacing: "0.5px"
  },
  box: {
    display: "flex",
    flex: "1 1 0",
    flexDirection: "column",
    border: `1px solid ${theme.palette.type === "dark" ? "#29475A" : "#D2E5DF"}`,
    borderRadius: 12,
    padding: theme.spacing(2, 1)
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
    display: "contents",
    "& .MuiSelect-select:focus": {
      backgroundColor: "transparent"
    },
    "& .MuiSelect-root": {
      borderRadius: 12,
      "&:hover": {
        backgroundColor: theme.palette.type === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"
      }
    },
    "& .MuiOutlinedInput-root": {
      border: "none",
    },
    "& .MuiInputBase-input": {
      fontWeight: "bold",
      fontSize: "16px"
    },
    "& .MuiSelect-icon": {
      top: "calc(50% - 14px)",
      fill: theme.palette.label
    },
    "& .MuiSelect-selectMenu": {
      minHeight: 0
    },
  },
  inputContainer: {
    marginTop: theme.spacing(2),
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    position: 'absolute',
    color: theme.palette.text?.primary,
    left: 20,
    top: 12,
    zIndex: 1,
  },
  inputRow: {
    paddingLeft: 0,
    backgroundColor: theme.palette.currencyInput,
    border: 0,
    "& input": {
      fontSize: "14px",
      height: "22px",
    }
  },
  selectMenu: {
    backgroundColor: theme.palette.background.default,
    "& .MuiListItem-root": {
      borderRadius: "12px",
      padding: theme.spacing(1.5),
      justifyContent: "center",
    },
    "& .MuiListItem-root.Mui-focusVisible": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
    },
    "& .MuiListItem-root.Mui-selected": {
      backgroundColor: theme.palette.label,
      color: theme.palette.primary.contrastText,
    },
    "& .MuiList-padding": {
      padding: "2px"
    }
  },
  wavyLine: {
    cursor: "pointer",
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: "-80px",
    marginTop: "-30px",
    width: "160px",
    [theme.breakpoints.down("xs")]: {
      width: "110px",
      marginLeft: "-55px",
    },
  },
  closeIcon: {
    float: "right",
    right: 0,
    position: "absolute",
    padding: 5,
  },
  priority: {
    zIndex: 10,
  },
  extraPadding: {
    padding: theme.spacing(1)
  },
  warningText: {
    color: theme.palette.warning.main,
  },
  warningIcon: {
    height: 24,
    width: 24,
    flex: "none",
    color: theme.palette.warning.main,
    marginRight: theme.spacing(1),
    "& path": {
      stroke: theme.palette.warning.main,
    },
  },
  errorBox: {
    marginBottom: theme.spacing(2),
    border: `1px solid ${theme.palette.warning.main}`,
    backgroundColor: `rgba${hexToRGBA(theme.palette.warning.light!, 0.2)}`,
    borderRadius: 12,
    padding: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    "& .MuiTypography-root": {
      color: theme.palette.warning.main,
      fontSize: "14px",
      lineHeight: "17px",
      [theme.breakpoints.down("xs")]: {
        fontSize: "12px",
        lineHeight: "14px",
      }
    }
  },
}))

export default BridgeView
