
const merge = require("webpack-merge");
const common = require("./webpack.common.js");

// TODO: use merge
common[0].mode = "development";
common[1].mode = "development";

module.exports = common;