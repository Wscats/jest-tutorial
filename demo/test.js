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

        // 缓存引入的模块
        require.cache[path] = {
            id: path,
            filename: path,
            loaded: true,
            // 更改导出的对象
            exports: mockExports
        };
    }
};

jest.mock('../math', {
    abc() { }
});

const math = require('../math');
console.log(math);