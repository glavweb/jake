#!/usr/bin/env node
'use strict';

const args = require('./args');
const config = require('./config');

const version = config.version ?? 1;
const jake = require(`./v${version}/jake`);
const SignalsHandler = require('./signals-handler');
const {Signale} = require('signale');

const env = process.env.JAKE_ENV ?? args.env;
const debug = Boolean(process.env.JAKE_DEBUG ? process.env.JAKE_DEBUG === 'true' : args.debug);
const logLevel = debug ? 'info' : 'error';
const terminateTimeout = process.env.JAKE_TERMINATE_TIMEOUT ?? args.terminate_timeout

const logger = new Signale({logLevel, scope: args.cmd.join(' ')});
const signalsHandler = new SignalsHandler(terminateTimeout, logger);

logger.config({
  displayTimestamp: true
});

jake.run(args, env, debug, logger, () => signalsHandler.terminating);