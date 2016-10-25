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

function setCurrentFile (file) {
  var main = this

  if (!file) {
    main.current = null
    return editor.container.classList.add('hide')
  }

  function loadFile () {
    // Load the current file
    main.current = file
    editor.container.classList.remove('hide')
    editor.setSession(file.session.edit)
    editor.focus()
  }

  var isSessionLoaded = !!file.session

  if (isSessionLoaded) {
    loadFile()
  } else {
    service.readFile(file.path, function (err, result) {
      if (err) {
        return util.handleError(err)
      }

      var edit = makeEditSession(result.contents, modes(file))
      var session = new Session({
        file: file,
        edit: edit
      })

      edit.on('change', function () {
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
