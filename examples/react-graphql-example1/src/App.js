import React from "react";
import Subspace from "@status-im/subspace";
import { $average, $latest } from "@status-im/subspace";
import { makeExecutableSchema } from "graphql-tools";
import { graphql } from "reactive-graphql";
import { map, scan } from "rxjs/operators";
import web3 from "./web3";
import { abi, address } from "./contract.json";

let Product;

class App extends React.Component {
  state = {
    userRating: 0,
    averageRating: 0,
    last5Ratings: [],
    filteredRatings: []
  };

  async componentDidMount() {
    const subspace = new Subspace(web3.currentProvider);
    await subspace.init();

    Product = subspace.contract({ abi, address });

    const typeDefs = `
       type Query {
        averageRating: Float!
        last5Ratings: [Int!]
        filteredRatings(gte: Int): [Int!]
      }
    `;

    const rating$ = Product.events.Rating.track()
      .map("rating")
      .pipe(map(x => parseInt(x)));

    const resolvers = {
      Query: {
        averageRating: () => rating$.pipe($average()),
        last5Ratings: () => rating$.pipe($latest(5)),
        filteredRatings: (a, conditions) => {
          const gte = (conditions && conditions.gte) || 0;
          return rating$.pipe(
            scan((accum, val) => {
              if (val >= gte) {
                return [...accum, val];
              } else {
                return accum;
              }
            }, [])
          );
        }
      }
    };

    const schema = makeExecutableSchema({ typeDefs, resolvers });

    const summaryQuery = `
    query {
      averageRating
      last5Ratings
    }
    `;

    graphql(schema, summaryQuery).subscribe(
      ({ data: { averageRating, last5Ratings } }) => {
        this.setState({ averageRating, last5Ratings });
      }
    );

    const filterRatingsQuery = `
    query {
      filteredRatings(gte: 3)
    }
    `;

    graphql(schema, filterRatingsQuery).subscribe(
      ({ data: { filteredRatings } }) => {
        this.setState({ filteredRatings });
      }
    );
  }

  rateProduct = async () => {
    let accounts = await web3.eth.getAccounts();
    await Product.methods
      .rateProduct(0, this.state.userRating)
      .send({ from: accounts[0] });
  };

  render() {
    return (
      <div>
        <button onClick={this.rateProduct}>Rate Product</button>
        <input
          type="number"
          value={this.state.userRating}
          onChange={evt =>
            this.setState({ userRating: parseInt(evt.target.value) })
          }
        />
        <ul>
          <li><b>average rating: </b> {this.state.averageRating}</li>
          <li><b>last 5 ratings: </b> {(this.state.last5Ratings || []).join(', ')}</li>
          <li><b>all ratings greater than 2:</b> {(this.state.filteredRatings || []).join(', ')}</li>
        </ul>
      </div>
    );
  }
}

export default App;
