module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@services/(.*)$': '<rootDir>/services/$1', // Ajout pour les services si besoin
  },
};
