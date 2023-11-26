'use strict';

const yaml = require('js-yaml');
const fs = require('fs');

module.exports = yaml.load(fs.readFileSync('.jake.yml', 'utf8'));
