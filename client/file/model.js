var path = require('path')
var screenfull = require('screenfull')
var filesize = require('filesize')
var supermodels = require('supermodels.js')
var File = require('../file')
var getMode = require('../modes')
var service = require('../file-service')
var debounce = require('../debounce')
var util = require('../util')

function requestFullscreen (element) {
  if (screenfull.enabled) {
    screenfull.request(element)
  }
}

function isFullscreen (element) {
  if (screenfull.enabled) {
    screenfull.request(element)
  }
}

// function onCloseClick (e, element) {
//   if (screenfull.element === element) {
//     screenfull.exit(element)
//   } else {
//     window.$(this.el).remove()
//     recent.remove(this.file.getRelativePath())
//     window.history.back()
//   }
// }

function getType (e) {
  var file = this.file
  if (!file) {
    return
  }

  if (file.name.endsWith('routes.json')) {
    return 'routes'
  } else if (file.name.endsWith('db.json')) {
    return 'db'
  }

  return 'ace'
}

function getRelativePath (absolutePath) {
  return path.relative(window.UCO.path, absolutePath)
}

function getFilesize () {
  if (!this.stat) {
    return ''
  }
  return filesize(this.stat.size, { bits: true, round: 0 })
}

function onContentChange (e) {
  var self = this
  var file = this.file

  service.writeFile(file.path, e.detail.contents)
    .then(function (result) {
      // Update the stat
      var payload = result.payload
      self.stat = payload.stat
    })
    .catch(util.handleError)
}

var model = {
  el: Object,
  file: File,
  stat: Object,
  contents: String,
  service: Object,
  getType: getType,
  getMode: getMode,
  onContentChange: debounce(onContentChange, 500),
  getRelativePath: getRelativePath,
  isFullscreen: isFullscreen,
  // onCloseClick: onCloseClick,
  requestFullscreen: requestFullscreen,
  getFilesize: getFilesize
}

var Model = supermodels(model)

module.exports = Model
