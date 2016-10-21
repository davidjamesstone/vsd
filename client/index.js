require('document-register-element')

var client = require('./client')
var Files = require('./files')
var util = require('./util')

require('./notify')
require('./db')
require('./breadcrumbs')
require('./routes')

client.connect(function (err) {
  if (err) {
    return util.handleError(err)
  }

  var watcher = require('./watcher')

  watcher.getWatched(function (err, payload) {
    if (err) {
      return util.handleError(err)
    }

    var files = new Files(payload.watched)
    window.files = payload.watched
    window.UCO.files = files

    watcher.watch(payload.id, files)

    require('./tree')
    require('./ace')
    require('./file')
    require('./sidebar')
    require('./workspace')

    console.log('connect')
  })
})
