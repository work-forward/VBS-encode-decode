const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');
function VbsDecode() {
    this.decodeInterger = function(value, arr, negative = false) {
        return this.unpackInt(arr, negative);
    }
    this.unpackInt = function(v, negative) { // pack the int
        let n = v.length;
        let m = '';
        let mon = '';
        // identifier、number 
        if (n == 1) {   // Only one byte
            m = (v & 0x1F).toString(2);
            if ((v & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Pos number plus the symbol
                m = '-' + m;
            }
            return parseInt(m, 2);
        }
        for (let i = 0;i < n; i++) { // mut byte splice v in order to get one byte every time
            if (i == n - 1) {
                if (v[i] == kindConst.vbsKind.VBS_BLOB) // blob
                    break;
                m = (v[i]  & 0x1F).toString(2);
                if ((v[i] & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) {
                    m = '-' + m;
                }
            } else {  // final one byte
                m = (v[i] & 0x7F).toString(2);
                if (m.length < 7 && i != n -1) {
                   m = padZero(m);
                }
            }
            mon = m + mon;
        }
        if (negative == true) {
            mon = '-' + mon;
        }
        return parseInt(mon, 2);
    }
    this.decodeFloat = function(value, arr, negative) { // pack the float

        if (arr.length == 0) {
            return;
        }
        let mantissa = this.unpackFloat(arr, negative);
       
        let arrReamin = this.getRemain(value, arr);
         
        let exponent = this.decodeInterger(value, arrReamin); // get exponent  by value code

        let num = floatOperate.makeFloat(mantissa, exponent); 
        // console.log(222, mantissa, arrReamin)
        return num;
    }
    this.getRemain = function(arr1, arr2) { // get arr1 - arr2
        let arr = [];
        let len = arr1.length - arr2.length;
        for (let i=0; i < len; i++) {
            arr[i] = arr1[arr2.length + i];
        }
        return arr;
    }
    this.unpackFloat = function(v, negative) {
        let n = v.length;
        let m = '';
        let mon = '';
        for (let i = 0;i < n - 1; i++) {
            m = (v[i] & 0x7F).toString(2);
            // console.log(1212, m, i)
            if (m.length < 7 && i != n -2 && n != 1) { // less than 7 bit, pad the m with 0 to 7 bit
               m = padZero(m);
            }
            mon = m + mon;
        }
        if (negative == true) {
            mon = '-' + mon;
        }
        return parseInt(mon, 2);
    }
    // if length of value is accuracy, return the blob data
    this.decodeBlob = function(value, arr) { 
        let len = this.decodeInterger(value, arr);
        if (len < 0) {
            return;
        }
        
        let arrRemain = this.getRemain(value, arr);

        if(len != arrRemain.length) {
            return;
        }
        let data = new Uint8Array(arrRemain); 
        return data;
    }
    // if it is bool, return type
    this.decodeBool = function(value, type) {
        return type;
    }

    this.decodeString = function(value, arr) {
        let len = this.decodeInterger(value, arr);

        let arrRemain = this.getRemain(value, arr);

        if (len != arrRemain.length) {
            return;
        }
        let str = commonFun.byteToString(arrRemain);
        return str;
    }
    this.decodeDescriptor = function(value, arr) {
        // special descripe code
        return this.decodeInterger(value, arr);
    }
    this.decodeArray = function(value, arr) {
        // variety 不为空
        let head = []; 
        head = head.concat(arr[0]); 
        if (arr.length > 1) {
            
        }
        let data = this.unpackArray(value, head);
        return data;
        // console.log(222, data, head)
        
    }
    this.unpackArray = function(value, arr) {
        var vbsDncode = new VbsDecode();
        let newArr = [];
        let newObj = [];
        let obj, x;
        obj = value.slice(arr.length, value.length - 1);
        // console.log(obj.toString())
        let pos = 0, j=0;
        for (let i=0;i<obj.length;i++) {
            x = obj[i];
            newArr[i] = x;
            if (x < 0x80) {
                // console.log(x, (x & 0x20), kindConst.vbsKind.VBS_STRING)
                if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER || ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER + 0x20)) {
                    newObj[j++] = decode(newArr.slice(pos, i+1));
                    pos = i+1;
                } else if ((x == kindConst.vbsKind.VBS_FLOATING) || (x == (kindConst.vbsKind.VBS_FLOATING + 1))) {// 读取m,e
                    continue;
                } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
                    continue;
                }

            }

        }
        return newObj;
        console.log(newObj)
    }
    // if length of m is less than 7, pad it to 7
    function padZero(m) {
        let len = m.length;
        for(; len <= 7; len++) {
            if (7-len > 0){
                m = 0 + m;
            }
        }
        return m;
    }
}


function decode(obj) {
    var vbsDncode = new VbsDecode();
    if (typeof obj == 'undefined' ) {
        return;
    }
    let n = obj.length; 
    let x; 
    let arr = [];
    let descript = 0;
    for (let i=0; i<n;i++) {
        if (obj[i] < 0x80) {
            x = obj[i];
            arr[i] = x;
            // console.log(22, i, x, x == kindConst.vbsKind.VBS_FLOATING)
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                return vbsDncode.decodeInterger(obj, arr, false);
            } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
                return vbsDncode.decodeInterger(obj, arr, true);
            } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
                return vbsDncode.decodeFloat(obj, arr, false);
            } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
               return vbsDncode.decodeFloat(obj, arr, true);
            } else if ((x == kindConst.vbsKind.VBS_LIST)&&(obj[n - 1] == kindConst.vbsKind.VBS_TAIL)) {
                return vbsDncode.decodeArray(obj, arr);
            } else if (x == kindConst.vbsKind.VBS_BLOB) { // blob
                return vbsDncode.decodeBlob(obj, arr);
            } else if (x == kindConst.vbsKind.VBS_BOOL) { // false
                return vbsDncode.decodeBool(obj, false);
            } else if (x == kindConst.vbsKind.VBS_BOOL + 1) { // true
                return vbsDncode.decodeBool(obj, true);
            } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
                return vbsDncode.decodeString(obj, arr);
            } else if (x == kindConst.vbsKind.VBS_NULL) { // null
                return null;
            } else if (kindConst.vbsKind.VBS_DESCRIPTOR <= x <= 0x1F) { // descriptor
                descript = vbsDncode.decodeDescriptor(obj, arr);
                arr[i] = descript;
            } 

        } else {
            arr[i] = obj[i];
        }
    }
}

function vbsParse(opt) {
        if (opt.length <= 0) {
                return;
        }  
       var dv = new DataView(opt); 
       var obj = [];
       for(var i = 0; i < opt.byteLength; i++) {
          obj[i] =dv.getUint8(i);
       }
       return decode(obj);    
       
}
function decodeVBS(u) {
    return vbsParse(u);
}
module.exports = {
    decodeVBS
}
