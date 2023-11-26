'use strict';

const deepmerge = require('deepmerge');

const { copyEnv } = require('./files');
const Executor = require('./executor');
const config = require('../config');
const envReplace = require("./env-replace");
const ExecutorError = require("./executor-error");

const executableVariableRegExp = /^\$\((.+)\)$/;

module.exports.run = async function (args, env, debug, logger, isTerminating) {
    const systemEnv = process.env;
    const executor = new Executor(logger);

    systemEnv.JAKE_ENV = env;
    systemEnv.JAKE_DEBUG = String(debug);

    logger.debug('ARGS', JSON.stringify(args));
    logger.debug('JAKE_ENV', env);
    logger.debug('JAKE_DEBUG', debug);
    logger.debug('PID', process.pid);

    try {

        if (!(env in config.environments)) {
            throw new Error(`Env "${env}" is not in config file`);
        }

        let envConfig = config.environments[env];
        let projectName = systemEnv.JAKE_PROJECT_NAME || null;
        const aliases = config.aliases || {};
        
        if ('environment_defaults' in config) {
          envConfig = deepmerge(config.environment_defaults, envConfig);
        }

        if (envConfig.project_name) {
            projectName = envReplace(envConfig.project_name);
        } else if (config.project_name) {
            projectName = envReplace(config.project_name);
        }

        if (projectName !== systemEnv.JAKE_PROJECT_NAME) {
            systemEnv.JAKE_PROJECT_NAME = projectName;
        }

        if ('before_script' in config) {
            for (const script of config.before_script) {
                await executor.exec(script);
            }
        }

        for (const varObject of envConfig.vars ?? []) {
            for (const varName in varObject) {
                if (varObject.hasOwnProperty(varName)) {
                    let value = varObject[varName];
                    let newValue = value;
                    if (value === null) {
                        if (!(varName in systemEnv)) {
                            throw new Error(`Environment variable "${varName}" expected, but not defined`);
                        }
                        newValue = systemEnv[varName];
                    } else {
                        if (typeof value !== 'string') {
                            throw new Error(`Variable "${varName}" value must be a string`)
                        }
                        const executableVariableMatch = value.trim().match(executableVariableRegExp)
                        if (executableVariableMatch) {
                            newValue = (await executor.exec(executableVariableMatch[1], true)).slice(0, -1);
                        } else {
                            newValue = envReplace(value);
                        }

                        systemEnv[varName] = newValue;
                    }
                    logger.debug(`ENV ${varName}=${newValue} [${value}]`);
                }
            }
        }

        if (args.task) {
            const TaskManager = require('./task-manager');

            const taskManager = new TaskManager(config.tasks, executor);
            if (envConfig.files?.cp_env) {
                const pathList = envConfig.files.cp_env;
                for (let j = 0; j < pathList.length; j++) {
                    const cpEnvArray = pathList[j];
                    const sourcePath = envReplace(cpEnvArray[0]);
                    const targetPath = envReplace(cpEnvArray[1]);
                    logger.debug('COPY_ENV', sourcePath, targetPath);
                    copyEnv(sourcePath, targetPath);
                }
            }

            await taskManager.runTask(args.task);
        } else {
            const CommandBuilder = require('./command-builder');
            const commandBuilder = new CommandBuilder();

            commandBuilder
              .setComposeFiles(envConfig.docker?.compose_files)
              .setUser(args.user ?? envConfig.docker?.user);

            commandBuilder
              .setContainer(args.container)
              .setCmd(args.docker_compose, args.cmd)
              .setWrapWithShell(args.sh)
              .setEnv(env);

            if (aliases) {
                commandBuilder.setAliases(aliases);
            }

            if (projectName) {
                commandBuilder.setProjectName(projectName);
            }

            const interactive = args.interactive ?? envConfig.docker?.interactive;
            const autoTty = args.auto_tty ?? envConfig.docker?.auto_tty;
            const tty = autoTty ? process.stdout.isTTY : args.tty ?? envConfig.docker?.tty;

            if (args.container) {
                const isRunning = (await executor
                  .exec(commandBuilder.buildIsRunning(), true))
                  .indexOf('running') >= 0;

                logger.debug('CONTAINER_IS_RUNNING', isRunning);
                commandBuilder.setIsRunning(isRunning);

                logger.debug('TTY', tty);
                commandBuilder.setTty(tty);

                logger.debug('INTERACTIVE', interactive);
                commandBuilder.setInteractive(interactive);
            }
            await executor.exec(commandBuilder.build());
        }
    } catch (e) {
        if (!(e instanceof ExecutorError)) {
            logger.error(e.stack);
        }
        if (!isTerminating()) {
            process.exit(1);
        }
    }
}