'use strict';

const cp = require('child_process');

module.exports = Executor;

function Executor(inLogger) {
    this.logger = inLogger;
}

Executor.prototype.exec =  async function (inCmd, inNeedOutput) {
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
                logger.error('EXIT', code, signal);
                reject(stderr);
                if (process.pid) {
                    process.exit(code);
                }
            }
        });

        logger.debug('PID', childProcess.pid);
    })
}
