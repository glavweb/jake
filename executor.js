'use strict';

var stream = require('stream');
var cp = require('child_process');
var process = require('process');

module.exports = Executor;

function Executor(inLogger) {
    this.logger = inLogger;
}

Executor.prototype.exec = function (inCmd, inNeedOutput) {
    var logger = this.logger;

    logger.debug('EXEC', inCmd);
    
    try {
        return cp.execSync(inCmd, {
            cwd: process.cwd(),
            env: process.env,
            stdio: [0, inNeedOutput ? 'pipe' : 1, 2],
            encoding: 'utf-8'
        });
    } catch (childProcess) {
        if ('error' in childProcess) {
            logger.error('ERROR', childProcess.error);
        }

        if (childProcess.status !== 0) {
            logger.error('EXIT', childProcess.status);
            process.exit(childProcess.status);
        } 
    }
};