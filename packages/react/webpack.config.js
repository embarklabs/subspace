const {join} = require("path");
const {sync: findUp} = require("find-up");

/* eslint-disable import/no-dynamic-require */
const config = require(
  findUp("webpack.config.js", {cwd: join(__dirname, '..')})
);

config.externals = {
  "@embarklabs/subspace": "Subspace",
  react: {          
    commonjs: 'react',          
    commonjs2: 'react',          
    amd: 'React',          
    root: 'React',      
  },      
  'react-dom': {          
      commonjs: 'react-dom',          
      commonjs2: 'react-dom',          
      amd: 'ReactDOM',          
      root: 'ReactDOM',      
  }
};

// TODO: set subspace as a dependency

config.entry = join(__dirname, "src/index.js");
config.output.filename = "subspace-react.min.js";
config.output.path = __dirname + "/dist/umd/";
config.output.library = "SubspaceReact";
config.output.libraryExport = "default";

module.exports = config;