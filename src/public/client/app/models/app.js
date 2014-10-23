var p = require('path');

function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;

  this._recentFiles = [];
}
AppModel.prototype.addRecentFile = function(file) {
  var recent = this._recentFiles;
  var idx = recent.indexOf(file.path);
  if (idx !== -1) {
    recent.move(idx, 0);
  } else {
    recent.unshift(file.path);
    recent.length = Math.min(this._recentFiles.length, 20);
  }
};

AppModel.prototype.countFiles = function(ext) {
  return this.list.filter(function(item) {
    return !item.isDirectory && item.ext === ext;
  }).length;
};
AppModel.prototype.clearRecentFiles = function() {
  this._recentFiles.length = 0;
};
AppModel.prototype.getRelativePath = function(path) {
  return p.relative(this.tree.path, path);
};
AppModel.prototype._readDependencies = function() {
  var deps = [];
  var packageJSON = this._packageJSON;
  if (packageJSON) {
    var keys = Object.keys(packageJSON.dependencies);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var version = packageJSON.dependencies[name];
      deps.push({
        name: name,
        version: version
      });
    }
  }
  return deps;
};
Object.defineProperties(AppModel.prototype, {
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
  recentFiles: {
    get: function() {
      var recent = this._recentFiles;

      // clean any files that may no longer exist
      var i = recent.length;
      while (i--) {
        if (!this.map[recent[i]]) {
          recent.splice(i, 1);
        }
      }

      return recent.map(function(item) {
        return this.map[item];
      }, this);

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

module.exports = AppModel;
