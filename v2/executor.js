'use strict';

const cp = require('child_process');
const ExecutorError = require("./executor-error");

module.exports = class Executor {
    constructor(inLogger) {
        this.logger = inLogger;
    }

    async exec(inCmd, inNeedOutput) {
        return new Promise((resolve, reject) => {
            const logger = this.logger;
            let stdout = '';
            let stderr = '';

            logger.debug('EXEC', inCmd);

            const childProcess = cp.spawn(inCmd, [], {
                cwd: process.cwd(),
                env: process.env,
                shell: true,
                stdio: [0, inNeedOutput ? 'pipe' : 1, 2]
            });

            childProcess.stdout?.on('data', (data) => stdout += data.toString());
            childProcess.stderr?.on('data', (data) => stderr += data.toString());
            childProcess.on('exit', (code, signal) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    logger.error('EXIT', {code, signal});
                    reject(new ExecutorError(stderr, code, signal));
                }
            });

            logger.debug('PID', childProcess.pid);
        })
    }
}

