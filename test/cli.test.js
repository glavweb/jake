'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const bin = path.join(__dirname, '..', 'jake.js');

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

function emptyDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'jake-test-'));
}

test('--help works without a config file', () => {
  const dir = emptyDir();
  const result = run(['--help'], dir);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /usage: jake\.js/);
  assert.strictEqual(result.stderr, '');
});

test('--version works without a config file', () => {
  const dir = emptyDir();
  const result = run(['--version'], dir);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('missing config gives a clear message instead of a stack trace', () => {
  const dir = emptyDir();
  const result = run([], dir);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Config file "\.jake\.yml" is not found or empty\./);
  assert.doesNotMatch(result.stderr, /at Object\.readFileSync/);
});

test('empty config also gives a clear message', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), '');
  const result = run([], dir);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Config file "\.jake\.yml" is not found or empty\./);
});
