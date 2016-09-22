var supermodels = require('supermodels.js')
var Schema = require('./schema')
var prop = require('../prop')

var model = {
  isModel: prop(Boolean).value(true).enumerable(false).writable(false),
  name: prop(String).value('Model name').required(),
  description: String,
  schemas: [Schema],
  addSchema: function () {
    var schema = new Schema({ name: 'NewSchema' })
    this.schemas.push(schema)
    return schema
  },
  removeSchema: function (schema) {
    var idx = this.schemas.indexOf(schema)
    if (~idx) {
      this.schemas.splice(idx, 1)
    }
  },
  getChildKeys: function () {
    var keys = []
    for (var i = 0; i < this.schemas.length; i++) {
      Array.prototype.push.apply(keys, this.schemas[i].getChildKeys())
    }
    return keys
  },
  references: function (schemaOrKey) {
    return this.getChildKeys().filter(function (key) {
      return schemaOrKey ? key.ref() === schemaOrKey.id : key.ref()
    })
  },
  isReferenced: function (schemaOrKey) {
    return this.references(schemaOrKey).length > 0
  }
}

var Model = supermodels(model)

module.exports = Model
