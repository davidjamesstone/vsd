/* global $ */
var path = require('path')
var recent = require('./recent')
var sessions = require('./sessions')
var editor = require('./ace/editor')
var util = require('./util')
var files = window.UCO.files

$(function () {
  var $workspace = $('section.content')

  $(document.body).on('click', 'a.file', function (e) {
    e.preventDefault()
    var target = this.hash.slice(1)
    if (!target) {
      return
    }

    var absolutePath = path.resolve(window.UCO.path, target)

    var file = files.find(function (item) {
      return item.isFile && item.path === absolutePath
    })

    if (!file) {
      return
    }

    var session = sessions.find(file)
    if (session) {
      sessions.current = session
    } else {
      sessions.add(file)
    }

    recent.insert(file.getRelativePath())
    // loadFile()
  })

  editor.commands.addCommands([{
    name: 'save',
    bindKey: {
      win: 'Ctrl-S',
      mac: 'Command-S'
    },
    exec: function (editor) {
      var current = sessions.current
      if (current && current.isDirty) {
        current.save(function (err, result) {
          if (!err) {
            current.manager.markClean()
          }
        })
      }
    },
    readOnly: false
  }, {
    name: 'saveall',
    bindKey: {
      win: 'Ctrl-Shift-S',
      mac: 'Command-Option-S'
    },
    exec: function (editor) {
      sessions.saveAll()
    },
    readOnly: false
  }])

  // When the current session changes, update the editor
  sessions.on('change', function (e) {
    if (e.path === 'current') {
      var current = e.detail.newValue
      if (current) {
        editor.setSession(current.manager.editSession)
        editor.focus()
      }
    }

    if (sessions.current) {
      editor.container.classList.remove('hide')
    } else {
      editor.container.classList.add('hide')
    }
  })

  // if (window.location.hash) {
  //   loadFile()
  // }

  // files.on('splice', function (e) {
  //   var removedCurrent = false
  //   var current = window.location.hash.slice(1)
  //   e.detail.removed.forEach(function (item) {
  //     var relativePath = item.getRelativePath()
  //     var el = document.getElementById(relativePath)
  //     if (el) {
  //       $(el).remove()
  //     }

  //     if (relativePath === current) {
  //       removedCurrent = true
  //     }
  //   })

  //   if (removedCurrent) {
  //     window.history.back()
  //   }
  // })
})
