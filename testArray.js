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
    
     // decode array
    this.decodeArray = function(value, arr) {
        let head = [],data = [];
        let headArr = [];

        head = head.concat(kindConst.vbsKind.VBS_LIST);
        let content;
        // console.log("---+++",value, value.slice(arr.length, value.length));
        // if(value[2] == 1)
        //      content = this.unpackArray(value.slice(arr.length-1, value.length)); // from 0x02 to 0x01
        // else 
         content = this.unpackArray(value.slice(arr.length, value.length));
        data =  data.concat(headArr, content);
        return data;       
    }
    this.unpackArray = function(value) {
        let dataArr = [],newObj,arr;
        let valueObj,j=0;
        let str = '[';
        let n = value.length;
        for (let i=0;i<n;i++) {  
            if (value[i] != kindConst.vbsKind.VBS_TAIL) { // until to 0x01
                value = value.slice(i,n);
                console.log("-----",value.toString());
                [j, valueObj] = decode(value);  // get the value of one type
                console.log("###", valueObj,j,value.toString())
                if (str.slice(str.length-1,str.length) == ']') {
                    str += ",";
                }
                i += j-1;
                console.log("sdh",i,value[i])
                str += (valueObj === undefined ? null : valueObj) + ",";
            } else {
              if (str !== '[') {
                    str = str.slice(0, -1);
              }
              str += ']';
              return [i, str];
            }

        }
        return str;
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
    let n = dataArr.length; 
    let result = "";
    let tempStr = "";
    let x; 
    let arr = [];
    let descript = 0,pos=0;
    let traData = commonFun.deepClone(dataArr);
    console.log("#####+++--++###", traData)
    let data;
    let len2 = 0; // 每次内层解析的长度
    for (let i=0; i<n;i++) {
        let len = 0;
        let arrLen = 0;
        if (traData[i] < 0x80) {
            x = traData[i];
            arr[pos++] = x;
            // console.log("result:::::", result,"$$$$$")
            if (result.length>0) {
              result += ",";
            }
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                // i is the position of the identifier different type, record it to find the to recover the integer.
                console.log("Int", dataArr,arr)
                data = vbsDncode.decodeInterger(dataArr, arr, false);
                dataArr = dataArr.slice(arr.length,n);
                pos = 0;
                len2 += arr.length;
                arr.length = 0;
                // arrLen += 1;
                // i+= arr.length; 
                console.log("Int i:", i,len2,data,dataArr)
            } else if ((x == kindConst.vbsKind.VBS_LIST)) { // array
                // console.log("--Array ----###", dataArr,arr);
                console.log("#####", i,len,len2);
                console.log("$$$$$$$$$$",typeof(data));
                  [len, data] = decode(dataArr.slice(1,dataArr.length));

                console.log("ss###",dataArr)
                if(len != dataArr.length-1)
                  data = "[" + data + "]";
                
                // arrLen += len;

                // [len, data] = vbsDncode.decodeArray(dataArr, arr);
                i += len + 1;
                
                dataArr = dataArr.slice(i,dataArr.length);
                pos = 0;
                arr.length = 0;
                console.log("arr--",len,i, dataArr,data)
            } else if (x == kindConst.vbsKind.VBS_TAIL) {
                  if (result.slice(result.length-1,result.length) !== ']') {

                      result = result.slice(0, -1);
                      console.log("@@@@@@",result);
                }
                
                //dataArr = dataArr.slice(i-1,n);
                // console.log("Tail:----", i,n,newLen,dataArr)
                // if (result !== '[') {
                //   result = result.slice(0, -1);
                // }
                //len2 += 2;
                console.log("64----", len2, result)

                return [i, result];
                // return [i,rsult];
            }
            result += (data === undefined ? null : data);
            // result += (data === undefined ? null : data);
        } else {
            arr[pos++] = traData[i];
        }

        // console.log("dfdf",i,traData[i])
    }
    console.log("@###", len2)
    return [len2, result];
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
     //let arr = [2,2,217,64,1,2,204,64,1,1]
     let arr = [2,2,217,64,1,2,204,64,1,2,2,217,64,1,2,204,64,1,1,1];
    //let arr = [2,2,217,64,1,1];
    //[[89],[76],[[89],[76]]]
    let byteArr = new ArrayBuffer(arr.length); 
    let vbsCode = new DataView(byteArr);
    for(let i = 0; i < arr.length; i++) {
      vbsCode.setUint8(i, arr[i]);
    }
    var ss = decodeVBS(byteArr);
    console.log(222, ss)

}
function decodeVBS(u) {
    return vbsParse(u);
}
module.exports = {
    decodeVBS
}



