
const m = process.env.SEGFAULT === 'no' ? '@contrast/distringuish' : '@contrast/agent-lib';
console.log(`requiring ${m}`);

module.exports = require(m);
