import React, {Component} from 'react';
import { isObservable } from "rxjs";

function observe(WrappedComponent) {
    return class extends Component {
      state = {
        observedValues: {},
        subscriptions: {}
      }
  
      componentDidMount() {
        Object.keys(this.props).forEach(prop => {
          if(isObservable(this.props[prop])){
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
        });
      }
  
      componentWillUnmount() {
        this.state.subscriptions.forEach(subscription => {
          subscription.unsubscribe();
        });
      }
  
      render() {
        return <WrappedComponent {...this.props} {...this.state.observedValues} />;
      }
    };
  }

export default observe;