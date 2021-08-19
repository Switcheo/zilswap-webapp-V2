import { Box, Button, Grid, makeStyles, OutlinedInput } from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import RefreshIcon from '@material-ui/icons/RefreshRounded';
import { Text } from 'app/components';
import { actions } from "app/store";
import { BridgeableTokenMapping, BridgeTx } from "app/store/bridge/types";
import { RootState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { hexToRGBA, useAsyncTask } from "app/utils";
import { ConnectButton } from "app/views/main/Bridge/components";
import BigNumber from 'bignumber.js';
import { providerOptions } from "core/ethereum";
import { ConnectedWallet } from "core/wallet";
import { ConnectedBridgeWallet } from "core/wallet/ConnectedBridgeWallet";
import dayjs from "dayjs";
import { ethers } from "ethers";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Blockchain, RestModels, SWTHAddress, TradeHubSDK } from "tradehub-api-js";
import Web3Modal from 'web3modal';

const useStyles = makeStyles((theme: AppTheme) => ({
    root: {
        backgroundColor: theme.palette.background.default,
        borderLeft: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
        borderRight: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
        borderBottom: theme.palette.type === "dark" ? "1px solid #29475A" : "1px solid #D2E5DF",
        borderRadius: "0 0 12px 12px",
        padding: theme.spacing(1, 7, 2),
        maxWidth: 510,
        [theme.breakpoints.down("sm")]: {
            padding: theme.spacing(0, 3, 2),
        },
        [theme.breakpoints.down("xs")]: {
            minWidth: 320
        },
        "& .MuiOutlinedInput-input": {
            padding: theme.spacing(1),
            fontSize: "16px",
            textAlign: "center"
        },
        "& .MuiButton-endIcon": {
            marginLeft: "6px"
        }
    },
    button: {
        borderRadius: 12,
        height: 38,
        width: "32%",
        "& .MuiButton-text": {
            padding: "6px 16px"
        },
        border: "none"
    },
    visibilityIcon: {
        color: theme.palette.label
    },
    warning: {
        color: theme.palette.warning.main
    },
    actionButton: {
        marginTop: theme.spacing(1),
        marginBottom: theme.spacing(1.5),
        height: 46,
    },
    refreshIcon: {
        verticalAlign: "bottom",
        color: theme.palette.primary.light
    },
    warningLink: {
        color: theme.palette.warning.main,
        textDecoration: "underline"
    },
    inputWord: {
        height: 38,
        backgroundColor: theme.palette.type === "dark" ? `rgba${hexToRGBA("#DEFFFF", 0.1)}` : "#D2E5DF",
        borderColor: "transparent",
        '&.Mui-focused': {
            borderColor: theme.palette.primary.dark,
            caretColor: theme.palette.primary.dark, 
        },
    },
    connectButton: {
        marginTop: theme.spacing(1.5)
    }
}));

