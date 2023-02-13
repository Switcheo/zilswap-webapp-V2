import { PreferenceStateUpdateProps } from "./types";

export enum PreferenceActionTypes {
  UPDATE = "PREFERENCE_UPDATE"
};

export function update(payload: PreferenceStateUpdateProps) {
  return {
    type: PreferenceActionTypes.UPDATE,
    payload
  }
};
