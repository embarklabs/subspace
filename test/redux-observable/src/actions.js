import { CREATED, INIT } from "./constants";

export const init = () => ({type: INIT});
export const created = (eventData) => ({ type: CREATED, eventData });
