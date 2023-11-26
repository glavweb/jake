'use strict';

const escapeRegexp = function (inString) {
  return inString.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = function (inString) {
  let pattern = '([^\\$])?\\$\\{?(';
  let isFirst = true;
  for (let varName in process.env) {
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
  const re = new RegExp(pattern, 'g');

  return inString.replace(re, function (match, p1, p2) {
        return (p1 === undefined ? '' : p1)  + process.env[p2];
    });
};