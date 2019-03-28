/**
 * 处理thenanble， 如果data不是thenable，返回false
 * @param promise: thanable执行后会对该promis产生影响
 * @param data: callback的返回，或者resolve的传入值
 */
function doResolveThenable (promise, data) {    
  if (data && /object|function/.test(typeof data)) {
    let then;
    try {
      then = data.then;
      if (typeof then !== 'function') return false;    // 非thenanble
      then.call(data, data => { 
        resolve(promise, data)
      }, err => {
        reject(promise, err)
      })
    } catch(err) {
      reject(promise, err)
    }
  } else {
    return false;   // 非thenanble
  }
  return true;
}

function execCallback(promise) {
  setTimeout(() => {     // 2.2.2.2、2.2.3.2、2.2.4
    const defers = promise.defers;
    while (defers.length > 0) {
      const defer = defers.shift();
      const nextPromise = defer.promise;
      const callback = promise.state === 'fullfilled' ?  defer.onFullfilled : defer.onRejected;
      if (typeof callback !== 'function') {     // 2.2.1
        (promise.state === 'fullfilled' ? resolve : reject)(nextPromise, promise.data);
        continue;
      }
      let cbRes;
      try {
        cbRes = callback(promise.data);
        if (cbRes === nextPromise) throw new TypeError();    // 2.3.1
      } catch (err) {
        reject(nextPromise, err);
        continue;
      }
      let isThenable = doResolveThenable(nextPromise, cbRes);
      if (!isThenable) {
        resolve(nextPromise, cbRes);
      }
    }
  });
}

function resolve(promise, data) {
  if (promise.state !== 'pending') return;
  let isThenable = doResolveThenable(promise, data);
  if (!isThenable) {
    promise.data = data;
    promise.state = 'fullfilled';
    execCallback(promise);
  }
}

function reject(promise, err) {
  if (promise.state !== 'pending') return; 
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