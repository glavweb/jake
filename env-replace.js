'use strict';

var escapeRegexp = function (inString) {
    return inString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = function (inString) {
    var pattern = '([^\\$])?\\$\\{?(';
    var isFirst = true;
    for (var varName in process.env) {
        if (process.env.hasOwnProperty(varName)) {
            if (isFirst) {
                isFirst = false;
                pattern += escapeRegexp(varName);
            } else {
                pattern += '|' + escapeRegexp(varName);
            }
        }
    }
    pattern += ')\\}?';
    var re = new RegExp(pattern, 'g');

    return inString.replace(re, function (match, p1, p2) {
        return (p1 === undefined ? '' : p1)  + process.env[p2];
    });
};