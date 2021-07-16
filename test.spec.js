jest.mock('fs', {
    readFile: () => 'wscats',
});

const fs = require('fs');
const sum = (a, b) => a + b;
describe('sumTest', () => {
    const text = fs.readFile();
    expect(text).toBe('wscats');
    expect(sum(1, 2)).toBe(3);
});