var supermodels = require('supermodels.js')
var Session = require('./session')
var path = require('path')

var fso = {
  name: String,
  path: String,
  dir: String,
  isFile: Boolean,
  isDirectory: Boolean,
  ext: String,
  filesize: String,
  stat: Object,
  session: Session,
  getRelativePath: function (to) {
    to = to || window.UCO.path
    return path.relative(to, this.path)
  },
  getRelativeDir: function (to) {
    to = to || window.UCO.path
    return path.relative(to, this.dir)
  },
  getDisplayName: function () {
    return this.path.replace(window.UCO.path, '').slice(1)
  }
}

var File = supermodels(fso)

module.exports = File
