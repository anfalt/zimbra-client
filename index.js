/**
 * Created by gsolovyev on 5/3/15.
 */
var request = require('request');
var js2xmlparser = require('js2xmlparser');
var ERR_UNKNOWN = "UNKNOWN";
exports.ERR_UNKNOWN = ERR_UNKNOWN;
exports.getAuthToken = function(hostName,adminLogin,adminPassword,cb) {
    var adminURL = getAdminURL(hostName);
    var authRequestObject = {
        "AuthRequest": {
            "@": {
                "xmlns": "urn:zimbraAdmin"
            },
            name: adminLogin,
            password: adminPassword
        }
    };
    var req = makeSOAPEnvelope(authRequestObject,"","zmsoap");
    //console.log("created soap request " + req);
    request({
            method:"POST",
            uri:adminURL,
            headers: {
                "Content-Type": "application/soap+xml; charset=utf-8"
            },
            body: req,
            strictSSL: false,
            jar: true,
            timeout: 10000
        },
        function(err,resp,body) {
            if(err != null) {
                cb(err,null);
            } else {

                var result = processResponse(body);
                if(result.err != null) {
                    cb(err,null);
                } else if(result.payload.Body.AuthResponse != null) {
                    cb(null,result.payload.Body.AuthResponse.authToken[0]._content);
                } else {
                    cb({"message":"Error: could node parse response from Zimbra ","resp":resp,"body":body});
                }
            }

        });
}

exports.createAccount = function(hostName, user, adminAuthToken, cb) {
    var adminURL = getAdminURL(hostName);
    var createAccountRequestObj = {
        "CreateAccountRequest":user
    };
    createAccountRequestObj.CreateAccountRequest["@"] = {"xmlns": "urn:zimbraAdmin"};
    var req = makeSOAPEnvelope(createAccountRequestObj,adminAuthToken,"zmsoap");
    request({
            method:"POST",
            uri:adminURL,
            headers: {
                "Content-Type": "application/soap+xml; charset=utf-8"
            },
            body: req,
            strictSSL: false,
            jar: true,
            timeout: 10000
        },
        function(err,resp,body) {
            if(err != null) {
                cb(err,null);
            } else {

                var result = processResponse(body);
                if(result.err != null) {
                    cb(result.err,null);
                } else if(result.payload.Body.CreateAccountResponse != null &&
                    result.payload.Body.CreateAccountResponse.account != null &&
                    result.payload.Body.CreateAccountResponse.account[0] != null) {
                    cb(null,result.payload.Body.CreateAccountResponse.account[0]);
                } else {
                    cb({"message":"Error: could node parse response from Zimbra ","resp":resp,"body":body,code:ERR_UNKNOWN}, null);
                }
            }

        });
}

function processResponse(body) {
    var errcode = ERR_UNKNOWN;
    var respJSON = JSON.parse(body);
    if(respJSON != null) {
        if (respJSON.Body.Fault != null) {
            if(respJSON.Body.Fault.Detail != null && respJSON.Body.Fault.Detail.Error != null &&
                respJSON.Body.Fault.Detail.Error.Code != null) {
                errcode = respJSON.Body.Fault.Detail.Error.Code;
            }
            return {err:{"message":respJSON.Body.Fault.Reason.Text,"body":body,code:errcode}, payload:null};
        } else {
            return {err:null, payload:respJSON,code:errcode};
        }
    } else {
        return {err:{"message":"Error: could node parse response from Zimbra ","body":body,code:errcode},payload:null};
    }
}

function getAdminURL(hostName) {
    return "https://" + hostName + ":7071/service/admin/soap";
}
function makeSOAPEnvelope(requestObject, authToken, userAgent) {
    var soapReq = {
        "@":{
            "xmlns:soap":"http://www.w3.org/2003/05/soap-envelope"
        },
        "soap:Header":{
            "context":{
                "@":{
                    "xmlns":"urn:zimbra"
                },
                "authToken":authToken,
                "userAgent":{
                    "@":{
                        "name":userAgent
                    }
                },
                "format":{
                    "@":{
                        "xmlns":"",
                        "type":"js"
                    }
                }
            }
        },
        "soap:Body":requestObject
    };
    return js2xmlparser("soap:Envelope",soapReq);
}
