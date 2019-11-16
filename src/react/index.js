import React, { Component } from "react";
import { isObservable } from "rxjs";

export function observe(WrappedComponent) {
  return class extends Component {
    state = {
      observedValues: {},
      subscriptions: {}
    };

    unsubscribe = prop => {
      const subscriptions = { ...this.state.subscriptions };
      if (subscriptions[prop]) subscriptions[prop].unsubscribe();
      delete subscriptions[prop];

      this.setState({ subscriptions });
    };

    subscribeToProp = prop => {
      if (!isObservable(this.props[prop])) return;

      const subscription = this.props[prop].subscribe(
        value => {
          this.setState(state => ({
            observedValues: {
              ...state.observedValues,
              [prop]: value
            }
          }));
        },
        err => {
          // TODO: pass the error to the wrapped component
          console.error(err);
        }
      );

      this.setState({
        subscriptions: {
          ...this.state.subscriptions,
          [prop]: subscription
        }
      });
    };

    componentDidMount() {
      Object.keys(this.props).forEach(this.subscribeToProp);
    }

    componentWillUnmount() {
      Object.keys(this.state.subscriptions).forEach(subscription => {
        this.unsubscribe(subscription);
      });
    }

    componentDidUpdate(prevProps) {
      Object.keys(prevProps).forEach(prop => {
        if (!prevProps[prop] && this.props[prop]) {
          this.subscribeToProp(prop);
        } else if (prevProps[prop] !== this.props[prop]) {
          this.unsubscribe(prop);
          this.subscribeToProp(prop);
        }
      });
    }

    render() {
      const props = Object.keys(this.props).reduce((accum, curr) => {
        if (!isObservable(this.props[curr])) {
          accum[curr] = this.props[curr];
          return accum;
        }
        return accum;
      }, {});

      return React.createElement(WrappedComponent, {
        ...props,
        ...this.state.observedValues
      });
    }
  };
}
