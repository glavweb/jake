'use strict';

module.exports = class Task {
  constructor(inName, inConfig, inManager) {
    this.manager = inManager;
    this.name = inName;
    this.dependency = inConfig.dependency || [];
    this.script = inConfig.script || [];
  }

  async run() {
    let i;

    for (i = 0; i < this.dependency.length; i++) {
      const dependency = this.dependency[i];
      await this.manager.runTask(dependency);
    }

    for (i = 0; i < this.script.length; i++) {
      const script = this.script[i];
      await this.manager.executor.exec(script);
    }
  }
}