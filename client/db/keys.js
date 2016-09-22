var supermodels = require('supermodels.js')
var Key = require('./key')
var prop = require('../prop')

function move (arr, oldIndex, newIndex) {
  if (isNaN(newIndex) || isNaN(oldIndex) || oldIndex < 0 || oldIndex >= arr.length) {
    return
  }

  if (newIndex < 0) {
    newIndex = arr.length - 1
  } else if (newIndex >= arr.length) {
    newIndex = 0
  }

  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0])

  return newIndex
}

var keys = {
  isKeys: prop(Boolean).value(true).enumerable(false).writable(false),
  items: [Key],
  addKey: function () {
    var key = new Key({
      name: 'Keyname',
      type: 'String'
    })
    this.items.push(key)
    return key
  },
  removeKey: function (key) {
    var idx = this.items.indexOf(key)
    if (~idx) {
      this.items.splice(idx, 1)
    }
  },
  insertKey: function (index) {
    var key = new Key({
      name: 'Keyname',
      type: 'String'
    })
    this.items.splice(index, 0, key)
    return key
  },
  deleteKey: function (key) {
    var idx = this.items.indexOf(key)
    if (~idx) {
      return this.items.splice(idx, 1)
    }
  },
  moveKeyUp: function (key) {
    var items = this.items
    var index = items.indexOf(key)
    move(items, index, --index)
  },
  moveKeyDown: function (key) {
    var items = key.keys.items
    var index = items.indexOf(key)
    move(items, index, ++index)
  },
  getChildKeys: function () {
    var keys = []
    Array.prototype.push.apply(keys, this.items)
    for (var i = 0; i < this.items.length; i++) {
      Array.prototype.push.apply(keys, this.items[i].getChildKeys())
    }
    return keys
  }
}

module.exports = supermodels(keys)
