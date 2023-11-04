
let m = process.env.SEGFAULT === 'no' ? '@contrast/distringuish' : '@contrast/agent-lib';
if (process.env.SEGFAULT) {
  m = process.env.SEGFAULT;
}
console.log(`requiring ${m}`);

module.exports = require(m);
