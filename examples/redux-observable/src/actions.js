import { DEPLOY_CONTRACT, INIT_PHOENIX, PHOENIX_READY, MY_ACTION, DUMMY_TRANSACTION } from "./constants";

export const deployContract = () => ({type: DEPLOY_CONTRACT});
export const initPhoenix = () =>({type: INIT_PHOENIX});
export const phoenixReady = () => ({type: PHOENIX_READY});
export const myAction = (eventData) => ({ type: MY_ACTION, eventData });
export const createDummyTransaction = () => ({ type: DUMMY_TRANSACTION });