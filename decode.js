const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');
function VbsDecode() {
    VbsDecode.prototype.dp = [];
    this.decodeInterger = function(value, arr, negative = false) {
        return this.unpackInt(arr, negative);
    }
    this.unpackInt = function(v, negative) { // unpack the int
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
        if (negative == true) { // symbol
            mon = '-' + mon;
        }
        return parseInt(mon, 2);
    }
    this.decodeFloat = function(value, arr, negative) { // unpack the float
        if (arr.length == 0) {
            return;
        }
        let mantissa = this.unpackFloat(arr, negative);
       
        let arrReamin = this.getRemain(value, arr);
         
        let exponent = this.decodeInterger(value, arrReamin); // get exponent  by value code

        let num = floatOperate.makeFloat(mantissa, exponent); 

        return num;
    }
    // get arr1 - arr2
    this.getRemain = function(arr1, arr2) { 
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
    // decode blob. 
    // if length of value is accuracy, return the blob data
    this.decodeBlob = function(value, arr) { 
        let len = this.decodeInterger(value, arr);
        if (len < 0) {
            return;
        }
        
        let arrRemain = this.getRemain(value, arr); // get value - arr

        arrRemain = arrRemain.slice(0,len);
        // console.log("---------",value,arr,arrRemain,len)

        if(len != arrRemain.length) {
            return;
        }
        let data = new Uint8Array(arrRemain); 
        len = arr.length + len -1;
        return [len, data];
    }
    // decode bool. if it is bool, return type
    this.decodeBool = function(value, type) {
        return type;
    }
    // decode string
    this.decodeString = function(value, arr) {
        let len = this.decodeInterger(value, arr);

        let arrRemain = this.getRemain(value, arr); // value - arr

        let ctnArr = this.getStringContent(arrRemain,len); // spilt arrRemain the len when it is object
        
        if (len != ctnArr.length) {
            return;
        }
        let str = commonFun.byteToString(ctnArr);
        
        return [len, str];
    }
    //split the value from 0 to len,and the length is len
    this.getStringContent = function(value,len) {
        let arr = [];
        for(let i=0;i<len;i++) {
            arr[i] = value[i];
        }
        return arr;
    }
    // special descripe decode
    this.decodeDescriptor = function(value, arr) {        
        return this.decodeInterger(value, arr);
    }
     // decode array
    this.decodeArray = function(value, arr) {
        let head = [],data = [];
        let headArr = [];
        if (arr.length > 1) { // judge variety whether is empty
            headArr = this.getHead(arr);
        }
        head = head.concat(kindConst.vbsKind.VBS_LIST);
        let content = this.unpackContentArray(value.slice(arr.length, value.length-1)); // from 0x02 to 0x01
        console.log("----Data---", content,)
        data =  data.concat(headArr, content);
        return data;       
    }
    // get variety if it is not empty
    this.getHead = function(arr) {  
        let headArr = [];
        let head = [];
        if (arr.length > 1) {
            for (let i=0;i<arr.length;i++) {
                if (arr[i] != kindConst.vbsKind.VBS_LIST) {
                    headArr[i] = arr[i];
                }
            }
        }
        return this.decodeInterger(arr, headArr);
    }
    this.unpackContentArray = function(value) {
        console.log(4444, value)
        let obj = [],newObj,arr;
        let valueObj,j=0,m=0; 
        let n = value.length;
        for (let i=0;i<n;i++) {
            if (value[i] == kindConst.vbsKind.VBS_LIST) { // child key->value
                [newObj, i, j] = unpackHeadOfArray(value, n, i, j); 
                obj[m++] = newObj;
                // console.log("--new Obj-", obj,newObj)
            } else {
                console.log("_____", value.slice(i,n));
                [j, valueObj] = decode(value.slice(i,n));  // get the value
                i += j;
                console.log("--value Object---",i,j,value[i],valueObj)
                obj[m++] = valueObj;  // construct the object key->value
            } 

        }
        return obj;
    }
    // find the content of object and decode it.
    function unpackHeadOfArray(value, n, i, j) { // child object
        console.log("--CCC--", value, n, i, j)
        let newObj;
        for (j = i;j<n;) { // get the object content   
           if (value[j] != kindConst.vbsKind.VBS_TAIL) { // 
               j++;
           } else {
            break;
           }
        }
        console.log("---ccc--", value.slice(i,j+1), i, j);
        [,newObj] = decode(value.slice(i,j+1)); // get the content from head(0x02) to tail(0x01)
        i = j;  // next element from j+1 start
        console.log("---ccd--", newObj, value[i]);
        return [newObj, i, j];
    }
    // decode array content
    // this.unpackArray = function(obj) {
    //     let newArr = [];
    //     let newObj = [];
    //     // let pos=0, j=0;
    //     let j = 0;
        
    //     // let n = 0;
    //     // for (let i=0;i<obj.length-1;) { 
    //     //     for (;n < obj.length;) { // Find the end of the array

    //     //        if (obj[n] != kindConst.vbsKind.VBS_TAIL) { 
    //     //             n++;
    //     //         } else {
    //     //             break;
    //     //         }
    //     //     }
    //     //     console.log("--aaa---", obj.slice(i, n), i,obj[n-1],obj[n])
    //     //     let [pos, x] = decode(obj.slice(i, n)); // Decode from i to n, and the length is n-i 
    //     //     newObj[j++] = x;
    //     //     i += pos+1; // i wiil skip len
    //     //     console.log("--bb---", i,pos,x)
    //     //     // pos = i+1; // slice from next postion

    //     // }
       
    //     // obj = obj.slice(0,obj.length-1);
    //     // while(obj.length != 0) {
    //     //     let len = obj.length;
    //     //     console.log("---AAA---", obj)
    //     //     let [pos, x] = decode(obj); // Decode from i to n, and the length is n-i 
    //     //     newObj[j++] = x;
    //     //     console.log("-decode obj--", pos, obj, x)

    //     //     obj = obj.slice(pos+1,len);
    //     //     console.log("-BCC--", pos, obj)
    //     // }

    //     obj = obj.slice(0,obj.length-1);
    //     while(obj.length != 0) {
    //         console.log("--AA--", obj)
    //         let [pos, x] = decode(obj); // Decode from i to n, and the length is n-i
    //         console.log("--AB--", x, obj) 
    //         newObj[j++] = x;
    //         console.log("-BB--", pos, newObj)
    //         obj = obj.slice(pos+1, obj.length);
    //     }
        
    //     // if(obj.length != 0) {
    //     //     obj = obj.slice(pos+1, obj.length);
    //     //     if (obj.length != 0) {
    //     //         [pos, x] = decode(obj); // Decode from i to n, and the length is n-i 
    //     //         newObj[j++] = x;
    //     //     }
    //     // }
    //     console.log("---CCC--", obj, newObj)
    //     // console.log("-----BBBB---", obj.slice(0, obj.length-1), x)
    //     return newObj;
    // }

    // decode object
    this.decodeObject = function(value, arr) {
        let head = [],data = [];
        let headArr = [],valContent = [];
        if (arr.length > 1) { // if variety is not empty
            headArr = this.getHead(arr);
        }
        head = head.concat(kindConst.vbsKind.VBS_LIST);
        valContent = value.slice(1,value.length-1); // Remove the head and tail
        let content = this.unpackObject(valContent);
        if (commonFun.isEmpty(headArr)) {
            return content;
        }
        data =  data.concat(headArr, content);
        return data;       
    }
    this.unpackObject = function(value) {
        let obj = {},newObj,arr;
        let keyStr,valueObj,j=0; 
        let n = value.length;
        for (let i=0;i<n;i++) {
            if ((value[i]&0x20) == kindConst.vbsKind.VBS_STRING) { // the key is string
                    [j, keyStr] = decode(value.slice(i, n));   // get the key                
                    i += j+1; // except value[i] from above
                    if (value[i] == kindConst.vbsKind.VBS_DICT) { // child key->value
                        [newObj, i, j] = unpackContentObj(value, n, i, j); 
                        obj[keyStr] = newObj;
                    } else {
                        [j, valueObj] = decode(value.slice(i,n));  // get the value
                        i += j;
                        obj[keyStr] = valueObj;  // construct the object key->value
                    }                  
            }
        }
        return obj;
        
    }
    // find the content of object and decode it.
    function unpackContentObj(value, n, i, j) { // child object
        let newObj;
        for (j = i;j<n;) { // get the object content   
           if (value[j] != kindConst.vbsKind.VBS_TAIL) { // 
               j++;
           } else {
            break;
           }
        }
        [,newObj] = decode(value.slice(i,j+1)); // get the content from head(0x03) to tail(0x01)
        i = j;  // next element from j+1 start
        return [newObj, i, j];
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
    if (typeof obj == 'undefined' || typeof obj == 'function') {
        return null;
    }
    let n = obj.length; 
    let x; 
    let arr = [];
    let descript = 0;
    // console.log(1111, obj.toString())
    for (let i=0; i<n;i++) {
        if (obj[i] < 0x80) {
            x = obj[i];
            arr[i] = x;
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                // i is the position of the identifier different type, record it to find the to recover the integer.
                let data= vbsDncode.decodeInterger(obj, arr, false);
                console.log("+++", i, data)
                return [i, data]; 
            } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
                return [i, vbsDncode.decodeInterger(obj, arr, true)];
            } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
                return [i, vbsDncode.decodeFloat(obj, arr, false)];
            } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
               return [i, vbsDncode.decodeFloat(obj, arr, true)];
            } else if ((x == kindConst.vbsKind.VBS_LIST)&&(obj[n - 1] == kindConst.vbsKind.VBS_TAIL)) { // array
                return [i,vbsDncode.decodeArray(obj, arr)];
            } else if ((x == kindConst.vbsKind.VBS_DICT)&&(obj[n - 1] == kindConst.vbsKind.VBS_TAIL)) { // key->value
                // console.log("-----decode Array-",i, obj)
                return [i,vbsDncode.decodeObject(obj, arr)];
            } else if (x == kindConst.vbsKind.VBS_BLOB) { // blob
                let [len, blobData] = vbsDncode.decodeBlob(obj, arr);
                return [len, blobData];
            } else if (x == kindConst.vbsKind.VBS_BOOL) { // bool false
                return [i,vbsDncode.decodeBool(obj, false)];
            } else if (x == kindConst.vbsKind.VBS_BOOL + 1) { // bool true
                return [i,vbsDncode.decodeBool(obj, true)];
            } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
                let [len, str] = vbsDncode.decodeString(obj, arr);
                return [len, str];
            } else if (x == kindConst.vbsKind.VBS_NULL) { // null
                return [i,null];
            } else if ((kindConst.vbsKind.VBS_DESCRIPTOR <= x) && (x <= 0x1F)) { // descriptor
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
       let obj = [];
       for(let i = 0; i < opt.byteLength; i++) {
          obj[i] =dv.getUint8(i);
       }
       let [,data] = decode(obj);
       return data;    
       
}
function decodeVBS(u) {
    return vbsParse(u);
}
module.exports = {
    decodeVBS
}
