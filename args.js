'use strict';

var packageInfo = require('./package');
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
    version: packageInfo.version,
    addHelp:true,
    description: 'Jake the dog and Finn the human'
});
parser.addArgument(
    [ '-e', '--env' ],
    {
        help: 'environment ( default value "dev" )',
        defaultValue: 'dev'
    }
);
parser.addArgument(
    [ '-t', '--task' ],
    {
        help: 'run task'
    }
);
parser.addArgument(
    [ '-d', '--docker-compose' ],
    {
        help: 'docker-compose',
        action: 'storeTrue'
    }
);
parser.addArgument(
    [ '-c', '--container' ],
    {
        help: 'docker-compose container'
    }
);
parser.addArgument(
    [ '-i', '--interactive' ],
    {
        help: 'jake shell',
        action: 'storeTrue'
    }
);
parser.addArgument(
    [ 'cmd' ],
    {
        help: 'command to execute',
        nargs: '...'
    }
);

module.exports = parser.parseArgs();