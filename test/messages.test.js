'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const TaskManager = require('../v2/task-manager');
const CommandBuilder = require('../v2/command-builder');
const UsageError = require('../usage-error');

const executor = { exec: async () => '' };

test('unknown task reports the task name and available tasks', async () => {
  const manager = new TaskManager({ build: { script: [] }, test: { script: [] } }, executor);

  await assert.rejects(
    () => manager.runTask('nope'),
    error => error instanceof UsageError
      && /Task "nope" is not in config file\. Available: build, test/.test(error.message)
  );
});

test('unknown task with no tasks in config says none', async () => {
  const manager = new TaskManager({}, executor);

  await assert.rejects(
    () => manager.runTask('nope'),
    error => /Available: none/.test(error.message)
  );
});

test('unknown dependency is reported as an unknown task', async () => {
  const manager = new TaskManager({ deploy: { dependency: ['missing'], script: [] } }, executor);

  await assert.rejects(
    () => manager.runTask('deploy'),
    error => /Task "missing" is not in config file/.test(error.message)
  );
});

test('unknown alias reports the alias and available aliases', () => {
  const builder = new CommandBuilder()
    .setAliases({ composer: 'jake -c php composer' })
    .setCmd(false, ['nosuchalias', 'install']);

  assert.throws(
    () => builder.build(),
    error => error instanceof UsageError
      && /Invalid alias "nosuchalias"\. Available aliases: composer/.test(error.message)
  );
});

test('unknown alias with no aliases says none', () => {
  const builder = new CommandBuilder().setCmd(false, ['nosuchalias']);

  assert.throws(() => builder.build(), /Available aliases: none/);
});
