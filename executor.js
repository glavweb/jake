'use strict';

var spawnSync = require('child_process').spawnSync;

module.exports.Executor = Executor;

function Executor(param) {

}

Executor.prototype.exec = function (inCmd) {
    console.log('EXEC', inCmd);
    var command, args;

    if (process.platform === 'win32') {
        command = 'cmd';
        args = ['/C', inCmd];
    } else {
        command = 'bash';
        args = ['-c', '"' + inCmd + '"'];
    }

    var cmd = spawnSync(command, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
        encoding: 'utf-8'
    });

    if ('error' in cmd) {
        console.log('ERROR', cmd.error);
    }

    if (cmd.status !== 0) {
        console.log('EXIT', cmd.status);
        process.exit(cmd.status);
    }
};