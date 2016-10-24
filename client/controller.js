var path = require('path')
var util = require('./util')
var editor = require('./ace/editor')
var makeEditSession = require('./ace/edit-session')
var service = require('./file-service')
var supermodels = require('supermodels.js')
var EditSession = window.ace.require('ace/edit_session').EditSession
var File = require('./fso')

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

function setCurrentFile (file) {
  var isSessionLoaded = file.session instanceof EditSession

  if (isSessionLoaded) {
    this.file = file
    editor.setSession(file.session)
    editor.focus()
  } else {
    service.readFile(file.path, function (err, result) {
      if (err) {
        return util.handleError(err)
      }

      file.session = makeEditSession(result.contents, file)

      this.file = file
      editor.setSession(file.session)
      editor.focus()
      this.recent.push(file)
      // var session = new Session({
      //   file: file,
      //   manager: new AceSession(file, result.contents)
      // })

      // session.manager.editSession.on('change', function () {
      //   setTimeout(function () {
      //     session.setDirty(session.manager.isDirty)
      //   }, 0)
      // })

      // self.items.push(session)
      // self.current = session
    }.bind(this))
  }
}

var Controller = supermodels({
  file: File,
  files: [File],
  recent: [File],
  findFile: findFile,
  findFileIndex: findFileIndex,
  setCurrentFile: setCurrentFile
})

module.exports = Controller
