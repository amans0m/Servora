module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Strip console.* from production bundles (SECURITY.md B5).
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
