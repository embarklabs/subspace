/* global module */

module.exports = function (api) {
    const node = {
      ignore: [],
      plugins: [],
      presets: [
        [
          '@babel/preset-env', {
            targets: {
              node: '8.11.3'
            }
          }
        ]
      ]
    };
  
    switch (api.env()) {
      case 'node':
        return node;
      default:
        throw new Error(`invalid babel env: ${api.env}`);
    }
  };