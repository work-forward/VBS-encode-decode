# VBS-encode-decode
Run in node.
The encodeVBS interface in encode.js implement the VBS encode.It will encode u to binary,and myVbs is ArrayBuffer type, and u is the 'primitive values'.You can use it as following.
        let myVbs = encodeVBS(u);
The decodeVBS interface in decode.js implement the VBS decode. It will decode myVbs to the original types.

Run in Browser.
It can also run in Browser. You just do as following.
      npm  install browserify -g. 
      browserify encode.js > index.js
  
Now you can use it in html just by
  <script type="text/javascript" src="./index.js"></script>
