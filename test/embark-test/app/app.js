/* global web3 */
import React from 'react';
import ReactDOM from 'react-dom';
import EmbarkJS from 'Embark/EmbarkJS';
import Ranking from '../embarkArtifacts/contracts/Ranking';

import Phoenix from 'phoenix';
import withObservables from '@nozbe/with-observables'

const {scan} = require('rxjs/operators');
import { of } from 'rxjs';


const phoenix = new Phoenix(web3);

const RankItem = ({votes, onUpvote, onDownvote}) => (
    <div>
        <b>1</b> - 0x00000000000000000000000000001<br />
        Upvotes: {votes.upvotes} - Downvotes: {votes.downvotes}<br />
        <button onClick={onUpvote}>Upvote</button> | <button onClick={onDownvote}>Downvote</button>
    </div>
);


const enhance = withObservables(['votes'], ({ votes }) => ({votes: votes || of({ /* default empty object */ })}));
const EnhancedRankItem = enhance(RankItem)

const observables = {};

class App extends React.Component {
  state = {
    ready: false
  }

  componentDidMount(){
    EmbarkJS.onReady((err) => {
      if(err){
        console.error(err);
        return;
      }
    
      phoenix.init(() => {
          observables.votes = phoenix.trackEvent(Ranking, 'Rating', {filter: {}, fromBlock: 1}).pipe(
            scan((acc, curr) => {
                if(curr.rating >= 3){ 
                    acc.upvotes++;
                } else {
                    acc.downvotes++;
                }
                return acc;
            }, {upvotes: 0, downvotes: 0})
          );

          this.setState({ready: true});
      });
    });
  }

    upvote = () => {
        Ranking.methods.rate("0x0000000000000000000000000000000000000001", 5).send();
    }

    downvote = () => {
        Ranking.methods.rate("0x0000000000000000000000000000000000000001", 1).send();
    }

    render() {
        const {ready} = this.state;
        if(!ready) return <span>Loading...</span>;
        return <EnhancedRankItem votes={observables.votes} onUpvote={this.upvote} onDownvote={this.downvote} />;
    }
}




ReactDOM.render(<App />, document.getElementById('content'));
  



