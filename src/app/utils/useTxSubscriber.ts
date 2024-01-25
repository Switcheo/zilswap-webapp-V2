import { RootState, TransactionState } from "app/store/types";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { SimpleMap } from "./types";
import { TxStatus } from "zilswap-sdk";

class SubscribedTx {
  status: "pending" | TxStatus;
  constructor(status) {
    this.status = status
  }

  isPending() {
    return this.status === 'pending'
  }

  isSuccess() {
    return this.status === 'confirmed'
  }

  updateStatus(updatedStatus: "pending" | TxStatus) {
    this.status = updatedStatus
  }
}

type TxSubscriberOutput = [SimpleMap<SubscribedTx>, (key: string, hash: string) => void]

const useTxSubscriber = (): TxSubscriberOutput => {
  const transactionState = useSelector<RootState, TransactionState>(state => state.transaction);
  const [txHashMap, setTxHashMap] = useState<SimpleMap<string>>({})
  const [subscribedTxs, setSubscribedTxs] = useState<SimpleMap<SubscribedTx>>({})

  const subscribeTask = useCallback((key: string, hash: string) => {
    setTxHashMap((prevTxHashMap) => {
      const updatedMap = { ...prevTxHashMap };
      updatedMap[key] = hash;
      return updatedMap;
    });
  }, []);

  useEffect(() => {
    const transactions = transactionState.transactions;
    const updatedSubscribedTxs = subscribedTxs
    for (const [key, value] of Object.entries(txHashMap)) {
      const tx = transactions.find((t) => t.hash === value);
      if (tx) {
        if (updatedSubscribedTxs[key]) {
          updatedSubscribedTxs[key].updateStatus(tx.status)
        } else {
          updatedSubscribedTxs[key] = new SubscribedTx(tx.status)
        }
      }
    }
    setSubscribedTxs(updatedSubscribedTxs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionState.transactions, txHashMap, subscribeTask]);

  return [subscribedTxs, subscribeTask];
};

export default useTxSubscriber;
