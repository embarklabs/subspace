const { ReplaySubject } = require('rxjs');
const { map, scan } = require('rxjs/operators');

const { exhaustMap, takeLast, take } = require('rxjs/operators');

let _scan = scan((acc, curr) => {
  acc.push(curr);
  if (acc.length > 4) {
    acc.shift();
  }
  return acc;
}, [])

let _average = map(arr => arr.reduce((acc, current) => acc + current, 0) / arr.length)

let sub = new ReplaySubject();
sub.next(1)
sub.next(2)
sub.next(3)
sub.next(4)

// sub.pipe(_scan, _average).subscribe((v) => {
sub.pipe(takeLast(2)).subscribe((v) => {
  console.log("got value " + v)
})

// result:
// got value 1
// got value 1.5
// got value 2
// got value 2.5

// wanted result:
// got value 2.5

console.dir("---------")

sub.next(5)
sub.next(6)

// expected afterwards
// got value 3.5
// got value 4.5
