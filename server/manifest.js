const config = require('../config')

const manifest = {
  server: {},
  connections: [
    {
      port: process.env.PORT || config.server.port,
      host: config.server.home,
      labels: config.server.labels
    }
  ],
  registrations: [
    {
      plugin: {
        register: 'inert'
      }
    },
    {
      plugin: {
        register: 'vision'
      }
    },
    {
      plugin: {
        register: 'lout'
      }
    },
    {
      plugin: {
        register: 'good',
        options: config.logging
      }
    },
    {
      plugin: {
        register: 'nes'
      }
    },
    {
      plugin: {
        register: 'vsd-plugin-fs'
      },
      options: {
        routes: {
          prefix: '/fs'
        }
      }
    },
    {
      plugin: {
        register: 'vsd-plugin-fs-watch'
      },
      options: {
        routes: {
          prefix: '/fs'
        }
      }
    }
  ]
}

module.exports = manifest
