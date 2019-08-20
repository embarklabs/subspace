/* global web3 */
import React from 'react';
import ReactDOM from 'react-dom';
import EmbarkJS from 'Embark/EmbarkJS';
import Ranking from '../embarkArtifacts/contracts/Ranking';

import Phoenix from 'phoenix';
import withObservables from '@nozbe/with-observables'

const { scan, map } = require('rxjs/operators');
import { of } from 'rxjs';


const phoenix = new Phoenix(web3);

const RankItem = ({items, onUpvote, onDownvote}) => {
    return items.map((item, i) => <div key={i} className="item">
        <b>{i+1}</b> - {item.addr}<br />
        Upvotes: {item.upvotes} - Downvotes: {item.downvotes}<br />
        <button onClick={onUpvote(item.addr)}>Upvote</button> | <button onClick={onDownvote(item.addr)}>Downvote</button>
    </div>);
};


const enhance = withObservables(['items'], ({ items }) => ({items: items || of({ /* default empty object */ })}));
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
         observables.items = phoenix
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
        return <EnhancedRankItem items={observables.items} onUpvote={this.upvote} onDownvote={this.downvote} />;
    }
}




ReactDOM.render(<App />, document.getElementById('content'));
  



