#!/usr/bin/env node
'use strict';

var packageInfo = require('./package');
var config = require('./config');
var args = require('./args');
var envReplace = require('./env-replace');

if (args.task !== null) {
    var TaskManager = require('./task-manager').TaskManager;
    var taskManager = new TaskManager(config.tasks);

    taskManager.runTask(args.task);
} else {
    var Executor = require('./executor').Executor;
    var executor = new Executor();
    var CommandBuilder = require('./command-builder').CommandBuilder;
    var commandBuilder = new CommandBuilder();
    var copyEnv = require('./files').copyEnv;

    var systemEnv = process.env;

    commandBuilder.setContainer(args.container);
    commandBuilder.setCmd(args.docker_compose, args.cmd);

    commandBuilder.setAliases(config.aliases);

    commandBuilder.setProjectName(config.project_name);
    systemEnv.JAKE_PROJECT_NAME = config.project_name;

    var env = args.env;
    if ('JAKE_ENV' in systemEnv) {
        env = systemEnv.JAKE_ENV;
    }

    commandBuilder.setEnv(env);

    if (env in config.environtments) {
        var envConfig = config.environtments[env];

        commandBuilder
            .setComposeFiles(envConfig.docker.compose_files)
            .setUser(envConfig.docker.user)
            .setVars(envConfig.vars);

        for (var i = 0; i < envConfig.vars.length; i++) {
            var varObject = envConfig.vars[i];
            for (var varName in varObject) {
                if (varObject.hasOwnProperty(varName)) {
                    var value = varObject[varName];
                    if (value === '*' && !(varName in systemEnv)) {
                        throw new Error('Variable "' + varName + '" expected, but not defined');
                    } else {
                        systemEnv[varName] = value;
                    }
                }
            }
        }

        if ('cp_env' in envConfig.files) {
            var pathLish = envConfig.files.cp_env;
            for (var j = 0; j < pathLish.length; j++) {
                var cpEnvArray = pathLish[j];
                console.log('COPY_ENV', cpEnvArray[0], cpEnvArray[1]);
                copyEnv(cpEnvArray[0], cpEnvArray[1]);
            }
        }
    } else {
        throw new Error('Env "', env, '" is not in config file');
    }


    console.log('>', process.cwd());
    executor.exec(commandBuilder.build())
}