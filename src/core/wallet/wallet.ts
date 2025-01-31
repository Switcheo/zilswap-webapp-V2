import { Account } from "@zilliqa-js/account/dist/account";
import { RPCResponse } from "@zilliqa-js/core";
import { validation } from "@zilliqa-js/util";
import { Zilliqa } from "@zilliqa-js/zilliqa";
import { getErrorMessage } from "app/utils";
import { BoltXNetworkMap, DefaultFallbackNetwork, RPCEndpoints, ZeevesNetworkMap, ZilPayNetworkMap } from "app/utils/constants";
import { RPCHandler } from "core/utilities";
import dayjs from "dayjs";
import { WalletProvider } from "zilswap-sdk";
import { Network } from 'zilswap-sdk/lib/constants';
import { BoltXConnectedWallet } from "./BoltXConnectedWallet";
import { ConnectWalletResult } from "./ConnectedWallet";
import { PrivateKeyConnectedWallet } from "./PrivateKeyConnectedWallet";
import { ZeevesConnectedWallet } from "./ZeevesConnectedWallet";
import { ZilPayConnectedWallet } from "./ZilPayConnectedWallet";

export const parseBalanceResponse = (balanceRPCResponse: RPCResponse<any, string>) => {
  let balanceResult: { balance: number } | null = null;
  try {
    // force cast required due to dependency resolution conflict
    balanceResult = RPCHandler.parseResponse(balanceRPCResponse);
  } catch (error) {
    // bypass error for addresses without any TXs.
    if (getErrorMessage(error) !== "Account is not created")
      throw error;
    balanceResult = {
      balance: 0,
    };
  }

  return balanceResult;
}

export const connectWalletPrivateKey = async (inputPrivateKey: string, network: Network = DefaultFallbackNetwork): Promise<ConnectWalletResult> => {

  if (!validation.isPrivateKey(inputPrivateKey))
    throw new Error("Invalid private key");

  const zilliqa = new Zilliqa(RPCEndpoints[network]);
  zilliqa.wallet.addByPrivateKey(inputPrivateKey);
  const account = zilliqa.wallet.defaultAccount! as unknown as Account;
  const timestamp = dayjs();

  const wallet = new PrivateKeyConnectedWallet(account, {
    network, timestamp,
  });

  return { wallet };
};

export const connectWalletZilPay = async (zilPay: any): Promise<ConnectWalletResult> => {

  if (!zilPay.wallet.isConnect)
    throw new Error("ZilPay connection failed.");

  const account: any = zilPay.wallet.defaultAccount;
  if (!account)
    throw new Error("Please sign in to your ZilPay account before connecting.");
  const timestamp = dayjs();

  let net = zilPay.wallet.net;
  if (net === "private") net = "testnet";
  const network = ZilPayNetworkMap[net];
  if (!network)
    throw new Error(`Unsupported network for ZilPay: ${net}`);

  const wallet = new ZilPayConnectedWallet({
    network, timestamp,
    zilpay: zilPay as WalletProvider,
    bech32: account!.bech32,
    base16: account!.base16,
  });

  return { wallet };
};

export const connectWalletBoltX = async (boltX: any): Promise<ConnectWalletResult> => {

  if (!boltX.zilliqa.wallet.isConnected)
    throw new Error("BoltX connection failed.");

  const account: any = boltX.zilliqa.wallet.defaultAccount;
  if (!account)
    throw new Error("Please sign in to your BoltX account before connecting.");
  const timestamp = dayjs();

  const net = boltX.zilliqa.wallet.net;
  const network = BoltXNetworkMap[net];
  if (!network)
    throw new Error(`Unsupported network for BoltX: ${net}`);

  const wallet = new BoltXConnectedWallet({
    network, timestamp,
    boltX: boltX.zilliqa as WalletProvider,
    bech32: account!.bech32,
    base16: account!.base16,
  });

  return { wallet };
};

export const connectWalletZeeves = async (zeeves: any): Promise<ConnectWalletResult> => {
  try {
    const account = await zeeves.getSession();
    const timestamp = dayjs();

    const net = "mainnet"; //TODO: Add TestNet support for SDK
    const network = ZeevesNetworkMap[net];
    if (!network)
      throw new Error(`Unsupported Zeeves network: ${net}`);

    const wallet = new ZeevesConnectedWallet({
      network,
      timestamp,
      zeeves: zeeves as WalletProvider,
      bech32: account!.bech32,
      byte20: account!.byte20
    });

    return { wallet };
  } catch (err) {
    console.error(err);
    throw new Error("Error connecting Zeeves wallet");
  }
};
