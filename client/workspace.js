/* global $ */
var path = require('path')
var recent = require('./recent')
var util = require('./util')
var files = window.UCO.files

$(function () {
  var $workspace = $('section.content')

  function loadFile () {
    var target = window.location.hash.slice(1)

    if (!target) {
      return
    }

    var absolutePath = path.resolve(window.UCO.path, target)
    var relativePath = path.relative(window.UCO.path, absolutePath)

    var file = files.find(function (item) {
      return item.isFile && item.path === absolutePath
    })

    if (!file) {
      return util.info('File [' + relativePath + '] not found',
        'File not found')
    }

    var el = document.getElementById(relativePath)

    if (!el) {
      el = $('<vsd-file id="' + relativePath + '">').attr('src', absolutePath).get(0)
      $workspace.prepend(el)
      recent.insert(relativePath)
    }

    el.scrollIntoView()
    window.scrollBy(0, -60)
    setTimeout(function () {
      el.focus()
    }, 200)
  }

  $(window).on('hashchange', function (e) {
    e.preventDefault()
    loadFile()
  })

  if (window.location.hash) {
    loadFile()
  }

  files.on('splice', function (e) {
    var removedCurrent = false
    var current = window.location.hash.slice(1)
    e.detail.removed.forEach(function (item) {
      var relativePath = item.getRelativePath()
      var el = document.getElementById(relativePath)
      if (el) {
        $(el).remove()
      }

      if (relativePath === current) {
        removedCurrent = true
      }
    })

    if (removedCurrent) {
      window.history.back()
    }
  })
})
