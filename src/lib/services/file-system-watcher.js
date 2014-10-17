var chokidar = require('chokidar');
var p = require('path');
var FileSystemObject = require('../../shared/file-system-object');

var root = process.cwd();

var watcher = chokidar.watch(root, {
  ignored: function(path, stat) {
    // This function gets called twice per path.
    // Once with a single argument (the path),
    // second time with two arguments (the path and the fs.Stats object of that path).
    //return stat && stat.isDirectory() ? /\/node_modules|[\/\\]\./.test(path) : false;
    if (stat) {
      // ignore node_modules' and bower_components grandchildren and also ignore
      // any dir starting with a '.' e.g. '.git'
      var isDir = stat.isDirectory();
      var fso = new FileSystemObject(path, stat);
      var parent = new FileSystemObject(fso.dir, true);
      var grandparent = new FileSystemObject(parent.dir, true);
      if (isDir) {
        return grandparent.name === 'node_modules' || grandparent.name === 'bower_components' || /[\/\\]\./.test(path);
      } else {
        return grandparent.name === 'node_modules' || grandparent.name === 'bower_components' || /[\/\\]\./.test(path);
      }
    } else {
      return false;
    }
  },
  ignoreInitial: true
});

module.exports = {
  watcher: watcher,
  get watched() {

    var items = {};
    var watched = watcher.watched;

    for (var dirpath in watched) {
      // add directory
      items[dirpath] = new FileSystemObject(dirpath, true);

      for (var i = 0; i < watched[dirpath].length; i++) {
        var name = watched[dirpath][i];
        var path = p.join(dirpath, name);
        if (!watched[path]) {
          // add file
          items[path] = new FileSystemObject(path, false);
        }
      }
    }

    return items;

  }
};
