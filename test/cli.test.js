'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const bin = path.join(__dirname, '..', 'jake.js');
const tmpDirs = [];

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' });
}

function emptyDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jake-test-'));
  tmpDirs.push(dir);
  return dir;
}

test.after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

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

const configWithEverything = [
  'version: 2',
  'project_name: list',
  'environments:',
  '  dev:',
  '    vars: []',
  '  prod:',
  '    vars: []',
  'tasks:',
  '  build:',
  '    script:',
  '      - echo build',
  '  deploy:',
  '    script:',
  '      - echo deploy',
  'aliases:',
  '  composer: jake -c php composer',
  '  npm: jake -i --auto-tty -c node npm',
  ''
].join('\n');

test('--list prints environment and task names and full aliases', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), configWithEverything);
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, [
    'Environments',
    '• dev',
    '• prod',
    '',
    'Tasks',
    '• build',
    '• deploy',
    '',
    'Aliases',
    '• composer: jake -c php composer',
    '• npm: jake -i --auto-tty -c node npm',
    ''
  ].join('\n'));
});

test('--list supports v1 config', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), [
    'project_name: v1',
    'environtments:',
    '  dev:',
    '    vars: []',
    'tasks:',
    '  one:',
    '    script:',
    '      - echo 1',
    'aliases:',
    '  php: jake -c php',
    ''
  ].join('\n'));
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /^Environments\n• dev\n/);
  assert.match(result.stdout, /Tasks\n• one\n/);
  assert.match(result.stdout, /Aliases\n• php: jake -c php\n/);
});

test('--list nests task dependencies under their tasks', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), [
    'version: 2',
    'environments:',
    '  dev:',
    '    vars: []',
    'tasks:',
    '  setup:',
    '    script:',
    '      - echo setup',
    '  build:',
    '    dependency:',
    '      - setup',
    '    script:',
    '      - echo build',
    '  deploy:',
    '    dependency:',
    '      - build',
    '    script:',
    '      - echo deploy',
    ''
  ].join('\n'));
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Tasks\n• deploy\n  • build\n    • setup\n/);
  assert.doesNotMatch(result.stdout, /• setup\n• \w/);
});

test('--list marks circular dependencies and shows every task once', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), [
    'version: 2',
    'environments:',
    '  dev:',
    '    vars: []',
    'tasks:',
    '  a:',
    '    dependency:',
    '      - b',
    '    script: []',
    '  b:',
    '    dependency:',
    '      - a',
    '    script: []',
    ''
  ].join('\n'));
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Tasks\n• a\n  • b\n    • a \(circular\)\n/);
});

test('--list prints none for an empty config', () => {
  const dir = emptyDir();
  fs.writeFileSync(path.join(dir, '.jake.yml'), 'version: 2\n');
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 0);
  assert.strictEqual(result.stdout, [
    'Environments',
    '• none',
    '',
    'Tasks',
    '• none',
    '',
    'Aliases',
    '• none',
    ''
  ].join('\n'));
});

test('--list needs a config file', () => {
  const dir = emptyDir();
  const result = run(['--list'], dir);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Config file "\.jake\.yml" is not found or empty\./);
});
