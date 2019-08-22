const path = require('path');

const web = {
  target: 'web',
  entry: path.join(__dirname, "dist/index.js"),
  externals: ['electron'],
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: 'browser.js',
    library: 'phoenix',
    libraryTarget: 'commonjs2'
  },
  node: {
    fs: 'empty',
  },
  optimization: {
    usedExports: true
  }
};

const node = {
  target: "node",
  externals: ['electron'],
  entry: path.join(__dirname, "dist/eventSyncer.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "node.js",
    library: 'phoenix',
    libraryTarget: 'commonjs2',
  }
};

module.exports = {
  node,
  web
};
