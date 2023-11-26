'use strict';

const packageInfo = require('./package.json');
const { ArgumentParser } = require('argparse');

const parser = new ArgumentParser({
  add_help: true,
  description: 'Jake the dog and Finn the human'
});

parser.add_argument(
  '-e', '--env',
  {
    help: 'Environment ( default value "dev" ). Relevant environment variable: JAKE_DEBUG',
    default: 'dev'
  }
);

parser.add_argument(
  '-t', '--task',
  {
    help: 'Run task'
  }
);

parser.add_argument(
  '-d', '--docker-compose',
  {
    help: 'Execute "docker compose" command',
    action: 'store_true'
  }
);

parser.add_argument(
  '-c', '--container',
  {
    help: 'Execute "docker compose [CONTAINER]" command'
  }
);

parser.add_argument(
  '-u', '--user',
  {
    help: 'Change docker container user'
  }
);

parser.add_argument(
  '-i', '--interactive',
  {
    help: 'Adds "--interactive" flag to "docker compose exec/run" commands',
    action: 'store_true'
  }
);

parser.add_argument(
  '-T', '--tty',
  {
    help: 'Adds "--tty" flag to "docker compose exec/run" commands. Conflicts with "--auto-tty" option',
    action: 'store_true'
  }
);

parser.add_argument(
  '--auto-tty',
  {
    help: 'Adds "--tty" flag to "docker compose exec/run" commands in tty terminal only. Conflicts with "--tty" option',
    action: 'store_true'
  }
);

parser.add_argument(
  '-s', '--sh',
  {
    help: 'wrap command with \'sh -c "$cmd" \'',
    action: 'store_true'
  }
);

parser.add_argument(
  '--terminate_timeout',
  {
    help: 'Child process terminating timeout. Relevant environment variable: JAKE_TERMINATE_TIMEOUT',
    action: 'store',
    default: 30
  }
);

parser.add_argument(
  '--debug',
  {
    help: 'Show debug information. Relevant environment variable: JAKE_DEBUG',
    action: 'store_true'
  }
);

parser.add_argument(
  '--version',
  {
    help: 'show jake version',
    action: 'version',
    version: packageInfo.version
  }
);

parser.add_argument(
  'cmd',
  {
    help: 'command to execute',
    nargs: '...'
  }
);

const args = parser.parse_args();

if (args.tty && args.auto_tty) {
  throw new Error('"--tty" and "--auto-tty" flags conflict');
}

module.exports = args;