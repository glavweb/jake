'use strict';

module.exports.TaskManager = TaskManager;
module.exports.Task = Task;

function TaskManager(inConfig, inExecutor) {
    this.config = inConfig;
    this.tasks = {};
    this.init();
    this.executor = inExecutor;
}

TaskManager.prototype.init = function () {
    for (let taskName in this.config) {
        if (this.config.hasOwnProperty(taskName)) {
            this.tasks[taskName] = new Task(taskName, this.config[taskName], this);
        }
    }
};

TaskManager.prototype.runTask = async function (inTaskName) {
    await this.tasks[inTaskName].run();
};

function Task(inName, inConfig, inManager) {
    this.manager = inManager;
    this.name = inName;
    this.dependency = inConfig.dependency || [];
    this.script = inConfig.script || [];
}

Task.prototype.run = async function () {
    let i;

    for (i = 0; i < this.dependency.length; i++) {
        const dependency = this.dependency[i];
        await this.manager.runTask(dependency);
    }

    for (i = 0; i < this.script.length; i++) {
        const script = this.script[i];
        await this.manager.executor.exec(script);
    }
};
