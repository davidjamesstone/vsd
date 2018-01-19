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
    service.writeFile(this.file.path, this.edit.getValue())
      .then(function (result) {
        var payload = result.payload
        // Mark clean
        this.markClean()
        callback(null, payload)
      }.bind(this))
      .catch(callback)
  }
}

var Session = supermodels(sessionSchema)

module.exports = Session
