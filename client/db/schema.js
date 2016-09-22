var supermodels = require('supermodels.js')
var Keys = require('./keys')
var prop = require('../prop')

var schema = {
  isSchema: prop(Boolean).value(true).enumerable(false).writable(false),
  id: prop(String).required().uuid(),
  name: prop(String).value('').required(),
  isVirtual: Boolean,
  description: String,
  displayName: String,
  keys: prop(Keys).value(function () { return new Keys() }),
  getChildKeys: function () {
    return this.keys.getChildKeys()
  },
  model: prop().enumerable(false).get(function () {
    return this.__parent.__parent // the model this schema belongs to
  }),
  isReferenced: function () {
    return this.model.isReferenced(this)
  },
  index: prop(Number).enumerable(false).get(function () {
    return this.model.schemas.indexOf(this)
  }),
  __validators: [
    function () {
      var idx = this.index
      var name = this.name
      if (name) {
        var dupe = this.model.schemas.find(function (item, index) {
          return index < idx && item.name === name
        })
        if (dupe) {
          return 'Duplicate schema name [' + name + ']'
        }
      }
    }
  ]
}

module.exports = supermodels(schema)
