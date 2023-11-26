'use strict';

module.exports.run = async function (args, env, debug, logger) {
  const config = require('../config');
  const copyEnv = require('./files').copyEnv;

  const systemEnv = process.env;

  systemEnv.JAKE_ENV = env;
  systemEnv.JAKE_DEBUG = String(debug);

  const Executor = require('./executor');
  const executor = new Executor(logger);

  logger.debug('JAKE_ENV', env);
  logger.debug('JAKE_DEBUG', debug);

  try {
    if (!(env in config.environtments)) {
      throw new Error(`Env "${env}" is not in config file`);
    }

    const envConfig = config.environtments[env];
    const envReplace = require('./env-replace');

    let projectName = systemEnv.JAKE_PROJECT_NAME || null;
    const aliases = config.aliases || {};

    if (envConfig.project_name) {
      projectName = envReplace(envConfig.project_name);
    } else if (config.project_name) {
      projectName = envReplace(config.project_name);
    }

    if (projectName !== systemEnv.JAKE_PROJECT_NAME) {
      systemEnv.JAKE_PROJECT_NAME = projectName;
    }

    for (const varObject of envConfig.vars ?? []) {
      for (let varName in varObject) {
        if (varObject.hasOwnProperty(varName)) {
          const value = varObject[varName];
          if (value === '*') {
            if (!(varName in systemEnv)) {
              throw new Error('Variable "' + varName + '" expected, but not defined');
            }
          } else {
            if (typeof value !== 'string') {
              throw new Error('Variable "' + varName + '" must be a string')
            }
            const replacedValue = envReplace(value + '');

            systemEnv[varName] = replacedValue;
            logger.debug('ENV', varName, '=', replacedValue, '(', value, ')');
          }
        }
      }
    }

    if (args.task) {
      const TaskManager = require('./task-manager').TaskManager;

      const taskManager = new TaskManager(config.tasks, executor);
      const pathList = envConfig.files?.cp_env;
      if (pathList) {
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
      const CommandBuilder = require('./command-builder').CommandBuilder;
      const commandBuilder = new CommandBuilder();

      commandBuilder
        .setComposeFiles(envConfig.docker?.compose_files)
        .setUser(args.user || envConfig.docker?.user)
        .setVars(envConfig.vars);

      commandBuilder
        .setContainer(args.container)
        .setCmd(args.docker_compose, args.cmd)
        .setEnv(env);

      if (aliases) {
        commandBuilder.setAliases(aliases);
      }

      if (projectName) {
        commandBuilder.setProjectName(projectName);
      }

      const interactive = envConfig.docker?.interactive || args.interactive;
      const tty = args.auto_tty ? process.stdout.isTTY : envConfig.docker?.tty || args.tty;

      if (args.container) {
        const containerId = (await executor.exec(commandBuilder.buildPs(), true)).trim();
        if (containerId) {
          commandBuilder.setContainerId(containerId);

          const isRunning = await executor.exec(commandBuilder.buildIsRunning(), true).indexOf('true') >= 0;

          logger.debug('CONTAINER_IS_RUNNING', isRunning);
          commandBuilder.setIsRunning(isRunning);

          logger.debug('TTY', tty);
          commandBuilder.setTty(tty);

          logger.debug('INTERACTIVE', interactive);
          commandBuilder.setInteractive(interactive);
        }
      }
      await executor.exec(commandBuilder.build());
    }
  } catch (e) {
    logger.error(e.stack);
  }
}