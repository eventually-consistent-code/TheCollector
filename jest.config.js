/**
 * Purpose: Jest config — data-layer tests run in plain Node against
 * @powersync/node; jest-expo's preset comes in when component tests land.
 * Author(s): John Reed
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@powersync/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // @powersync/node is ESM-only ("import" condition); point Jest's CJS
    // resolver at the file and let babel transpile it.
    '^@powersync/node$': '<rootDir>/node_modules/@powersync/node/lib/index.js',
  },
};
