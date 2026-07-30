module.exports = {
  presets: ['@react-native/babel-preset'],
  // No extra plugins. react-native-gesture-handler v2 ships no babel plugin
  // (that was a v1 artifact), and reanimated is not a dependency. If you add
  // react-native-reanimated later, add 'react-native-reanimated/plugin' here
  // and keep it LAST in the array.
  plugins: [],
};
