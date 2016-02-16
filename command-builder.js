'use strict';

module.exports.CommandBuilder = CommandBuilder;

function CommandBuilder() {
    this.projectName = null;
    this.env = null;
    this.composeFiles = [];
    this.user = null;
    this.vars = [];
    this.container = null;
    this.isDockerCommand = false;
    this.cmd = [];
}

CommandBuilder.prototype.setProjectName = function (inProjectName) {
    this.projectName = inProjectName;
    return this;
};

CommandBuilder.prototype.setEnv = function (inEnv) {
    this.env = inEnv;
    return this;
};

CommandBuilder.prototype.setComposeFiles = function (inComposeFiles) {
    this.composeFiles = inComposeFiles;
    return this;
};

CommandBuilder.prototype.setUser = function (inUser) {
    this.user = inUser;
    return this;
};

CommandBuilder.prototype.setVars = function (inVars) {
    this.vars = inVars;
    return this;
};

CommandBuilder.prototype.setContainer = function (inContainer) {
    this.container = inContainer;
    return this;
};

CommandBuilder.prototype.setCmd = function (isDocker, inCmd) {
    this.isDockerCommand = isDocker;
    this.cmd = inCmd;
    return this;
};

CommandBuilder.prototype.setAliases = function (isAliases) {
    this.aliases = isAliases;
    return this;
};

CommandBuilder.prototype.getAlias = function (inCmd) {
    if (inCmd in this.aliases) {
        return this.aliases[inCmd];
    }
    return null;
};

CommandBuilder.prototype.build = function () {
    var result;

    if (this.isDockerCommand || this.container !== null) {
        result = 'docker-compose';

        result += ' -p ' + this.projectName;

        var i;

        for (i = 0; i < this.composeFiles.length; i++) {
            var composeFileName = this.composeFiles[i];
            result += ' -f ' + composeFileName + '';
        }

        if (this.isDockerCommand) {
            result += ' ' + this.cmd.join(' ');
        } else if (this.container !== null) {
            result += ' run --rm';
            if (this.user !== null) {
                result += ' -u ' + this.user;
            }
            result += ' ' + this.container + ' ' + this.cmd.join(' ');
        }
    } else {
        var alias = this.cmd[0];
        var aliasCmd = this.getAlias(alias);

        if (aliasCmd === null) {
            throw new Error('Invalid alias "' + alias + '"');
        }
        result = aliasCmd + ' ' + this.cmd.slice(1).join(' ');
    }

    return result;
};


