const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
function VbsDecode() {
    this.decodeInterger = function(value, arr, negative = false) {
        return this.unpackInt(arr, negative);
    }
    this.unpackInt = function(v, negative) {
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
    this.decodeFloat = function(value, arr, negative) {
        if (arr.length == 0) {
            return;
        }
        let mantissa = this.unpackFloat(arr, negative);
       
        let arrReamin = this.getRemain(value, arr);
         // get exponent  by value code
        let exponent = this.decodeInterger(value, arrReamin);

        let num = floatOperate.makeFloat(mantissa, exponent);
        // console.log(222, mantissa, exponent)
        return num;
    }
    this.getRemain = function(arr1, arr2) { // get the e code
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

function getDecode(jsonObj) {
    var vbsDncode = new VbsDecode();
    if (typeof jsonObj == 'undefined') {
        return;
    }
    let n = jsonObj.length;
    let x; 
    let arr = [];
    for (let i=0; i<n;i++) {
        if ((jsonObj[i] & 0x80) == 0) {
            x = jsonObj[i];
            arr[i] = x;
            // console.log(i, x & 0x60)
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                return vbsDncode.decodeInterger(jsonObj, arr, false);
            } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
                return vbsDncode.decodeInterger(jsonObj, arr, true);
            } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
                return vbsDncode.decodeFloat(jsonObj, arr, false);
            } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
               return vbsDncode.decodeFloat(jsonObj, arr, true);
            } else {

            }
        } else {
            arr[i] = jsonObj[i];
        }
    }
}

function myJsonParse(opt) {
        if (opt.length <= 0) {
                return;
        }  
       var jsonObj = eval(opt); // decode json
       return getDecode(jsonObj);    
       
}
function jsonVbsDecode(u) {
    return myJsonParse(u);
}
module.exports = {
    jsonVbsDecode
}
