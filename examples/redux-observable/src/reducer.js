import { MY_ACTION } from "./constants";

const initialState = { 
  data: {}
};

export const myReducer = (state = initialState, action) => {
  switch (action.type) {
    case MY_ACTION:
      return { data: action.eventData };
    default:
      return state;
  }
};
