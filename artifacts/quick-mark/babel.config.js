module.exports = function (api) {
  api.cache(true);
  return {
    // Keep Expo's Babel pipeline unmodified. React Compiler is intentionally
    // disabled in app.json because the current compiler beta cannot transform
    // some React Native/third-party components ("private prop" error).
    presets: ['babel-preset-expo'],
  };
};
