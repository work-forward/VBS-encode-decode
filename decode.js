const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');
const limitCost  =    require('./limits.js');
let emptyString = "";

function ByteUnpack() {

}

function VbsDecode() {
    let head = {
        kind: 0,
        descriptor: 0,
        num: 0
    };
    let Decoder = {
        pos: 0,
        maxStrLength: 0,
        maxDepth: limitCost.MaxDepth,
        depth: 0,
        finished: false,
        err: "",
        encodeData: [],
        decodeData: [],
        maxLength: 0,
        hStart: 0,
        hEnd: 0
    };
    let dec = Object.assign({}, Decoder);
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

        return num;
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
        let data = commonFun.ab2String(byteArr);

        // len = arr.length + len -1;
        return data;
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

        let ctnArr = this.getContent(arrRemain,len); // spilt arrRemain the len when it is object
        
        if (len != ctnArr.length) {
            return;
        }
        let str = commonFun.byteToString(ctnArr);
        
        return str;
    }
    /**
     *  @get the array that split value from 0 to len-1
     *
     *  {param: value, the array of the encode}
     *  {len: the length that need to split}
     *  
     */
    this.getContent = function(value,len) {
        let arr = [];
        for(let i=0;i<len;i++) {
            arr[i] = value[i];
        }
        return arr;
    }
    /**
     *  @special descripe decode
     *
     *  {param: value, the array of the encode}
     *  {arr: the descriptor of data}
     *  return the decode descriptor
     */
    this.decodeDescriptor = function(value, arr) {        
        return this.decodeInterger(value, arr);
    }
    /**
     *  @array decode
     *
     *  If it encounter Tail, break.
     *  else decode the content
     *  return the decode data
     */
    this.decodeArray = function() {
        dec.depth++;
        if (dec.depth > dec.maxDepth) {
            dec.err = "Depth Overflow Error{"+dec.maxDepth+"}";
            return;
        }
        let back_arr = [];
        for (let i=0;dec.err == emptyString;i++) {
            if (this.unpackIfTail()) {
                break;
            }
            let x = this.decodeInterface();
            if (dec.err != emptyString) {
                return;
            }
            back_arr = commonFun.arrCopy(back_arr, x);
        }

        dec.decodeData = back_arr;
        return dec.decodeData;
    }
    /**
     *  @key/value decode
     *
     *  If it encounter Tail, break.
     *  else decode the k and v
     *  return the decode data
     */
    this.decodeObject = function() {
        dec.depth++;
        if (dec.depth > dec.maxDepth) {
            dec.err = "Depth Overflow Error" + dec.maxDepth;
            return;
        }
        let ms; // int, string/value
        let kind = 0;
        for (;dec.err == emptyString;) {
            if (this.unpackIfTail()) {
                break;
            }
            let k = this.decodeInterface();
            let v = this.decodeInterface();
            if (dec.err != emptyString) {
                return;
            }
            let kk = k;
            if (kind == 0) {
                kind = (typeof kk);
                switch(kind) {
                    case 'number':
                    case 'string':
                         ms = {};   // string/value
                         break;
                    case 'boolean':
                    case 'string':
                    case 'undefined':
                    case 'null':
                    case 'function':
                    case 'object':
                         dec.err = "Invalid Unmarshal Error";
                         return;
                    default:
                         dec.err = "vbs: can't reach here!";
                         return;
                }
            } else if ((typeof kk) != kind) {
                dec.err = "Invalid Unmarshal Error :" + kk;
                return;
            }
            switch (typeof kind) {
                case 'number':
                case 'string':
                     ms[kk] = v;
                     break;
                default:
                    dec.err = "vbs: can't reach here!";
            }
        }
        return ms;
    }
    /**
     *  @init the dec
     *
     */
    this.decodeInit = function() {
        dec.maxLength = (dec.encodeData == "undefined" ? 0: dec.encodeData.length);
        let maxString = Number.MAX_VALUE;
        if (dec.maxLength > 0 && maxString >= dec.maxLength) {
            maxString = dec.maxLength - 1;
        }
        dec.maxStrLength = maxString;
    }
     /**
     *  @decode obj
     *  {param: value, the array of the encode}
     *  return: true/false, whether it is the tail 
     */
    this.decodeInterface = function(value) {
        if (typeof value != "undefined") {
            dec.encodeData = [...value]; // copy value
            this.decodeInit(); 
        } 
        let x;
        let temHead = this.unpackHead();
        let head = commonFun.deepClone(temHead);
        if (dec.err != emptyString) {
            return;
        }
        switch(head.kind) {
           case kindConst.vbsKind.VBS_INTEGER: // int
                x = head.num;
                break;
           case kindConst.vbsKind.VBS_STRING: // string
                let buf = this.getBytes(head.num);
                if (dec.err == emptyString) {
                    x = buf;
                }
                break;
           case kindConst.vbsKind.VBS_FLOATING: // float
                let head2 = this.unpackHeadKind(kindConst.vbsKind.VBS_INTEGER);
                if (dec.err == emptyString) {
                    x = floatOperate.makeFloat(head.num, head2.num); 
                } 
                break;
           case kindConst.vbsKind.VBS_BLOB: // blob
                let blobData = this.takeBytes(head.num);      
                if (dec.err == emptyString) {
                    x = new Uint8Array(blobData); 
                }
                break;
           case kindConst.vbsKind.VBS_LIST: // array
                x =  this.decodeArray();  
                break;
           case kindConst.vbsKind.VBS_DICT:
                x = this.decodeObject();
                break;
           case kindConst.vbsKind.VBS_NULL:
                x = null;
                break;
           default:
                dec.err = "Invalid Vbs Error";
        }
        return x;
    }
    /**
     *  @get string content
     *
     *  decode the encodeData
     *  return the decode string
     */
    this.getBytes = function(number) {
        let num = number;
        if (num > this.left() || num > dec.maxStrLength) {
            dec.err = "Invalid Vbs Error";
            return;
        }
        let str = this.getContent(dec.encodeData.slice(dec.hStart,dec.hEnd),num);
        dec.hStart += num; 
        return commonFun.ab2String(str);
    }
     /**
     *  @get blob conten
     *
     *  decode blob encodeData
     *  return the decode blob
     */
    this.takeBytes = function(number) {
        let num = number;
        if (num > this.left() || num > dec.maxStrLength) {
            dec.err = "";
            return emptyString;
        }
        let blob = this.getContent(dec.encodeData.slice(dec.hStart,dec.hEnd), num);
        dec.hStart += num; // move 
        return blob;
    }
    
    /**
     *  @unpack the tail
     *
     *  return: true/false, whether it is the tail 
     */
    this.unpackIfTail = function() {
        if (dec.err == emptyString) {
            let data = this.headBuffer();
            if (data.length > 0 && (dec.depth > 0) && (data[0] == kindConst.vbsKind.VBS_TAIL)) {
                dec.hStart++;
                dec.depth--;
                return true;
            }
        }
        return false;
    }
    /**
     *  @unpack the kind of the head
     *
     *  {param: kind, identifier different type}
     *  return: head, the struct that contain {kind, number,negative}
     */
    this.unpackHeadKind = function(kind) {
        head = this.unpackHead();
        if (dec.err == emptyString) {
            if (head.kind != kind) {
                dec.err = "Mismatched Kind Error{Expect:"+kind+"Got:"+head.kind+"}";
            } else if (head.descriptor != 0) {
                dec.err = "Invalid Vbs Error";
            }
        }
        return head;
    }
    /**
     *  @unpack the head

     *  return: head, the struct that contain {kind, number,negative}
     */
    this.unpackHead = function() {
       if (dec.err != emptyString) {
            return;
       }
       let headData = this.headBuffer();

       let n = headData.length;
       let negative = false;
       let kd = 0;
       let descriptor = 0 >>>0;
       let num = 0 >>>0;
       let i = 0; 
       loop1:
            for(;i < n;) {
                let x = headData[i++];
                if (x < 0x80) {
                    kd = x;
                    if (x >= kindConst.vbsKind.VBS_STRING) { // 0x20
                        kd = x & 0x60;   
                        num = (x & 0x1F) >>> 0;
                        if (kd == 0x60) { // 0x60
                            kd = kindConst.vbsKind.VBS_INTEGER;
                            negative = true;
                        }
                    } else if (x >= kindConst.vbsKind.VBS_BOOL) { // 0x18
                        if (x != kindConst.vbsKind.VBS_BLOB) { // 0x1B
                            kd = x & 0xFE;
                        }
                        if (x <= kindConst.vbsKind.VBS_BOOL + 1) { // 0x1B+1
                            num = (x & 0x01) >>> 0;
                        }
                    } else if (x >= kindConst.vbsKind.VBS_DESCRIPTOR) {
                        num = (x & 0x07) >>> 0;
                        if (num == 0) {
                           if ((descriptor&kindConst.VBS_SPECIAL_DESCRIPTOR) == 0) {
                              descriptor |= kindConst.VBS_SPECIAL_DESCRIPTOR;
                           } else {
                              dec.err = "Invalid VBS Error";
                              return;
                           }
                        } else {
                            if ((descriptor&kindConst.VBS_DESCRIPTOR_MAX) == 0) {
                               descriptor |= num >>> 0;
                            } else {
                                dec.err = "Invalid VBS Error";
                                return;
                            }
                        }
                        continue loop1;
                    } else if (!bitmapTestSingle(x)) {
                        dec.err = "Invalid VBS Error";
                        return;
                    }
                } else {
                    let shift = 7;
                    let m = '';
                    num = (x & 0x7F) >>> 0;  
                    let mon = num.toString(2); // -------//
                    if (mon.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                           mon = padZero(mon);
                    }
                    for(;;) {
                       if (i >= n) {
                          dec.err = "Invalid VBS Error";
                          return;
                       }
                       shift += 7;
                       x = headData[i++];
                       if (x < 0x80) {
                          break;
                       }
                       x &= 0x7F;
                       let left = 64 - shift;
                       if (left <= 0 || (left < 7 && x >= (1 << (left >>> 0)))) {
                            dec.err = "Number Over flow Error";
                            return;
                       }
                       m = x.toString(2);
                       if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                           m = padZero(m);
                        }
                       mon = m + mon;
                       num = parseInt(mon, 2);

                       // num |= x << (shift >>> 0);
                    }
                    kd = x;
                    if (x >= kindConst.vbsKind.VBS_STRING) {
                        kd = (x & 0x60);
                        x &= 0x1F;
                        if(x != 0) {
                            let left = 64 - shift;
                            if (left <= 0 || (left < 7 && x >= (1 << (left >>> 0)))) {
                                dec.err = "Number Over flow Error";
                                return;
                            }
                            m = x.toString(2);
                            if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                               m = padZero(m);
                            }
                            mon = m + mon;
                            num = parseInt(mon, 2);

                            // num |= x << (shift >>> 0);
                        }
                        if (kd == 0x60) {
                            kd = kindConst.vbsKind.VBS_INTEGER;
                            negative = true;
                        }
                    } else if (x >= kindConst.vbsKind.VBS_DECIMAL) {
                        kd = x & 0xFE;
                        negative = ((x & 0x01) != 0);
                    } else if (x >= kindConst.vbsKind.VBS_DESCRIPTOR && (x < kindConst.vbsKind.VBS_BOOL)) {
                        x &= 0x07;
                        if(x != 0) {
                            let left = 64 - shift;
                            if (left <= 0 || (left < 7 && x >= (1 << (left >>> 0)))) {
                                dec.err = "Number Over flow Error";
                                return;
                            }
                            m = x.toString(2);
                            if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                               m = padZero(m);
                            }
                            mon = m + mon;
                            num = parseInt(mon, 2);

                            // num |= x << (shift >>> 0);
                        }
                        if (num == 0 || num > kindConst.VBS_DESCRIPTOR_MAX) {
                            dec.err = "Number Over flow Error";
                            return;
                        }
                        if ((descriptor & kindConst.VBS_DESCRIPTOR_MAX) == 0) {
                            descriptor |= num;
                        } else {
                            dec.err = "Number Over flow Error";
                            return;
                        }
                        continue loop1;
                    } else if (!bitmapTestMulti(x)) {
                        dec.err = "Number Over flow Error";
                        return;
                    }
                    if (num > limitCost.MaxInt64) {
                        if (!(kd == kindConst.vbsKind.VBS_INTEGER && negative && num == limitCost.MaxInt64)) {
                            dec.err = "Number Over flow Error";
                            return;
                        }
                    }
                }
                head.kind = kd;
                head.descriptor = descriptor;
                head.num = num;
                if (negative) {
                    head.num = -head.num;
                }
                dec.hStart += i;
                return head;
        }
        dec.err = "Invalid Vbs Error";
        return;

    }
    /**
     *  @split the encode Data
     
     * 
     *  return: dec.encodeData
     */
    this.headBuffer = function() {
        let hsize = dec.hEnd - dec.hStart;

        if (hsize < 16 && !dec.finished && dec.err == emptyString) {
            if (hsize > 0) {
                dec.encodeData = dec.encodeData.slice(dec.hStart,dec.hEnd); 
            }
            dec.hStart = 0;
            dec.hEnd   = hsize;
            
            let need = this.left();

            if(need > dec.encodeData.length) {
                need = dec.encodeData.length;
            }
            let chunk = dec.encodeData.slice(dec.hEnd, need);
            let k = chunk.length;
            if (k > 0) {
                dec.hEnd += parseInt(k);
                dec.pos += k;
                if(dec.maxLength > 0 && dec.pos >= dec.maxLength) {
                    dec.finished = true;
                }
            } else {
                dec.err = "Fail";
            }
        }
        return dec.encodeData.slice(dec.hStart, dec.hEnd);
    }
    /**
     *  @get the end of the encodeData
     
     *  return: the postion 
     */
    this.left = function() {
        if (dec.maxLength > 0) {
            return (dec.maxLength - dec.pos) + parseInt(dec.hEnd - dec.hStart);
        }
        return limitCost.MaxInt64;
    }
    let bitmapSingle = [
            0xFB00C00E, /* 1111 1011 1111 1111  1000 0000 0000 1110 */

                        /* ?>=< ;:98 7654 3210  /.-, +*)( '&%$ #"!  */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

                        /* _^]\ [ZYX WVUT SRQP  ONML KJIH GFED CBA@ */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

                        /*  ~}| {zyx wvut srqp  onml kjih gfed cba` */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
    ];

    let bitmapMulti = [
            0xF800400C, /* 1111 1000 1111 1111  0000 0000 0000 1100 */

                        /* ?>=< ;:98 7654 3210  /.-, +*)( '&%$ #"!  */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

                        /* _^]\ [ZYX WVUT SRQP  ONML KJIH GFED CBA@ */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

                        /*  ~}| {zyx wvut srqp  onml kjih gfed cba` */
            0xFFFFFFFF, /* 1111 1111 1111 1111  1111 1111 1111 1111 */

            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
            0x00000000, /* 0000 0000 0000 0000  0000 0000 0000 0000 */
    ];
    function bitmapTestSingle(x) {
        return (bitmapSingle[x>>3] & (1 << (x & 0x1F))) != 0;
    }

    function bitmapTestMulti(x) {
        return (bitmapMulti[x>>3] & (1 << (x & 0x1F))) != 0;
    }
    /**
     *  @pad 0
     
     * if length of m is less than 7, pad it to 7
     *  return: dec.encodeData
     */
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
    let x; 
    let arr = [];
    let descript = 0;
    for (let i=0; i<n;i++) {
        if (dataArr[i] < 0x80) {
            x = dataArr[i];
            arr[i] = x;
            if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
                return vbsDncode.decodeInterger(dataArr, arr, false);
            } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
                return vbsDncode.decodeInterger(dataArr, arr, true);
            } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
                return vbsDncode.decodeFloat(dataArr, arr, false);
            } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
               return vbsDncode.decodeFloat(dataArr, arr, true);
            } else if ((x == kindConst.vbsKind.VBS_LIST)) { // array
                return vbsDncode.decodeInterface(dataArr);
            } else if ((x == kindConst.vbsKind.VBS_DICT)) { // key->value
                return vbsDncode.decodeInterface(dataArr);
            } else if (x == kindConst.vbsKind.VBS_BLOB) { // blob
                return vbsDncode.decodeBlob(dataArr, arr);
            } else if (x == kindConst.vbsKind.VBS_BOOL) { // bool false
                return vbsDncode.decodeBool(dataArr, false);
            } else if (x == kindConst.vbsKind.VBS_BOOL + 1) { // bool true
                return vbsDncode.decodeBool(dataArr, true);
            } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
                return vbsDncode.decodeString(dataArr, arr);
            } else if (x == kindConst.vbsKind.VBS_NULL) { // null
                return null;
            } else if ((kindConst.vbsKind.VBS_DESCRIPTOR <= x) && (x <= 0x1F)) { // descriptor
                descript = vbsDncode.decodeDescriptor(dataArr, arr);
                arr[i] = descript;
            } else {
                return "Cannot resolve the encode data";
            }
        } else {
            arr[i] = dataArr[i];
        }
    }
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
       return decode(dataArr);    
       
}
function decodeVBS(u) {
    return vbsParse(u);
}
module.exports = {
    decodeVBS
}

