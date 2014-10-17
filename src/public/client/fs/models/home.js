function HomeModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;
}
HomeModel.prototype.countFiles = function(ext) {
  return this.list.filter(function(item) {
    return !item.isDirectory && item.ext === ext;
  }).length;
};
HomeModel.prototype._readDependencies = function() {
  var deps = [];
  var packageJSON = this._packageJSON;
  if (packageJSON) {
    var keys = Object.keys(packageJSON.dependencies);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var version = packageJSON.dependencies[name];
      deps.push({ name: name, version: version });
    }
  }
  return deps;
};
Object.defineProperties(HomeModel.prototype, {
  map: {
    get: function() {
      return this.watcher.map;
    }
  },
  list: {
    get: function() {
      return this.watcher.list;
    }
  },
  tree: {
    get: function() {
      return this.watcher.tree[0].children[0];
    }
  },
  jsCount: {
    get: function() {
      return this.countFiles('.js');
    }
  },
  cssCount: {
    get: function() {
      return this.countFiles('.css');
    }
  },
  htmlCount: {
    get: function() {
      return this.countFiles('.html');
    }
  },
  totalCount: {
    get: function() {
      return this.list.length;
    }
  },
  package: {
    get: function() {
      return this._package;
    },
    set: function(value) {
      this._package = value;
      this._packageJSON = JSON.parse(value.contents);
      this._dependencies = this._readDependencies();
    }
  },
  dependencies: {
    get: function() {
      return this._dependencies;
    }
  },
  readme: {
    get: function() {
      return this._readme;
    },
    set: function(value) {
      this._readme = value;
    }
  }
});

module.exports = HomeModel;
