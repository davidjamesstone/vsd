var Controller = require('./controller')
var util = require('./util')
var client = require('./client')
var editor = require('./ace/editor')

/**
 * Initialise the controller
 */
var projectPath = window.UCO.path
var files = window.UCO.files
var storageKey = 'vsd-' + projectPath
var storage = window.localStorage.getItem(storageKey)
storage = storage ? JSON.parse(storage) : {}
var recent = storage.recent || []

/**
 * Construct main controller
 */
var main = new Controller({
  files: files
})

/**
 * Initialise recent files
 */
recent.forEach(function (item) {
  var recentFile = main.findFile(item)
  if (recentFile) {
    main.recent.push(recentFile)
  }
})

/**
 * Watch filesystem
 */
function subscribeError (err) {
  if (err) {
    return util.handleError(err)
  }
}

function onFileAdded (payload) {
  // Create it only if it
  // doesn't already exist.
  // It could've been added by the file-editor mkfile'
  var file = files.create(payload)
  controller.files.push(file)
}

function onFileRemoved (payload) {
  var idx = controller.findFileIndex(payload.path)
  controller.files.splice(idx, 1)
}

function onFileChanged (payload) {
  var file = controller.findFile(payload.path)
  file.stat = payload.stat
}

// Subscribe to watched file changes
// that happen on the file system
// Reload the session if the changes
// do not match the state of the file
var id = 0
client.subscribe('/fs/' + id + '/add', onFileAdded, subscribeError)
client.subscribe('/fs/' + id + '/addDir', onFileAdded, subscribeError)
client.subscribe('/fs/' + id + '/unlink', onFileRemoved, subscribeError)
client.subscribe('/fs/' + id + '/unlinkDir', onFileRemoved, subscribeError)
client.subscribe('/fs/' + id + '/change', onFileChanged, subscribeError)

editor.commands.addCommands([{
  name: 'save',
  bindKey: {
    win: 'Ctrl-S',
    mac: 'Command-S'
  },
  exec: function (editor) {
    var file = main.file
    if (file && file.isDirty) {
      current.save(function (err, result) {
        if (!err) {
          current.manager.markClean()
        }
      })
    }
  },
  readOnly: false
}, {
  name: 'saveall',
  bindKey: {
    win: 'Ctrl-Shift-S',
    mac: 'Command-Option-S'
  },
  exec: function (editor) {
    sessions.saveAll()
  },
  readOnly: false
}])

main.recent.on('change', function () {
  var state = JSON.stringify({
    recent: this.map(function (item) {
      return item.getRelativePath()
    })
  })

  console.log('Saving state', state)
  window.localStorage.setItem(storageKey, state)
})

main.on('change', function (e) {
  console.log(e)
})

module.exports = main
