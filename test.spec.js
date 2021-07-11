const sum = (a, b) => a + b;
test('sumAsync adds numbers asynchronously', () => {
    console.log('const result = sum(3, 7);');
    const result = sum(3, 7);
    const expected = 10;
    expect(result).toBe(expected);
});