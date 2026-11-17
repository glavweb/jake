'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const SignalsHandler = require('../signals-handler');

const logger = { debug() {}, error() {} };

function handler(options = {}) {
  return new SignalsHandler(options.timeout ?? 1, logger, options.container);
}

function fakeBuilder(overrides = {}) {
  return {
    buildContainerSignalCommand: () => 'true',
    buildContainerKillCommand: () => 'true',
    buildContainerCheckCommand: () => 'false',
    buildContainerCleanupCommand: () => 'true',
    ...overrides,
  };
}

test('a process we cannot signal is still alive', () => {
  const h = handler();
  const original = process.kill;
  process.kill = () => {
    const error = new Error('EPERM');
    error.code = 'EPERM';
    throw error;
  };
  try {
    assert.strictEqual(h.isAlive(1), true);
  } finally {
    process.kill = original;
  }
});

test('a missing process is not alive', () => {
  const h = handler();
  const original = process.kill;
  process.kill = () => {
    const error = new Error('ESRCH');
    error.code = 'ESRCH';
    throw error;
  };
  try {
    assert.strictEqual(h.isAlive(999999), false);
  } finally {
    process.kill = original;
  }
});

test('current process is alive and not a zombie', () => {
  const h = handler();
  assert.strictEqual(h.isAlive(process.pid), true);
  assert.strictEqual(h.isZombie(process.pid), false);
});

test('EPERM on kill is remembered as an unkillable process', () => {
  const h = handler();
  const original = process.kill;
  process.kill = () => {
    const error = new Error('EPERM');
    error.code = 'EPERM';
    throw error;
  };
  try {
    assert.strictEqual(h.kill(4242, 'SIGTERM'), false);
    assert.deepStrictEqual([...h.foreignPids], [4242]);
  } finally {
    process.kill = original;
  }
});

test('container command reports its exit status', () => {
  const h = handler();
  assert.strictEqual(h.containerCommand('true'), true);
  assert.strictEqual(h.containerCommand('false'), false);
  assert.strictEqual(h.containerCommand(null), false);
});

test('container is alive only when its check command succeeds', () => {
  const alive = handler({ container: { builder: fakeBuilder({ buildContainerCheckCommand: () => 'true' }) } });
  assert.strictEqual(alive.containerAlive(), true);

  const dead = handler({ container: { builder: fakeBuilder() } });
  assert.strictEqual(dead.containerAlive(), false);

  const none = handler();
  assert.strictEqual(none.containerAlive(), false);
});

test('shutdown forwards the same signal to the container, kills, cleans up and exits', async () => {
  const calls = [];
  const container = {
    builder: fakeBuilder({
      buildContainerSignalCommand: signal => {
        calls.push('signal:' + signal);
        return 'true';
      },
      buildContainerKillCommand: () => {
        calls.push('kill');
        return 'true';
      },
      buildContainerCleanupCommand: () => {
        calls.push('cleanup');
        return 'true';
      },
    }),
  };

  const h = new SignalsHandler(0, logger, container);
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = code => {
    exitCode = code;
  };

  try {
    h.shutdown('INT');
    await new Promise(resolve => setTimeout(resolve, 1500));
  } finally {
    process.exit = originalExit;
  }

  assert.deepStrictEqual(calls, ['signal:INT', 'kill', 'cleanup']);
  assert.strictEqual(exitCode, 0);
});

test('shutdown is idempotent', async () => {
  const h = new SignalsHandler(0, logger, null);
  const originalExit = process.exit;
  let exits = 0;
  process.exit = () => {
    exits += 1;
  };

  try {
    h.shutdown('TERM');
    h.shutdown('INT');
    await new Promise(resolve => setTimeout(resolve, 1200));
  } finally {
    process.exit = originalExit;
  }

  assert.strictEqual(exits, 1);
});
