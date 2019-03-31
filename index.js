const Promise = require('./promise');

let promise = new Promise((resolve, reject) => {
  resolve(123);
}).then(data => {
  return {
    then(onFullfilled, onRejected) {
      onFullfilled(111);
      onFullfilled(222);
      onRejected(333);
      onRejected(444);
      throw (666);
    }
  }
}).then(data => {
  console.log(data);
}, err => {
  console.warn(err);
})

