'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

process.env.JAKE_TEST_LONG = 'long-value';
process.env.JAKE_TEST_LONGER = 'longer-value';

const envReplace = require('../v2/env-replace');

test('replaces $VAR and ${VAR}', () => {
  assert.strictEqual(envReplace('$JAKE_TEST_LONG'), 'long-value');
  assert.strictEqual(envReplace('${JAKE_TEST_LONG}'), 'long-value');
});

test('prefers the longest matching variable name', () => {
  assert.strictEqual(envReplace('$JAKE_TEST_LONGER'), 'longer-value');
});

test('keeps text around the variable', () => {
  assert.strictEqual(envReplace('x-$JAKE_TEST_LONG-y'), 'x-long-value-y');
});
