module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],

  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^../config/mailer$': '<rootDir>/src/__mocks__/mailer.ts',
    '^../../config/mailer$': '<rootDir>/src/__mocks__/mailer.ts',
  },

};