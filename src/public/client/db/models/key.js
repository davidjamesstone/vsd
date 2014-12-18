var utils = require('vsd-utils');
var base = require('./base');
var def = require('./def');
var Msg = require('./msg');

var key = _.extend({}, base, {
  keys: null,
  initialize: function(data) {
    this.id = data.id || utils.getuid();
    this.name = data.name;
    this.description = data.description;
    this.define(data);
  },
  define: function(data) {
    this.type = data.type;
    this.def = Object.create(def, {
      key: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
    this.def.initialize(data);
  },
  typeAsString: function() {
    var names = _.object(_.map(this.keys.schema.db.schemas, function(schema) {
      return [schema.id, schema.name];
    }));

    var def = this.def;
    var t = this.type;
    if (t === 'Array') {
      var ofT = def.oftype;
      if (ofT === 'ForeignKey') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]';
      } else if (ofT === 'ChildDocument') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]';
      } else {
        return '[' + ofT + ']';
      }
    } else if (t === 'ForeignKey') {
      return t + '<' + names[def.ref] + '>';
    } else {
      return t;
    }
  },
  ref: function() {
    if (this.type === 'ForeignKey' || this.type === 'ChildDocument') {
      return this.def.ref;
    } else if (this.type === 'Array' && this.def.oftype === 'ForeignKey') {
      return this.def.def.ref;
    } else if (this.type === 'Array' && this.def.oftype === 'ChildDocument') {
      return this.def.def.ref;
    } else {
      return;
    }
  },
  isNestedType: function() {
    return this.type == 'NestedDocument';
  },
  isNestedTypeArray: function() {
    return this.isArray() && this.def.oftype === 'NestedDocument';
  },
  isNested: function() {
    return this.isNestedType() || this.isNestedTypeArray();
  },
  isArray: function() {
    return this.type === 'Array';
  },
  path: function() {
    var path = [this];
    var args = [0, 0].concat(this.keys.path());
    Array.prototype.splice.apply(path, args);
    return path;
  },
  dotPath: function() {
    return this.path().map(function(p) { return p.name; }).join('.');
  },
  slashPath: function() {
    return this.path().map(function(p) { return p.name; }).join('/');
  },
  childKeys: function() {
    if (this.isNestedType()) {
      return this.def.keys.childKeys();
    } else if (this.isNestedTypeArray()) {
      return this.def.def.keys.childKeys();
    }
    return null;
  },
  siblings: function() {
    var self = this;
    return this.keys.items.filter(function(item) {
      return item !== self;
    });
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Name is required'));
    }

    var def = this.def;
    return def.errors ? errors.concat(def.errors()) : errors;
  },
  isRequired: function() {
    return this.isArray() ? this.def.def.required : this.def.required; 
  }
});

module.exports = key;
