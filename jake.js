#!/usr/bin/env node
'use strict';

var config = require('./config');
var args = require('./args');
var copyEnv = require('./files').copyEnv;
var log = require('log-util');

var systemEnv = process.env;
var env = args.env;

if ('JAKE_ENV' in systemEnv) {
    env = systemEnv.JAKE_ENV;
} else {
    systemEnv.JAKE_ENV = env;
}

var debug = systemEnv.JAKE_DEBUG === 'true' || args.debug;
systemEnv.JAKE_DEBUG = debug;
var logLevel = debug ? log.Log.VERBOSE : log.Log.ERROR;
var logger = new log.Log(logLevel);
var Executor = require('./executor');
var executor = new Executor(logger);

logger.debug('JAKE_DEBUG', systemEnv.JAKE_DEBUG, logLevel);
try {
    logger.debug('JAKE_ENV', env);

    var envConfig = config.environtments[env];
    var envReplace = require('./env-replace');
    
    if (args.task !== null) {
        var TaskManager = require('./task-manager').TaskManager;

        var taskManager = new TaskManager(config.tasks, executor);
        if (envConfig && 'files' in envConfig && 'cp_env' in envConfig.files) {
            var pathList = envConfig.files.cp_env;
            for (var j = 0; j < pathList.length; j++) {
                var cpEnvArray = pathList[j];
                var sourcePath = envReplace(cpEnvArray[0]);
                var targetPath = envReplace(cpEnvArray[1]);
                logger.debug('COPY_ENV', sourcePath, targetPath);
                copyEnv(sourcePath, targetPath);
            }
        }

        taskManager.runTask(args.task);
    } else {
        var CommandBuilder = require('./command-builder').CommandBuilder;
        var commandBuilder = new CommandBuilder();

        systemEnv.JAKE_PROJECT_NAME = config.project_name;

        if (env in config.environtments) {

            commandBuilder
                .setComposeFiles(envConfig.docker.compose_files)
                .setUser(args.user || envConfig.docker.user)
                .setVars(envConfig.vars);

            for (var i = 0; i < envConfig.vars.length; i++) {
                var varObject = envConfig.vars[i];
                for (var varName in varObject) {
                    if (varObject.hasOwnProperty(varName)) {
                        var value = varObject[varName];
                        if (value === '*') {
                            if (!(varName in systemEnv)) {
                                throw new Error('Variable "' + varName + '" expected, but not defined');
                            }
                        } else {
                            if (typeof value !== 'string') {
                                throw new Error('Variable "' + varName + '" must be a string')
                            }
                            var replacedValue = envReplace(value + '');

                            systemEnv[varName] = replacedValue;
                            logger.debug('ENV', varName, '=', replacedValue, '(', value, ')');
                        }
                    }
                }
            }


        } else {
            throw new Error('Env "', env, '" is not in config file');
        }

        commandBuilder
            .setContainer(args.container)
            .setCmd(args.docker_compose, args.cmd)
            .setAliases(config.aliases)
            .setProjectName(config.project_name)
            .setEnv(env);

        var interactive = envConfig.docker.interactive || args.interactive;
        var tty = envConfig.docker.tty || args.tty || process.stdout.isTTY;

        if (args.container) {
            var containerId = executor.exec(commandBuilder.buildPs(), true).trim();
            if (containerId) {
                commandBuilder.setContainerId(containerId);

                var isRunning = executor.exec(commandBuilder.buildIsRunning(), true).indexOf('true') >= 0;

                logger.debug('CONTAINER_IS_RUNNING', isRunning);
                commandBuilder.setIsRunning(isRunning);

                logger.debug('TTY', tty);
                commandBuilder.setTty(tty);

                logger.debug('INTERACTIVE', interactive);
                commandBuilder.setInteractive(interactive);
            }
        }
        executor.exec(commandBuilder.build());
    }
} catch (e) {
    logger.error(e.stack);
}
