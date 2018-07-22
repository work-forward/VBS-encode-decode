const kindConst  =    require('./kind.js');
const floatOperate =  require('./float.js');
const commonFun =     require('./common.js');
const limitConst  =    require('./limits.js');
let   NoError = "";
/**
 *  @decode class
 */
function VbsDecoder() {
    VbsDecoder.prototype.head = {  // global variable in VbsDecoder
        kind: 0,
        descriptor: 0,
        num: 0
    };
    VbsDecoder.prototype.dec = {
        maxStrLength: 0,
        maxDepth: limitConst.MaxDepth,
        depth: 0,
        err: "",
        encodeData: [],
        maxLength: 0,
        hStart: 0,
        hEnd: 0
    };
    /**
     *  @array decode
     *
     *  If it encounter Tail, break.
     *  else decode the content
     *  return the decode data
     */
    this._decodeArray = function() {
        this.dec.depth++;
        
        if (this.dec.depth > this.dec.maxDepth) {
            this.dec.err = "Depth Overflow Error { "+this.dec.maxDepth+" }";
            return;
        }
        let back_arr = [];
        for (let i=0;this.dec.err == NoError;i++) {
            if (this._unpackIfTail()) {
                break;
            }
            let x = this.decodeObj();
            if (this.dec.err != NoError) {
                return;
            }
            back_arr = commonFun.arrCopy(back_arr, x[0]);
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
        this.dec.depth++;
        if (this.dec.depth > this.dec.maxDepth) {
            this.dec.err = "Depth Overflow Error: " + this.dec.maxDepth;
            return;
        }
        let ms; // int、string/value
        let kind = 0;
        for (;this.dec.err == NoError;) {
            if (this._unpackIfTail()) {
                break;
            }
            let kObj = this.decodeObj();
            let k = kObj[0];

            let vObj = this.decodeObj();
            let v = vObj[0];

            if (this.dec.err != NoError) {
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
                         this.dec.err = "Invalid Unmarshal Error!";
                         return;
                }
            } else if ((typeof kk) != kind) {
                this.dec.err = "Invalid Unmarshal Error: " + kk;
                return;
            }
            ms[kk] = v;
        }

        return ms;
    }
    /**
     *  @init the this.dec
     *
     */
    this.decodeInit = function(value, i) {
        this.dec.encodeData = value;
        this.dec.hEnd = (this.dec.encodeData == "undefined" ? 0: this.dec.encodeData.length);      
 
        if (typeof i == "undefined" || i > this.dec.maxLength) {
            this.dec.err = "Input Parameter Error: " + i;
        }
        if (commonFun.isInteger(i) && i > 0) {
            this.dec.hStart = i;
        } 
    }
     /**
     *  @decode obj
     *  {param: value, the array of the encode}
     *  return: true/false, judge whether it is the tail 
     */
    this.decodeObj = function() {
        let x;
        this._unpackHead(); 
        // console.log("head: ", this.head)    
        if (this.dec.err != NoError) {
            return;
        }

        switch(this.head.kind) {
           case kindConst.vbsKind.VBS_INTEGER: // int
                x = this.head.num;
                break;
           case kindConst.vbsKind.VBS_STRING: // string
                let str = this._getStr(this.head.num);
                if (this.dec.err == NoError) {
                    x = str;
                }
                break;
           case kindConst.vbsKind.VBS_FLOATING: // float 
                let num = this.head.num;
                this._unpackHeadKind(kindConst.vbsKind.VBS_INTEGER); 
                if (this.dec.err == NoError) {
                    x = floatOperate.makeFloat(num, this.head.num); 
                } 
                break;
           case kindConst.vbsKind.VBS_BLOB: // blob
                let blobData = this._takeBytes(this.head.num); 

                // let newBuf = commonFun.string2Arrb(this.dec.encodeData.toString());
                // x = new Uint8Array(this.dec.encodeData, this.dec.hStart, this.head.num)
                // console.log(444, x, this.dec.hStart, this.head.num, this.dec.encodeData)

                if (this.dec.err == NoError) {
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
                this.dec.err = "Invalid Vbs Error!";
        }
        return [x, this.dec.hStart];
    }
    /**
     *  @get string content
     *
     *  decode the encodeData
     *  return the decode string
     */
    this._getStr = function(number) {
        let str = this._getContent(number);
        this.dec.hStart += number; 
        return commonFun.ab2String(str);
    }
     /**
     *  @get blob conten
     *
     *  decode blob encodeData
     *  return the decode blob
     */
    this._takeBytes = function(number) {
        let blob = this._getContent(number);
        this.dec.hStart += number; // move 
        return blob;
    }
    /**
     *  @get the array that split value from 0 to len-1
     *
     *  {param: value, the array of the encode}
     *  {len: the length that need to split}
     *  
     */
    this._getContent = function(n) {
        let newArr = [];
        if (n > this._left()) {
            this.dec.err = "Invalid Vbs Error";
            return;
        }
        let startPos = this.dec.hStart;
        for(let i=0;i<n;i++) {
            newArr[i] = this.dec.encodeData[startPos+i];
        }
        return newArr;
    }
    /**
     *  @unpack the tail
     *
     *  return: true/false, whether it is the tail 
     */
    this._unpackIfTail = function() {
        if (this.dec.err == NoError) {
            let hSize = this.dec.hEnd - this.dec.hStart;
            if (hSize > 0 && (this.dec.depth > 0) && (this.dec.encodeData[this.dec.hStart] == kindConst.vbsKind.VBS_TAIL)) {
                this.dec.hStart++;
                this.dec.depth--;
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
        this._unpackHead();
        if (this.dec.err == NoError) {
            if (this.head.kind != kind) {
                this.dec.err = "Mismatched Kind Error { Expect: "+kind+" ,Got: "+this.head.kind+" }";
            } else if (this.head.descriptor != 0) {
                this.dec.err = "Invalid Vbs Error";
            }
        }
    }
    /**
     *  @unpack the this.head
     *
     *  return: this.head, the struct that contain {kind, number,negative}
     */
    this._unpackHead = function() {
       if (this.dec.err != NoError) {
            return;
       }
       
       let headData = this.dec.encodeData;
       let n = this.dec.hEnd;
       let negative = false;
       let kd = 0;
       let descriptor = 0;
       let num = 0;
       let i = this.dec.hStart; 
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
                        if (x <= kindConst.vbsKind.VBS_BOOL + 1) { // 0x18+1
                            num = (x & 0x01) >>> 0;
                        }
                    } else if (x >= kindConst.vbsKind.VBS_DESCRIPTOR) {
                        num = (x & 0x07) >>> 0;
                        if (num == 0) {
                           if ((descriptor&kindConst.VBS_SPECIAL_DESCRIPTOR) == 0) {
                              descriptor |= kindConst.VBS_SPECIAL_DESCRIPTOR;
                           } else {
                              this.dec.err = "Invalid VBS Error";
                              return;
                           }
                        } else {
                            if ((descriptor&kindConst.VBS_DESCRIPTOR_MAX) == 0) {
                               descriptor |= num >>> 0;
                            } else {
                                this.dec.err = "Invalid VBS Error";
                                return;
                            }
                        }
                        continue loop1;
                    } else if (!_bitmapTestSingle(x)) {
                        this.dec.err = "Invalid VBS Error";
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
                          this.dec.err = "Invalid VBS Error";
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
                            this.dec.err = "Number Over flow Error";
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
                            let left = 64 - shift;
                            if (left <= 0 || (left < 7 && x >= (1 << (left >>> 0)))) {
                                this.dec.err = "Number Over flow Error";
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
                            let left = 64 - shift;
                            if (left <= 0 || (left < 7 && x >= (1 << (left >>> 0)))) {
                                this.dec.err = "Number Over flow Error";
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
                            this.dec.err = "Number Over flow Error";
                            return;
                        }
                        if ((descriptor & kindConst.VBS_DESCRIPTOR_MAX) == 0) {
                            descriptor |= num;
                        } else {
                            this.dec.err = "Number Over flow Error";
                            return;
                        }
                        continue loop1;
                    } else if (!_bitmapTestMulti(x)) {
                        this.dec.err = "Number Over flow Error";
                        return;
                    }
                    if (num > limitConst.MaxInt64) {
                        if (!(kd == kindConst.vbsKind.VBS_INTEGER && negative && num == limitConst.MaxInt64)) {
                            this.dec.err = "Number Over flow Error";
                            return;
                        }
                    }
                }
                this.head.kind = kd;
                this.head.descriptor = descriptor;
                this.head.num = num;
                if (negative) {
                    this.head.num = -this.head.num;
                }

                this.dec.hStart = i; // i point to the index of headData
                return;
        }
        this.dec.err = "Invalid Vbs Error";
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
         return this.dec.hEnd - this.dec.hStart;
    }
    function _bitmapTestSingle(x) {
        return (bitmapSingle[x>>3] & (1 << (x & 0x1F))) != 0;
    }
    function _bitmapTestMulti(x) {
        return (bitmapMulti[x>>3] & (1 << (x & 0x1F))) != 0;
    }
    /**
     *  @pad 0 to make the length of m to 7 bit 
     *  if length of m is less than 7, pad it to 7
     *  return: this.dec.encodeData
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
function decode(dataArr, j) {
    var vbsDecode = new VbsDecoder();
    vbsDecode.decodeInit(dataArr, j); 
    let decodeData = vbsDecode.decodeObj();
    if (vbsDecode.dec.err != NoError) {
        throw new Error(vbsDecode.dec.err);
    } 
    return decodeData;  
}
/**
  *   @decode data 
  *   Description: Decode Binary array to array, and decode it 
*/
function vbsParse(opt, j) {
        if (opt.length <= 0) {
                return;
        }  
       let dv = new DataView(opt); 
       let dataArr = [];
       for(let i = 0; i < opt.byteLength; i++) {
          dataArr[i] =dv.getUint8(i);
       }
       return decode(dataArr, j);    
       
}
function decodeVBS(u, j) {
    return vbsParse(u, j);
}
module.exports = {
    decodeVBS
}


