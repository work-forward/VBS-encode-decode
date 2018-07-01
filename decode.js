const flt_ZERO_ZERO = 0;    // 0.0
const flt_ZERO      = 1;    // +0.0 or -0.0
const flt_INF       = 2;    // +inf or -inf
const flt_NAN       = 3;    // nan

const   mask_SIGN = 0x80000000;
const   mask_EXPO = 0x7F800000;
const   mask_MANT = 0x007FFFFF;

function FloatOperate() {
    
    this._breakFloat = function(v) {
        var expo, mantissa;
        let [s, e, m] = floatToNumber(v);
        let negative = s ? true : false;
        for (let i=0; i< 52; i++) {
            if (m % 1 ==0) {
                break;
            } else {
                m = m * 2;
                e--;
            }
        }
        expo = e;
        if (negative) {
            mantissa = -m;
        } else {
            mantissa = m;
        }
        return [expo, mantissa];
    }
    function assembleFloat(sign, exponent, mantissa)
    {
        return [sign, exponent, mantissa];
    }
    function floatToNumber(flt)
    {
        if (isNaN(flt)) // Special case: NaN
            return assembleFloat(0, 0xFF, 0x1337); // Mantissa is nonzero for NaN
        var sign = (flt < 0) ? 1 : 0;
        flt = Math.abs(flt); 
        var exponent = Math.floor(Math.log(flt) / Math.LN2);

        var mantissa = flt / Math.pow(2, exponent);

        return [sign, exponent, mantissa];
    }
}
function breakFloat(v) {
    return new FloatOperate()._breakFloat(v);
}

module.exports = {
    FloatOperate
}

