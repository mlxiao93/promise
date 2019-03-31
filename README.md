# 一步一步实现一个符合Promises/A+规范的Promise

## 准备工作
+ Promises/A+规范：https://promisesaplus.com （中文翻译可参考[这篇博客](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)）
+ 完整测试用例：https://github.com/promises-aplus/promises-tests

## 开始

### 首先，抛开测试用例，实现一个我们印象中的Promise

1. Promise是一个构造函数，其入参接收一个函数 *（fn）*，

1. Promise执行会调用fn, 并将resolve和reject作为入参传递给fn *（resolve和reject均是函数）*

1. Promise执行后，返回其实例promise

1. promise有三种状态：pending、fullfilled、rejected

1. promise存在then方法，then方法可以注册回调函数onFullfilled、onRejeted，then方法返回Promise实例 *(nextPromise)* ，供链式调用
    + then方法内部：当promise为非pending状态时，执行回调。 *（`回调的执行结果会对nextPromise产生影响，所以每次注册的回调和对应的nextPromise需要一起保存`）*

1. promise默认pending状态
    + 执行resolve置为fullfilled，保存resolve入参 *（data）*，触发onFullfilled
    + 执行reject置为rejected，保存reject入参 *（data）*，触发onRejeted

1. 执行callback时 *（onFullfilled、onRejeted）* ，传入保存的data
    + callback正常返回：触发nextPromise的resolve，传入返回值
    + callback执行捕获到错误：触发nextPromise的reject，传入捕获到的错误信息

1. 若callback的返回值是Promise实例，保证nextPromise的状态与返回的promise的状态同步

