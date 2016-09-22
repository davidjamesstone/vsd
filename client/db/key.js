var supermodels = require('supermodels.js')
var prop = require('../prop')

// Models properties are merged in the order they are defined.
// Order of 'type' and 'def' is important!! Same for ArrayDef.

var key = {
  isKey: prop(Boolean).value(true).enumerable(false).writable(false),
  id: prop(String).required().uuid(),
  name: prop(String).required(),
  description: String,
  displayName: String,
  _type: prop(String).enumerable(false).writable(true),
  type: prop(String).required().get(function () {
    return this._type
  }).set(function (value) {
    // silently set to prevent an onchange. This will come after def has been redefined.
    // Consider changing the key / def structure and put type within def rather than key.
    this.__set('_type', value)
    this.def = value === 'Array' ? { oftype: 'String' } : {}
  }),
  isString: prop(Boolean).get(function () { return this.type === 'String' }).enumerable(false),
  isBoolean: prop(Boolean).get(function () { return this.type === 'Boolean' }).enumerable(false),
  isArray: prop(Boolean).get(function () { return this.type === 'Array' }).enumerable(false),
  isObject: prop(Boolean).get(function () { return this.type === 'Object' }).enumerable(false),
  isNumber: prop(Boolean).get(function () { return this.type === 'Number' }).enumerable(false),
  isDate: prop(Boolean).get(function () { return this.type === 'Date' }).enumerable(false),
  isNestedDocument: prop(Boolean).get(function () { return this.type === 'NestedDocument' }).enumerable(false),
  isNestedDocumentArray: prop(Boolean).get(function () { return this.isArray && this.def.oftype === 'NestedDocument' }).enumerable(false),
  isChildDocumentArray: prop(Boolean).get(function () { return this.isArray && this.def.oftype === 'ChildDocument' }).enumerable(false),
  isNested: prop(Boolean).get(function () { return this.isNestedDocument || this.isNestedDocumentArray }).enumerable(false),
  _def: prop(Object).enumerable(false).writable(true),
  def: prop(Object).get(function () {
    return this._def
  }).set(function (value) {
    var def = require('./defs').factory(this, value)
    this._def = def
  }),
  ref: function () {
    if (this.type === 'ForeignKey' || this.type === 'ChildDocument') {
      return this.def.ref
    } else if (this.type === 'Array' && this.def.oftype === 'ForeignKey') {
      return this.def.def.ref
    } else if (this.type === 'Array' && this.def.oftype === 'ChildDocument') {
      return this.def.def.ref
    } else {
      return
    }
  },
  getBreadcrumb: function () {
    return this.__ancestors.filter(function (item) {
      return item.isSchema || item.isKey
    }).reverse().concat(this)
  },
  getPath: function () {
    return this.getBreadcrumb().map(function (item) {
      return item.name
    }).join('.')
  },
  owner: prop().enumerable(false).get(function () {
    return this.keys.__parent // the schema or nested key this key belongs to
  }),
  keys: prop().enumerable(false).get(function () {
    return this.__parent.__parent // the keys this key belongs to
  }),
  index: prop(Number).enumerable(false).get(function () {
    return this.keys.items.indexOf(this)
  }),
  getChildKeys: function () {
    if (this.isNestedDocument) {
      return this.def.keys.getChildKeys()
    } else if (this.isNestedDocumentArray) {
      return this.def.def.keys.getChildKeys()
    }
    return null
  },
  getRef: function () {
    if (this.type === 'ForeignKey' || this.type === 'ChildDocument') {
      return this.def.ref
    } else if (this.type === 'Array' && this.def.oftype === 'ForeignKey') {
      return this.def.def.ref
    } else if (this.type === 'Array' && this.def.oftype === 'ChildDocument') {
      return this.def.def.ref
    } else {
      return
    }
  },
  __validators: [
    function () {
      var idx = this.index
      var name = this.name
      if (name) {
        var dupe = this.keys.items.find(function (item, index) {
          return index < idx && item.name === name
        })
        if (dupe) {
          return 'Duplicate key name [' + name + ']'
        }
      }
    }
  ]
}

module.exports = supermodels(key)
