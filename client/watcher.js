var util = require('./util')

// Nes websocket file watcher service
function Service (client, options) {
  options = options || {}
  var path = options.path
  var mount = options.mount || ''

  function getWatched (callback) {
    client.request({
      path: mount + '/watched?path=' + path,
      method: 'GET'
    }, callback)
  }

  function watch (id, files) {
    function handleError (err) {
      if (err) {
        return util.handleError(err)
      }
    }

    function addFile (payload) {
      // Create it only if it
      // doesn't already exist.
      // It could've been added by the file-editor mkfile'
      var file = files.find(function (item) {
        return item.path === payload.path
      })

      if (!file) {
        file = files.create(payload)
        files.push(file)
      }
    }

    function removeFile (payload) {
      var idx = files.findIndex(function (item) {
        return item.path === payload.path
      })

      if (idx > -1) {
        files.splice(idx, 1)
      }
    }

    function changeFile (payload) {
      var file = files.find(function (item) {
        return item.path === payload.path
      })

      if (file) {
        if (!file.stat || payload.stat.mtime !== file.stat.mtime) {
          // File has changed on disk
          file.stat = payload.stat
        }
      }
    }

    // Subscribe to watched file changes
    // that happen on the file system
    // Reload the session if the changes
    // do not match the state of the file
    client.subscribe(mount + '/' + id + '/add', addFile, handleError)
    client.subscribe(mount + '/' + id + '/addDir', addFile, handleError)
    client.subscribe(mount + '/' + id + '/unlink', removeFile, handleError)
    client.subscribe(mount + '/' + id + '/unlinkDir', removeFile, handleError)
    client.subscribe(mount + '/' + id + '/change', changeFile, handleError)
  }

  this.watch = watch
  this.getWatched = getWatched
}

var client = require('./client')
var service = new Service(client, {
  mount: '/fs',
  path: window.UCO.path
})

module.exports = service
