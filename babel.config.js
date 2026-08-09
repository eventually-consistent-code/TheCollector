/**
 * Purpose: Babel config — stock expo preset, plus an import.meta transform
 * in the test env so Jest can digest ESM-only deps (@powersync/node).
 * Author(s): John Reed
 */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      test: {
        plugins: ['babel-plugin-transform-import-meta'],
      },
    },
  };
};
