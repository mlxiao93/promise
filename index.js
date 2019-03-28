const Promise = require('./promise');

let promise = new Promise((resolve, reject) => {
  resolve(123);
});
let nextPromise = promise.then(data => {
  return nextPromise;
})

