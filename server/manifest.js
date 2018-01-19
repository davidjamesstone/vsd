const config = require('../config')
const viewsOptions = require('./view-options')

const manifest = {
  server: {
    port: process.env.PORT || config.server.port,
    host: config.server.host,
  },
  register: {
    plugins: [
      'inert',
      'nes',
      './plugins/router',
      {
        plugin: 'vision',
        options: viewsOptions
      },
      {
        plugin: 'good',
        options: config.logging
      },
      {
        plugin: 'vsd-plugin-fs',
        routes: {
          prefix: '/fs'
        }
      },
      {
        plugin: 'vsd-plugin-fs-watch',
        routes: {
          prefix: '/fs'
        }
      },
      './plugins/log-errors',
      // './plugins/view-data'
    ]
  }
}

// const manifest = {
//   server: {},
//   connections: [
//     {
//       port: process.env.PORT || config.server.port,
//       host: config.server.host
//     }
//   ],
//   registrations: [
//     {
//       plugin: {
//         register: 'inert'
//       }
//     },
//     {
//       plugin: {
//         register: 'vision'
//       }
//     },
//     {
//       plugin: {
//         register: 'lout'
//       }
//     },
//     {
//       plugin: {
//         register: 'good',
//         options: config.logging
//       }
//     },
//     {
//       plugin: {
//         register: 'nes'
//       }
//     },
//     {
//       plugin: {
//         register: 'vsd-plugin-fs'
//       },
//       options: {
//         routes: {
//           prefix: '/fs'
//         }
//       }
//     },
//     {
//       plugin: {
//         register: 'vsd-plugin-fs-watch'
//       },
//       options: {
//         routes: {
//           prefix: '/fs'
//         }
//       }
//     }
//   ]
// }

module.exports = manifest
