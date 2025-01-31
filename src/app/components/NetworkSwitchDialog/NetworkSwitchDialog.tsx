import { makeStyles } from "@material-ui/core";
import { DialogModal } from "app/components";
import { actions } from "app/store";
import { RootState } from "app/store/types";
import { AppTheme } from "app/theme/types";
import { Blockchain, BridgeableChains, evmIncludes, getEvmChainIDs, useNetwork } from "app/utils";
import cls from "classnames";
import { ConnectedBridgeWallet } from "core/wallet/ConnectedBridgeWallet";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Network } from "zilswap-sdk/lib/constants";
import NetworkSwitchBox from "./NetworkSwitchBox";

const useStyles = makeStyles((theme: AppTheme) => ({
    root: {
    },
}));

const NetworkSwitchDialog = (props: any) => {
    const { children, className, ...rest } = props;
    const classes = useStyles();
    const network = useNetwork();
    const dispatch = useDispatch();
    const showNetworkSwitchDialog = useSelector<RootState, boolean>(state => state.layout.showNetworkSwitchDialog);
    const ethWallet = useSelector<RootState, ConnectedBridgeWallet | null>(state => state.wallet.bridgeWallets[Blockchain.Ethereum]);
    const srcChain = useSelector<RootState, BridgeableChains>(state => state.bridge.formState.fromBlockchain);

    const isMainNet = useMemo(() => {
      if (srcChain === Blockchain.Zilliqa) {
        return network === Network.MainNet
      } else if (evmIncludes(srcChain)) {
        if (Array.from(getEvmChainIDs(Network.TestNet).values()).includes(Number(ethWallet?.chainId))) return false;
        return true;
      }
    }, [ethWallet?.chainId, network, srcChain])

    const [requiredChainName, requiredChainID, walletToChange, currentChainName] = useMemo(() => {
      const getEthChainName = (chainId: number) => {
        switch (chainId) {
          case 1: return 'Ethereum Network'
          case 5: return 'Goerli Test Network'
          case 56: return 'Binance Smart Chain Network'
          case 97: return 'Binance Smart Chain (Testnet)'
          case 137: return 'Polygon Mainnet'
          case 32769: return 'Zilliqa Mainnet'
          case 80001: return 'Polygon Mumbai Testnet'
          case 42161: return 'Arbitrum One Network'
          case 421611: return "Arbitrum Testnet Network";
          default: return 'Unknown Network'
        }
      }

      const getEthWalletName = () => {
        if (ethWallet?.provider.isBoltX) {
            return 'BoltX';
        } else if (ethWallet?.provider.isMetamask) {
            return 'Metamask';
        }
        return 'Your Wallet';
      }

      if (!ethWallet) {
        return [null, null, null, null]
      }

      const ethChainID = Number(ethWallet?.chainId)
      if (isMainNet) {
        const correctChainId = getEvmChainIDs(network).get(srcChain)
        if (correctChainId && correctChainId !== ethChainID) {
          dispatch(actions.Layout.toggleShowNetworkSwitch("open"))
          return [getEthChainName(correctChainId), `0x${(correctChainId).toString(16)}`, getEthWalletName(), getEthChainName(ethChainID)]
        }
      } else if (!isMainNet) {
        const correctChainId = getEvmChainIDs(network).get(srcChain)
        if (correctChainId && ethChainID !== correctChainId) {
          dispatch(actions.Layout.toggleShowNetworkSwitch("open"))
          return [getEthChainName(correctChainId), `0x${(correctChainId).toString(16)}`, getEthWalletName(), getEthChainName(ethChainID)]
        }
      }
      return [null, null, null, null]
    }, [network, dispatch, ethWallet, isMainNet, srcChain])

    const onCloseDialog = () => {
        dispatch(actions.Layout.toggleShowNetworkSwitch("close"));
    };

    return (
        <DialogModal
            open={showNetworkSwitchDialog}
            onClose={onCloseDialog}
            {...rest}
            className={cls(classes.root, className)}
        >
            <NetworkSwitchBox ethWallet={ethWallet} requiredChainName={requiredChainName} requiredChainID={requiredChainID} walletToChange={walletToChange} currentChainName={currentChainName} />
        </DialogModal>
    )
}

export default NetworkSwitchDialog;
