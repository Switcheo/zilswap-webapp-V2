import { useDispatch } from "react-redux";
import actions from "app/store/actions";
import { uuidv4 } from "app/utils";
import { useCallback } from "react";

const useStatefulTask = <T>() => {
  const dispatch = useDispatch();
  return useCallback(async (runnable: () => Promise<T>, taskName = uuidv4()): Promise<T> => {
    if (typeof runnable !== "function")
      throw new Error("stateful task runnable not a function");
    const taskUuid = uuidv4();
    dispatch(actions.Layout.addBackgroundLoading(taskName, taskUuid));
    try {
      return await runnable();
    } finally {
      dispatch(actions.Layout.removeBackgroundLoading(taskUuid));
    }
  }, [dispatch])
};

export default useStatefulTask;
