var base = require('./base');
var schema = require('./schema');
var Msg = require('./msg');

var staticTypes = 'String Boolean Number Date NestedDocument Array ForeignKey ObjectId Mixed Buffer'.split(' ');
var childDocumentType = ['ChildDocument'];

var db = _.extend({}, base, {
  id: null,
  name: null,
  description: null,
  schemas: [],
  initialize: function(data) {

    data = (data && Array.isArray(data.schemas)) ? data : {
      schemas: []
    };

    this.id = data.id;
    this.name = data.name;
    this.schemas = [];
    if (data.schemas) {
      for (var i = 0; i < data.schemas.length; i++) {
        this.addSchema(data.schemas[i]);
      }
    }
  },
  addSchema: function(data) {
    var s = this.createSchema();
    s.initialize(data);
    this.schemas.push(s);
    return s;
  },
  insertSchema: function(schema) {
    this.schemas.push(schema);
    return schema;
  },
  createSchema: function() {
    return Object.create(schema, {
      db: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
  },
  getSchemaById: function(id) {
    return _.findWhere(this.schemas, {
      id: id
    });
  },
  getSchemaByName: function(name) {
    return this.schemas.find(function(item) {
      return item.name === name;
    });
  },
  removeSchema: function(schema) {
    this.schemas.splice(this.schemas.indexOf(schema), 1);
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Model name is required'));
    }

    // get schema names
    var schemaNames = this.schemas.map(function(schema) {
      return schema.name;
    });

    // ensure unique schema names
    var dupes = schemaNames.sort().filter(function(item, index, arr) {
      return (index !== 0) && (item === arr[index - 1]);
    });

    if (dupes.length) {
      errors.push(new Msg('Duplicate schema names: ' + _.uniq(dupes).join(', ')));
    }

    // bubble any individual schema errors
    for (var i = 0; i < this.schemas.length; i++) {
      Array.prototype.push.apply(errors, this.schemas[i].errors());
    }

    return errors;
  },
  isValid: function() {
    return this.errors().length === 0;
  },
  validateSchemaName: function(name, ignoreSchema) {
    if (!name) return new Msg('Name cannot be blank. Please supply a name.');
    var dupes = _.find(this.schemas, function(s) {
      return s !== ignoreSchema && s.name.toLowerCase() === name.toLowerCase();
    });
    return dupes ? new Msg('Duplicate Schema name. Please supply a unique name.') : true;
  },
  schemaReferences: function(schema) {
    return this.childKeys().filter(function(key) {
      return schema ? key.ref() === schema.id : key.ref();
    });
  },
  isSchemaReferenced: function(schema) {
    return this.schemaReferences(schema).length > 0;
  },
  staticTypes: staticTypes,
  childDocumentType: childDocumentType,
  allTypes: [].concat(staticTypes, childDocumentType),
  notInstalledSchemas: function() {
    return _.filter(this.schemas, function(schema) {
      return !schema.installed;
    });
  },
  installedSchemas: function() {
    return _.filter(this.schemas, function(schema) {
      return schema.installed;
    });
  },
  availableDocumentRefs: function() {
    return _.map(this.installedSchemas(), function(schema) {
      return {
        id: schema.id,
        name: schema.name
      };
    });
  },
  availableChildDocumentRefs: function() {
    return _.map(this.notInstalledSchemas(), function(schema) {
      return {
        id: schema.id,
        name: schema.name
      };
    });
  },
  childKeys: function() {
    var keys = [];
    for (var i = 0; i < this.schemas.length; i++) {
      Array.prototype.push.apply(keys, this.schemas[i].keys.childKeys());
    }
    return keys;
  },
  findByPath: function(path) {
    var parts = path.split('/');

    if (parts.length === 2) {
      return this.getSchemaByName(parts[1]);
    } else {
      return this.childKeys().find(function(item) {
        return item.slashPath() === path;
      });
    }
  },
  getKeyById: function(id) {
    return this.childKeys().find(function(item) {
      return item.id === id;
    });
  },
  toJson: function() {
    return JSON.stringify(this, function(key, value) {
      if (this.propertyIsEnumerable(key) === false) {
        return;
      }
      return value;
    }, 2);
  }
});

module.exports = window.db = db;
