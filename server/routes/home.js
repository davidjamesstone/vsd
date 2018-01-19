const clientConfig = require('../../config/client')

module.exports = {
  method: 'GET',
  path: '/',
  options: {
    handler: (request, h) => {
      return h.view('home', {
        path: request.query.path,
        config: JSON.stringify(clientConfig)
      })
    }
  }
}
