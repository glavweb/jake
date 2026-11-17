'use strict';

module.exports = function printList(config) {
  const environments = config.environments ?? config.environtments ?? {};
  const tasks = config.tasks ?? {};
  const aliases = config.aliases ?? {};
  const tty = process.stdout.isTTY;
  const title = value => (tty ? `\x1b[1;36m${value}\x1b[0m` : value);
  const dim = value => (tty ? `\x1b[2m${value}\x1b[0m` : value);

  const section = heading => {
    console.log(title(heading));
  };

  const bullets = (lines, empty) => {
    console.log(lines.length ? lines.join('\n') : '• ' + dim(empty));
  };

  const taskLines = (taskNames, seen = new Set(), depth = 0) => {
    const lines = [];
    for (const taskName of taskNames) {
      const dependencies = tasks[taskName]?.dependency ?? [];
      const circular = seen.has(taskName);
      const prefix = depth === 0 ? '• ' : '  '.repeat(depth) + '• ';
      lines.push(prefix + taskName + (circular ? ' ' + dim('(circular)') : ''));
      if (!circular && dependencies.length) {
        lines.push(...taskLines(dependencies, new Set([...seen, taskName]), depth + 1));
      }
    }
    return lines;
  };

  const collectDependencies = (taskName, result) => {
    const dependencies = tasks[taskName]?.dependency ?? [];
    for (const dependency of dependencies) {
      if (!result.has(dependency)) {
        result.add(dependency);
        collectDependencies(dependency, result);
      }
    }
    return result;
  };

  const collectRendered = (taskNames, result) => {
    for (const taskName of taskNames) {
      if (!result.has(taskName)) {
        result.add(taskName);
        collectRendered(tasks[taskName]?.dependency ?? [], result);
      }
    }
    return result;
  };

  const taskNames = Object.keys(tasks);
  const allDependencies = new Set();
  for (const taskName of taskNames) {
    collectDependencies(taskName, allDependencies);
  }

  const rootNames = taskNames.filter(name => !allDependencies.has(name));
  const rendered = collectRendered(rootNames, new Set());
  const orphanNames = [];
  for (const name of taskNames) {
    if (!rendered.has(name)) {
      collectRendered([name], rendered);
      orphanNames.push(name);
    }
  }

  section('Environments');
  bullets(Object.keys(environments).map(name => '• ' + name), 'none');

  console.log();
  section('Tasks');
  bullets(taskNames.length ? [...taskLines(rootNames), ...taskLines(orphanNames)] : [], 'none');

  console.log();
  section('Aliases');
  bullets(Object.keys(aliases).map(name => '• ' + `${name}: ` + dim(aliases[name])), 'none');
};
