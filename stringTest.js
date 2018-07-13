const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');
let k=0;
function VbsDecode() {
    /**
     *  @decode interger
     *
     *  {param: value, the array of the encode}
     *  {param: arr, the identifier blob type}
     *  {param: negative, the sign of Positive and negative}
     *  return: the number of decode
     */
    this.decodeInterger = function(value, arr, negative = false) {
        return this.unpackInt(arr, negative);
    }
    /**
     *  @unpack interger
     *
     *  {param: v, the array of the encode}
     *  {param: negative, the identifier integer type}
     *  return: the number of decode
     */
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
    /**
     *  @decode float
     *
     *  {param: value, the array of the encode}
     *  {param: arr, the identifier blob type}
     *  {param: negative, the sign of Positive and negative}
     *  return {len: the length of mantissa and exponent};{num: decode the float}
     */
    this.decodeFloat = function(value, arr, negative) { // unpack the float
        if (arr.length == 0) {
            return;
        }
        let mantissa = this.unpackFloat(arr, negative);

        let [arrRemain,eNeg] = this.getExponent(value, arr); // get value - arr, that is the exponent code

        let exponent = this.decodeInterger(value, arrRemain, eNeg); // get exponent  by value code

        let num = floatOperate.makeFloat(mantissa, exponent); 
        let len = arr.length + arrRemain.length;

        return [len, num];
    }
    /**
     *  @get exponent encode sequence
     *
     *  {param: value, the array of the encode}
     *  {param: arr, the identifier blob type}
     *  {param: negative, the sign of Positive and negative}
     *  return {remain: exponent encode};{true/false refer to Positive and negative number}
     */
    this.getExponent = function(value, arr) {
        let remain = [];
        let len = arr.length;
        let j=0;
        for(let i=len;i<value.length;i++) {
            remain[j++] = value[i]; 
            if ((value[i] & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // int +
                return [remain,false];
            } 
            if ((value[i] & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // int -
                return [remain,false];
            }
        }
        return ["cannot decode the type"];
    }
    /**
     *  @get arr1 subtract arr2
     *
     *  {param: arr1, array}
     *  {param: arr2, array}
     *  return {arr: arr1 - arr2}
     */
    this.getRemain = function(arr1, arr2) { 
        let arr = [];
        let len = arr1.length - arr2.length;
        for (let i=0; i < len; i++) {
            arr[i] = arr1[arr2.length + i];
        }
        return arr;
    }
     /**
     *  @unpack float
     *
     *  {param: v, the array of the encode}
     *  {param: negative, the identifier integer type}
     *  return: the number of decode
     */
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
    /**
     *  @decode blob
     *
     *  {param: value, the array of the encode}
     *  {param: arr, the identifier blob type}
     *  return {len: the blob length};{data: decode the blob data}
     */
    this.decodeBlob = function(value, arr) { 
        let len = this.decodeInterger(value, arr);
        if (len < 0) {
            return;
        }
        
        let arrRemain = this.getRemain(value, arr); // get value - arr

        arrRemain = arrRemain.slice(0,len);

        if(len != arrRemain.length) {
            return;
        }
        let byteArr = new ArrayBuffer(arrRemain.length); 
        let vbsCode = new DataView(byteArr);
        for(let i = 0; i < arrRemain.length; i++) {
          vbsCode.setUint8(i, arrRemain[i]);
        }
        let data = commonFun.arrb2String(byteArr);

        len = arr.length + len -1;
        return [len, data];
    }
    /**
     *  @decode bool
     *
     *  {param: value, the array of the encode}
     *  {param: type, true or false}
     *  return {type: true/false}
     */
    this.decodeBool = function(value, type) {
        return type;
    }
    /**
     *  @decode string
     *
     *  {param: value, the array of the encode}
     *  {param: arr, the type encode}
     *  return {valueLen: the length of the string};{str: the decode string}
     */
    this.decodeString = function(value, arr) {
        let len = this.decodeInterger(value, arr);

        let arrRemain = this.getRemain(value, arr); // value - arr

        let ctnArr = this.getStringContent(arrRemain,len); // spilt arrRemain the len when it is object
        
        if (len != ctnArr.length) {
            return;
        }
        let str = commonFun.byteToString(ctnArr);

        let valLen = arr.length + len -1;
        return [valLen, str];
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
        let content;
        // console.log("---+++",value, value.slice(arr.length, value.length));
        // if(value[2] == 1)
        //      content = this.unpackArray(value.slice(arr.length-1, value.length)); // from 0x02 to 0x01
        // else 
         content = this.unpackArray(value.slice(arr.length, value.length));
        // console.log("--content--", content)
        data =  data.concat(headArr, content);
        return data;       
    }
    this.unpackArray = function(value) {
        // console.log("decodeArray---",value)
        let dataArr = [],newObj,arr;
        let valueObj,j=0,m=0;
        let str = '[';
        let n = value.length; // 
        k++;
        // console.log(111, value,k,n,str)
        for (let i=0;i<n;i++) {  
            // console.log("#### i: ",i, value[i], str);
            if (value[i] != kindConst.vbsKind.VBS_TAIL) { // until to 0x01
                value = value.slice(i,n);
                // console.log("-----",value.toString());
                [j, valueObj] = decode(value);  // get the value of one type
                console.log("###", valueObj,j,value.toString())
                // console.log("----####----",valueObj, j,value.toString());
                if (str.slice(str.length-1,str.length) == ']') {
                    str += ",";
                }
                i += j;
                str += (valueObj === undefined ? null : valueObj) + ",";
                console.log("sd",i,value[i]);
            } else {
              if (str !== '[') {
                    str = str.slice(0, -1);
              }
              str += ']';
              // i++;
              return [i, str];
            }

        }
        // console.log("232323",str)
        return str;
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
    
    // find the content of object and decode it.
    function unpackHeadOfArray(value, n, i, j) { // child array
        let newObj;
        for (j = i;j<n;) { // get the array content   
           if (value[j] != kindConst.vbsKind.VBS_TAIL) { // 
               j++;
           } else {
            break;
           }
        }
        [,newObj] = decode(value.slice(i,j+1)); // get the content from head(0x02) to tail(0x01)
        i = j;  // next element from j+1 start
        return [newObj, i, j];
    }
    // decode object
    this.decodeObject = function(value, arr) {
        let head = [],data = [];
        let headArr = [],valContent = [];
        if (arr.length > 1) { // if variety is not empty
            headArr = this.getHead(arr);
        }
        head = head.concat(kindConst.vbsKind.VBS_LIST);
        valContent = value.slice(arr.length,value.length-1); // Remove the head and tail
        let content = this.unpackObject(valContent);
        if (commonFun.isEmpty(headArr)) {
            return content;
        }
        data =  data.concat(headArr, content);
        return data;       
    }
    this.unpackObject = function(value) {
        let dataArr = {},newObj,arr;
        let keyStr,valueObj,j=0; 
        let n = value.length;
        for (let i=0;i<n;i++) {
            if ((value[i]&0x20) == kindConst.vbsKind.VBS_STRING) { // the key is string
                    [j, keyStr] = decode(value.slice(i, n));   // get the key                
                    i += j+1; // except value[i] from above
                    if (value[i] == kindConst.vbsKind.VBS_DICT) { // child key->value
                        [newObj, i, j] = unpackContentObj(value, n, i, j); 
                        dataArr[keyStr] = newObj;
                    } else {
                        [j, valueObj] = decode(value.slice(i,n));  // get the value
                        i += j;
                        dataArr[keyStr] = valueObj;  // construct the object key->value
                    }                  
            }
        }
        return dataArr;
        
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


function decode(dataArr) {
    var vbsDncode = new VbsDecode();
    if (typeof dataArr == 'undefined' || typeof dataArr == 'function') {
        return null;
    }
    let n = dataArr.length; 
    let result = "";
    let x; 
    let arr = [];
    let descript = 0,pos=0;
    let traData = dataArr;
    let data;
    for (let i=0; i<n;i++) {
        let len = 0;
        if (traData[i] < 0x80) {
            x = traData[i];
            arr[pos++] = x;
            // console.log("@#",i,x,arr)
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                // i is the position of the identifier different type, record it to find the to recover the integer.
                console.log("Int", dataArr,arr,arr.length,n)
                data = vbsDncode.decodeInterger(dataArr, arr, false);
                dataArr = dataArr.slice(arr.length,n);
                pos = 0;
                arr.length = 0;
                // i+= arr.length; 
                console.log("Int i:", i,data,dataArr)
            } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
                data = vbsDncode.decodeInterger(dataArr, arr, true);
                dataArr = dataArr.slice(arr.length,n);
                pos = 0;
                arr.length = 0;
                i+=arr.length;
            } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
                [len, data] = vbsDncode.decodeFloat(dataArr, arr, false);
                i += len - arr.length; 
                dataArr = dataArr.slice(len,n);
                pos = 0;
                arr.length = 0;
            } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
               [len, data] = vbsDncode.decodeFloat(dataArr, arr, true);
               i += len - arr.length; // 
               dataArr = dataArr.slice(len,n);
               pos = 0;
               arr.length = 0;
            } else if ((x == kindConst.vbsKind.VBS_LIST)) { // array
                console.log("--Array ----###", dataArr,arr);
                //len++;
                [len, data] = vbsDncode.decodeArray(dataArr, arr);
                i += len;

                dataArr = dataArr.slice(i,n);
                pos = 0;
                arr.length = 0;
                console.log("arr--",len, dataArr,data)
            } else if ((x == kindConst.vbsKind.VBS_DICT)) { // key->value
                data = vbsDncode.decodeObject(dataArr, arr);
            } else if (x == kindConst.vbsKind.VBS_BLOB) { // blob
                [i, data] = vbsDncode.decodeBlob(dataArr, arr);
            } else if (x == kindConst.vbsKind.VBS_BOOL) { // bool false
                data = vbsDncode.decodeBool(dataArr, false);
                dataArr = dataArr.slice(++i,n);
            } else if (x == kindConst.vbsKind.VBS_BOOL + 1) { // bool true
                data = vbsDncode.decodeBool(dataArr, true);
                dataArr = dataArr.slice(++i,n);
                // console.log("--bool--", dataArr)
            } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
                // console.log("arr", arr,dataArr.toString());
                [len, data] = vbsDncode.decodeString(dataArr, arr); 
                i += len;
                dataArr = dataArr.slice(len+1,n);
                pos = 0;
                arr.length = 0;
                // console.log("string",arr,data,dataArr.toString())
            } else if (x == kindConst.vbsKind.VBS_NULL) { // null
                data = null;
                dataArr = dataArr.slice(++i,n);
            } else if ((kindConst.vbsKind.VBS_DESCRIPTOR <= x) && (x <= 0x1F)) { // descriptor
                descript = vbsDncode.decodeDescriptor(dataArr, arr);
                arr[i] = descript;
            } else if (x == kindConst.vbsKind.VBS_TAIL) {
                // console.log("++==++", i)
                result = result.slice(0, -1);
                dataArr = dataArr.slice(i+1,n);
                len = i+1;
                console.log("Tail:----", len,i)
                return [i,result];
            }
            // result += (data === undefined ? null : data) + ",";
            result += (data === undefined ? null : data)+",";
        } else {
            arr[pos++] = traData[i];
            // console.log("pos", arr)
        }

    }
    // console.log("$####", traData, dataArr);
    result = result.slice(0, -1);
    return [dataArr,result];
}

