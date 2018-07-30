
var BigNumber = require('bignumber.js');
let a = "000010000000000000000000000000000000000000000000000000000000000";
console.log(BigNumber("000010000000000000000000000000000000000000000000000000000000000", 2).toNumber())
var c = 1;
var b = 63;
console.log(BigNumber(1).multipliedBy(BigNumber(2).exponentiatedBy(63)).valueOf());