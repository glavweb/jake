'use strict';

const cp = require('child_process');
const fs = require('fs');
const psTree = require('ps-tree');

module.exports = class SignalsHandler {
  terminating = false;
  pids = [];
  foreignPids = new Set();

  constructor(timeout, logger, containerContext) {
    this.timeout = timeout;
    this.logger = logger;
    this.container = containerContext;

    process.on('SIGTERM', () => this.shutdown('TERM'));
    process.on('SIGINT', () => this.shutdown('INT'));
  }

  isZombie(pid) {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2)[0] === 'Z';
    } catch (e) {
      return false;
    }
  }

  isAlive(pid) {
    if (this.isZombie(pid)) {
      return false;
    }
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return e.code === 'EPERM';
    }
  }

  kill(pid, signal) {
    try {
      process.kill(pid, signal);
      return true;
    } catch (e) {
      if (e.code === 'EPERM') {
        this.foreignPids.add(pid);
      }
      return false;
    }
  }

  removeExitedProcessesIds() {
    this.pids = this.pids.filter(pid => this.isAlive(pid));
  }

  scan() {
    return new Promise(resolve => {
      psTree(process.pid, (err, children) => {
        if (err) {
          this.logger.debug('PS TREE ERROR', err.message);
          return resolve();
        }
        for (const {PID} of children) {
          if (!this.pids.includes(PID)) {
            this.pids.push(PID);
          }
        }
        resolve();
      });
    });
  }

  containerCommand(command) {
    if (!command) {
      return false;
    }
    this.logger.debug('CONTAINER', command);
    try {
      const result = cp.spawnSync(command, {
        shell: true,
        timeout: 10000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const stderr = String(result.stderr || '').trim();
      if (result.status !== 0) {
        this.logger.debug('CONTAINER EXIT', result.status, stderr);
      }
      return result.status === 0;
    } catch (e) {
      this.logger.debug('CONTAINER ERROR', e.message);
      return false;
    }
  }

  builder() {
    return this.container && this.container.builder;
  }

  containerAlive() {
    const builder = this.builder();
    return Boolean(builder) && this.containerCommand(builder.buildContainerCheckCommand());
  }

  async forceShutdown() {
    await this.scan();
    for (const pid of this.pids) {
      if (this.kill(pid, 'SIGKILL')) {
        this.logger.debug('KILL', pid);
      }
    }
    this.removeExitedProcessesIds();
  }

  shutdown(signal) {
    if (this.terminating) {
      return;
    }

    this.logger.debug('SHUTDOWN', signal, this.timeout);

    this.terminating = true;

    const forward = async () => {
      await this.scan();
      for (const pid of this.pids) {
        this.kill(pid, 'SIG' + signal);
      }
      const builder = this.builder();
      if (builder) {
        this.containerCommand(builder.buildContainerSignalCommand(signal));
      }
    };

    forward();

    const shutdownTime = Date.now();
    let forceAt = null;

    const interval = setInterval(async () => {
      this.removeExitedProcessesIds();

      const own = this.pids.filter(pid => !this.foreignPids.has(pid));
      const deadline = shutdownTime + this.timeout * 1000;

      if (forceAt === null && Date.now() >= deadline) {
        forceAt = Date.now();
        this.logger.debug('FORCE SHUTDOWN');
        await this.forceShutdown();
        const builder = this.builder();
        if (builder) {
          this.containerCommand(builder.buildContainerKillCommand());
        }
      }

      if (own.length) {
        return;
      }

      const builder = this.builder();
      let containerBusy = false;
      if (builder) {
        containerBusy = this.containerAlive();
        const limit = forceAt === null ? deadline : forceAt + this.timeout * 1000;
        if (containerBusy && Date.now() < limit) {
          return;
        }
      }

      clearInterval(interval);

      if (builder) {
        this.containerCommand(builder.buildContainerCleanupCommand());
      }

      const stuck = [...this.pids];
      if (containerBusy) {
        stuck.push('container');
      }
      if (stuck.length) {
        this.logger.error('CANNOT KILL', stuck.join(', '));
      }

      process.exit(0);
    }, 500);
  }
}
