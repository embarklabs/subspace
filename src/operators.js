const { of, pipe }  = require('rxjs');
const { map, pluck, reduce } = require('rxjs/operators');

function $takeProps() {
  const args = Object.values(arguments);
  return pipe(
    map(v => {
      const r = {};
      args.forEach(a => {
        r[a] = v[a];
      });
      return r;
    }),
  );
}

/*
// ex 1
of({a: 1, b:2, e: 1}, {a: 0, c: 1, b:3}, {a: 0, d: 1, b:1})
  .pipe($takeProps("a", "b", "e"))
  .subscribe((v) => console.log(v));
*/

function $average(cb) {
    return pipe(
      reduce((accum, curr) => {
        let currentValue;
        if (typeof cb === 'string' || cb instanceof String){
          currentValue = curr[cb];
        } else if(typeof cb === "function") {
          currentValue = cb(curr);
        } else {
          currentValue = curr;
        }
  
        return {
          sum: accum.sum + currentValue,
          count: accum.count + 1
        }
      }, { sum: 0, count: 0 }),
      map(o => o.sum / o.count)
    );
  }

/*
of(10, 3, 4)
  .pipe($average())
  .subscribe((v) => console.log(v));
*/


module.exports = {
    $takeProps,
    $average
};