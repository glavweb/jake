'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const CommandBuilder = require('../v2/command-builder');

function builder() {
  return new CommandBuilder()
    .setComposeFiles(['./ci/docker-compose.yml'])
    .setProjectName('demo')
    .setUser('www-data:www-data')
    .setContainer('php')
    .setIsRunning(true);
}

test('exec command records pid and starttime before exec', () => {
  const command = builder()
    .setRef('/tmp/.jake-1-abc.ref')
    .setCmd(false, ['sleep', '500'])
    .build();

  assert.match(command, /^docker compose -p demo -f \.\/ci\/docker-compose\.yml exec/);
  assert.match(command, /-u www-data:www-data php sh -c /);
  assert.match(command, /\/proc\/\$\$\/stat/);
  assert.match(command, /> \/tmp\/\.jake-1-abc\.ref/);
  assert.match(command, /; exec "\$@"' -- 'sleep' '500'$/);
});

test('argv elements with spaces stay separate', () => {
  const command = builder()
    .setRef('/tmp/.jake-1-abc.ref')
    .setCmd(false, ['php', '-r', 'var_dump($argv);', 'a b'])
    .build();

  assert.match(command, /'php' '-r' 'var_dump\(\$argv\);' 'a b'$/);
});

test('--sh is passed as a single nested sh -c argument', () => {
  const command = builder()
    .setRef('/tmp/.jake-1-abc.ref')
    .setWrapWithShell(true)
    .setCmd(false, ['find', '.', '-type', 'd'])
    .build();

  assert.match(command, /-- 'sh' '-c' 'find \. -type d'$/);
});

test('run --rm does not record a ref', () => {
  const command = new CommandBuilder()
    .setComposeFiles(['./ci/docker-compose.yml'])
    .setContainer('php')
    .setIsRunning(false)
    .setCmd(false, ['php', '-v'])
    .build();

  assert.doesNotMatch(command, /\/proc\/\$\$\/stat/);
  assert.match(command, / run --rm php php -v$/);
});

test('single quotes in arguments are escaped', () => {
  const command = builder()
    .setRef('/tmp/.jake-1-abc.ref')
    .setCmd(false, ['php', '-r', "echo 'hi';"])
    .build();

  assert.match(command, /'echo '\\''hi'\\'';'/);
});

test('container signal command checks pid and starttime before killing the group', () => {
  const command = builder()
    .setRef('/tmp/.jake-9-xyz.ref')
    .buildContainerSignalCommand('INT');

  assert.match(command, /^docker compose -p demo -f \.\/ci\/docker-compose\.yml exec -T/);
  assert.match(command, /read P S < \/tmp\/\.jake-9-xyz\.ref/);
  assert.match(command, /-f22 \/proc\/\$P\/stat/);
  assert.match(command, /kill -INT -\$P'$/);
});

test('container kill, check and cleanup commands use the same ref', () => {
  const b = builder().setRef('/tmp/.jake-9-xyz.ref');

  assert.match(b.buildContainerKillCommand(), /kill -KILL -\$P'$/);
  assert.match(b.buildContainerCheckCommand(), /kill -0 -\$P'$/);
  assert.match(b.buildContainerCleanupCommand(), /rm -f \/tmp\/\.jake-9-xyz\.ref'$/);
});
