var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotalySecretKey');
const sign = 'v-7JCVJsWAFbQZqIeE2BOW9oXU2NjZTU9kWn5QnxvasiS7W-JRt7XwEbPOH0vJ2wzx33_aPGWKcsxMRGijg9L2Uf425soBc1_iYzCmPYYpmdkhnKQY3SUuJjsaSwki64hEIOEYNSWDqyRJJ15GnOJcW_HhMn-Jhwgynz7aNlaK_nlb9phBU0C0GRabjfcQyifovxbhmaVzc_vR7pVX-lV5-V98Ijldp4GiCKbL_W6OrGGor_GgsuGYnCysWykg2'
exports.xssEscape = (stringToEscape) => {
    return stringToEscape
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&#x27;");
}

exports.parseTojwtEncripted = (object) => {

    let encryptedString = null;
    if (object != null) {
        var token = jwt.sign(JSON.stringify(object), sign);
        encryptedString = cryptr.encrypt(token);
    }
    return encryptedString;
}

exports.getDecyptedObject = (encryptedValue) => {

    let decriptedObject = null;
    let decryptedString = null;
    if (encryptedValue != undefined) {
        const decryptedStr = cryptr.decrypt(encryptedValue);
        if (decryptedStr != null) {
            decriptedObject = jwt.decode(decryptedStr, sign);
        }
    }

    return decriptedObject;
}