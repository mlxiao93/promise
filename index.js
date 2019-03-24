const Promise = require('./promise');

let _resolve;
let promise = new Promise((resolve, reject) => {
  _resolve = resolve;
})

promise.then(data => {
  console.log('data: ', data)
}, err => {
  console.log('error: ', err)
})

_resolve(123);
