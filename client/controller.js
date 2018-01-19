var path = require('path')
var util = require('./util')
var editor = require('./ace/editor')
var Session = require('./session')
var modes = require('./modes')
var makeEditSession = require('./ace/session')
var service = require('./file-service')
var supermodels = require('supermodels.js')
var Files = require('./files')
var File = require('./file')
var workspace = document.getElementById('workspace')
var db = document.getElementById('db')
var routes = document.getElementById('routes')

/**
 * Declare the controller
 */
function findFile (relativeOrAbsolute) {
  var absolutePath = path.resolve(window.UCO.path, relativeOrAbsolute)
  return this.files.find(function (item) {
    return item.path === absolutePath
  })
}

function findFileIndex (relativeOrAbsolute) {
  var file = this.findFile(relativeOrAbsolute)
  return file && this.files.indexOf(file)
}

function getDirtyFiles () {
  return this.files.filter(function (item) {
    return item.session && item.session.isDirty
  })
}

function getFileEditorClass (file) {
  if (file.name.endsWith('routes.json')) {
    return 'routes'
  } else if (file.name.endsWith('db.json')) {
    return 'db'
  }
  return 'ace'
}

function setCurrentFile (file) {
  var main = this

  if (!file) {
    main.current = null
    return workspace.setAttribute('class', 'hide')
  }

  function loadFile () {
    // Load the current file
    var editorClass = getFileEditorClass(file)
    main.current = file
    workspace.setAttribute('class', editorClass)
    switch (editorClass) {
      case 'ace':
        editor.setSession(file.session.edit)
        editor.focus()
        break
      case 'db':
        // Cache the file and only update if necessary. This ensures
        // that files can be switched without losing the editor state
        if (db.file !== file) {
          db.file = file
          db.data = file.session.edit.getValue()
        }
        db.focus()
        break
      case 'routes':
        // Cache the file and only update if necessary. This ensures
        // that files can be switched without losing the editor state
        if (routes.file !== file) {
          routes.file = file
          routes.data = file.session.edit.getValue()
        }
        routes.focus()
        break
    }
  }

  var isSessionLoaded = !!file.session

  if (isSessionLoaded) {
    loadFile()
  } else {
    service.readFile(file.path)
      .then(function (result) {
        var payload = result.payload
        var edit = makeEditSession(payload.contents, modes(file))
        var session = new Session({
          file: file,
          edit: edit
        })

        edit.on('change', function () {
          // Do on the next tick to allow
          // the UndoManager to catch up
          setTimeout(function () {
            var isClean = edit.getUndoManager().isClean()
            session.setDirty(!isClean)
          }, 0)
        })

        // Set the session on the file
        file.session = session

        loadFile()

        // Add to to the list of recent files
        if (this.recent.indexOf(file) === -1) {
          this.recent.push(file)
        }
      }.bind(this))
      .catch(function (err) {
        util.handleError(err)
      })
  }
}

function resetCurrentFile () {
  var firstLoadedRecentFile = this.recent.find(function (item) {
    return item.session
  })
  this.setCurrentFile(firstLoadedRecentFile)
}

function closeFile (file) {
  var main = this
  var recent = this.recent
  var idx = recent.indexOf(file)
  var session = file.session
  var isCurrent = file === this.current

  function close () {
    recent.splice(idx, 1)
    file.session = null
    if (isCurrent) {
      main.resetCurrentFile()
    }
  }

  if (!session) {
    recent.splice(idx, 1)
  } else {
    var dirty = session.isDirty

    if (dirty) {
      if (window.confirm('There are unsaved changes to ' +
        file.name + '. Save changes?')) {
        return session.save(function (err, data) {
          if (!err) {
            close()
          }
        })
      }
    }
    close()
  }
}

var Controller = supermodels({
  current: File,
  files: Files,
  recent: [File],
  findFile: findFile,
  findFileIndex: findFileIndex,
  closeFile: closeFile,
  setCurrentFile: setCurrentFile,
  resetCurrentFile: resetCurrentFile,
  getDirtyFiles: getDirtyFiles
})

module.exports = Controller
