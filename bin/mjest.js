#!/usr/bin/env node
const path = require('path');
const assert = require('assert');

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`${actual} is not equal to ${expected}`);
      }
    },
    toEqual(expected) {
      try {
        assert.deepStrictEqual(actual, expected);
      } catch {
        throw new Error(`${JSON.stringify(actual)} is not equal to ${JSON.stringify(expected)}`);
      }
    },
    toHaveBeenCalledTimes(expected) {
      let actualCallTimes = 0;
      try {
        actualCallTimes = actual.mock.calls.length;
        expect(actualCallTimes).toEqual(expected);
      } catch {
        throw new Error(
          `expect function: ${
          actual.originImpl.toString()
          } to call ${expected} times, but actually call ${actualCallTimes} times`
        );
      }
    },
    toHaveBeenCalledWith(...expectedArgs) {
      let actualCallArgs = [];
      try {
        actualCallArgs = actual.mock.calls;
        actualCallArgs.forEach(callArgs => {
          expect(callArgs).toEqual(expectedArgs);
        });
      } catch {
        throw new Error(
          `expect function: ${
          actual.originImpl.toString()
          } to be called with ${expectedArgs}, but actually it was called with ${actualCallArgs}`
        );
      }
    }
  };
};

async function test(title, callback) {
  try {
    await callback();
    console.log(`✓ ${title}`);
  } catch (error) {
    console.error(`✕ ${title}`);
    console.error(error);
  }
}

// 注入给全局对象，使得每个文件可以访问
global.jest = {
  fn: (impl = () => { }) => {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return impl(...args);
    };
    mockFn.originImpl = impl;
    mockFn.mock = { calls: [] };
    return mockFn;
  },
  mock: (mockPath, mockExports = {}) => {
    const path = require.resolve(mockPath, {
      paths: ['.']
    });

    require.cache[path] = {
      id: path,
      filename: path,
      loaded: true,
      exports: mockExports
    };
  }
};

global.test = test;
global.expect = expect;

// 从命令行加载所有测试用例：
process.argv.slice(2).forEach(file => {
  require(path.join(process.cwd(), file));
});