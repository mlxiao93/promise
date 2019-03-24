const Promise = require('./promise');

new Promise((resolve, reject) => {
  resolve(123);
}).then(data => {
  console.log('data: ', data)
}, err => {
  console.log('error: ', err)
})
