// ./user.test.js
jest.mock('uuid', {
  v4: () => 'FAKE_ID'
});

const { createUser } = require('./user');

test('create an user with id', () => {
  const userData = {
    name: 'Christina', age: 25
  };
  const expectUser = {
    ...userData, id: 'FAKE_ID'
  };

  expect(createUser(userData)).toEqual(expectUser);
});