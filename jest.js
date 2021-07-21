/**
 * Copyright © 1998 - 2021 Tencent. All Rights Reserved.
 * @author enoyao
 */

const vm = require("vm");
const path = require("path");
const fs = require("fs");


const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();

const dispatch = event => {
    const { fn, type, name, pass } = event;
    switch (type) {
        case "ADD_TEST":
            const { testBlock } = global["STATE_SYMBOL"];
            testBlock.push({ fn, name });
            break;
        case "BEFORE_EACH":
            const { beforeEachBlock } = global["STATE_SYMBOL"];
            beforeEachBlock.push(fn);
            break;
        case "BEFORE_ALL":
            const { beforeAllBlock } = global["STATE_SYMBOL"];
            beforeAllBlock.push(fn);
            break;
        case "AFTER_EACH":
            const { afterEachBlock } = global["STATE_SYMBOL"];
            afterEachBlock.push(fn);
            break;
        case "AFTER_ALL":
            const { afterAllBlock } = global["STATE_SYMBOL"];
            afterAllBlock.push(fn);
            break;
        case "COLLECT_REPORT":
            const { reports } = global["STATE_SYMBOL"];
            reports.push({ name, pass });
            break;
    }
};

const createState = () => {
    global["STATE_SYMBOL"] = {
        testBlock: [],
        beforeEachBlock: [],
        beforeAllBlock: [],
        afterEachBlock: [],
        afterAllBlock: [],
        reports: []
    };
};

createState();

const jest = {
    fn(impl = () => { }) {
        const mockFn = (...args) => {
            mockFn.mock.calls.push(args);
            return impl(...args);
        };
        mockFn.originImpl = impl;
        mockFn.mock = { calls: [] };
        return mockFn;
    },
    mock(mockPath, mockExports = {}) {
        const path = require.resolve(mockPath, { paths: ["."] });
        require.cache[path] = {
            id: path,
            filename: path,
            loaded: true,
            exports: mockExports,
        };
    }
};

const log = (color, text) => console.log(color, text);

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
            throw new Error(`${JSON.stringify(actual)} is not equal to ${JSON.stringify(expected)}`);
        }
    },
});

const context = {
    console: console.Console({ stdout: process.stdout, stderr: process.stderr }),
    jest,
    expect,
    require,
    afterAll: (fn) => dispatch({ type: "AFTER_ALL", fn }),
    afterEach: (fn) => dispatch({ type: "AFTER_EACH", fn }),
    beforeAll: (fn) => dispatch({ type: "BEFORE_ALL", fn }),
    beforeEach: (fn) => dispatch({ type: "BEFORE_EACH", fn }),
    test: (name, fn) => dispatch({ type: "ADD_TEST", fn, name }),
};

(async () => {
    const start = new Date();

    vm.createContext(context);
    vm.runInContext(code, context);

    const { testBlock, beforeEachBlock, beforeAllBlock, afterEachBlock, afterAllBlock } = global["STATE_SYMBOL"];

    await new Promise((done) => {
        beforeAllBlock.forEach(async (beforeAll) => await beforeAll());
        testBlock.forEach(async (item) => {
            const { fn, name } = item;
            try {
                beforeEachBlock.forEach(async (beforeEach) => await beforeEach());
                await fn.apply(this);
                dispatch({ type: "COLLECT_REPORT", name, pass: 1 });
                afterEachBlock.forEach(async (afterEach) => await afterEach());
                log("\x1b[32m%s\x1b[0m", `√ ${name} passed`);
            } catch (error) {
                dispatch({ type: "COLLECT_REPORT", name, pass: 0 });
                console.error(error);
                log("\x1b[32m%s\x1b[0m", `× ${name} error`);
            }
        });
        afterAllBlock.forEach(async (afterAll) => await afterAll());
        done();
    })

    const end = new Date();
    log("\x1b[32m%s\x1b[0m", `Time: ${end - start} ms`);
    const { reports } = global["STATE_SYMBOL"];
    const pass = reports.reduce((pre, next) => pre.pass + next.pass);
    log("\x1b[32m%s\x1b[0m", `All Tests: ${pass}/${reports.length} passed`);
})();
