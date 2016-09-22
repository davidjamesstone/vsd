var path = require('path')
var patch = require('../patch')
var service = require('../file-service')
var util = require('../util')
var fileEditor = require('../file-editor')
var view = require('./view.html')
var copied
var $ = window.jQuery

function FileMenu (el) {
  var $el = $(el)
  $el.on('mouseleave', function () {
    hide()
  })

  function callback (err, payload) {
    if (err) {
      return util.handleError(err)
    }
  }

  function resetPasteBuffer () {
    copied = null
  }

  function setPasteBuffer (file, action) {
    hide()
    copied = {
      file: file,
      action: action
    }
  }

  function showPaste (file) {
    if (copied) {
      var sourcePath = copied.file.getRelativePath().toLowerCase()
      var sourceDir = copied.file.getRelativeDir().toLowerCase()
      var destinationDir = (file.isDirectory ? file.getRelativePath() : file.getRelativeDir()).toLowerCase()
      var isDirectory = copied.file.isDirectory

      if (!isDirectory) {
        // Always allow pasting of a file unless it's a move operation (cut) and the destination dir is the same
        return copied.action !== 'cut' || destinationDir !== sourceDir
      } else {
        // Allow pasting directories if not into self a decendent
        if (destinationDir.indexOf(sourcePath) !== 0) {
          // and  or if the operation is move (cut) the parent dir too
          return copied.action !== 'cut' || destinationDir !== sourceDir
        }
      }
    }
    return false
  }

  function rename (file) {
    hide()
    resetPasteBuffer()
    fileEditor.rename(file)
  }

  function paste (file) {
    hide()
    if (copied && copied.file) {
      var action = copied.action
      var source = copied.file
      resetPasteBuffer()

      var pastePath = file.isDirectory ? file.path : file.dir

      if (action === 'copy') {
        service.copy(source.path, path.resolve(pastePath, source.name), callback)
      } else if (action === 'cut') {
        service.rename(source.path, path.resolve(pastePath, source.name), callback)
      }
    }
  }

  function mkfile (node) {
    var file = node.fso
    hide()
    resetPasteBuffer()
    fileEditor.mkfile(file.isDirectory ? file : node.parent.fso)
  }

  function mkdir (node) {
    var file = node.fso
    hide()
    resetPasteBuffer()
    fileEditor.mkdir(file.isDirectory ? file : node.parent.fso)
  }

  function remove (file) {
    var path = file.path
    var relativePath = file.getRelativePath()
    hide()
    resetPasteBuffer()
    if (window.confirm('Delete [' + relativePath + ']')) {
      service.remove(path, callback)
    }
  }

  var model = {
    x: 0,
    y: 0,
    file: null,
    rename: rename,
    paste: paste,
    mkfile: mkfile,
    mkdir: mkdir,
    remove: remove,
    showPaste: showPaste,
    setPasteBuffer: setPasteBuffer
  }

  function hide () {
    model.file = null
    patch(el, view, model)
  }

  function show (x, y, node) {
    model.x = x
    model.y = y
    model.node = node
    model.file = node.fso
    patch(el, view, model)
  }

  this.show = show
}

var fileMenuEl = document.getElementById('file-menu')
var fileMenu = new FileMenu(fileMenuEl)

module.exports = fileMenu
