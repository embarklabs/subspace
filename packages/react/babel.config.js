module.exports = api => {
  api.cache(true);

  return {
    env: {
      browser: {
        presets: [
          [
            "@babel/preset-env",
            {
              corejs: 3,
              modules: false,
              shippedProposals: true,
              targets: {browsers: "defaults"},
              useBuiltIns: "usage"
            }
          ]
        ],
        plugins: [
          [
            "@babel/plugin-transform-runtime",
            {
              corejs: 3,
              useESModules: true
            }
          ],
          "@babel/plugin-proposal-export-default-from",
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods",
          "@babel/plugin-proposal-nullish-coalescing-operator",
          "@babel/plugin-proposal-optional-chaining",
          "@babel/plugin-transform-react-jsx"
        ]
      },
      module: {
        presets: [
          [
            "@babel/preset-env",
            {
              corejs: 3,
              modules: false,
              shippedProposals: true,
              targets: {node: "current"},
              useBuiltIns: "usage"
            }
          ]
        ],
        plugins: [
          [
            "@babel/plugin-transform-runtime",
            {
              corejs: 3,
              useESModules: true
            }
          ],
          "@babel/plugin-proposal-export-default-from",
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods",
          "@babel/plugin-proposal-nullish-coalescing-operator",
          "@babel/plugin-proposal-optional-chaining",
          "@babel/plugin-transform-react-jsx"
        ]
      }
    },
    sourceMaps: true
  };
};
