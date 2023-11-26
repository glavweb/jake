'use strict';

const envReplace = require('./env-replace');
const fs = require('fs');
const mkdirp = require('mkdirp');
const getDirName = require('path').dirname;

module.exports.copyEnv = function (inSourcePath, inTargetPath) {
    const data = fs.readFileSync(inSourcePath, 'utf8');
    mkdirp.sync(getDirName(inTargetPath));
    fs.writeFileSync(inTargetPath, envReplace(data), 'utf8');
};