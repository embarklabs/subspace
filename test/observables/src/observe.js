import React, {Component} from 'react';
import { isObservable } from "rxjs";

function observe(WrappedComponent) {
    return class extends Component {
      state = {
        observedValues: {},
        subscriptions: {}
      }

      subscribeToProp = prop => {
        if(!isObservable(this.props[prop])) return;

        const subscription = this.props[prop].subscribe(
          value => {
            this.setState({
              observedValues: {
                ...this.state.observedValues,
                [prop]: value
              }
            });
          },
          err => {
            // TODO: pass the error to the wrapped component
            console.err(err);
          }
        );

        this.setState({
          subscriptions: {
            ...this.state.subscriptions,
            [prop]: subscription
          }
        });
      }
  
      componentDidMount() {
        Object.keys(this.props).forEach(this.subscribeToProp);
      }
  
      componentWillUnmount() {
        this.state.subscriptions.forEach(subscription => {
          subscription.unsubscribe();
        });
      }

      componentDidUpdate(prevProps) {
        Object.keys(prevProps).forEach(prop => {
          if(!prevProps[prop] && this.props[prop]){
            this.subscribeToProp(prop);
          }
        });

        // TODO: check if prevProps and currProps are different, and unsubscribe from prevProp
      }
  
      render() {
        const props = Object.keys(this.props).reduce((accum, curr) => {
          if(!isObservable(this.props[curr])){
            accum[curr] = this.props[curr];
            return accum;
          }
          return accum;
        }, {});

        return <WrappedComponent {...props} {...this.state.observedValues} />;
      }
    };
  }

export default observe;