module.exports = function (api) {
  api.cache(true);
  return {
    // Keep Expo's Babel pipeline unmodified. React Compiler is intentionally
    // disabled in app.json because the current compiler beta cannot transform
    // some React Native/third-party components ("private prop" error).
    presets: ['babel-preset-expo'],
    // Some installed Expo Go runtimes cannot parse private class fields that
    // React Native 0.81 ships in its web API polyfills. Compile them away so
    // the development bundle remains compatible with those runtimes.
    plugins: [
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ],
  };
};