// testVbsKeyVal()
// function testVbsKeyVal() {
//     // let arr = [2,2,217,64,1,2,204,64,1,1]
//     // let arr = [2,2,217,64,1,2,217,64,1,2,2,217,64,1,2,204,64,1,1,1];
//     // let arr = [2,2,206,64,2,218,64,207,64,1,1,2,163,187,182,64,2,223,189,183,64,131,246,166,165,64,1,1,1];
//     // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,218,64,2,150,210,227,241,93,237,65,2,183,70,1,87,191,252,212,65,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
//     // let arr = [2,206,64,2,66,73,1,218,64,2,217,64,1,1];//[78,[2,9],90,[89]]
//     // let arr = [2,2,206,64,2,218,64,207,64,1,1,2,163,187,182,64,2,223,189,183,64,131,246,166,165,64,1,1,1]; //[[78,[90,79]],[892323,[909023,78232323]]]
//     // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,218,64,237,65,2,183,70,1,87,2,191,252,212,65,163,187,182,64,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
//     // let arr = [2,217,64,2,217,64,204,64,1,217,64,2,204,64,1,1]
//     // let arr = [2,2,65,1,2,66,1,67,1];
//     // let arr = [3,33,97,35,107,101,121,34,106,115,34,50,51,35,100,106,100,36,100,115,100,104,1];
//     // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,218,64,237,65,2,183,70,1,87,2,191,252,212,65,163,187,182,64,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
//     // let arr = [2,143,189,64,208,197,64,2,252,70,137,74,1,235,203,152,186,225,157,200,130,30,70,237,65,2,183,70,1,87,2,191,252,212,65,163,187,182,64,163,187,182,64,1,2,210,228,228,65,244,213,160,68,1,255,70,219,197,64,208,64,1];
//     // let arr = [2,235,203,152,186,225,157,200,130,30,70,1]; // [ 92389238293232320 ]
//     // let arr = [2,143,133,215,199,151,230,231,136,30,125,215,148,132,228,133,210,140,136,30,167,96,179,230,204,153,179,230,196,132,30,168,96,1];
//     // let arr = [2,163,187,182,64,1];   //[892323]
//     // let arr = [2,215,199,194,235,227,203,163,139,30,164,96,169,184,189,148,220,158,190,129,30,173,96,173,228,246,252,254,228,189,134,30,170,96,177,211,149,133,129,185,193,140,30,179,96,179,230,204,153,179,230,196,132,30,168,96,1]; // [92389.89, 23.78,829.789,3.127823,2323.20]
//     // let arr = [2,38,115,104,100,106,115,100,1];
//     // let arr = [2,38,119,101,104,106,119,101,40,115,100,106,104,100,115,102,100,40,100,102,98,106,100,102,100,102,42,100,102,100,117,102,100,113,119,113,119,52,115,100,119,117,101,98,117,119,101,101,103,117,101,121,103,102,117,114,119,114,1]; // ["wehjwe","sdjhdsfd","dfbjdfdf","dfdufdqwqw","sdwuebuweegueygfurwr"]
//     // let arr = [2,163,187,182,64,38,119,101,104,106,119,101,40,115,100,106,104,100,115,102,100,40,100,102,98,106,100,102,100,102,42,100,102,100,117,102,100,113,119,113,119,52,115,100,119,117,101,98,117,119,101,101,103,117,101,121,103,102,117,114,119,114,43,115,100,104,104,104,104,104,104,117,101,114,38,51,55,52,56,50,51,163,187,182,64,2,38,115,104,100,106,115,100,1,89,78,65,1]; // ["wehjwe","sdjhdsfd","dfbjdfdf","dfdufdqwqw","sdwuebuweegueygfurwr","sdhhhhhhuer","374823"]
//     // let arr = [2,131,27,15,68,12,1];
//     // let arr = [2,38,115,104,100,106,115,100,1];
//     // let arr = [2,72,131,27,15,68,12,195,64,2,167,65,217,64,1,36,115,100,104,106,217,64,37,104,100,102,100,102,131,27,190,68,12,1];
//     // let arr = [2,72,131,27,15,68,12,195,64,2,167,65,169,184,189,148,220,158,206,133,30,173,96,169,184,189,148,220,222,178,129,30,171,96,217,64,1,36,115,100,104,106,217,64,37,104,100,102,100,102,131,27,190,68,12,1];
//     // let arr = [2,72,131,27,15,68,12,195,64,2,167,65,169,184,189,148,220,158,206,133,30,173,96,169,184,189,148,220,222,178,129,30,171,96,132,27,89,85,161,89,217,64,1,36,115,100,104,106,217,64,37,104,100,102,100,102,131,27,190,68,12,1];  // [8, new Uint8Array([15,68,12]),67,[167,89.78,89.37,new Uint8Array([89,2389,3489,89.8]),89],"sdhj",89,"hdfdf",new Uint8Array([190,68,12])]
//     // let arr = [3,33,97,35,107,101,121,34,106,115,34,50,51,35,100,106,100,36,100,115,100,104,1]; // {"a": "key","js":'23',"djd":"dsdh"};
//     // let arr = [3,33,97,36,100,102,100,102,1];   // {"a": "dfdf"}
//     // let arr = [3,33,97,35,107,101,121,34,106,115,34,50,51,35,100,106,100,36,100,115,100,104,1]; // {"a": "key","js":'23',"djd":"dsdh"}
//     // let arr = [3,34,50,51,38,100,102,104,106,100,102,34,56,57,35,107,101,121,35,115,104,106,35,100,102,110,1]; // {89:"key","shj":"dfn","23":"dfhjdf"}
//     // let arr = [3,34,100,102,3,34,115,100,35,100,115,102,1,33,115,3,33,107,35,101,100,102,33,108,35,100,100,102,34,115,100,210,73,35,115,100,102,36,100,102,106,107,1,35,100,102,106,36,100,102,106,107,38,115,106,100,107,115,100,34,100,102,1]; // { df: { sd: 'dsf' },s: { k: 'edf', l: 'ddf', sd: 1234, sdf: 'dfjk' },dfj: 'dfjk',sjdksd: 'df' } 
//     // let arr = [202,223,165,182,226,86];
//     let arr = [251,229,217,247,138,252,208,138,30,81];
//     let byteArr = new ArrayBuffer(arr.length);
//     let vbsCode = new DataView(byteArr);
//     for(let i = 0; i < arr.length; i++) {
//       vbsCode.setUint8(i, arr[i]);
//     }
//     var ss = decodeVBS(byteArr);
//     console.log(222, ss)

// }
