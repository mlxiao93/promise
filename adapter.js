const Promise = require('./promise');

module.exports = {
  deferred() {
    let resolve, reject;
    const promise = new Promise((_resolve, _reject) => {
      resolve = _resolve,
      reject = _reject
    })
    return {
      promise,
      resolve, 
      reject
    }
  }
}