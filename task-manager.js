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
    for (var taskName in this.config) {
        if (this.config.hasOwnProperty(taskName)) {
            this.tasks[taskName] = new Task(taskName, this.config[taskName], this);
        }
    }
};

TaskManager.prototype.runTask = function (inTaskName) {
    this.tasks[inTaskName].run();
};

function Task(inName, inConfig, inManager) {
    this.manager = inManager;
    this.config = inConfig;
    this.name = inName;
    this.dependency = inConfig.dependency || [];
    this.script = inConfig.script || [];
}

Task.prototype.setName = function (inName) {
    this.name = inName;
};

Task.prototype.setDependency = function (inDependency) {
    this.dependency = inDependency;
};

Task.prototype.setScript = function (inScript) {
    this.script = inScript;
};

Task.prototype.run = function () {
    var i;

    for (i = 0; i < this.dependency.length; i++) {
        var dependency = this.dependency[i];
        this.manager.runTask(dependency);
    }

    for (i = 0; i < this.script.length; i++) {
        var script = this.script[i];
        this.manager.executor.exec(script);
    }
};