```javascript
function execCallback(promise) {
  const defers = promise.defers;
  while (defers.length > 0) {
    const defer = defers.shift();
    const nextPromise = defer.promise;
    const callback = promise.state === 'fullfilled' ?  defer.onFullfilled : defer.onRejected;
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
      resolve(nextPromise, cbRes);
    }
  }
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
```
[github上查看上述代码](https://github.com/mlxiao93/promise/commit/f45ea76d075f7bc47fa4aa2a80147e8b524203f8#diff-3db146440007cdb17d5114975a8638e0)

用几个常用的promise demo验证了下上述代码，没发现问题

跑测试用例,结果是:
```
171 passing (2m)
672 failing

  1) 2.2.1: Both `onFulfilled` and `onRejected` are optional arguments. 2.2.1.2: If `onRejected` is not a function, it must be ignored. applied to a promise fulfilled and then chained off of `onFulfilled` is `undefined`:
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
  ......
```
[查看全部log](https://github.com/mlxiao93/promise/commit/f45ea76d075f7bc47fa4aa2a80147e8b524203f8#diff-be3c246b51c5946753d44d32a39b4468)

### 分析log，按顺序先实现规范2.2.1：处理callback不为函数的情况
> 2.2.1 Both onFulfilled and onRejected are optional arguments:    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.2.1.1. If onFulfilled is not a function, it must be ignored.    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.2.1.2. If onRejected is not a function, it must be ignored.

意思是若onFulfilled、onRejected不是函数，则忽略。 

考虑如下case:
``` javascript
new Promise((resolve, reject) => {
  resolve(123);
})
.then(null, null)
.then(data => {
  console.log('data: ', data)
}, err => {
  console.log('error: ', err)
})
```
代码修改如下：
![](https://i.loli.net/2019/03/25/5c984eafc6d7a.png)
*(^_^本文写到后面发现这儿有处错误: 第8行不应该使用return，应该使用continue，但是测试用例还是过了。¶¶¶)*

[查看diff](https://github.com/mlxiao93/promise/commit/b7e9ac57032f523e55cb8289b2731ac1eafea6bb#diff-3db146440007cdb17d5114975a8638e0)


### 实现规范2.2.2、2.2.3、2.2.4中未通过的部分：异步执行callback
> 2.2.2. If onFulfilled is a function:      
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.2.2.2. it must not be called before promise is fulfilled.     
2.2.3. If onRejected is a function,            
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.2.3.2. it must not be called before promise is rejected.       
2.2.4. onFulfilled or onRejected must not be called until the [execution context](https://es5.github.io/#x10.3) stack contains only platform code. [[3.1](https://promisesaplus.com/#notes)].    

这几条规范总结起来就是: callback需要异步执行

所以为execCallback的方法体加上setTimeout就能解决问题

[查看diff](https://github.com/mlxiao93/promise/commit/40c85a64ce3e2b564e7bacc38b624e400e2e8441#diff-3db146440007cdb17d5114975a8638e0)

### 实现规范2.1.2与2.1.3：状态转换的限制
> 2.1.2. When fulfilled, a promise:     
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.1.2.1. must not transition to any other state.    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.1.2.2. must have a value, which must not change.    
2.1.3. When rejected, a promise:    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.1.3.1. must not transition to any other state.    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2.1.3.2. must have a reason, which must not change.    

状态只能从pending转掉fullfilled或者rejected, 且只能转换一次

改动如下：
![](https://i.loli.net/2019/03/25/5c98578d6379f.png)
[查看diff](https://github.com/mlxiao93/promise/commit/0538a569eaef14cc4478f45a3df8815efa97b053#diff-3db146440007cdb17d5114975a8638e0)

至此，规范1、2.1、2.2的要求全部满足

### 理解规范2.3：callback返回promise & resolve传入promise的处理
promise的callback函数是可以返回promise的，

对于返回promise的情况，then方法返回的newPromise的状态和携带的数据，要求与callback返回的promise一致，看demo：

```javascript
const promise1 = new Promise((resolve, reject) => {
  resolve(123);
});
const promise2 = new Promise((resolve, reject) => {
  resolve(456);
});
new Promise((resolve, reject) => {
  resolve(promise1);
}).then(data => {
  console.log(data)    // expect "123"
  return promise2;
}).then(data => {
  console.log(data);   // expect "456"
})
```
规范2.3:

+ 保障了promise状态和数据的链式传递，实现了异步代码的继发调用，避免callback hell
+ 规定了只要对象是`thenable`，就可以当成promise处理

关于`thenable`, 简单来讲，**就是包含then方法的对象或函数**：
```javascript
new Promise((resolve, reject) => {
  resolve('ok');
}).then(data => {
  return {         // 此处返回的就是thenable
    then(resolve, reject) {
      resolve('aaa');
    }
  };
}).then(data => {
  console.log(data)   // log: aaa
})
```
为什么会有`thenable`这个定义？

主要是为了使不同的promise实现可以协同使用

例如，张三实现了个Promise1， 李四实现了个库Promise2，那么可以这么使用
```javascript
new Promise1(resolve => {
  resolve(new Promise2())
})
```
具体到实现代码，不可通过跑一遍测试用例判断是否Promise, 所以规定通过thenable判断是否可以协同使用

### 实现规范 2.3
前文的测试log，报错指向 2.3.1

| 2.3.1. promise and x refer to the same object, reject promise with a TypeError as the reason.

case如下
```
let promise = new Promise((resolve, reject) => {
  resolve(123);
});
let nextPromise = promise.then(data => {
  return nextPromise;    // 这种情况需要throw TypeError
})
```
代码改动：
![](https://i.loli.net/2019/03/29/5c9cf74343a19.png)
[查看diff](https://github.com/mlxiao93/promise/commit/a1beb0becbbef4c6e7e05ac8fd5c717c9dd5cdad#diff-3db146440007cdb17d5114975a8638e0)


**2.3.3 & 2.3.4**
![](https://i.loli.net/2019/03/29/5c9cfb3081b26.png
)
其实就是围绕`thanable`的一堆处理逻辑，先大致按照文档写一下

注意:
+ execCallback和resolve函数都要处理thenable
+ promise也可以当成thenable处理

这里先贴一下用于处理thenable的函数：
```javascript
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
```

其它修改
![](https://i.loli.net/2019/03/31/5ca08ebf483a0.png
)
[查看diff](https://github.com/mlxiao93/promise/commit/8bc642d9b77ede74c01b52a8f6f03b7e74d442c9#diff-3db146440007cdb17d5114975a8638e0)


**再看[log](https://github.com/mlxiao93/promise/commit/8bc642d9b77ede74c01b52a8f6f03b7e74d442c9#diff-be3c246b51c5946753d44d32a39b4468)，只剩下60个失败的case了**

剩下的case如下：

thenable的then方法里，如果先后执行了onFullfilled、onRejected、throw，应当以第一次执行的为准，忽略后续的执行
```javascript
let promise = new Promise((resolve, reject) => {
  resolve('ok');
}).then(data => {
  return {
    then(onFullfilled, onRejected) { 
      onFullfilled(111);   // 只允许这一句执行
      onFullfilled(222);
      onRejected(333);
      onRejected(444);
      throw (666);
    }
  }
})
```

代码修改：
![](https://i.loli.net/2019/03/31/5ca0947ca2c8c.png
)
[查看diff](https://github.com/mlxiao93/promise/commit/0ab4326f3257338ddb288ff970d299705bb069e0#diff-3db146440007cdb17d5114975a8638e0)


**终于，测试用例全过了，大功告成~~~**

![](https://i.loli.net/2019/03/31/5ca09baae92d2.gif
)


