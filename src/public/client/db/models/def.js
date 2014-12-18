var base = require('./base');
var Msg = require('./msg');

//
// todo - type getters/setters casting of properties for numbers, dates etc.
//

var StringDef = function(data) {
  this.unique = data.unique;
  this.index = data.index;
  this.required = data.required;
  this.defaultValue = data.defaultValue;
  this.enumeration = data.enumeration;
  this.uppercase = data.uppercase;
  this.lowercase = data.lowercase;
  this.match = data.match;
  this.trim = data.trim;
};

var BooleanDef = function(data) {
  this.required = data.required;
  this.defaultValue = data.defaultValue;
};

var NumberDef = function(data) {
  this.unique = data.unique;
  this.index = data.index;
  this.required = data.required;
  this.defaultValue = data.defaultValue;
  this.min = data.min;
  this.max = data.max;
  this.errors = function() {
    var errors = [];
    var min = this.min;
    var max = this.max;
    var dflt = this.defaultValue;

    if (dflt < min) {
      errors.push(new Msg('The Default value should be greater than Min'));
    }
    if (dflt > max) {
      errors.push(new Msg('The Default value should be less than Max'));
    }

    if (max <= min) {
      errors.push(new Msg('Max value should be greater than Min'));
    }

    return errors;
  };
};

var DateDef = function(data) {
  this.index = data.index;
  this.unique = data.unique;
  this.required = data.required;
  this.defaultValue = data.defaultValue;
};

var NestedDocumentDef = function(data, key) {
  this.required = data.required;
  this.keys = Object.create(require('./keys'), { // require('keys') is used lazily here since 'keys' is a circular dependency
    schema: {
      value: key.keys.schema,
      writable: false,
      enumerable: false
    },
    key: {
      value: key,
      writable: false,
      enumerable: false
    }
  });
  this.keys.initialize(data.keys ? data.keys.items : []);

  this.errors = function() {
    return this.keys.errors();
  };
};

var ArrayDef = function(data, key) {
  this.define(data, key);
  this.errors = function() {
    return this.def.errors ? this.def.errors() : [];
  };
};
ArrayDef.prototype.define = function(data, key) {
  this.oftype = data.oftype;
  this.def = Object.create(def, {
    key: {
      writable: false,
      enumerable: false,
      value: key
    }
  });
  this.def.initialize(data);
};

var ForeignKeyDef = function(data) {
  this.unique = data.unique;
  this.index = data.index;
  this.required = data.required;
  this.ref = data.ref;
};

var MixedDef = function(data) {
  this.required = data.required;
};

var ObjectIdDef = function(data) {
  this.unique = data.unique;
  this.index = data.index;
  this.required = data.required;
  this.auto = data.auto;
};

var BufferDef = function(data) {
  this.required = data.required;
  this.ref = data.ref;
};

var ChildDocumentDef = function(data) {
  this.required = data.required;
  this.ref = data.ref;
};

function factoryDef(data, key) {
  var type = (data.type || data.oftype).toLowerCase();
  var def = data.def;
  switch (type) {
    case 'string':
      return new StringDef(def);
    case 'boolean':
      return new BooleanDef(def);
    case 'number':
      return new NumberDef(def);
    case 'date':
      return new DateDef(def);
    case 'nesteddocument':
      return new NestedDocumentDef(def, key);
    case 'array':
      return new ArrayDef(def, key);
    case 'foreignkey':
      return new ForeignKeyDef(def);
    case 'objectid':
      return new ObjectIdDef(def);
    case 'mixed':
      return new MixedDef(def);
    case 'buffer':
      return new BufferDef(def);
    case 'childdocument':
      return new ChildDocumentDef(def);
    default:
      throw new Error('Type not supported');
  }
}

var def = _.extend({}, base, {
  key: null,
  initialize: function(data) {
    _.extend(this, factoryDef(data, this.key));
  }
});

module.exports = def;
