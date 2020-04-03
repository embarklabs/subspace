const {BundleAnalyzerPlugin} = require("webpack-bundle-analyzer");

const config = {
  devtool: "source-map",
  /* entry: ..., */
  mode: "production",
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /(node_modules)/,
        use: [
          {
            loader: "babel-loader",
            options: {
              rootMode: "upward"
            }
          }
        ]
      }
    ]
  },
  output: {
    /* filename: ..., */
    globalObject: "this",
    /* path: ..., */
    /* library: ..., */
    libraryTarget: "umd"
  },
  plugins: [],
  resolve: {
    extensions: [
      // webpack defaults
      // see: https://webpack.js.org/configuration/resolve/#resolveextensions
      ".wasm", ".mjs", ".js", ".json",
      // additional extensions
      ".jsx"
    ]
  },
  target: "web",
};

if (process.env.WEBPACK_ANALYZE) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;