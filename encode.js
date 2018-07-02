const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
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
        if(isE) {
            let len = this.bp.length;
            this.bp = _intShift(this.bp, n + len, kind, num);
        } else {
            this.bp = _intShift(this.bp, n, kind, num);
        }
    }

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
        arr[n] = kind | num;
        return arr;
    }

    this.encodeFloat = function(value){  
        let [expo, mantissa] = floatOperate.breakFloat(value);
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
        let numString = num.toString(2);
        this.bp = _floatShift(kind, num);
        n = this.bp.length;
        this.bp[n] = kind;
    }
    function _floatShift(kind, num) {
        let numString = num.toString(2);
        let n = 0;
        let arr = [];
        let len = numString.length;
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

module.exports = {
    myJsonStringify
}
function testVbs() {
    let u = -1.1;  // 判断是否是整数的问题
    var myJson = myJsonStringify(u);
    console.log(myJson)
    // for ( u = 10;u < 4334;) {
    //    var myJson = myJsonStringify(u);
    //    console.log(myJson)
    //    u += 50;
    // }

    // for ( u = 10.5;u < 422333.4544545562189;) {
    //    var myJson = myJsonStringify(u);
    //    console.log(myJson)
    //    u += 100.6898;
    // }
    
}
testVbs()

