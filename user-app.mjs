import { default as x } from './user-x.js';
console.log(Object.keys(x));

setTimeout(() => {
  console.log('done');
}, 1000);
