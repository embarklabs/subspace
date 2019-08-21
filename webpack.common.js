const path = require('path');

const webConfig = {
  target: 'web',
  entry: path.join(__dirname, "src/index.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: 'browser.js',
    library: 'phoenix',
    libraryTarget: 'commonjs2'
  },
  node: {
    fs: 'empty',
    process: false
  }
};

const nodeConfig = {
  target: "node",
  entry: path.join(__dirname, "src/eventSyncer.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "node.js",
    library: 'phoenix',
    libraryTarget: 'commonjs2',
  }
};

module.exports = [nodeConfig, webConfig];