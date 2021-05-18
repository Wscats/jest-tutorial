const { sum, subtract, sumAsync, subtractAsync } = require('./math');

test('sumAsync adds numbers asynchronously', async () => {
  const result = await sumAsync(3, 7);
  const expected = 10;
  expect(result).toBe(expected);
});

test('subtractAsync subtracts numbers asynchronously', async () => {
  const result = await subtractAsync(7, 3);
  const expected = 4;
  expect(result).toBe(expected);
});

test('sum should have been called once', () => {
  const sumMockFn = jest.fn(sum);
  sumMockFn(3, 7);
  expect(sumMockFn).toHaveBeenCalledTimes(1);
});

test('sum should have been called with `3` `7`', () => {
  const sumMockFn = jest.fn(sum);
  sumMockFn(3, 7);
  expect(sumMockFn).toHaveBeenCalledWith(3, 7);
});