'use strict';

var envReplace = require('./env-replace');
var fs = require('fs');
var mkdirp = require("mkdirp");
var getDirName = require("path").dirname;

module.exports.copyEnv = function (inSourcePath, inTargetPath) {
    var data = fs.readFileSync(inSourcePath, 'utf8');
    mkdirp.sync(getDirName(inTargetPath));
    fs.writeFileSync(inTargetPath, envReplace(data), 'utf8');

};