const Promise = require('./promise');

let promise = new Promise((resolve, reject) => {
  resolve(123);
});
let nextPromise = promise.then(data => {
  return {
    then(onFulfilled) {
      onFulfilled({
        then(onFulfilled) {
          onFulfilled(2333);
        }
      });
    }
  };
}).then(data => {
  console.log('resolved', data);
}, err => {
  console.log('rejected', err)
})

