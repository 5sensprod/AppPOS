//AppServe\jest.config.js
module.exports = {
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['<rootDir>/data/'],
  moduleNameMapper: {
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
  },
};
