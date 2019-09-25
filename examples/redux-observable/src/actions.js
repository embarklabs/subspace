import { DEPLOY_CONTRACT, INIT_SUBSPACE, SUBSPACE_READY, MY_ACTION, DUMMY_TRANSACTION } from "./constants";

export const deployContract = () => ({type: DEPLOY_CONTRACT});
export const initSubspace = () =>({type: INIT_SUBSPACE});
export const subspaceReady = () => ({type: SUBSPACE_READY});
export const myAction = (eventData) => ({ type: MY_ACTION, eventData });
export const createDummyTransaction = () => ({ type: DUMMY_TRANSACTION });