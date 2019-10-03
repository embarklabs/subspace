import { of, pipe }  from 'rxjs';
import { map, pluck, scan } from 'rxjs/operators';

export function $takeProps() {
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

export function $average(cb) {
    return pipe(
      scan((accum, curr) => {
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

export function $max(cb) {
  return pipe(
    scan((acc, curr) => {
      let currentValue;
      if (typeof cb === 'string' || cb instanceof String){
        currentValue = curr[cb];
      } else if(typeof cb === "function") {
        currentValue = cb(curr);
      } else {
        currentValue = curr;
      }

      if (currentValue > acc) return currentValue;
      return acc;
    })
  );
}

export function $min(cb) {
  return pipe(
    scan((acc, curr) => {
      let currentValue;
      if (typeof cb === 'string' || cb instanceof String){
        currentValue = curr[cb];
      } else if(typeof cb === "function") {
        currentValue = cb(curr);
      } else {
        currentValue = curr;
      }

      if (currentValue < acc) return currentValue;
      return acc;
    })
  );
}

export function $latest(num) {
  return pipe(
    scan((acc, curr) => {
      let currentValue = curr;

      acc.push(currentValue)
      if (acc.length > num) {
        acc.shift()
      }

      return acc;
    }, [])
  );
}

/*
of(10, 3, 4)
  .pipe($average())
  .subscribe((v) => console.log(v));
*/
