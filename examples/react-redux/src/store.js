import { createStore } from "redux";
import { myReducer } from "./reducer";

const store = createStore(myReducer);

export default store;
