"use strict";

const BN = require('bn.js');

// npm install --save bn.js

String.prototype.getBytes = function () {
  var bytes = [];
  for (var i = 0; i < this.length; ++i) {
    bytes.push(this.charCodeAt(i));
  }
  return bytes;
};

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function encodeCredValue(str){
	if(typeof str == 'string'){
    const input = toHexString(str.getBytes());
		return new BN(input, 16).toString(10);
  } else if(typeof str == 'number') {
		return str.toString();
	}
	throw new Error("unsupported data type")
}

function example(){
	const input = 'vd6'
	const output = encodeCredValue(input)

	console.log("INPUT: ", input)
	console.log("OUTPUT: ", output)
}

module.exports = {
    encodeCredValue,
    example,
}