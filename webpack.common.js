const path = require("path");

const externals = {
  react: {
    commonjs: "react",
    commonjs2: "react",
    amd: "React",
    root: "React"
  },
  "react-dom": {
    commonjs: "react-dom",
    commonjs2: "react-dom",
    amd: "ReactDOM",
    root: "ReactDOM"
  },
  electron: "electron",
  "web3-eth": "web3-eth"
};

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const web = {
  target: "web",
  entry: path.join(__dirname, "dist/index.js"),
  externals,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "browser.js",
    library: "phoenix",
    libraryTarget: "umd"
  },
  node: {
    fs: "empty"
  },
  optimization: {
    usedExports: true
  },
  // plugins: [new BundleAnalyzerPlugin()]
};

const node = {
  target: "node",
  externals,
  entry: path.join(__dirname, "dist/eventSyncer.js"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "node.js",
    library: "phoenix",
    libraryTarget: "commonjs2"
  }
};

module.exports = {
  node,
  web
};
