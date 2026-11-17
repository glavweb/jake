'use strict';

const Task = require('./task');
const UsageError = require('../usage-error');

module.exports = class TaskManager {
    constructor(inConfig, inExecutor) {
        this.config = inConfig || {};
        this.tasks = {};
        this.init();
        this.executor = inExecutor;
    }

    init() {
        for (const taskName in this.config) {
            if (this.config.hasOwnProperty(taskName)) {
                this.tasks[taskName] = new Task(taskName, this.config[taskName], this);
            }
        }
    }

    async runTask(inTaskName) {
        if (!(inTaskName in this.tasks)) {
            throw new UsageError(
                `Task "${inTaskName}" is not in config file. Available: ${Object.keys(this.tasks).join(', ') || 'none'}`
            );
        }

        await this.tasks[inTaskName].run();
    }
}
