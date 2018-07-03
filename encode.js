const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const vbsDecode = require('./decode.js');
function VbsEncode() {
    VbsEncode.prototype.bp = [];
    this.encodeInterger = function(value, isE = false){  // isE: judge whether it is exponent
        if (value < 0) {
                 this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER + 0x20, -value, isE); 
           } else {
                this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER, value, isE);
           }
           return this.bp;
    }

    this.packIntOrStringHead = function(kind, num, isE) {
        var n = 0;
        let len = this.bp.length;
        this.bp = _intShift(this.bp, n + len, kind, num); 
    }
    // splice num according to byte and  encode every byte
    function _intShift(bp = [], n, kind, num) {
        let numString = num.toString(2);
        let arr = [];
        arr = arr.concat(bp);
        let len = numString.length;
        let numLow;  // bit of every operated
        for(let i=0;num >= 0x20 && (i < len);n++) {
            if (len - i >= 7) { // shift every 7 bit, so that it can form every
                numLow = numString.slice(len - i -7,len - i); // splice 7 bit
                num = numString.slice(0, len - i -7);
                if (typeof num != 'number') {
                    num = parseInt(num, 2);
                }
                i += 7;
                arr[n] = 0x80 | parseInt(numLow, 2); // carry every encode bit
            } else {
                if (typeof num != 'number') {
                    num = parseInt(num, 2);
                }
                arr[n] = 0x80 | num; // carry every encode bit
                num >>= 7;
            }
        }
        arr[n] = kind | num;  // operate (VBS_INTEGER | num[num.length - 1])
        return arr;
    }

    this.encodeFloat = function(value){  
        let [expo, mantissa] = floatOperate.breakFloat(value);
        // console.log(111, mantissa, expo)
        if (mantissa < 0) {
              this.packIntKind(kindConst.vbsKind.VBS_FLOATING + 1, -mantissa); 
           } else {
              this.packIntKind(kindConst.vbsKind.VBS_FLOATING, mantissa);
           }
           this.encodeInterger(expo, true);
           return this.bp;
    }
    this.packIntKind = function(kind, num) {
        let n = 0;
        this.bp = _floatShift(kind, num);
        n = this.bp.length;
        this.bp[n] = kind; // encode identifier
    }
    // splice num according to byte and  encode every byte
    function _floatShift(kind, num) {
        let numString = num.toString(2);
        let n = 0;
        let arr = [];
        let len = numString.length;
        if (len == 1) {
            arr[n] = 0x80 | num;
            return arr;
        }
        for(let i = 0;i < len;) {
            let numLow;
            if (len - i >= 7) {
                numLow = numString.slice(len - i -7,len - i); // splice 7 bit
                i += 7;
                arr[n] = 0x80 | parseInt(numLow, 2); // carry every encode bit 
            } else {
                numLow = numString.slice(0,len - i);
                i += len - i;
                arr[n] = 0x80 | parseInt(numLow, 2);

            }
            n++;
        }
        return arr;
    }
}

function myJsonStringify(jsonObj) {
        var vbsEncode = new VbsEncode();
        var result = '', curVal;
        if (jsonObj === null) {
            return String(jsonObj);
        }
        switch (typeof jsonObj) {
            case 'number':
                // big-float will be lost when store it. If the type of jsonObj is exceed 53, it express with float
                if (jsonObj % 1 == 0 && jsonObj <= Math.pow(2, 53)) {  
                    return vbsEncode.encodeInterger(jsonObj);
                } else {
                   return vbsEncode.encodeFloat(jsonObj);
                }
            case 'boolean':
                return String(jsonObj);
            case 'string':
                return '"' + jsonObj + '"';
            case 'undefined':
            case 'function':
                return undefined;
        }

        switch (Object.prototype.toString.call(jsonObj)) {
            case '[object Array]':
                result += '[';
                for (var i = 0, len = jsonObj.length; i < len; i++) {
                    curVal = JSON.stringify(jsonObj[i]);
                    result += (curVal === undefined ? null : curVal) + ",";
                }
                if (result !== '[') {
                    result = result.slice(0, -1);
                }
                result += ']';
                return result;
            case '[object Date]':
                return '"' + (jsonObj.toJSON ? jsonObj.toJSON() : jsonObj.toString()) + '"';
            case '[object RegExp]':
                return "{}";
            case '[object Object]':
                result += '{';
                for (i in jsonObj) {
                    if (jsonObj.hasOwnProperty(i)) {
                        curVal = JSON.stringify(jsonObj[i]);
                        if (curVal !== undefined) {
                            result += '"' + i + '":' + curVal + ',';
                        }
                    }
                }
                if (result !== '{') {
                    result = result.slice(0, -1);
                }
                result += '}';
                return result;

            case '[object String]':
                return '"' + jsonObj.toString() + '"';
            case '[object Number]':
            case '[object Boolean]':
                return jsonObj.toString();
        }
}

function jsonVbsEncode(u) {
    var myJson = new myJsonStringify(u);
    return JSON.stringify(myJson);
}

module.exports = {
    jsonVbsEncode
}
function testVbs() {
    let u = -1.1;  // small number test
    // let u = Math.pow(2, 1022) - 1  // big number test
    // let u = NaN;
    // let u = 0;
    var myJson = jsonVbsEncode(u);
    // console.log(myJson)
    var ss = vbsDecode.jsonVbsDecode(myJson);
    console.log(u, myJson, ss)
}

testVbs()
// function testVbs() {
//     for (let u = 1;u < 50;) {
//        let myJson = myJsonStringify(u);
//        let ss = vbsDecode.jsonVbsDecode(myJson);
//        console.log(u, myJson, ss)
//        u += Math.random();
//     } 
//     // for (let u = 10;u < 433555556756565;) {
//     //    let myJson = myJsonStringify(u);
//     //    let ss = vbsDecode.jsonVbsDecode(myJson);
//     //    console.log(u, myJson, ss)
//     //    u *= 51;
//     // } 
//     // for ( u = 10.5;u < 428543.44189;) {
//     //    var myJson = myJsonStringify(u);
//     //    var ss = vbsDecode.jsonVbsDecode(myJson);
//     //    console.log(u, myJson, ss)
//     //    u += 100.6898;
//     // }
    
// }


