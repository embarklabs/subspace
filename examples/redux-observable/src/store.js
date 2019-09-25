import { createStore, applyMiddleware } from "redux";
import { myReducer } from "./reducer";
import { createEpicMiddleware } from "redux-observable";
import {
  DEPLOY_CONTRACT,
  INIT_SUBSPACE,
  SUBSPACE_READY,
  DUMMY_TRANSACTION
} from "./constants";
import { mergeMap, map, mapTo, delay, filter } from "rxjs/operators";
import MyContract from "./MyContract";
import { combineEpics } from "redux-observable";
import { ofType } from "redux-observable";
import {
  initSubspace,
  subspaceReady,
  createDummyTransaction,
  myAction
} from "./actions";
import web3 from "./web3";
import Subspace from "phoenix";

let MyContractInstance;
let eventSyncer;

const deployContractEpic = action$ =>
  action$.pipe(
    ofType(DEPLOY_CONTRACT),
    mergeMap(() => {
      return MyContract.getInstance();
    }),
    map(instance => {
      MyContractInstance = instance;
      return initSubspace();
    })
  );

const initSubspaceEpic = action$ =>
  action$.pipe(
    ofType(INIT_SUBSPACE),
    mergeMap(() => {
      eventSyncer = new Subspace(web3.currentProvider);
      return eventSyncer.init();
    }),
    mapTo(subspaceReady())
  );

const trackEventEpic = action$ =>
  action$.pipe(
    ofType(SUBSPACE_READY),
    mergeMap(() => {
      createDummyTransaction();
      return eventSyncer
        .trackEvent(MyContractInstance, "MyEvent", { filter: {}, fromBlock: 1 })
        .pipe(
          map(eventData => {
            return myAction(eventData);
          })
        );
    })
  );

const dummyTransactionEpic = action$ =>
  action$.pipe(
    filter(
      action =>
        action.type === SUBSPACE_READY || action.type === DUMMY_TRANSACTION
    ),
    map(() => {
      MyContractInstance.methods
        .myFunction()
        .send({ from: web3.eth.defaultAccount });
    }),
    delay(2000),
    mapTo(createDummyTransaction())
  );

  
const rootEpic = combineEpics(
  deployContractEpic,
  initSubspaceEpic,
  trackEventEpic,
  dummyTransactionEpic
);

const epicMiddleware = createEpicMiddleware();

const store = createStore(myReducer, applyMiddleware(epicMiddleware));

epicMiddleware.run(rootEpic);

export default store;
