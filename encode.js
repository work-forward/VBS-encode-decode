const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const vbsDecode = require('./decode.js');
const commonFun = require('./common.js');
function VbsEncode() {
    VbsEncode.prototype.bp = [];
    /**
     *  @pack the integer

     *  return: this.bp
     */
    this.encodeInterger = function(value){  // isE: judge whether it is exponent
        if (value < 0) {
                 this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER + 0x20, -value); 
           } else {
                this.packIntOrStringHead(kindConst.vbsKind.VBS_INTEGER, value);
           }
           return this.bp;
    }
     /**
     *  @pack the head
     */
    this.packIntOrStringHead = function(kind, num) {
        let n = 0;
        let len = this.bp.length;
        this.bp = _intShift(this.bp, n + len, kind, num); 
    }
    /**
      *  @split num according to byte and  encode every byte
      *   the highest position of every byte set up to 1 except the last byte
      *   the late byte and kind conduct  or operartion
     */
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
    /**
      *  @encode float
      *  split value to expo and mantissa
      *  and then pack expo with encodeInterger
      *  pack mantissa with packKind
     */
    this.encodeFloat = function(value){  
        let [expo, mantissa] = floatOperate.breakFloat(value);

        if (mantissa < 0) {
              this.packKind(kindConst.vbsKind.VBS_FLOATING + 1, -mantissa); 
           } else {
              this.packKind(kindConst.vbsKind.VBS_FLOATING, mantissa);
           }
           this.encodeInterger(expo);
           return this.bp;
    }
    /**
      *  @pack num and kind
     */
    this.packKind = function(kind, num) {
        let n = 0;
        this.bp = _floatShift(kind, num);
        n = this.bp.length;
        this.bp[n] = kind; // encode identifier
    }
    /**
      *  @split num according to byte and  encode every byte
      *   the highest position of every byte set up to 1 except the last byte
     */
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

    /**
      *  @blob decode
      *   pack the type of value  and the length of value
      *   pack the blob data 
     */
    this.encodeBlob = function(value) {
        this.packKind(kindConst.vbsKind.VBS_BLOB, value.length);
        let n = this.bp.length;
        for (let i=0;i < value.length; i++) {
            this.bp[n+i] = value[i];
        }
        return this.bp;
    }
    /**
      *  @bool decode
      *   pack the true/false
      *   pack the bool type
     */
    this.encodeBool = function(value) {
        let b = kindConst.vbsKind.VBS_BOOL;
        let n = 0;
        if (value) {
            b += 1;
        }
        this.bp[n] = b;
        return this.bp;
    }
    /**
      *   @pack string
      *   pack the type of the value and the length of the value
      *   pack the data
     */
    this.encodeString = function(value) {
        this.packIntOrStringHead(kindConst.vbsKind.VBS_STRING, value.length);
        let n = this.bp.length;
        let bytes = commonFun.stringToByte(value);
        this.bp = this.bp.concat(bytes); 
        return this.bp;
    }
    /**
      *  @pack bool null, function
      *   pack the null/undefine/function
     */
    this.encodeNull = function(value) {
        let n = 0;
        this.bp[n] = kindConst.vbsKind.VBS_NULL;
        return this.bp;
    }
    /**
      *  @bool null, function
      *   pack the null/undefine/function
     */
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
        this.bp = arr3.concat(head,arr2, tail); // head+arr2+tail
        return this.bp;
    }
    /**
      *   @pack object key/value
      *   pack the type of the value
      *   pack the data
      *   pack the tail
     */
    this.encodeObject = function(value) {
        let head = kindConst.vbsKind.VBS_DICT; // head identity
        let arr = [];
        let obj = packObject(value); // pack the content by key/value
        let tail = kindConst.vbsKind.VBS_TAIL; 
        this.bp = arr.concat(head,obj, tail); // head+obj+tail  
        return this.bp;
    }
    /**
      *   @pack key and value
     */
    function packObject(obj) {
      let arr = [];
      let data = [];
      let j=0;
      for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            arr[j++] = vbsStringify(i); // pack the key
            arr[j++] = vbsStringify(obj[i]); // pack the value that key->value

            data = data.concat(arr[j-2],arr[j-1]); // concat the pack key-value
        }
      }
      return data;
    }
}
/**
  *   @judge the obj type
  *    according to corresponding type to encode the data
*/
function vbsStringify(obj) {
        var vbsEncode = new VbsEncode();
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
                 } else if (Object.prototype.toString.call(obj) == '[object Array]') { // array
                    return vbsEncode.encodeArray(obj);
                 } else { // key/value
                    return vbsEncode.encodeObject(obj);
                }
        }
}
// apply vbs encode function
/**
  *   @encode data interface
  *   Description: Encode u to strCode, and turn strCode into Binary array
*/
function encodeVBS(u) { 
    let strCode = new vbsStringify(u);  // get encode vbs
    let byteArr = new ArrayBuffer(strCode.length); 
    let vbsCode = new DataView(byteArr);
    for(let i = 0; i < strCode.length; i++) {
      vbsCode.setUint8(i, strCode[i]);
    }
    return byteArr;
}

