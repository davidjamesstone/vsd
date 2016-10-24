var supermodels = require('supermodels.js')
var util = require('./util')
var Session = require('./session')
var service = require('./file-service')
var AceSession = require('./ace/session')
var files = window.UCO.files

var sessionsSchema = {
  items: [Session],
  current: Session,
  find: function (file) {
    return this.items.find(function (item) {
      return item.file === file
    })
  },
  add: function (file) {
    if (!file || file.isDirectory) {
      return
    }

    var self = this
    var src = file.path

    service.readFile(src, function (err, result) {
      if (err) {
        return util.handleError(err)
      }

      var session = new Session({
        file: file,
        manager: new AceSession(file, result.contents)
      })

      session.manager.editSession.on('change', function () {
        setTimeout(function () {
          session.setDirty(session.manager.isDirty)
        }, 0)
      })

      self.items.push(session)
      self.current = session
    })
  },
  remove: function (session) {
    var idx = this.items.indexOf(session)
    if (~idx) {
      this.items.splice(idx, 1)
      if (session === this.current) {
        this.current = this.items[0]
      }
    }
  },
  dirty: function () {
    return this.items.filter(function (item) {
      return item.isDirty
    })
  },
  clear: function () {
    this.items.splice(0, this.items.length)
    this.current = null
  },
  saveAll: function () {
    this.dirty().forEach(function (item) {
      item.save()
    })
  }
}

var Sessions = supermodels(sessionsSchema)

var sessions = new Sessions()

// Listen for files being removed.
// Remove the session if there is one associated.
// If the current file was removed, move back to the first session.
files.on('splice', function (e) {
  var removedCurrent = false
  var current = sessions.current

  e.detail.removed.forEach(function (file) {
    var session = sessions.find(file)
    if (session) {
      sessions.remove(session)
      if (session === current) {
        removedCurrent = true
      }
    }
  })

  if (removedCurrent) {
    sessions.current = sessions.items[0]
  }
})

module.exports = sessions
