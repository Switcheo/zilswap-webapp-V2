import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "app/store/types";
import { LoadingTasks } from "app/store/layout/types";
import useStatefulTask from "./useStatefulTask";

export type ErrorHandler = (error: any) => void;
export type AsyncTaskOutput<T> = [(task: () => Promise<T>) => Promise<void>, boolean, Error | null, (e?: Error) => void];

const parseError = (original: unknown): Error => {
  let error = original;
  if (typeof error === "string")
    error = new Error(error);
  return error as Error;
};

const useAsyncTask = <T>(taskname: string, errorHandler?: (error: Error) => void): AsyncTaskOutput<T> => {
  const [error, setError] = useState<Error | null>(null);
  const loadingTasks = useSelector<RootState, LoadingTasks>(store => store.layout.loadingTasks);

  const statefulTask = useStatefulTask<T>();
  const asyncTaskRunner = useCallback(async (task: () => Promise<T>): Promise<void> => {
    setError(null);

    try {
      await statefulTask(task, taskname);
    } catch (rawError) {
      console.error("async task error", rawError);
      const error = parseError(rawError);
      errorHandler?.(error);
      setError(error);
    }
  }, [taskname, statefulTask, errorHandler, setError]);

  const setOrClearError = useCallback((error?: Error) => {
    error ? setError(error) : setError(null);
  }, []);

  const loadingState = !!loadingTasks[taskname];
  return [asyncTaskRunner, loadingState, error, setOrClearError];
};

export default useAsyncTask;
