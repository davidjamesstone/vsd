var supermodels = require('supermodels.js')
var prop = require('./prop')
var projectPath = window.UCO.path
var files = window.UCO.files
var storageKey = 'vsd-' + projectPath

function findFile (relativePath) {
  return files.find(function (item) {
    return item.getRelativePath() === relativePath
  })
}

var schema = {
  items: [{
    ref: prop(String).required(),
    getDisplayName: function () {
      return this.ref.replace(window.UCO.path, '')
    }
  }],
  exists: function (ref) {
    return this.items.find(function (item) {
      return item.ref === ref
    })
  },
  insert: function (ref) {
    if (ref && !this.exists(ref)) {
      var item = this.items.create()
      item.ref = ref
      this.items.unshift(item)
    }
  },
  remove: function (ref) {
    var item = this.exists(ref)
    if (item) {
      this.items.splice(this.items.indexOf(item), 1)
    }
  }
}

var Model = supermodels(schema)
var storage = window.localStorage.getItem(storageKey)
var recent = storage ? JSON.parse(storage) : {}

// Filter out any deleted files
if (recent.items) {
  recent.items = recent.items.filter(function (item) {
    return findFile(item.ref)
  })
}

var model = new Model(recent)

model.on('change', function () {
  window.localStorage.setItem(storageKey, JSON.stringify(this))
})

files.on('splice', function (e) {
  e.detail.removed.forEach(function (item) {
    var relativePath = item.getRelativePath()
    model.remove(relativePath)
  })
})

module.exports = model