const ResumeTransferBox = (props: any) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const [showPhrase, setShowPhrase] = useState<boolean>(false);
    const [mnemonic, setMnemonic] = useState<Array<string>>(Array(12).fill(""));
    const bridgeableTokens = useSelector<RootState, BridgeableTokenMapping>(store => store.bridge.tokens);
    const wallet = useSelector<RootState, ConnectedWallet | null>(state => state.wallet.wallet); // zil wallet
    const bridgeWallet = useSelector<RootState, ConnectedBridgeWallet | null>(state => state.wallet.bridgeWallets[Blockchain.Ethereum]); // eth wallet
    const network = TradeHubSDK.Network.DevNet;

    const [dstChain, setDstChain] = useState<Blockchain.Zilliqa | Blockchain.Ethereum | null>(null);
    const [depositTransfer, setDepositTransfer] = useState<RestModels.Transfer>();
    const [sdk, setSdk] = useState<TradeHubSDK | null>(null);

    const [runGetTransfer, loading, error] = useAsyncTask("getTransfer");

    const isMnemonicFilled = useMemo(() => {
        return mnemonic.indexOf("") === -1;
    }, [mnemonic])

    useEffect(() => {
        const sdk = new TradeHubSDK({ network });
        setSdk(sdk);
    }, [])

    useEffect(() => {
        if (sdk && isMnemonicFilled) {
            runGetTransfer(async () => {
                const mnemonicString = mnemonic.join(" ");
                const swthAddress = SWTHAddress.generateAddress(mnemonicString, undefined, { network });
        
                // find deposit confirmation tx
                const extTransfers = await sdk.api.getTransfers({ account: swthAddress }) as RestModels.Transfer[];
        
                const depositTransfer = extTransfers.find((transfer) => transfer.transfer_type === 'deposit');

                if (depositTransfer && depositTransfer.status === 'success') {
                    setDstChain(depositTransfer.blockchain === Blockchain.Zilliqa ? Blockchain.Ethereum : Blockchain.Zilliqa);
                    setDepositTransfer(depositTransfer);
                }

                // else set error message
            })
        }
    
        // eslint-disable-next-line
    }, [mnemonic]);

    const dstWalletAddr = useMemo(() => {
        if (dstChain) {
            if (dstChain === Blockchain.Zilliqa && wallet) {
                return wallet.addressInfo.byte20;
            }

            if (dstChain === Blockchain.Ethereum && bridgeWallet) {
                return bridgeWallet.address;
            }
        }

        return "";
    }, [dstChain, wallet, bridgeWallet])

    const handleShowPhrase = () => {
        setShowPhrase(!showPhrase);
    }

    // TODO: add validation to ensure only string input
    const handleWordChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const mnemonicCopy = mnemonic.slice();
        mnemonicCopy[index] = e.target.value;
        setMnemonic(mnemonicCopy);
    }

    const handleResumeTransfer = () => {
        if (depositTransfer && dstChain) {
            // tx found and status success - build bridgeTx
            const srcChain = depositTransfer.blockchain as Blockchain.Zilliqa | Blockchain.Ethereum;
            const bridgeToken = bridgeableTokens[srcChain].find(token => token.denom === depositTransfer.denom);

            const bridgeTx: BridgeTx = {
                srcChain,
                dstChain,
                srcAddr: "",
                dstAddr: wallet?.addressInfo.bech32 ?? "",
                srcToken: depositTransfer.denom,
                dstToken: bridgeToken?.toDenom!,
                inputAmount: new BigNumber(depositTransfer.amount),
                interimAddrMnemonics: mnemonic.join(" "),
                withdrawFee: new BigNumber(depositTransfer.fee_amount), // need to check
                depositDispatchedAt: dayjs(),
            }

            dispatch(actions.Bridge.addBridgeTx([bridgeTx]));
        }
    }

    const onClickConnectETH = async () => {
        const web3Modal = new Web3Modal({
          cacheProvider: true,
          disableInjectedProvider: false,
          providerOptions
        });
    
        const provider = await web3Modal.connect();
        const ethersProvider = new ethers.providers.Web3Provider(provider)
        const signer = ethersProvider.getSigner();
        const ethAddress = await signer.getAddress();
        const chainId = (await ethersProvider.getNetwork()).chainId;
    
        dispatch(actions.Wallet.setBridgeWallet({ blockchain: Blockchain.Ethereum, wallet: { provider: provider, address: ethAddress, chainId: chainId } }));
        dispatch(actions.Token.refetchState());
    };
    
    const onClickConnectZIL = () => {
        dispatch(actions.Layout.toggleShowWallet());
    };

    const handleConnectWallet = () => {
        if (dstChain === Blockchain.Zilliqa) {
            return onClickConnectZIL();
        } else {
            return onClickConnectETH();
        }
    }

    const isConnectWalletEnabled = useMemo(() => {
        return depositTransfer && dstChain;
    }, [depositTransfer])

    // Dst wallet connected and deposit tx found
    const isResumeTransferEnabled = useMemo(() => {
        return dstWalletAddr && dstChain;

        // eslint-disable-next-line
    }, [dstWalletAddr, dstChain])

    return (
        <Box overflow="hidden" display="flex" flexDirection="column" className={classes.root}>
            <Text variant="h2" align="center">
                <RefreshIcon fontSize="large" className={classes.refreshIcon} />
                {" "}
                Resume Transfer
            </Text>

            <Text marginTop={2} marginBottom={2.5} variant="h6" align="center">
                Connect your wallet and enter your transfer key to resume your paused transfer.
            </Text>

            <Text marginBottom={1.5} align="center">
                Transfer Key
            </Text>

            <Grid container spacing={1}>
                {mnemonic.map((word: string, index) => (
                     <Grid item xs={4}>
                        <OutlinedInput
                            className={classes.inputWord}
                            value={word}
                            onChange={handleWordChange(index)}
                            type={showPhrase ? 'text' : 'password'}
                        />
                    </Grid>
                ))}
            </Grid>

            <Box display="flex" justifyContent="center" mt={1.5}>
                <Button
                    onClick={handleShowPhrase}
                    className={classes.button}
                    variant="outlined"
                    endIcon={showPhrase ? <VisibilityOff className={classes.visibilityIcon}/> : <Visibility className={classes.visibilityIcon}/>}
                    >
                    <Text>{showPhrase ? "Hide Phrase" : "Show Phrase"}</Text>
                </Button>
            </Box>

            <Box mt={1} mb={.5} display="flex" flexDirection="column">
                <Text align="center">
                    Destination Wallet Address
                </Text>

                {/* Connect wallet button - disabled unless */}
                <ConnectButton address={dstWalletAddr} chain={dstChain} className={classes.connectButton} onClick={handleConnectWallet} disabled={!isConnectWalletEnabled} />
            </Box>

            <Box mt={1}>
                <Button
                    onClick={handleResumeTransfer}
                    variant="contained"
                    color="primary"
                    className={classes.actionButton}
                    disabled={!isResumeTransferEnabled}
                    fullWidth
                >
                    Resume Transfer
                </Button>
            </Box>
        </Box>
    )
}

export default ResumeTransferBox;