module.exports = {
    encodeVBS
}
// function testVbsKeyVal() {
//     let u = {"a": "key","js":'23',"dj":{"djd":"dsdh","hu":{"djd":"dsdh"}}};
//     let myVbs = encodeVBS(u);
// }
// testVbsKeyVal()
// function testVbsKeyVal() {
//     // let u = [12,34,78,"string", null, 'undefied'];
//     // let u = {"a": "dfdf"} 
//     // let u = {"a": "key","js":'23',"djd":"dsdh"};
//     // let u = {89:"key","shj":"dfn","23":"dfhjdf"}
//     let cc = {
//     	"k": "edf",
//     	"l": "ddf",
//     	"sd": 1234,
//     	"sdf":"dfjk"
//     }
//     // let u = {"s":cc};
//     let u = {"df":{"sd":"dsf"},"s":cc,"dfj":"dfjk","sjdksd":"df","dfhjdf":"dbfhdfd","93":"dfhdf"};
//     let myVbs = encodeVBS(u);
//     // console.log(myVbs)
//     var ss = vbsDecode.decodeVBS(myVbs);
//     console.log(u, myVbs, ss)
// }
// testVbsArray()
// function testVbsArray() {
//     // let u = [7823,8912,[892,1289],92389238293232320,237,[823],23,[3489343,892323,892323],[3748434,8923892],895,8923,80];
// 	// let u = [23,34,[52,372],56,56]; 
// 	// let u = [[78,[90,79]],[892323,[9023,323]]]
//     // let u = [78,[2,9],90,[89]];
// 	// let u = [23,34,52372,56,56,true,false,343,56,"dflkd","df",4,568,89434]; 
//     // let u = [16,new Uint8Array([15,68,12]),1212,128723,2389]; 
//     let u = [8, new Uint8Array([15,68,12]),67,[167,89.78,89.37,new Uint8Array([89,2389,3489,89.8]),89],"sdhj",89,"hdfdf",new Uint8Array([190,68,12])];
//     // let u = [92389.89, 23.78,829.789,3.127823,2323.20];
//     // let u = [[78,[90,79]],[892323,[909023,78232323]]];
//     // let u = [892323,[909023,78232323]];
//     // let u = ["wehjwe","sdjhdsfd","dfbjdfdf","dfdufdqwqw","sdwuebuweegueygfurwr","sdhhhhhhuer","374823"];
//     // let u = ["shdjsd"]
//     // let u = [89.347,89]
//     // let u = [new Uint8Array([15,68,12])];
//     let myVbs = encodeVBS(u);
//     // console.log(myVbs)
//     // let ss = vbsDecode.decodeVBS(myVbs);
//     // console.log(u, myVbs, ss)
// }
// testVbsBatArray()
// function testVbsBatArray() {
//     for (let i=0;i<100;) {
//     	 let u = [8, new Uint8Array([15,68,12]),67,[i,89],"sdhj",89,"hdfdf",new Uint8Array([190,68,12])];
// 	    let myVbs = encodeVBS(u);
// 	    i += 20;
// 	    // console.log(myVbs)
// 	    let ss = vbsDecode.decodeVBS(myVbs);
// 	    console.log(u, myVbs, ss)
//     }  
// }
// console.log([23,34,45,{"key":34,"value":56}])
// testVbsString()
// function testVbsString() {
//     // let u = [89,23,902323,3403493,450459,23902,34903];
//     // let u = ["89","skdj","sdhjs","sdjksd","dshf","dfjk",89,100,290,"sdhj"];  8023238934,237,[823],23,3489343,892323
//     // let u = [12.89,89.8,24,89,"str","sdhj",89.8,80.6,-1.1,-1.25] ,[3748434,8923892],895,8923,80
//     // let u = [12,[9,6],80,[89],90,67]
//     // let u = [[8023238934,237,[823],23,3489343,892323]]
//     let u = [7823,8912,[892,1289],90,237,[823],23,[3489343,892323,892323],[3748434,8923892],895,8923,80];
//     // let u = [null];
//     // let u = -1.367;
//     let myVbs = encodeVBS(u);
//     // console.log(myVbs)
//     // var ss = vbsDecode.decodeVBS(myVbs);
//     // console.log(u, '----' )
// }
// testVbsBool()
// function testVbsBool() {
//     let u = true; 
//     let myVbs = encodeVBS(u);
//     // console.log(myVbs)
//     var ss = vbsDecode.decodeVBS(myVbs);
//     console.log(ss)
    
