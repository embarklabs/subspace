const path = require("path");
const AddModuleExportsPlugin = require('add-module-exports-webpack-plugin');

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
  // "web3-eth": "web3-eth"  TODO: uncomment to not pack web3-eth
};

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const web = {
  target: "web",
  entry: path.join(__dirname, "src/index.js"),
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      }
    ]
  },
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
    usedExports: true,
    sideEffects: true
  },
  plugins: [
    // new BundleAnalyzerPlugin()
  ]
};

const react = {
  ...web,
  entry: path.join(__dirname, "src/react/index.js"),
  output: {
    path: path.resolve(__dirname, "react"),
    filename: "index.js",
    library: "phoenix-react",
    libraryTarget: "umd"
  }
};

const node = {
  target: "node",
  externals,
  entry: path.join(__dirname, "src/index.js"),
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      }
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "node.js",
    library: "phoenix",
    libraryTarget: "commonjs2"
  },
  optimization: {
    usedExports: true,
    sideEffects: true
  },
  plugins: [
    new AddModuleExportsPlugin()
  ]
};

module.exports = {
  node,
  web,
  react
};
