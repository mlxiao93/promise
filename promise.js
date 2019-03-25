function execCallback(promise) {
  setTimeout(() => {     // 2.2.2.2、2.2.3.2、2.2.4
    const defers = promise.defers;
    while (defers.length > 0) {
      const defer = defers.shift();
      const nextPromise = defer.promise;
      const callback = promise.state === 'fullfilled' ?  defer.onFullfilled : defer.onRejected;
      if (typeof callback !== 'function')      // 2.2.1
          return (promise.state === 'fullfilled' ? resolve : reject)(nextPromise, promise.data);
      let cbRes;
      try {
        cbRes = callback(promise.data);
      } catch (err) {
        reject(nextPromise, err);
        continue;
      }
      if (cbRes instanceof Promise) {
        cbRes.then(data => {          // 当cbRes也是Promise时，保证nextPromise的状态与cbRes一致
          resolve(nextPromise, data);
        }, err => {
          reject(nextPromise, err);
        });
      } else {
        resolve(nextPromise);
      }
    }
  });
}

function resolve(promise, data) {
  promise.data = data;
  promise.state = 'fullfilled';
  execCallback(promise);
}

function reject(promise, err) {
  promise.data = err;
  promise.state = 'rejected';
  execCallback(promise);
}

function Promise(fn) {
  this.state = 'pending';    // pending|fullfilled|rejected
  this.data = undefined;
  this.defers = [];     // 保存 callback 和 nextPromise

  const promise = this;
  fn(data => {
    resolve(promise, data);
  }, err => {
    reject(promise, err);
  });
  return this;
};

Promise.prototype.then = function(onFullfilled, onRejected) {
  const nextPromise = new Promise(function() {});
  let defer = {
    promise: nextPromise,
    onFullfilled,
    onRejected
  };   // 回调的执行会对nextPromise产生影响，故一起保存
  this.defers.push(defer)
  if (this.state !== 'pending') {
    execCallback(this);    // 非pending状态，触发callback
  }
  return nextPromise;
}

module.exports =  Promise;