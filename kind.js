// identifier different type
const vbsKind = {
	VBS_TAIL: 0x01,
	VBS_LIST: 0x02,
	VBS_DICT: 0x03,
	VBS_NULL: 0x0F,
	VBS_DESCRIPTOR: 0x10,         // 0001 0xxx
	VBS_BOOL: 0x18,         // 0001 100x 	0=F 1=T
	VBS_BLOB: 0x1B,
	VBS_DECIMAL: 0x1C,         // 0001 110x 	0=+ 1=-
	VBS_FLOATING: 0x1E,         // 0001 111x 	0=+ 1=-
	VBS_STRING: 0x20,         // 001x xxxx
	VBS_INTEGER: 0x40
}

const VBS_DESCRIPTOR_MAX	= 0x7fff

const VBS_SPECIAL_DESCRIPTOR	= 0x8000

var kindNames = [
	"INVALID",      /*  0 */
    "TAIL",         /*  1 */
    "LIST",         /*  2 */
    "DICT",         /*  3 */
    "NULL",         /*  4 */
    "FLOATING",     /*  5 */
    "DECIMAL",      /*  6 */
    "BOOL",         /*  7 */
    "STRING",       /*  8 */
    "INTEGER",      /*  9 */
    "BLOB",         /* 10 */
    "DESCRIPTOR"   /* 11 */
]

var kindIdx = [
	0,  1,  2,  3,  0,  0,  0, 0,  0,  0,  0,  0,  0,  0,  0,  4,
    11,  0,  0,  0,  0,  0,  0, 0,  7,  0,  0, 10,  6,  0,  5,  0,
    8,  0,  0,  0,  0,  0,  0, 0,  0,  0,  0,  0,  0,  0,  0,  0,
    0,  0,  0,  0,  0,  0,  0, 0,  0,  0,  0,  0,  0,  0,  0,  0,
    9
]

function KindString(k) {
	if (k >= 0 && k <= vbsKind.VBS_INTEGER) {
		return kindNames[kindIdx[k]];
	}
	return kindNames[0];
}

module.exports = {
	vbsKind,
	VBS_DESCRIPTOR_MAX,
	VBS_SPECIAL_DESCRIPTOR,
	KindString
}