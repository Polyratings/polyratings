// From https://stackoverflow.com/questions/58603201/jest-cannot-load-svg-file?rq=1
module.exports = {
  process() {
    return 'module.exports = {};';
  },
  getCacheKey() {
    // The output is always the same.
    return 'assetTransformer';
  },
};
