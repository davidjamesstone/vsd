require('document-register-element')

var client = require('./client')
var Files = require('./files')
var util = require('./util')
var projectPath = window.UCO.path

require('./notify')

client.connect(function (err) {
  if (err) {
    return util.handleError(err)
  }

  client.request({
    path: '/fs/watched?path=' + projectPath,
    method: 'GET'
  }, function (err, payload) {
    if (err) {
      return util.handleError(err)
    }

    var files = new Files(payload.watched)
    window.files = payload.watched
    window.UCO.files = files

    require('./main')
    require('./tree')
    require('./sidebar')

    require('./db')
    require('./breadcrumbs')
    require('./routes')
  })
})
