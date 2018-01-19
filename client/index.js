require('document-register-element')

var client = require('./client')
var Files = require('./files')
var util = require('./util')
var projectPath = window.UCO.path

require('./notify')

client.connect()
.then(function () {
  client.request({
    path: '/fs/watched?path=' + projectPath,
    method: 'GET'
  })
  .then(function (response) {
    var payload = response.payload
    var files = new Files(payload.watched)
    window.files = payload.watched
    window.UCO.files = files
    window.UCO.watchId = payload.id

    require('./main')
    require('./tree')
    require('./sidebar')

    require('./db')
    require('./breadcrumbs')
    require('./routes')
  })
  .catch(function (err) {
    util.handleError(err)
  })
})
.catch(function (err) {
  util.handleError(err)
})
