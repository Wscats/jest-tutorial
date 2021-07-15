const vm = require('vm');
const setState = state => {
    global["STATE_SYM_SYMBOL"] = state;
};

const getState = () => {
    return global["STATE_SYM_SYMBOL"];
};

const dispatchSync = event => {
    for (const handler of [eventHandler]) {
        handler(event, getState());
    }
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
            console.log('add_test');
            currentDescribeBlock.push(fn);
            break;
    }
};

const context = {
    // 将 vm 作用域中的 console 改写为 node 作用域中 console 的输出流中打印
    console: console.Console({ stdout: process.stdout, stderr: process.stderr }),
    describe: (name, callback) => {
        // 缓存编写测试中的回调函数
        dispatchSync({
            name: 'add_test',
            fn: callback,
        })
    }
};

const code = `
describe('sumAsync', () => {
    console.log('1111');
});
describe('sumAsync', () => {
    console.log('2222');
});
`;

// context 的目的是在 vm 运行的时候，让环境拥有 describe，test 和 expect 等单测方法
vm.createContext(context);
vm.runInContext(code, context);

console.log(global["STATE_SYM_SYMBOL"]);
console.log(global["STATE_SYM_SYMBOL"].currentDescribeBlock[0]);
const { currentDescribeBlock } = global["STATE_SYM_SYMBOL"]

// 执行缓存中的 describe 方法
currentDescribeBlock.forEach(fn => {
    fn.apply(this);
});