jest.mock('fs', {
    readFile: jest.fn(() => 'wscats'),
});

const fs = require('fs');
const sum = (a, b) => a + b;
test('sum test', () => {
    expect(sum(1, 2)).toBe(3);
});

test('fs test', () => {
    const text = fs.readFile();
    expect(text).toBe('wscats');
});
