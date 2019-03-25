const Promise = require('./promise');

let _resolve;
let promise = new Promise((resolve, reject) => {
  _resolve = resolve;
})

promise.then(data => {
  return 1;
}).then(data => {
  console.log(data)
})

promise.then(data => {
  throw 2;
}).then(null, err => {
  console.log(err);
})

promise.then(data => {
  return 3
}).then(data => {
  console.log(data)
})

_resolve('')