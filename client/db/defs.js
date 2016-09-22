var supermodels = require('supermodels.js')
var prop = require('../prop')
var Keys = require('./keys')

var stringDef = {
  unique: Boolean,
  index: Boolean,
  required: Boolean,
  defaultValue: String,
  enumeration: String,
  casing: String,
  trim: Boolean
}

var booleanDef = {
  required: Boolean,
  defaultValue: Boolean
}

var numberDef = {
  unique: Boolean,
  index: Boolean,
  required: Boolean,
  defaultValue: Number,
  min: Number,
  max: Number,
  __validators: [
    function () {
      if (this.defaultValue < this.min) {
        return 'The Default value should be greater than Min'
      }
    },
    function () {
      if (this.defaultValue < this.min) {
        return 'The Default value should be less than Max'
      }
    },
    function () {
      if (this.max <= this.min) {
        return 'Max value should be greater than Min'
      }
    }
  ]
}

var dateDef = {
  index: Boolean,
  unique: Boolean,
  required: Boolean,
  defaultValue: Date
}

var mixedDef = {
  required: Boolean
}

var nestedDocumentDef = {
  keys: prop(Keys).value(function () { return new Keys() })
}

// Models properties are merged in the order they are defined.
// Order of 'oftype' and 'def' is important!! Same for key.
var arrayDef = {
  _oftype: prop(String).enumerable(false).writable(true),
  oftype: prop(String).required().get(function () {
    return this._oftype
  }).set(function (value) {
    // silently set to prevent an onchange. This will come after def has been redefined.
    // Consider changing the key / def structure and put type within def rather than key.
    this.__set('_oftype', value)
    this.def = {}
  }),
  _def: prop(Object).enumerable(false).writable(true),
  def: prop(Object).get(function () {
    return this._def
  }).set(function (value) {
    var def = factory(this, value)
    this._def = def
  })
}

var childDocumentDef = {
  required: Boolean,
  ref: prop(String).required()
}

var objectIdDef = {
  required: Boolean,
  unique: Boolean,
  auto: Boolean,
  index: Boolean
}

var foreignKeyDef = {
  required: Boolean,
  ref: prop(String).required()
}

var bufferDef = {
  required: Boolean
}

var StringDef = supermodels(stringDef)
var BooleanDef = supermodels(booleanDef)
var NumberDef = supermodels(numberDef)
var DateDef = supermodels(dateDef)
var BufferDef = supermodels(bufferDef)
var MixedDef = supermodels(mixedDef)
var ObjectIdDef = supermodels(objectIdDef)
var ForeignKeyDef = supermodels(foreignKeyDef)
var NestedDocumentDef = supermodels(nestedDocumentDef)
var ArrayDef = supermodels(arrayDef)
var ChildDocumentDef = supermodels(childDocumentDef)

function factory (keyOrDef, def, name) {
  var type = (keyOrDef.type || keyOrDef.oftype).toLowerCase()
  switch (type) {
    case 'string':
      return new StringDef(def)
    case 'boolean':
      return new BooleanDef(def)
    case 'number':
      return new NumberDef(def)
    case 'date':
      return new DateDef(def)
    case 'nesteddocument':
      return new NestedDocumentDef(def)
    case 'array':
      return new ArrayDef(def, name)
    case 'foreignkey':
      return new ForeignKeyDef(def)
    case 'objectid':
      return new ObjectIdDef(def)
    case 'buffer':
      return new BufferDef(def)
    case 'mixed':
      return new MixedDef(def)
    case 'childdocument':
      return new ChildDocumentDef(def)
    default:
      throw new Error('Type not supported')
  }
}

module.exports = {
  factory: factory
}