function vbsParse(opt) {
        if (opt.length <= 0) {
                return;
        }  
       var dv = new DataView(opt); 
       let dataArr = [];
       for(let i = 0; i < opt.byteLength; i++) {
          dataArr[i] =dv.getUint8(i);
       }
       let [,data] = decode(dataArr);
       return data;    
       
}
testVbsKeyVal()
function testVbsKeyVal() {
    // let arr = [2,33,97,35,107,101,121,34,106,115,34,50,51,35,100,106,100,36,100,115,100,104,1,64,10,3,9,2,89,214,89,120,1,89,80,90,1];
    // let arr = [2,33,97,104,89,56,2,89,214,89,120,1,89,80,90,1];
    // [23,[372],56]
    // let arr = [2,87,2,244,66,1,184,64,1];
    // let arr = [25,2,244,66,1]
    // let arr = [137,27,1,6,3,4,5,78,6,230,255];
    // string
    // let arr = [217,64,87,217,64,36,115,107,100,106];
    // let arr = [217,64,87,179,137,183,64,229,221,207,65,155,191,91,222,186,65,215,144,66];
    // let arr = [34,56,57,36,115,107,100,106,37,115,100,104,106,115,38,115,100,106,107,115,100,36,100,115,104,102,36,100,102,106,107,34,56,57,36,115,107,100,106,37,115,100,104,106,115,38,115,100,106,107,115,100,36,100,115,104,102,36,100,102,106,107,217,64,228,64,162,66,36,115,100,104,106]
    // falot
    // let arr = [169,184,189,148,220,158,206,129,30,174,96,179,230,204,153,179,230,156,139,30,174,96,88];
    // mul type
    // let arr = [36,115,100,104,106,179,230,204,153,179,230,156,139,30,174,96,205,153,179,230,204,153,179,132,31,179,96];
    // let arr = [169,184,189,148,220,158,206,129,30,174,96,179,230,204,153,179,230,156,139,30,174,96,88,217,64,35,115,116,114,36,115,100,104,106,179,230,204,153,179,230,156,139,30,174,96,179,230,204,153,179,230,132,133,30,173,96,205,153,179,230,204,153,179,132,31,179,96,133,31,98];
    //null+int+string
    // let arr = [2,15,2,217,64,87,1,217,64,36,115,107,100,106,171,142,218,200,237,249,221,130,31,178,96,1]
    // array [89,[76],89]
    //[76,[76],89,89,[89]]
    let arr = [2,2,217,64,1,217,64,2,204,64,1,1];
    // let arr = [2,204,64,2,204,64,1,217,64,217,64,2,217,64,1,217,64,1];
    //let arr = [2,204,64,2,204,64,1,217,64,217,64,217,64,2,217,64,1,2,217,64,1,1];
    let byteArr = new ArrayBuffer(arr.length); 
    let vbsCode = new DataView(byteArr);
    for(let i = 0; i < arr.length; i++) {
      vbsCode.setUint8(i, arr[i]);
    }
    var ss = decodeVBS(byteArr);
    console.log(222, ss)
    // let data = eval(ss);
    // console.log(333, commonFun.string2Arrb(ss))

    // var dv = new DataView(ss); 
    // let dataArr = [];
    // for(let i = 0; i < ss.byteLength; i++) {
    //    dataArr[i] =dv.getUint8(i);
    // }
    // console.log(dataArr)
}
function decodeVBS(u) {
    return vbsParse(u);
}
module.exports = {
    decodeVBS
}



