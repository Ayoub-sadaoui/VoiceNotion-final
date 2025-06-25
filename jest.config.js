module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|uuid)',
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/app/test.jsx"
  ],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage': '<rootDir>/jest/mocks/asyncStorage.js',
  },
  setupFiles: ['<rootDir>/jest/setup.js'],
};
