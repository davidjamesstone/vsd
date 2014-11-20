function DbFinderModel(model, active) {
  this.model = model;
  this.active = active || model;
}
DbFinderModel.prototype.types = {
  model: 'model',
  schema: 'schema',
  key: 'key'
};

Object.defineProperties(DbFinderModel.prototype, {
  active: {
    get: function() {
      return this._active;
    },
    set: function(value) {
      this._active = value;
    }
  },
  activeSchema: {
    get: function() {
      if (this.active && !this.isModel) {
        return this.isSchema ? this.active : this.key.keys.schema;
      }
    }
  },
  isModel: {
    get: function() {
      return this.type === this.types.model;
    }
  },
  isSchema: {
    get: function() {
      return this.type === this.types.schema;
    }
  },
  isKey: {
    get: function() {
      return this.type === this.types.key;
    }
  },
  schema: {
    get: function() {
      return this.isSchema && this.active;
    }
  },
  key: {
    get: function() {
      return this.isKey && this.active;
    }
  },
  type: {
    get: function() {

      var active = this.active;
      
      if (!active) {
        return null;
      }
      
      if (active.type) {
        return this.types.key;
      } else if (active.schemas) {
        return this.types.model;
      } else {
        return this.types.schema;
      }
    }
  }
});


module.exports = DbFinderModel;