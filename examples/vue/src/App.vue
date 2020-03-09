<template>
  <div id="app">
    <button v-on:click="createTrx">Create a Transaction</button>
    <MyComponent v-bind:event-data="myEventObservable$" v-if="!!myEventObservable$" />
  </div>
</template>

<script>
import MyComponent from './components/MyComponent.vue'
import Subspace from "@embarklabs/subspace";
import web3 from './web3';
import MyContract from './MyContract';

export default {
  name: 'app',
  data: function(){
    return {
      myEventObservable$: null,
      MyContractInstance: null
    };
  },
  created: async function(){
    this.MyContractInstance = await MyContract.getInstance(); 

    const subspace = new Subspace(web3);
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
