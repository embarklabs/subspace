module.exports = {
  title: 'SUBSPACE',
  description: 'Reactive ÐApp Development',
  base: '/',
  head: [
    ['link', { rel: "apple-touch-icon", sizes: "180x180", href: "/assets/img/logo-small.png"}],
    ['link', { rel: "icon", type: "image/png", sizes: "32x32", href: "/assets/img/logo-small.png"}],
    ['link', { rel: "icon", type: "image/png", sizes: "16x16", href: "/assets/img/logo-small.png"}],
    ['link', { rel: "shortcut icon", href: "/assets/img/logo-small.png"}],
    ['meta', { name: "theme-color", content: "#ffffff"}],
    // ['link', { rel: "manifest", href: "/assets/favicons/site.webmanifest"}],
    // ['link', { rel: "mask-icon", href: "/assets/favicons/safari-pinned-tab.svg", color: "#3a0839"}],
    // ['meta', { name: "msapplication-TileColor", content: "#3a0839"}],
    // ['meta', { name: "msapplication-config", content: "/assets/favicons/browserconfig.xml"}],
  ],
  markdown: {
    lineNumbers: true
  },
  themeConfig: {
    logo: "/assets/img/logo-small.png",
    displayAllHeaders: true,
    search: false,
    nav: [
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Integrations', link: '/integrations-overview' },
      { text: 'API', link: '/api' },
      { text: 'Github', link: 'https://github.com/embarklabs/subspace' },
    ],
    sidebar: [
      '/',
      '/how-it-works',
      '/getting-started',
      {
        title: 'Integrations',
        collapsable: false,
        children: [
          ['/integrations-overview', 'Overview'],
          '/react',
          '/vue',
          {
            title: 'Redux',
            collapsable: false,
            children: [
              '/redux',
              '/redux-observable'
            ]
          },
          '/reactive-graphql',
          '/apollo-client'
        ]
      },
      ['/tutorial', 'Tutorial'],
      '/api'
    ]
  },
};
