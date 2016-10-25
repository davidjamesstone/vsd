var clientConfig = require('../../config/client')

module.exports = [{
  method: 'GET',
  path: '/',
  config: {
    handler: function (request, reply) {
      return reply.view('index', {
        path: request.query.path,
        config: JSON.stringify(clientConfig)
      })
    }
  }
}]
