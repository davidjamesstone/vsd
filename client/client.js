var Nes = require('nes/client')
var host = window.location.host
var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
var client = new Nes.Client(protocol + '//' + host)

module.exports = client
