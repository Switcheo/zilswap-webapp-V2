import { Blockchain, BRIDGEABLE_EVM_CHAINS } from 'app/utils'
import BigNumber from "bignumber.js";
import { Models } from "carbon-js-sdk";
import dayjs from "dayjs";
import { Network } from "zilswap-sdk/lib/constants";


export type BridgeableToken = {
  blockchain: Blockchain;
  symbol: string
  tokenAddress: string;
  tokenManagerAddress: string;
  decimals: number;
  chains: Record<string, string>
  balance?: BigNumber
}

export type BridgeableTokenMapping = ReadonlyArray<BridgeableToken>;

export interface BridgeState {
  formState: BridgeFormState;
  bridgeTxs: BridgeTx[];
  activeBridgeTx?: BridgeTx;
  previewBridgeTx?: BridgeTx;

  tokens: BridgeableTokenMapping;
}


export interface UpdateBridgeBalance {
  balance?: BigNumber;
  tokenAddress: string;
  chain: BridgeableChains;
}

export interface BridgeFormState {
  sourceAddress?: string; // can be evm or zil address
  destAddress?: string; // can be evm or zil address
  transferAmount: BigNumber;
  fromBlockchain: BridgeableChains;
  toBlockchain: BridgeableChains;

  token?: BridgeableToken;
  withdrawFee: Partial<Record<Blockchain, Record<string, BigNumber>>>;

  isInsufficientReserves: boolean;
  forNetwork: Network | null,
};

export interface BridgeTx {
  srcChain: BridgeableChains;
  dstChain: BridgeableChains;

  network: Network;

  // in respective display formats
  // zil: bech32 (zil1…)
  // eth: hex (0x…)
  // bsc: hex (0x…)
  // neo: base58check
  srcAddr: string;
  dstAddr: string;

  // token addresses
  srcToken: string;
  dstToken: string;

  // allocated withdraw fee
  withdrawFee: BigNumber;

  // unitless amount
  inputAmount: BigNumber;

  // source chain token spend tx
  approveTxHash?: string;

  // .lock tx on the source chain
  sourceTxHash?: string;

  // Carbon external transfers confirmed
  depositTxConfirmedAt?: dayjs.Dayjs;

  // tx on the destination chain
  destinationTxHash?: string;

  // populated when bridge tx is deemed complete
  destinationTxConfirmedAt?: dayjs.Dayjs;

  // dismissed by user, hide from UI
  dismissedAt?: dayjs.Dayjs;

  // populated when bridge tx is added
  sourceDispatchedAt?: dayjs.Dayjs;

  // block confirmations
  sourceConfirmations?: number;
}
