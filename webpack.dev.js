
const merge = require("webpack-merge");
const common = require("./webpack.common.js");

const mode_config = {};
Object.keys(common).forEach(k => {
  mode_config[k] = {
    mode: "development"
  }
});

module.exports = merge.multiple(common, mode_config);
