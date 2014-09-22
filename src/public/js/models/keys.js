var base = require('./base');
var key = require('./key');
var Msg = require('./msg');

var keys = _.extend({}, base, {
  schema: null,
  key: null,
  initialize: function(data) {
    this.items = [];
    for (var i = 0; i < data.length; i++) {
      this.addKey(data[i]);
    }
  },
  createKey: function(data) {
    var o = Object.create(key, {
      keys: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
    o.initialize(data);
    return o;
  },
  addKey: function(data) {
    var o = this.createKey(data);
    this.items.push(o);
    return o;
  },
  insertKey: function(data, index) {
    var o = this.createKey(data);
    this.items.splice(index, 0, o);
    return o;
  },
  deleteKey: function(key) {
    var index = this.items.indexOf(key);
    if (~index) {
      this.items.splice(index, 1);
    }
  },
  path: function() {
    return this.key ? this.key.path() : this.schema.path();
  },
  childKeys: function() {
    var keys = [];
    Array.prototype.push.apply(keys, this.items);
    for (var i = 0; i < this.items.length; i++) {
      Array.prototype.push.apply(keys, this.items[i].childKeys());
    }
    return keys;
  },
  errors: function() {
    var errors = [];
    var keyNames = [];

    // key errors
    for (var i = 0; i < this.items.length; i++) {
      keyNames.push(this.items[i].name);
      Array.prototype.push.apply(errors, this.items[i].errors());
    }

    // ensure unique names
    var dupes = keyNames.sort().filter(function(item, index, arr) {
      return (index !== 0) && (item === arr[index - 1]);
    });

    if (dupes.length) {
      errors.push(new Msg('Duplicate key names: ' + _.uniq(dupes).join(', ')));
    }

    return errors;
  }
});

module.exports = keys;
