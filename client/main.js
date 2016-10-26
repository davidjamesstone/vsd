var Mousetrap = require('mousetrap')
var File = require('./file')
var util = require('./util')
var lint = require('./lint')
var client = require('./client')
var editor = require('./ace/editor')
var Controller = require('./controller')
var projectPath = window.UCO.path
var files = window.UCO.files
var storageKey = 'vsd-' + projectPath
var storage = window.localStorage.getItem(storageKey)
var db = document.getElementById('db')
var routes = document.getElementById('routes')
storage = storage ? JSON.parse(storage) : {}
var recent = storage.recent || []

/**
 * Initialise the main controller
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
  var file = new File(payload)
  main.files.push(file)
}

function onFileRemoved (payload) {
  var idx = main.findFileIndex(payload.path)
  var file = main.files[idx]

  // Remove the file from the list
  main.files.splice(idx, 1)

  // If the removed file was the current one,
  // reset the current file
  if (file === main.current) {
    main.resetCurrentFile()
  }

  // If the file was in the recent files list, remove it
  idx = main.recent.indexOf(file)
  if (~idx) {
    main.recent.splice(idx, 1)
  }
}

function onFileChanged (payload) {
  var file = main.findFile(payload.path)
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

function save () {
  console.log('Saving')
  var session = main.current && main.current.session
  if (session && session.isDirty) {
    session.save(function (err, result) {
      if (err) {
        return util.handleError(err)
      }
    })
  }
}

function saveAll () {
  console.log('Saving all')
  main.getDirtyFiles().forEach(function (item) {
    item.session.save(function (err, result) {
      if (err) {
        return util.handleError(err)
      }
    })
  })
}

editor.commands.addCommands([{
  name: 'save',
  bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
  exec: save,
  readOnly: false
}, {
  name: 'saveall',
  bindKey: { win: 'Ctrl-Shift-S', mac: 'Command-Option-S' },
  exec: saveAll,
  readOnly: false
}])

Mousetrap.bind(['command+s', 'ctrl+s'], function () {
  save()
  return false
})
Mousetrap.bind(['command+alt+s', 'ctrl+shift+s'], function () {
  saveAll()
  return false
})

// On change, upload the localStorage state
main.on('change', function (e) {
  console.log('Main controller change', e)

  var state = JSON.stringify({
    current: this.current && this.current.getRelativePath(),
    recent: this.recent.map(function (item) {
      return item.getRelativePath()
    })
  })

  console.log('Saving state', state)
  window.localStorage.setItem(storageKey, state)
})

// Set initial current file
if (storage.current) {
  var initialFile = main.findFile(storage.current)
  if (initialFile) {
    main.setCurrentFile(initialFile)
  }
}

// Set the linter
setInterval(function () {
  lint(editor.getSession())
}, 1000)

// Handle custom editors' data change event
function onData (e) {
  var current = main.current
  if (current && current.session) {
    var value = e.detail.data
    current.session.edit.setValue(value)

    // Need to do this manually since although the editSession
    // 'change' event is emitted, the Undo stack is still clean.
    // Do this on the next tick though because otherwise it get overwritten
    // in main.js from the editSession 'change' event.
    setTimeout(function () {
      current.session.setDirty(true)
    }, 0)
  }
}

db.addEventListener('data', onData)
routes.addEventListener('data', onData)

module.exports = main
