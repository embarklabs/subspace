const { makeExecutableSchema } = require("graphql-tools");
const gql  = require( "graphql-tag");
const graphql  = require( "reactive-graphql").graphql;
const Subspace = require('../dist/index.js').default;
const { map, scan, last, distinctUntilChanged, pluck } = require('rxjs/operators');
const Web3Eth = require('web3-eth');
const {$average} = require('../src/operators');
const {deployRatingContract} = require('./utils-web3');


let eth = new Web3Eth("ws://localhost:8545");


async function run() {
  let accounts = await eth.getAccounts();
  var RatingContract = await deployRatingContract(eth)

  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})

  const subspace = new Subspace(eth.currentProvider);

  await subspace.init()

  const typeDefs = `
  type Escrow {
    averageRating: Float!
  }
  type Query {
    escrows: Escrow!
    escrow(id: ID!): Escrow!
  }
`;

  const resolvers = {
    Escrow: {
      averageRating: (something, params) => {
        return subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe( $average(x => parseInt(x.rating)))
      }
    },
    Query: {
      escrows: () => {
        // return subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), $average())
      },
      escrow: (something, params) => {
        console.dir(something) // error object?
        console.dir(params.id) // 123
        return resolvers.Escrow
      }
    }
  };

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers
  });

  const query = gql`
  query {
    escrow(id: 123) {
      averageRating
    }
  }
`;

  const stream = graphql(schema, query);
  stream.pipe(pluck("data", "escrow", "averageRating")).subscribe(res => console.log(res));



  // TODO: would be nice if trackEvent was smart enough to understand the type of returnValues and do the needed conversions
  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {

  // subspace.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => x.rating)).subscribe((v) => {

  // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), myscan, mymap).subscribe((v) => {
  //   console.dir("value is ")
  //   console.dir(v)
  // });

  // var max = scan((acc, curr) => {
  //   if (curr > acc) return curr;
  //   return acc;
  // }, [])

  // // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
  // // subspace.trackEvent(RatingContract, 'Rating', ((x) => true)).pipe(map(x => parseInt(x.rating)), last()).subscribe((v) => {

  // subspace.trackEvent(RatingContract, 'Rating').pipe(map(x => parseInt(x.rating)), max, distinctUntilChanged()).subscribe((v) => {
  //   console.dir("max known rating is")
  //   console.dir(v)
  // });


  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 3).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 1).send({from: accounts[0]})
  // await RatingContract.methods.doRating(1, 5).send({from: accounts[0]})
}

run()