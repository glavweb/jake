'use strict';

const Task = require('./task');

module.exports = class TaskManager {
    constructor(inConfig, inExecutor) {
        this.config = inConfig;
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
        await this.tasks[inTaskName].run();
    }
}

