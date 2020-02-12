module.exports = api => {
  api.cache(true);

  return {
    env: {
      development: {
        presets: [
          [
            "@babel/preset-env",
            {
              corejs: 3,
              shippedProposals: true,
              targets: { node: "current" },
              useBuiltIns: "usage"
            }
          ]
        ],
        plugins: [
          [
            "@babel/plugin-transform-runtime",
            {
              corejs: 3
            }
          ],
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods"
        ]
      },
      browser: {
        presets: [
          [
            "@babel/preset-env",
            {
              corejs: 3,
              modules: false,
              shippedProposals: true,
              targets: { browsers: "defaults" },
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
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods"
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
              targets: { node: "current" },
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
          "@babel/plugin-proposal-class-properties",
          "@babel/plugin-proposal-private-methods"
        ]
      }
    },
    sourceMaps: true
  };
};
