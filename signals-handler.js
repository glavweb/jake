'use strict';

const psTree = require('ps-tree');

module.exports = class SignalsHandler {
  terminating = false;
  pids = [];

  constructor(timeout, logger) {
    this.timeout = timeout;
    this.logger = logger;

    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  removeExitedProcessesIds() {
    this.pids = this.pids.filter(pid => {
      try {
        process.kill(pid, 0)
        return true;
      } catch (e) {
        return false;
      }
    })
  }

  async forceShutdown() {
    if (!this.pids.length) {
      return;
    }

    const rootPid = this.pids[0];

    return new Promise((resolve, reject) => {
      psTree(rootPid, async (err, children) => {
        try {
          for (const {PID} of children) {
            this.logger.debug('KILL', PID);
            try {
              process.kill(PID, 'SIGKILL');
            } catch (e) {
            }
          }

          this.logger.debug('KILL', rootPid);
          try {
            process.kill(rootPid, 'SIGKILL');
          } catch (e) {
          }
          this.removeExitedProcessesIds();

          await this.forceShutdown();

          resolve();
        } catch (e) {
          reject(e);
        }
      })
    });
  }

  shutdown() {
    if (this.terminating) {
      return;
    }

    this.logger.debug('SHUTDOWN', this.timeout)

    this.terminating = true;
    psTree(process.pid, (err, children) => {
      for (const {PID} of children) {
        this.pids.push(PID);
        try {
          process.kill(PID, 'SIGTERM');
        } catch (e) {
        }
      }
    });
    const shutdownTime = new Date();
    const interval = setInterval(async () => {
      const force = Date.now() - shutdownTime >= this.timeout * 1000
      this.removeExitedProcessesIds();

      if (force) {
        this.logger.debug('FORCE SHUTDOWN')
        await this.forceShutdown();
      }

      if (!this.pids.length) {
        clearInterval(interval);
        process.exit(0);
      }
    }, 500)
  }
}