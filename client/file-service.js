var Service = require('vsd-plugin-fs/client')
var client = require('./client')
var service = new Service(client, { mount: '/fs' })

module.exports = service
