# Vue
Vue provides the official npm package `vue-rx` that provides RxJS integration, which simplifies the use of Subspace with Vue.js

### Example

::: tip 
This example is available in [Github](https://github.com/embark-framework/subspace/tree/master/examples/vue)
:::


#### MyComponent.vue
```js
<template>
  <ul v-if="!!eventData$">
    <li><b>someValue: </b> {{eventData$.someValue}}</li>
    <li><b>anotherValue: </b> {{eventData$.anotherValue}}</li>
  </ul>
</template>

<script>
export default {
  name: 'MyComponent',
  props: {
    eventData: Object
  },
  subscriptions() { // provide Rx observables
    return {
      eventData$: this.eventData
    }
  }
}
</script>
```

#### App.vue
```js
<template>
  <div id="app">
    <button v-on:click="createTrx">Create a Transaction</button>
    <MyComponent v-bind:event-data="myEventObservable$" v-if="!!myEventObservable$" />
  </div>
</template>

<script>
import MyComponent from './components/MyComponent.vue';
import Subspace from "@embarklabs/subspace";

export default {
  name: 'app',
  data: function(){
    return {
      myEventObservable$: null,
      MyContractInstance: null
    };
  },
  created: async function(){
    this.MyContractInstance = ...; // TODO: obtain a web3.eth.contract instance

    const subspace = new Subspace("wss://localhost:8545"); // Use a valid provider (geth, parity, infura...)
    await subspace.init();

    this.myEventObservable$ = subspace.trackEvent(this.MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 });
  }, 
  methods: {
    createTrx: function(){
      this.MyContractInstance.methods
        .myFunction()
        .send({ from: web3.eth.defaultAccount });
    }
  },
  components: {
    MyComponent
  }
}
</script>
```



#### Further read
- [vue-rx](https://www.npmjs.com/package/vue-rx)
