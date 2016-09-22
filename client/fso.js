var supermodels = require('supermodels.js')
var prop = require('./prop')
var path = require('path')

var fso = {
  name: prop(String).required(),
  path: prop(String).required(),
  dir: prop(String).required(),
  isFile: prop(Boolean).required(),
  isDirectory: prop(Boolean).required(),
  ext: prop(String),
  filesize: prop(String),
  stat: prop(Object),
  getRelativePath: function (to) {
    to = to || window.UCO.path
    return path.relative(to, this.path)
  },
  getRelativeDir: function (to) {
    to = to || window.UCO.path
    return path.relative(to, this.dir)
  }
}

var File = supermodels(fso)

module.exports = File