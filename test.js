// function decode(obj) {
//     var vbsDncode = new VbsDecode();
//     if (typeof obj == 'undefined' ) {
//         return;
//     }
//     let n = obj.length;
//     let x; 
//     let arr = [];
//     for (let i=0; i<n;i++) {
//         if ((obj[i] & 0x80) == 0) {
//             x = obj[i];
//             arr[i] = x;
//             if ((x & 0x60) == kindConst.vbsKind.VBS_INTEGER) { // Int +
//                 return vbsDncode.decodeInterger(obj, arr, false);
//             } else if ((x & 0x60) == (kindConst.vbsKind.VBS_INTEGER + 0x20)) { // Int -
//                 return vbsDncode.decodeInterger(obj, arr, true);
//             } else if (x == kindConst.vbsKind.VBS_FLOATING) { // float +
//                 return vbsDncode.decodeFloat(obj, arr, false);
//             } else if (x == kindConst.vbsKind.VBS_FLOATING + 1) { // float -
//                return vbsDncode.decodeFloat(obj, arr, true);
//             } else if (x == kindConst.vbsKind.VBS_BLOB) { // blob
//                 return vbsDncode.decodeBlob(obj, arr);
//             } else if (x == kindConst.vbsKind.VBS_BOOL) { // false
//                 return vbsDncode.decodeBool(obj, false);
//             } else if (x == kindConst.vbsKind.VBS_BOOL + 1) { // true
//                 return vbsDncode.decodeBool(obj, true);
//             } else if ((x & 0x20) == kindConst.vbsKind.VBS_STRING) { // string
//                 return vbsDncode.decodeString(obj, arr);
//             } else if (x == kindConst.vbsKind.VBS_NULL) {
//                 return null;
//             } else if ((x & 0x10) == kindConst.vbsKind.VBS_DESCRIPTOR) {
//                 return vbsDncode.decodeDescriptor(obj, arr);
//             }
//         } else {
//             arr[i] = obj[i];
//         }
//     }
// }
var myCar = new Object();
var propertyName = "c";
myCar.c = { sd: 'key' };

// propertyName = "model";
// myCar[propertyName] = "Mustang";

function showProps(obj, objName) {
  var result = "";
  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
        result += objName + "." + i + " = " + obj[i] + "\n";
    }
  }
  return result;
}

// console.log(showProps(myCar, "myCar"))

function listAllProperties(o){     
	var objectToInspect;     
	var result = [];
	
	for(objectToInspect = o; objectToInspect !== null; objectToInspect = Object.getPrototypeOf(objectToInspect)){  
		result = result.concat(Object.getOwnPropertyNames(objectToInspect));  
	}
	
	return result; 
}
// console.log(222, listAllProperties(myCar))
    // let maker = 33;
    var aa = "dfh";;
    var bb = 'fgfg';
    listss = {};
     // aa 
    // listss.a = aa;
    listss[aa]=bb;
    // eval("listss."+aa+"="+bb);//missing ;
    console.log(listss);

