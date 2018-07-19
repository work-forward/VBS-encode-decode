const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun = require('./common.js');
const limitCost  =    require('./limits.js');
let   NoError = "";
/**
 *  @decode class
 */
function VbsDecode() {
    let head = {  // g
        kind: 0,
        descriptor: 0,
        num: 0
    };
    VbsDecode.prototype.Decoder = {
        pos: 0,
        maxStrLength: 0,
        maxDepth: limitCost.MaxDepth,
        depth: 0,
        finished: false,
        err: "",
        encodeData: [],
        maxLength: 0,
        hStart: 0,
        hEnd: 0
    };
    let dec =  Object.assign({}, this.Decoder);
    /**
     *  @array decode
     *
     *  If it encounter Tail, break.
     *  else decode the content
     *  return the decode data
     */
    this._decodeArray = function() {
        dec.depth++;
        if (dec.depth > dec.maxDepth) {
            dec.err = "Depth Overflow Error{"+dec.maxDepth+"}";
            return;
        }
        let back_arr = [];
        for (let i=0;dec.err == NoError;i++) {
            if (this._unpackIfTail()) {
                break;
            }
            let x = this.decodeObject();
            if (dec.err != NoError) {
                return;
            }
            back_arr = commonFun.arrCopy(back_arr, x);
        }
        return back_arr;
    }
    /**
     *  @key/value decode
     *
     *  If it encounter Tail, break.
     *  else decode the k and v
     *  return the decode data
     */
    this._decodeKV = function() {
        dec.depth++;
        if (dec.depth > dec.maxDepth) {
            dec.err = "Depth Overflow Error" + dec.maxDepth;
            return;
        }
        let ms; // int、string/value
        let kind = 0;
        for (;dec.err == NoError;) {
            if (this._unpackIfTail()) {
                break;
            }
            let k = this.decodeObject();
            let v = this.decodeObject();
            if (dec.err != NoError) {
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
                    default:
                         dec.err = "Invalid Unmarshal Error!";
                         return;
                }
            } else if ((typeof kk) != kind) {
                dec.err = "Invalid Unmarshal Error :" + kk;
                return;
            }
            ms[kk] = v;
        }
        return ms;
    }
    /**
     *  @init the dec
     *
     */
    this.decodeInit = function(value) {
        dec.encodeData = [...value];
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
     *  return: true/false, judge whether it is the tail 
     */
    this.decodeObject = function(value) {
        let x;
        head = this._unpackHead();
        if (dec.err != NoError) {
            return;
        }
        switch(head.kind) {
           case kindConst.vbsKind.VBS_INTEGER: // int
                x = head.num;
                break;
           case kindConst.vbsKind.VBS_STRING: // string
                let buf = this._getBytes(head.num);
                if (dec.err == NoError) {
                    x = buf;
                }
                break;
           case kindConst.vbsKind.VBS_FLOATING: // float 
                let num = head.num;
                head = this._unpackHeadKind(kindConst.vbsKind.VBS_INTEGER);
                if (dec.err == NoError) {
                    x = floatOperate.makeFloat(num, head.num); 
                } 
                break;
           case kindConst.vbsKind.VBS_BLOB: // blob
                let blobData = this._takeBytes(head.num);      
                if (dec.err == NoError) {
                    x = new Uint8Array(blobData); 
                }
                break;
           case kindConst.vbsKind.VBS_LIST: // array
                x =  this._decodeArray();  
                break;
           case kindConst.vbsKind.VBS_DICT: // key/value
                x = this._decodeKV();
                break;
           case kindConst.vbsKind.VBS_NULL: // null
                x = null;
                break;
           default:
                dec.err = "Invalid Vbs Error!";
        }
        if (dec.err != NoError) {
            throw new Error(dec.err);
        }
        return x;
    }
    /**
     *  @get string content
     *
     *  decode the encodeData
     *  return the decode string
     */
    this._getBytes = function(number) {
        let num = number;
        if (num > this._left() || num > dec.maxStrLength) {
            dec.err = "Invalid Vbs Error";
            return;
        }
        let str = this._getContent(dec.encodeData.slice(dec.hStart,dec.hEnd),num);
        dec.hStart += num; 
        return commonFun.ab2String(str);
    }
     /**
     *  @get blob conten
     *
     *  decode blob encodeData
     *  return the decode blob
     */
    this._takeBytes = function(number) {
        let num = number;
        if (num > this._left() || num > dec.maxStrLength) {
            dec.err = "Invalid Vbs Error";
            return NoError;
        }
        let blob = this._getContent(dec.encodeData.slice(dec.hStart,dec.hEnd), num);
        dec.hStart += num; // move 
        return blob;
    }
    /**
     *  @get the array that split value from 0 to len-1
     *
     *  {param: value, the array of the encode}
     *  {len: the length that need to split}
     *  
     */
    this._getContent = function(arr,len) {
        let newArr = [];
        for(let i=0;i<len;i++) {
            newArr[i] = arr[i];
        }
        return newArr;
    }
    /**
     *  @unpack the tail
     *
     *  return: true/false, whether it is the tail 
     */
    this._unpackIfTail = function() {
        if (dec.err == NoError) {
            let data = dec.encodeData.slice(dec.hStart, dec.hEnd);
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
    this._unpackHeadKind = function(kind) {
        head = this._unpackHead();
        if (dec.err == NoError) {
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
     *
     *  return: head, the struct that contain {kind, number,negative}
     */
    this._unpackHead = function() {
       if (dec.err != NoError) {
            return;
       }

       dec.hEnd = dec.maxLength;
       let headData = dec.encodeData.slice(dec.hStart, dec.hEnd);
   
       let n = dec.hEnd - dec.hStart;
       let negative = false;
       let kd = 0;
       let descriptor = 0 >>> 0;
       let num = 0 >>> 0;
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
                    } else if (!_bitmapTestSingle(x)) {
                        dec.err = "Invalid VBS Error";
                        return;
                    }
                } else {
                    let shift = 7;
                    let m = '';
                    num = (x & 0x7F) >>> 0;  
                    let mon = num.toString(2); 
                    if (mon.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                           mon = _padZero(mon);
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
                       let _left = 64 - shift;
                       if (_left <= 0 || (_left < 7 && x >= (1 << (_left >>> 0)))) {
                            dec.err = "Number Over flow Error";
                            return;
                       }
                       m = x.toString(2);
                       if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                           m = _padZero(m);
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
                            let _left = 64 - shift;
                            if (_left <= 0 || (_left < 7 && x >= (1 << (_left >>> 0)))) {
                                dec.err = "Number Over flow Error";
                                return;
                            }
                            m = x.toString(2);
                            if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                               m = _padZero(m);
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
                            let _left = 64 - shift;
                            if (_left <= 0 || (_left < 7 && x >= (1 << (_left >>> 0)))) {
                                dec.err = "Number Over flow Error";
                                return;
                            }
                            m = x.toString(2);
                            if (m.length < 7) { // less than 7 bit, pad the m with 0 to 7 bit
                               m = _padZero(m);
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
                    } else if (!_bitmapTestMulti(x)) {
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
    /**
     *  @get the end of the encodeData
     * 
     *  return: the postion 
     */
    this._left = function() {
        if (dec.maxLength > 0) {
            return (dec.maxLength - dec.pos) + parseInt(dec.hEnd - dec.hStart);
        }
        return limitCost.MaxInt64;
    }
    function _bitmapTestSingle(x) {
        return (bitmapSingle[x>>3] & (1 << (x & 0x1F))) != 0;
    }
    function _bitmapTestMulti(x) {
        return (bitmapMulti[x>>3] & (1 << (x & 0x1F))) != 0;
    }
    /**
     *  @pad 0 to make the length of m to 7 bit 
     * if length of m is less than 7, pad it to 7
     *  return: dec.encodeData
     */
    function _padZero(m) {
        let len = m.length;
        for(; len <= 7; len++) {
            if (7-len > 0){
                m = 0 + m;
            }
        }
        return m;
    }
    
}
/**
  *   @decode dataArr 
  *   Description: judge the type of dataArr and  decode according to the type
*/
function decode(dataArr) {
    var vbsDncode = new VbsDecode();
    try {
        vbsDncode.decodeInit(dataArr); 
        return vbsDncode.decodeObject();
    } catch (e) {
        console.error(e.name + ": " + e.message);
    }
    
}
/**
  *   @decode data 
  *   Description: Decode Binary array to array, and decode it 
*/
function vbsParse(opt) {
        if (opt.length <= 0) {
                return;
        }  
       let dv = new DataView(opt); 
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


