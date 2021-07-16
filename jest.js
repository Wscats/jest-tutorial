const vm = require('vm');
const path = require('path');
const fs = require('fs');

const testPath = process.argv.slice(2)[0];
const code = fs.readFileSync(path.join(process.cwd(), testPath)).toString();

const getState = () => {
    return global["STATE_SYM_SYMBOL"];
};

const dispatchSync = event => {
    eventHandler(event, getState());
};

const resetState = () => {
    global["STATE_SYM_SYMBOL"] = createState();
};

const createState = () => {
    return {
        currentDescribeBlock: [],
    };
};
resetState();

const eventHandler = (event, state) => {
    switch (event.name) {
        case 'add_test':
            const { currentDescribeBlock } = state;
            const { fn } = event;
            currentDescribeBlock.push(fn);
            break;
    }
};

const jest = {
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

const log = (color, text) => console.log(color, text);

const expect = (actual) => {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`${actual} is not equal to ${expected}`);
            }
            log('\x1b[32m%s\x1b[0m', 'Test Success');
        },
        toEqual(expected) {
            try {
                assert.deepStrictEqual(actual, expected);
            } catch {
                throw new Error(`${JSON.stringify(actual)} is not equal to ${JSON.stringify(expected)}`);
            }
            log('\x1b[32m%s\x1b[0m', 'Test Success');
        },
    };
};

const context = {
    // 将 vm 作用域中的 console 改写为 node 作用域中 console 的输出流中打印
    console: console.Console({ stdout: process.stdout, stderr: process.stderr }),
    jest,
    expect,
    require,
    describe: (name, callback) => {
        // 缓存编写测试中的回调函数
        dispatchSync({
            name: 'add_test',
            fn: callback,
        })
    }
};

// context 的目的是在 vm 运行的时候，让环境拥有 describe，test 和 expect 等单测方法
vm.createContext(context);
vm.runInContext(code, context);

const { currentDescribeBlock } = global["STATE_SYM_SYMBOL"]

// 执行缓存中的 describe 方法
currentDescribeBlock.forEach(fn => {
    fn.apply(this);
});
