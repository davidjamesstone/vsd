const glupe = require('glupe')
const config = require('./config')
const { manifest, options } = require('./server')

;(async () => {
  try {
    await glupe(manifest, options)
  } catch (err) {
    console.error(err)
  }
})()


// const Glue = require('glue')
// const requireDirectory = require('require-directory')
// const config = require('./config')
// const manifest = require('./server/manifest')
// const pkg = require('./package.json')
// const appName = pkg.name
// const appVersion = pkg.version

// Glue.compose(manifest, function (err, server) {
//   if (err) {
//     throw err
//   }



//   // Load all routes
//   const routes = requireDirectory(module, './server/routes')
//   for (var key in routes) {
//     server.route(routes[key])
//   }

//   // Configure views
//   server.views(require('./server/views'))

//   /*
//    * Start the server
//    */
//   server.start(function (err) {
//     var details = {
//       name: appName,
//       version: appVersion,
//       info: server.info
//     }

//     if (err) {
//       details.error = err
//       details.message = 'Failed to start ' + details.name
//       server.log(['error', 'info'], details)
//       throw err
//     } else {
//       details.config = config
//       details.message = 'Started ' + details.name
//       server.log('info', details)
//       console.info('Server running at:', server.info)
//     }
//   })
// })
