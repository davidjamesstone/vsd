var utils = require('../../shared/utils');
var FileSystemObject = require('../../shared/file-system-object');
var emitter = require('emitter-component');

/*
 * FileSystemWatcher constructor
 */
function FileSystemWatcher() {

  this._watched = {};

  this._list = null;
  this._tree = null;

  var socket = io.connect(utils.urlRoot() + '/fswatch');

  socket.on('connection', function(res) {

    var data = res.data;

    Object.keys(data).map(function(key) {
      this._watched[key] = new FileSystemObject(key, data[key].isDirectory);
    }, this);

    //utils.extend(this._watched, data);

    this.emit('connection', this._watched);
    this.emit('change');

  }.bind(this));

  socket.on('add', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, false);

    this._watched[data.path] = fso;

    this.emit('add', fso);
    this.emit('change');

  }.bind(this));

  socket.on('addDir', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, true);

    this._watched[fso.path] = fso;

    this.emit('addDir', fso);
    this.emit('change');

  }.bind(this));

  socket.on('change', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    // check we got something
    if (fso) {
      this.emit('modified', fso);
    }

  }.bind(this));

  socket.on('unlink', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];
      this.emit('unlink', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('unlinkDir', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];
      this.emit('unlinkDir', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('error', function(res) {

    this.emit('error', res.err);

  }.bind(this));

  this._socket = socket;

  this.on('change', function() {
    this._list = null;
    this._tree = null;
  });

}
Object.defineProperties(FileSystemWatcher.prototype, {
  map: {
    get: function() {
      return this._watched;
    }
  },
  list: {
    get: function() {
      if (!this._list) {
        this._list = [];
        var keys = Object.keys(this._watched);
        for (var i = 0; i < keys.length; i++) {
          this._list.push(this._watched[keys[i]]);
        }
      }
      return this._list;
    }
  },
  tree: {
    get: function() {

      function treeify(list, idAttr, parentAttr, childrenAttr) {

        var treeList = [];
        var lookup = {};
        var path, obj;

        for (path in list) {

          obj = list[path];
          obj.label = obj.name;
          lookup[obj[idAttr]] = obj;
          obj[childrenAttr] = [];
        }

        for (path in list) {
          obj = list[path];
          var parent = lookup[obj[parentAttr]];
          if (parent) {
            obj.parent = parent;
            lookup[obj[parentAttr]][childrenAttr].push(obj);
          } else {
            treeList.push(obj);
          }
        }

        return treeList;

      }

      if (!this._tree) {
        this._tree = treeify(this._watched, 'path', 'dir', 'children');
      }

      return this._tree;
    }
  }
});
emitter(FileSystemWatcher.prototype);

var FileSystemWatcher = new FileSystemWatcher();

module.exports = FileSystemWatcher;
