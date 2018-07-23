// 空白（空格、换行、tab）和逗号分隔的字符串，变成用逗号分隔
function getSplitString(str) {
    var arr = str.split(" ");

    var resources = "";
    for (var i = 0; i < arr.length; i++) {
        var arr1 = arr[i].split(/\s+/);
        for (var j = 0; j < arr1.length; j++) {
            if (arr1[j].replace(/^\s+|\s+$/g,"") != "") {
                resources += arr1[j].replace(/^\s+|\s+$/g,"") + ",";
            }
        }
    }

    return resources;
}
let aa = "3 37 104 101 108 108 111 65 37 119 111 114 108 100 67 37 102 97 105 110 116 97 1";
let bb = getSplitString(aa);
console.log(bb)
// console.log(aa)