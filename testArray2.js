
const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');


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

    let x;
    let arr = [];
    let pos=0;
    let traData = commonFun.deepClone(dataArr);

    let data;
    let len2 = 0;
    try{
        for (let i=0; i<n;i++) {
            let len = 0;

            if (traData[i] < 0x80) {//
                x = traData[i];
                arr[pos++] = x;
                if (result.length>0) {
                    result += ",";
                }
                if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +

                    data = vbsDncode.decodeInterger(dataArr, arr, false);
                    dataArr = dataArr.slice(arr.length,n);
                    pos = 0;
                    len2 += arr.length;

                    arr.length = 0;
                    result += (data === undefined ? null : data);

                } else if ((x == kindConst.vbsKind.VBS_LIST))  { //  array
                    let tmp_data = dataArr.slice(1,dataArr.length);
                    let data_back = '';
                    [len, data_back] = decode(tmp_data);

                    if(dataArr[0] == 2){
                        data_back = "[" + data_back + "]";
                    }


                    i += (len + 1);

                    len2 = len2+len+2;

                    dataArr = dataArr.slice(i,dataArr.length);
                    pos = 0;
                    arr.length = 0;

                    result += (data_back === undefined ? null : data_back);

                } else if (x == kindConst.vbsKind.VBS_TAIL) { // Tail
                    if (result.slice(result.length-1,result.length) !== ']') {
                        result = result.slice(0, -1);
                    }
                    console.log("#####",len2,result,traData[i])
                    return [len2, result];
                }
                if(dataArr[0] == 2 && dataArr.slice(1,dataArr.length)[0] == 2){
                    continue;
                }

            } else {
                arr[pos++] = traData[i];
            }
        }

        if (result.slice(result.length-1,result.length) !== ']') {
            result = result.slice(0, -1);
        }

        return [len2, result];
    }catch (e){
        console.log(e);
    }
}
let origin_arr_len = 0;
function vbsParse(opt) {
        if (opt.length <= 0) {
                return;
        }  
       var dv = new DataView(opt); 
       let dataArr = [];
       for(let i = 0; i < opt.byteLength; i++) {
          dataArr[i] =dv.getUint8(i);
       }
      // let [,data] =  decode(dataArr);
        origin_arr_len = dataArr.length;
        let data = decode(dataArr);
       return data;    
       
}
testVbsKeyVal()
function testVbsKeyVal() {
    // let arr = [2,2,217,64,1,2,204,64,1,1]
    // let arr = [2,2,217,64,1,2,217,64,1,2,2,217,64,1,2,204,64,1,1,1];
    // let arr = [2,2,206,64,2,218,64,207,64,1,1,2,163,187,182,64,2,223,189,183,64,131,246,166,165,64,1,1,1];
    // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,218,64,2,150,210,227,241,93,237,65,2,183,70,1,87,191,252,212,65,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
    // let arr = [2,76,2,73,70,1,208,64,2,217,64,1,1];//[78,[2,9],90,[89]]
    // let arr = [2,2,206,64,2,218,64,207,64,1,1,2,163,187,182,64,2,223,189,183,64,131,246,166,165,64,1,1,1]; //[[78,[90,79]],[892323,[909023,78232323]]]
    // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,218,64,237,65,2,183,70,1,87,2,191,252,212,65,163,187,182,64,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
    let arr = [2,217,64,2,217,64,204,64,1,217,64,2,204,64,1,1]
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



