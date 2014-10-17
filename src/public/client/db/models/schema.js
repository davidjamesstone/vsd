var base = require('./base');
var keys = require('./keys');
var Msg = require('./msg');

var schema = _.extend({}, base, {
  db: null,
  initialize: function(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.installed = data.installed || false;
    this.keys = Object.create(keys, {
      schema: {
        writable: false,
        enumerable: false,
        value: this
      }
    });

    this.keys.initialize((data.keys && data.keys.items) || {} );
  },
  path: function() {
    return [this.db, this];
  },
  dotPath: function() {
    return this.path().map(function(p) { return p.name; }).join('.');
  },
  slashPath: function() {
    return this.path().map(function(p) { return p.name; }).join('/');
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Schema name is required'));
    }

    Array.prototype.push.apply(errors, this.keys.errors());

    return errors;
  },
  schemaReferences: function(schema) {
    return this.db.schemaReferences(this);
  },
  isSchemaReferenced: function(schema) {
    return this.db.isSchemaReferenced(this);
  },
  childKeys: function() {
    return this.keys.childKeys();
  },
  findKey: function(path) {
    return this.childKeys().filter(function() {
      return item.path() === path;
    });
  }
});

module.exports = schema;
