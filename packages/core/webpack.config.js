const {join} = require("path");
const {sync: findUp} = require("find-up");

/* eslint-disable import/no-dynamic-require */
const config = require(
  findUp("webpack.config.js", {cwd: join(__dirname, '..')})
);

config.entry = join(__dirname, "src/index.js");
config.output.filename = "subspace.min.js";
config.output.path = __dirname + "/dist/umd/";
config.output.library = "Subspace";
config.output.libraryExport = "default";

module.exports = config;