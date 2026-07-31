'use strict';

const escapeRegexp = function (inString) {
    return inString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = function (inString) {
    const varNames = Object.keys(process.env)
        .filter((varName) => process.env.hasOwnProperty(varName))
        .sort((a, b) => b.length - a.length);

    let pattern = '([^\\$])?\\$\\{?(';
    let isFirst = true;

    for (const varName of varNames) {
        if (isFirst) {
            isFirst = false;
            pattern += escapeRegexp(varName);
        } else {
            pattern += '|' + escapeRegexp(varName);
        }
    }
    pattern += ')\\}?';

    const re = new RegExp(pattern, 'g');

    return inString.replace(re, function (match, p1, p2) {
        return (p1 === undefined ? '' : p1)  + process.env[p2];
    });
};
