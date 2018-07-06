const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const vbsDecode = require('./decode.js');
const commonFun = require('./common.js');
function VbsEncode() {
    VbsEncode.prototype.bp = [];
    this.encodeInterger = function(value){  // isE: judge whether it is exponent
        if (value < 0) {
                 this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER + 0x20, -value); 
           } else {
                this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER, value);
           }
           return this.bp;
    }

    this.packIntOrStringHead = function(kind, num) {
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
        if (arr[n] == 37) {
            // console.log(kind, num)
        }
        return arr;
    }

    this.encodeFloat = function(value){  
        let [expo, mantissa] = floatOperate.breakFloat(value);
        // console.log(111, mantissa, expo)
        if (mantissa < 0) {
              this.packKind(kindConst.vbsKind.VBS_FLOATING + 1, -mantissa); 
           } else {
              this.packKind(kindConst.vbsKind.VBS_FLOATING, mantissa);
           }
           this.encodeInterger(expo);
           return this.bp;
    }
    this.packKind = function(kind, num) {
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
        if (len == 1) {  // only one byte
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
                numLow = numString.slice(0,len - i); // the last byte
                i += len - i;
                arr[n] = 0x80 | parseInt(numLow, 2);

            }
            n++;
        }
        return arr;
    }

    // Blob encode
    this.encodeBlob = function(value) {
        this.packKind(kindConst.vbsKind.VBS_BLOB, value.length);
        let n = this.bp.length;
        for (let i=0;i < value.length; i++) {
            this.bp[n+i] = value[i];
        }
        return this.bp;
    }
    // bool encode
    this.encodeBool = function(value) {
        let b = kindConst.vbsKind.VBS_BOOL;
        let n = 0;
        if (value) {
            b += 1;
        }
        this.bp[n] = b;
        return this.bp;
    }
    // string encode
    this.encodeString = function(value) {
        this.packIntOrStringHead(kindConst.vbsKind.VBS_STRING, value.length);
        let n = this.bp.length;
        let bytes = commonFun.stringToByte(value);
        this.bp = this.bp.concat(bytes); 
        return this.bp;
    }
    // null, function
    this.encodeNull = function(value) {
        let n = 0;
        this.bp[n] = kindConst.vbsKind.VBS_NULL;
        return this.bp;
    }
    // Array
    this.encodeArray = function(value) {
        let n = 0;
        let head = kindConst.vbsKind.VBS_LIST;
        let arr = [];
        let arr2 = [];
        for (;n < value.length; n++) {
            arr[n] = vbsStringify(value[n]); // encode value which can be in any type
            arr2 = arr2.concat(arr[n]);
        }
        let tail = kindConst.vbsKind.VBS_TAIL; 
        let arr3 = [];
        this.bp = arr3.concat(head,arr2, tail);
        return this.bp;
    }
}

function vbsStringify(obj) {
        var vbsEncode = new VbsEncode();
        var result = '', curVal;
        if (obj === null) {
            return vbsEncode.encodeNull(obj);
        }
        switch (typeof obj) {
            case 'number':
                // big-float will be lost when store it. If the type of obj is exceed 53, it express with float
                if (commonFun.isInteger(obj) && obj <= Math.pow(2, 53)) {  
                    return vbsEncode.encodeInterger(obj);
                } else {
                   return vbsEncode.encodeFloat(obj);
                }
            case 'boolean':
                return vbsEncode.encodeBool(obj);
            case 'string':
                return vbsEncode.encodeString(obj);
            case 'undefined':
            case 'null':
            case 'function':
                return vbsEncode.encodeNull(obj);
            case 'object':
                 if (Object.prototype.toString.call(obj) == '[object Uint8Array]') { // blob
                    return vbsEncode.encodeBlob(obj);
                 } else if (Object.prototype.toString.call(obj) == '[object Array]') { // list
                    return vbsEncode.encodeArray(obj);
                 } else { // key/value
                    return vbsEncode.encodeObject(obj);
                }
        }
}
// apply vbs encode function
function encodeVBS(u) { 
    let strCode = new vbsStringify(u);  // get encode vbs
    let byteArr = new ArrayBuffer(strCode.length); 
    let vbsCode = new DataView(byteArr);
    for(var i = 0; i < strCode.length; i++) {
      vbsCode.setUint8(i, strCode[i]);
    }
    // console.log(33,strCode.toString())
    return byteArr;
}

module.exports = {
    encodeVBS
}
testVbsArray()
function testVbsArray() {
    // let u = [12,34,78,"string", null, 'undefied']; 
    let u = [8, new Uint8Array([15,68,12]),78,"sdhj",89,"hdfdf",new Uint8Array([190,68,12])];
    let myJson = encodeVBS(u);
    // console.log(myJson)
    var ss = vbsDecode.decodeVBS(myJson);
    console.log(u, myJson, ss)
}
// console.log([23,34,45,{"key":34,"value":56}])
// testVbsString()
// function testVbsString() {
//     let u = "sdjsdh,sdjsdh, njsds"; 
//     let myJson = encodeVBS(u);
//     // console.log(myJson)
//     var ss = vbsDecode.decodeVBS(myJson);
//     console.log(ss)
// }
// testVbsBool()
// function testVbsBool() {
//     let u = false; 
//     let myJson = encodeVBS(u);
//     // console.log(myJson)
//     var ss = vbsDecode.decodeVBS(myJson);
//     console.log(ss)
    
// }
// testVbsBlob()
// function testVbsBlob() {
//     for (let i = 0;i<20; i++) {
//          u = new Uint8Array([1,i,3,4,5,6,230,255]); 
//         let myJson = encodeVBS(u);
//         i++;
//         var ss = vbsDecode.decodeVBS(myJson);
//         console.log(ss)
//     }
    
// }
// function testVbsFloat() {
//     let u = -1.1;  // small number test
//     // let u = Math.pow(2, 1022) - 1  // big number test
//     // let u = NaN;
//     // let u = 0;
//     let myCode = encodeVBS(u);
//     let ss = vbsDecode.decodeVBS(myCode);
//     console.log(u, myCode, ss)
//     // var dv = new DataView(myJson); 
//     // // 从第1个字节读取一个8位无符号整数
//     // var v1 = dv.getUint8(0);
//     // console.log(v1)
// }
// testVbsFloat()
// function testVbsFloat() {
//     // for (let u = 1;u < 50;) {
//     //    let myJson = encodeVBS(u);
//     //    let ss = vbsDecode.decodeVBS(myJson);
//     //    console.log(u, myJson, ss)
//     //    u += Math.random();
//     // } 
//     for (let u = 10;u < 433555556756565;) {
//        let myJson = encodeVBS(u);
//        let ss = vbsDecode.decodeVBS(myJson);
//        console.log(u, myJson, ss)
//        u *= 51;
//     } 
//     // for ( u = 10.5;u < 428543.44189;) {
//     //    var myJson = encodeVBS(u);
//     //    var ss = vbsDecode.decodeVBS(myJson);
//     //    console.log(u, myJson, ss)
//     //    u += 100.6898;
//     // }
    
// }


