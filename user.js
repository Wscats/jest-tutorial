const { v4: uuidv4 } = require('uuid');

module.exports = {
  createUser({ name, age }) {
    return {
      id: uuidv4(), name, age
    };
  }
}