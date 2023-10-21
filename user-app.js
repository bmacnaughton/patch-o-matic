const x = require('./user-x.js');
console.log('x', Object.getOwnPropertyNames(x));

setTimeout(() => {
  console.log('done');
}, 1000);

