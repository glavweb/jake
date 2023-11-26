'use strict';

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

        if (this.wrapWithShell) {
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
        throw new Error(`Invalid alias "${alias}"`);
      }
      result = aliasCmd + ' ' + this._escapeCommand(this.cmd.slice(1).join(' '));
    }

    return result;
  }

  buildIsRunning() {
    return `${this._build()} ps --format="{{ .State }}" ${this.container}`;
  }

  _escapeCommand(command) {
    return command.replace(/\\/g, '\\\\');
  }
}


