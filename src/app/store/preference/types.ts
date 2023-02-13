import BigNumber from "bignumber.js";

export interface PreferenceState {
  theme: string;
  slippage: BigNumber;
  timeoutBlocks: number;
};

export interface PreferenceStateInitProps {
  theme?: string;
  slippage: BigNumber;
  timeoutBlocks: number;
};

export interface PreferenceStateUpdateProps extends Partial<PreferenceState> {
};
