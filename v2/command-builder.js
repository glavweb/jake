'use strict';

const UsageError = require('../usage-error');

module.exports = class CommandBuilder {
  constructor() {
    this.projectName = null;
    this.env = null;
    this.composeFiles = [];
    this.user = null;
    this.container = null;
    this.tty = false;
    this.interactive = false;
    this.isDockerCommand = false;
    this.cmd = [];
    this.aliases = [];
    this.isRunning = false;
    this.wrapWithShell = false;
    this.ref = null;
  }

  setRef(inRef) {
    this.ref = inRef;
    return this;
  }

  setProjectName(inProjectName) {
    this.projectName = inProjectName;
    return this;
  }

  setEnv(inEnv) {
    this.env = inEnv;
    return this;
  }

  setComposeFiles(inComposeFiles) {
    this.composeFiles = inComposeFiles;
    return this;
  }

  setUser(inUser) {
    this.user = inUser;
    return this;
  }

  setContainer(inContainer) {
    this.container = inContainer;
    return this;
  }

  setTty(inTty) {
    this.tty = inTty;
    return this;
  }

  setInteractive(inInteractive) {
    this.interactive = inInteractive;
    return this;
  }

  setCmd(isDocker, inCmd) {
    this.isDockerCommand = isDocker;
    this.cmd = inCmd;
    return this;
  }

  setIsRunning(inIsRunning) {
    this.isRunning = inIsRunning;
    return this;
  }

  setAliases(isAliases) {
    this.aliases = isAliases;
    return this;
  }

  setWrapWithShell(inWrapWithShell) {
    this.wrapWithShell = inWrapWithShell;
    return this;
  }

  getAlias(inCmd) {
    if (inCmd in this.aliases) {
      return this.aliases[inCmd];
    }
    return null;
  }

  _build() {
    let result;

    result = 'docker compose';

    if (this.projectName) {
      result += ` -p ${this.projectName}`;
    }

    let i;

    for (i = 0; i < this.composeFiles.length; i++) {
      const composeFileName = this.composeFiles[i];
      result += ` -f ${composeFileName}`;
    }

    return result;
  }

  build() {
    let result;

    if (this.isDockerCommand || this.container) {
      result = this._build();

      if (this.isDockerCommand) {
        result += ' ' + this._escapeCommand(this.cmd.join(' '));
      } else if (this.container) {
        if (this.isRunning) {
          result += ' exec';
        } else {
          result += ' run --rm';
        }
        if (this.tty) {
          result += ' -t';
        }
        if (this.interactive) {
          result += ' -i';
        }
        if (this.user) {
          result += ' -u ' + this.user;
        }

        result += ' ' + this.container;

        if (this.ref) {
          const record = `echo "$$ $(cut -d' ' -f22 /proc/$$/stat)" > ${this.ref}`;
          result += ' sh -c' + (this.interactive ? 'i' : '') + ' ' + this._quote(record + '; exec "$@"');
          result += ' -- ' + this._containerArgv();
        } else if (this.wrapWithShell) {
          result += ' sh -c';

          if (this.interactive) {
            result += 'i';
          }

          result += ' "' + this._escapeCommand(this.cmd.join(' ')) + '"';
        } else {
          result += ' ' + this._escapeCommand(this.cmd.join(' '));
        }
      }
    } else {
      const alias = this.cmd[0];
      const aliasCmd = this.getAlias(alias);

      if (aliasCmd === null) {
        const known = Object.keys(this.aliases || {});
        throw new UsageError(
          `Invalid alias "${alias}". Available aliases: ${known.join(', ') || 'none'}`
        );
      }
      result = aliasCmd + ' ' + this._escapeCommand(this.cmd.slice(1).join(' '));
    }

    return result;
  }

  buildIsRunning() {
    return `${this._build()} ps --format="{{ .State }}" ${this.container}`;
  }

  _containerExecScript(script) {
    let result = this._build() + ' exec -T';

    if (this.user) {
      result += ' -u ' + this.user;
    }

    return result + ' ' + this.container + ' sh -c ' + this._quote(script);
  }

  _signalScript(signal) {
    const ref = this.ref;
    return `i=0; while [ ! -s ${ref} ] && [ $i -lt 10 ]; do sleep 0.05; i=$((i+1)); done; `
      + `read P S < ${ref} 2>/dev/null; `
      + `[ -n "$P" ] && [ "$(cut -d' ' -f22 /proc/$P/stat 2>/dev/null)" = "$S" ] `
      + `&& kill -${signal} -$P`;
  }

  buildContainerSignalCommand(signal) {
    return this._containerExecScript(this._signalScript(signal));
  }

  buildContainerKillCommand() {
    return this._containerExecScript(this._signalScript('KILL'));
  }

  buildContainerCheckCommand() {
    const ref = this.ref;
    return this._containerExecScript(
      `read P S < ${ref} 2>/dev/null; `
      + `[ -n "$P" ] && [ "$(cut -d' ' -f22 /proc/$P/stat 2>/dev/null)" = "$S" ] `
      + `&& kill -0 -$P`
    );
  }

  buildContainerCleanupCommand() {
    return this._containerExecScript(`rm -f ${this.ref}`);
  }

  _quote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  _argv() {
    return this.cmd.map(token => this._quote(this._escapeCommand(token))).join(' ');
  }

  _containerArgv() {
    const argv = this.wrapWithShell
      ? ['sh', '-c' + (this.interactive ? 'i' : ''), this._escapeCommand(this.cmd.join(' '))]
      : this.cmd;

    return argv.map(token => this._quote(this._escapeCommand(token))).join(' ');
  }

  _escapeCommand(command) {
    return command.replace(/\\/g, '\\\\');
  }
}


