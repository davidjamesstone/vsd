var supermodels = require('supermodels.js')
var File = require('./file')
var service = require('./file-service')

var sessionSchema = {
  file: File,
  edit: Object,
  isDirty: Boolean,
  setDirty: function (value) {
    if (this.isDirty !== value) {
      this.isDirty = value
    }
  },
  markClean: function () {
    this.setDirty(false)
    this.edit.getUndoManager().markClean()
  },
  save: function (callback) {
    service.writeFile(this.file.path, this.edit.getValue(), function (err, result) {
      if (err) {
        return callback(err)
      }

      // Mark clean
      this.markClean()
      callback(null, result)
    }.bind(this))
  }
}

var Session = supermodels(sessionSchema)

module.exports = Session
