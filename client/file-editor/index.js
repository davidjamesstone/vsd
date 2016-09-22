var path = require('path')
var util = require('../util')
var patch = require('../patch')
var view = require('./view.html')
var service = require('../file-service')
var files = window.UCO.files

function FileEditor (el) {
  var model = {
    mode: null,
    file: null,
    rename: function ($event, file) {
      $event.preventDefault()
      var oldPath = file.path
      var name = $event.target.rename.value.trim()
      var newPath = path.resolve(file.dir, name)

      service.rename(oldPath, newPath, function (err, result) {
        if (err) {
          return util.handleError(err)
        }
        hide()
      })
    },
    mkfile: function ($event) {
      $event.preventDefault()
      var dir = this.file.path
      var name = $event.target.filename.value.trim()
      var absolutePath = path.resolve(dir, name.trim())

      service.mkfile(absolutePath, function (err, payload) {
        if (err) {
          return util.handleError(err)
        }
        hide()

        var file = files.create(payload)
        files.push(file)

        window.location.hash = file.getRelativePath()
      })
    },
    mkdir: function ($event) {
      $event.preventDefault()
      var dir = this.file.path
      var name = $event.target.dirname.value.trim()
      var absolutePath = path.resolve(dir, name.trim())

      service.mkdir(absolutePath, function (err, payload) {
        if (err) {
          return util.handleError(err)
        }
        hide()
      })
    }
  }

  function hide () {
    model.file = null
    model.mode = null
    patch(el, view, model, hide)
  }

  function show (file, mode) {
    model.file = file
    model.mode = mode
    patch(el, view, model, hide)
    var input = el.querySelector('input')
    input.focus()
  }

  this.show = show
}
FileEditor.prototype.rename = function (file) {
  this.show(file, 'rename')
}
FileEditor.prototype.mkfile = function (dir) {
  this.show(dir, 'mkfile')
}
FileEditor.prototype.mkdir = function (dir) {
  this.show(dir, 'mkdir')
}

var fileEditorEl = document.getElementById('file-editor')
var fileEditor = new FileEditor(fileEditorEl)

module.exports = fileEditor
