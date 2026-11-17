#!/usr/bin/env node
'use strict';

const args = require('./args');
const config = require('./config');

if (!config || typeof config !== 'object') {
  console.error('Config file ".jake.yml" is not found or empty.');
  process.exit(1);
}

const version = config.version ?? 1;
const jake = require(`./v${version}/jake`);
const SignalsHandler = require('./signals-handler');
const {Signale} = require('signale');

const env = process.env.JAKE_ENV ?? args.env;
const debug = Boolean(process.env.JAKE_DEBUG ? process.env.JAKE_DEBUG === 'true' : args.debug);
const logLevel = debug ? 'info' : 'error';
const terminateTimeout = process.env.JAKE_TERMINATE_TIMEOUT ?? args.terminate_timeout

const logger = new Signale({logLevel, scope: args.cmd.join(' ')});
const containerContext = require('./v2/container-context');
const signalsHandler = new SignalsHandler(terminateTimeout, logger, containerContext);

logger.config({
  displayTimestamp: true
});

jake.run(args, env, debug, logger, () => signalsHandler.terminating, containerContext);