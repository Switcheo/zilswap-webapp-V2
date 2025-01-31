import createSagaMiddleware from "redux-saga";
import blockchainSaga from "./app/blockchainSaga";
import bridgeSaga from "./app/bridgeSaga";
import tokensSaga from "./app/tokensSaga";

const sagaMiddleware = createSagaMiddleware();

export function startSagas() {
  sagaMiddleware.run(blockchainSaga);
  sagaMiddleware.run(bridgeSaga);
  sagaMiddleware.run(tokensSaga);
};

export default sagaMiddleware;
