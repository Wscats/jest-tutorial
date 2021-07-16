const vm = require('vm');
const path = require('path');
const fs = require('fs');

const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();

const dispatch = event => {
    const { fn, type, name } = event;
    switch (type) {
        case 'ADD_TEST':
            const { testBlock } = global["STATE_SYMBOL"];
            testBlock.push({ fn, name });
            break;
    }
};

const createState = () => {
    global["STATE_SYMBOL"] = {
        testBlock: [],
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
        const path = require.resolve(mockPath, { paths: ['.'] });
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
    test: (name, fn) => dispatch({ type: 'ADD_TEST', fn, name })
};

const start = new Date();

vm.createContext(context);
vm.runInContext(code, context);

const { testBlock } = global["STATE_SYMBOL"];

testBlock.forEach(async (item) => {
    const { fn, name } = item;
    try {
        await fn.apply(this);
        log('\x1b[32m%s\x1b[0m', `√ ${name} passed`);
    } catch {
        log('\x1b[32m%s\x1b[0m', `× ${name} error`);
    }
});

const end = new Date();
log('\x1b[32m%s\x1b[0m', `Time: ${end - start}ms`);
