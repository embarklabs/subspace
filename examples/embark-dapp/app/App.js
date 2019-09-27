/* global web3 */
import React from 'react';
import EmbarkJS from 'Embark/EmbarkJS';
import Subspace from '@status-im/subspace';
import Ranking from '../embarkArtifacts/contracts/Ranking';
import { scan, map } from 'rxjs/operators';
import RankItem from './RankItem';

const subspace = new Subspace(web3.currentProvider);

const observables = {};

class App extends React.Component {
  state = {
    ready: false
  }

  componentDidMount(){
      EmbarkJS.onReady(async (err) => {
        if(err){
          console.error(err);
          return;
        }

        await subspace.init()

        observables.items = subspace
          .trackEvent(Ranking, 'Rating', {filter: {}, fromBlock: 1})
          .pipe(
            scan((acc, curr) => {
              const votes = {...acc[curr.addr]} || {};
              return {
                ...acc,
                [curr.addr]: {
                  upvotes: (votes.upvotes || 0) + (curr.rating >= 3 ? 1 : 0),
                  downvotes: (votes.downvotes || 0) + (curr.rating < 3 ? 1 : 0)
                }
              }
            }, {}),
            map(summary => {
              return Object.keys(summary).map(k => {
                return {addr: k, ...summary[k]}
              })
            })
          );

        this.setState({ready: true});
      });
  }

  upvote = address => () => {
    Ranking.methods.rate(address, 5).send();
  }

  downvote = address => () => {
    Ranking.methods.rate(address, 1).send();
  }

  render() {
    const {ready} = this.state;
    if(!ready) return <span>Loading...</span>;
    return <RankItem items={observables.items} onUpvote={this.upvote} onDownvote={this.downvote} />;
  }
}

export default App;
