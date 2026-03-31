'use strict';

/**
 * Minimal Jest-like test runner implementation.
 * Demonstrates how test frameworks work internally.
 *
 * @author enoyao
 * Copyright © 1998 - 2021 Tencent. All Rights Reserved.
 */

const vm = require('vm');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();

/** Global state key for test runner internals. */
const STATE_KEY = 'STATE_SYMBOL';

/** Dispatch an event to update the global test state. */
const dispatch = (event) => {
  const { fn, type, name, pass } = event;
  const state = global[STATE_KEY];

  switch (type) {
    case 'ADD_TEST':
      state.testBlock.push({ fn, name });
      break;
    case 'BEFORE_EACH':
      state.beforeEachBlock.push(fn);
      break;
    case 'BEFORE_ALL':
      state.beforeAllBlock.push(fn);
      break;
    case 'AFTER_EACH':
      state.afterEachBlock.push(fn);
      break;
    case 'AFTER_ALL':
      state.afterAllBlock.push(fn);
      break;
    case 'COLLECT_REPORT':
      state.reports.push({ name, pass });
      break;
  }
};

/** Initialize the global test state. */
const createState = () => {
  global[STATE_KEY] = {
    testBlock: [],
    beforeEachBlock: [],
    beforeAllBlock: [],
    afterEachBlock: [],
    afterAllBlock: [],
    reports: [],
  };
};

createState();

/** Mock implementation of jest.fn() and jest.mock(). */
const jest = {
  fn(impl = () => {}) {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return impl(...args);
    };
    mockFn.originImpl = impl;
    mockFn.mock = { calls: [] };
    return mockFn;
  },
  mock(mockPath, mockExports = {}) {
    const resolvedPath = require.resolve(mockPath, { paths: ['.'] });
    require.cache[resolvedPath] = {
      id: resolvedPath,
      filename: resolvedPath,
      loaded: true,
      exports: mockExports,
    };
  },
};

/** Log with ANSI color codes. */
const log = (color, text) => console.log(color, text);

/** Assertion helper: compare actual vs expected values. */
const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`${actual} is not equal to ${expected}`);
    }
  },
  toEqual(expected) {
    try {
      assert.deepStrictEqual(actual, expected);
    } catch {
      throw new Error(
        `${JSON.stringify(actual)} is not equal to ${JSON.stringify(expected)}`,
      );
    }
  },
});

/** VM sandbox context with test runner globals. */
const context = {
  console: new console.Console({ stdout: process.stdout, stderr: process.stderr }),
  jest,
  expect,
  require,
  afterAll: (fn) => dispatch({ type: 'AFTER_ALL', fn }),
  afterEach: (fn) => dispatch({ type: 'AFTER_EACH', fn }),
  beforeAll: (fn) => dispatch({ type: 'BEFORE_ALL', fn }),
  beforeEach: (fn) => dispatch({ type: 'BEFORE_EACH', fn }),
  test: (name, fn) => dispatch({ type: 'ADD_TEST', fn, name }),
};

/** Run all collected tests with lifecycle hooks. */
(async () => {
  const start = Date.now();

  vm.createContext(context);
  vm.runInContext(code, context);

  const { testBlock, beforeEachBlock, beforeAllBlock, afterEachBlock, afterAllBlock } =
    global[STATE_KEY];

  // Run beforeAll hooks
  for (const hook of beforeAllBlock) {
    await hook();
  }

  // Run each test with beforeEach/afterEach hooks
  for (const { fn, name } of testBlock) {
    try {
      for (const hook of beforeEachBlock) {
        await hook();
      }
      await fn();
      dispatch({ type: 'COLLECT_REPORT', name, pass: 1 });
      for (const hook of afterEachBlock) {
        await hook();
      }
      log('\x1b[32m%s\x1b[0m', `√ ${name} passed`);
    } catch (error) {
      dispatch({ type: 'COLLECT_REPORT', name, pass: 0 });
      console.error(error);
      log('\x1b[31m%s\x1b[0m', `× ${name} failed`);
    }
  }

  // Run afterAll hooks
  for (const hook of afterAllBlock) {
    await hook();
  }

  const elapsed = Date.now() - start;
  log('\x1b[32m%s\x1b[0m', `Time: ${elapsed}ms`);

  const { reports } = global[STATE_KEY];
  const passCount = reports.filter((r) => r.pass).length;
  log('\x1b[32m%s\x1b[0m', `All Tests: ${passCount}/${reports.length} passed`);
})();
