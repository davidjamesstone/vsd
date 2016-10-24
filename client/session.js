var supermodels = require('supermodels.js')
var util = require('./util')
var prop = require('./prop')
var Fso = require('./fso')
var service = require('./file-service')

var sessionSchema = {
  file: Fso,
  manager: prop(Object).enumerable(false),
  isDirty: prop(Boolean).value(false),
  setDirty: function (value) {
    if (this.isDirty !== value) {
      this.isDirty = value
    }
  },
  save: function (callback) {
    service.writeFile(this.file.path, this.manager.getValue(), function (err, result) {
      if (err) {
        util.handleError(err)
        if (callback) callback(err)
      }

      // Mark clean
      this.setDirty(false)
      if (callback) callback(null, result)
    }.bind(this))
  }
}

var Session = supermodels(sessionSchema)

module.exports = Session
