'use strict';

module.exports = class ExecutorError extends Error {
  code;
  signal;

  constructor(stderr, code, signal) {
    super(stderr);
    this.code = code;
    this.signal = signal;
  }
}