<script>
// import web3 from './web3';
// import MyContract from './MyContract';
import { onMount } from 'svelte';
import Subspace from "@status-im/subspace";

let MyContractInstance;
let subspace;
let myEventObservable$;

onMount(async () => {
  //MyContractInstance = await MyContract.getInstance(); 

 // subspace = new Subspace(web3.currentProvider);
  // await subspace.init();

  //myEventObservable$ = subspace.trackEvent(MyContractInstance, "MyEvent", {filter: {}, fromBlock: 1 });
});


let name = 'world';
	
</script>

<h1>Hello {name}!</h1>