// }
// testVbsBlob()
// function testVbsBlob() {
//     for (let i = 0;i<20; i++) {
//          u = new Uint8Array([1,i,3,4,5,6,230,255]); 
//         let myVbs = encodeVBS(u);
//         i++;
//         var ss = vbsDecode.decodeVBS(myVbs);
//         console.log(u, ss)
//     }  
// }

// testVbsBlob()
// function testVbsBlob() {
//     let u = new Uint8Array([1,6,3,4,5,78,6,230,255]); 
//     let myVbs = encodeVBS(u);
//     var ss = vbsDecode.decodeVBS(myVbs);
//     console.log(u, ss)  
// }
// function testVbsFloat() {
//     // let u = -1282.8923298283232;  // small number test
//     // let u = Math.pow(2, 1022) - 1  // big number test
//     // let u = NaN;
//     let u = 784545454233478334434.34874323;
//     // let u = 127823
//     // let u = 0;
//     let myCode = encodeVBS(u);
//     let ss = vbsDecode.decodeVBS(myCode);
//     console.log(u, myCode, ss)
//     // var dv = new DataView(myVbs); 
//     // // 从第1个字节读取一个8位无符号整数
//     // var v1 = dv.getUint8(0);
//     // console.log(v1)
// }
// testVbsFloat()
// function testVbsFloat() {
//     // for (let u = 1;u < 50;) {
//     //    let myVbs = encodeVBS(u);
//     //    let ss = vbsDecode.decodeVBS(myVbs);
//     //    console.log(u, myVbs, ss)
//     //    u += Math.random();
//     // } 
//     for (let u = 10;u < 433555556756565;) {
//        let myVbs = encodeVBS(u);
//        let ss = vbsDecode.decodeVBS(myVbs);
//        console.log(u, myVbs, ss)
//        u *= 51;
//     } 
//     // for ( u = 10.5;u < 428543.44189;) {
//     //    var myVbs = encodeVBS(u);
//     //    var ss = vbsDecode.decodeVBS(myVbs);
//     //    console.log(u, myVbs, ss)
//     //    u += 100.6898;
//     // }
    
// }


