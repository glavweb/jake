'use strict';

const yaml = require('js-yaml');
const fs = require('fs');

let config = null;

try {
  config = yaml.load(fs.readFileSync('.jake.yml', 'utf8'));
} catch (e) {
  if (e.code === 'ENOENT' || e.code === 'EISDIR') {
    config = null;
  } else if (e.name === 'YAMLException' && /expected a document/.test(e.message)) {
    config = null;
  } else {
    throw e;
  }
}

module.exports = config || null;
