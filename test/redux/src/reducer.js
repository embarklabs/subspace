import { CREATED } from "./constants";

const initialState = { data: {} };

export const pingReducer = (state = initialState, action) => {
  switch (action.type) {
    case CREATED:
      return { data: action.eventData };
    default:
      return state;
  }
};
