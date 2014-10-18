(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],2:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');

module.exports = function($stateProvider, $locationProvider, $urlRouterProvider) {

  //$locationProvider.html5Mode(true);

  // For any unmatched url, redirect to /
  $urlRouterProvider.otherwise('/');

  $stateProvider
    .state('app', {
      abstract: true,
      controller: 'AppCtrl',
      templateUrl: '/client/app/views/index.html',
      resolve: {
        fsPromise: ['$q',
          function($q) {
            var deferred = $q.defer();
            filesystem.on('connection', function() {
              deferred.resolve(filesystem);
            });
            return deferred.promise;
          }
        ],
        fsWatcherPromise: ['$q',
          function($q) {
            var deferred = $q.defer();
            watcher.on('connection', function() {
              deferred.resolve(watcher);
            });
            return deferred.promise;
          }
        ]
      }
    })
    .state('app.home', {
      url: '',
      templateUrl: '/client/app/views/app.html',
    });

  function registerDbStates($stateProvider) {

    $stateProvider
      .state('db', {
        url: '/db',
        controller: 'DbCtrl',
        templateUrl: '/html/db.html'
      })
      .state('db.model', {
        abstract: true,
        url: '/:modelName',
        controller: 'ModelCtrl',
        templateUrl: '/html/model.html',
        resolve: {
          modelPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return $http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('db.model.edit', {
        url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (db.model/)
        templateUrl: '/html/model-editor.html'
      })
      .state('db.model.schema', {
        url: '/:schemaId',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            controller: 'SchemaCtrl',
            templateUrl: '/html/schema.html'
          }
        }
      })
      .state('db.model.schema.key', {
        url: '/:keyId',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            controller: 'KeyCtrl',
            templateUrl: '/html/key.html'
          }
        }
      })
      .state('db.model.diagram', {
        url: '#diagram',
        views: {
          '@db.model': { // Target the ui-view='' in parent state 'db.model'
            //controller: 'DiagramCtrl',
            templateUrl: '/html/db-diagram.html'
          }
        }
      });

  }

  function registerApiStates($stateProvider) {

    $stateProvider
      .state('api', {
        abstract: true,
        url: '/api/:apiName',
        controller: 'ApiCtrl',
        templateUrl: '/html/api/api.html',
        resolve: {
          apiPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return window._api; //$http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('api.home', {
        url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (api/)
        templateUrl: '/html/api/api-home.html'
      })
      .state('api.diagram', {
        url: '/diagram',
        controller: 'ApiDiagramCtrl',
        templateUrl: '/html/api/diagram.html'
      })
      .state('api.controller', {
        abstract: true,
        url: '/controller'
      })
      .state('api.controller.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/html/api/controller-home.html'
          }
        }
      })
      .state('api.controller.item', {
        url: '/:controllerId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiControllerCtrl',
            templateUrl: '/html/api/controller.html'
          }
        }
      })
      .state('api.controller.item.handler', {
        url: '/:handlerId',
        views: {
          'x@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/html/api/handler.html'
          },
          'handler@api.controller.item': { // Target the ui-view='handler' in parent state 'api.controller.item',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/html/api/handler.html'
          }
        }
      })
      .state('api.route', {
        abstract: true,
        url: '/route'
      })
      .state('api.route.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/html/api/route-home.html'
          }
        }
      })
      .state('api.route.item', {
        url: '/:routeId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiRouteCtrl',
            templateUrl: '/html/api/route.html'
          }
        }
      })
      .state('api.route.item.action', {
        url: '/:actionId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiActionCtrl',
            templateUrl: '/html/api/action.html'
          }
        }
      });

  }

};

},{"../../../../shared/utils":30,"../../file-system":18,"../../file-system-watcher":17}],3:[function(require,module,exports){
var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');
var utils = require('../../../../shared/utils');

module.exports = function($scope, $state, fs, watcher, FileService, dialog) {

  var model = new AppModel({
    fs: fs,
    watcher: watcher
  });

  $scope.model = model;

  FileService.readFile('/Users/guest/Documents/tequid/vsd/package.json').then(function(res) {
    model.package = res;
  });

  FileService.readFile('/Users/guest/Documents/tequid/vsd/readme.md').then(function(res) {
    model.readme = res;
  });

  $scope.encodePath = utils.encodeString;
  $scope.decodePath = utils.decodeString;
};

},{"../../../../shared/file-system-object":29,"../../../../shared/utils":30,"../models/app":5}],4:[function(require,module,exports){
// var filesystem = require('../file-system');
// var watcher = require('../file-system-watcher');
// var utils = require('../../../shared/utils');

// Load Module Dependencies
require('../dialog');
require('../fs');

var mod = require('./module');

mod.service('FileService', [
  '$q',
  require('./services/file')
]);

mod.service('ResponseHandler', [
  'DialogService',
  require('./services/response-handler')
]);

mod.controller('AppCtrl', [
  '$scope',
  '$state',
  'fsPromise',
  'fsWatcherPromise',
  'FileService',
  'DialogService',
  require('./controllers')
]);

// ACE Global Defaults
mod.run(['uiAceConfig',
  function(uiAceConfig) {
    uiAceConfig.ace = {};
    angular.extend(uiAceConfig.ace, {
      useWrapMode: false,
      showGutter: true,
      mode: 'javascript',
      require: ['ace/ext/language_tools'],
      advanced: {
        enableSnippets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
      }
    });
  }
]);

mod.config([
  '$stateProvider',
  '$locationProvider',
  '$urlRouterProvider',
  require('./config')
]);

// mod.directive("fileEditor", [
//   function() {
//     return {
//       restrict: "A",
//       template: '<div>{{file.content}}</div>',
//       link: function(scope, element, attrs) {
//         //scope[attrs.allPhones];
//       }
//     };
//   }
// ]);

module.exports = mod;

},{"../dialog":14,"../fs":25,"./config":2,"./controllers":3,"./module":6,"./services/file":7,"./services/response-handler":8}],5:[function(require,module,exports){
function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;
}
AppModel.prototype.countFiles = function(ext) {
  return this.list.filter(function(item) {
    return !item.isDirectory && item.ext === ext;
  }).length;
};
AppModel.prototype._readDependencies = function() {
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

},{}],6:[function(require,module,exports){
module.exports = angular.module('app', [
  'ui.router',
  'ui.bootstrap',
  'ui.ace',
  'evgenyneu.markdown-preview',
  'michiKono',
  'dialog',
  'fs'
]);

},{}],7:[function(require,module,exports){
var filesystem = require('../../file-system');

module.exports = function($q) {
  return {
    readFile: function(file) {
      var deferred = $q.defer();

      filesystem.readFile(file, function(res) {
        if (res.err) {
          deferred.reject(res.err);
        } else {
          deferred.resolve(res.data);
        }
      });

      return deferred.promise;
    }
  };
};

},{"../../file-system":18}],8:[function(require,module,exports){
module.exports = function(dialog) {
  return {
    responseHandler: function(fn) {
      return function(rsp, showError) {
        showError = showError || true;
        if (rsp.err) {
          if (showError) {
            dialog.alert({
              title: 'Error',
              message: JSON.stringify(rsp.err)
            });
          }
        } else {
          fn(rsp.data);
        }
      };
    }
  };
};

},{}],9:[function(require,module,exports){
Array.prototype.move = function(oldIndex, newIndex) {

  if (isNaN(newIndex) || isNaN(oldIndex) || oldIndex < 0 || oldIndex >= this.length) {
    return;
  }

  if (newIndex < 0) {
    newIndex = this.length - 1;
  } else if (newIndex >= this.length) {
    newIndex = 0;
  }

  this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);

  return newIndex;
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

},{}],10:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };
};

},{}],11:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};

},{}],12:[function(require,module,exports){
module.exports = {
  alert: require('./alert'),
  confirm: require('./confirm'),
  prompt: require('./prompt')
};

},{"./alert":10,"./confirm":11,"./prompt":13}],13:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;
  $scope.placeholder = data.placeholder;
  $scope.input = {
    value: data.defaultValue
  };

  $scope.ok = function() {
    $modalInstance.close($scope.input.value);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};

},{}],14:[function(require,module,exports){
var mod = require('./module');
var controllers = require('./controllers');

mod.controller('AlertCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.alert
]);

mod.controller('ConfirmCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.confirm
]);

mod.controller('PromptCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  controllers.prompt
]);

mod.service('DialogService', [
  '$modal',
  require('./services/dialog')
]);

module.exports = mod;

},{"./controllers":12,"./module":15,"./services/dialog":16}],15:[function(require,module,exports){
module.exports = angular.module('dialog', [
  'ui.bootstrap'
]);

},{}],16:[function(require,module,exports){
module.exports = function($modal) {

  var service = {};

  service.alert = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/alert.html',
      controller: 'AlertCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message
          };
        }
      }
    }).result;

  };

  service.confirm = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/confirm.html',
      controller: 'ConfirmCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message
          };
        }
      }
    }).result;

  };

  service.prompt = function(data) {

    return $modal.open({
      templateUrl: '/client/dialog/views/prompt.html',
      controller: 'PromptCtrl',
      resolve: {
        data: function() {
          return {
            title: data.title,
            message: data.message,
            defaultValue: data.defaultValue,
            placeholder: data.placeholder
          };
        }
      }
    }).result;

  };

  return service;

};

},{}],17:[function(require,module,exports){
var utils = require('../../shared/utils');
var FileSystemObject = require('../../shared/file-system-object');
var emitter = require('emitter-component');

/*
 * FileSystemWatcher constructor
 */
function FileSystemWatcher() {

  this._watched = {};

  var socket = io.connect(utils.urlRoot() + '/fswatch');

  socket.on('connection', function(res) {

    var data = res.data;

    Object.keys(data).map(function(key) {
       this._watched[key] = new FileSystemObject(key, data[key].isDirectory);
    }, this);

    utils.extend(this._watched, data);

    this.emit('connection', this._watched);
    this.emit('change');

  }.bind(this));

  socket.on('add', function(res) {

    var data = res.data;
    this._watched[data.path] = data;

    this.emit('add', data);
    this.emit('change');

  }.bind(this));

  socket.on('addDir', function(res) {

    var data = res.data;
    this._watched[data.path] = data;

    this.emit('addDir', res.data);
    this.emit('change');

  }.bind(this));

  socket.on('change', function(res) {

    var data = res.data;

    this.emit('modified', data);

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
}
Object.defineProperties(FileSystemWatcher.prototype, {
  map: {
    get: function() {
      return this._watched;
    }
  },
  list: {
    get: function() {
      var list = [];
      var keys = Object.keys(this._watched);
      for (var i = 0; i < keys.length; i++) {
        list.push(this._watched[keys[i]]);
      }
      return list;
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

      return treeify(this._watched, 'path', 'dir', 'children');
    }
  }
});
emitter(FileSystemWatcher.prototype);

var FileSystemWatcher = new FileSystemWatcher();

module.exports = FileSystemWatcher;

},{"../../shared/file-system-object":29,"../../shared/utils":30,"emitter-component":1}],18:[function(require,module,exports){
var utils = require('../../shared/utils');
var emitter = require('emitter-component');;

/*
 * FileSystem constructor
 */
function FileSystem(socket) {

  socket.on('mkdir', function(response) {
    this.emit('mkdir', response);
  }.bind(this));

  socket.on('mkfile', function(response) {
    this.emit('mkfile', response);
  }.bind(this));

  socket.on('copy', function(response) {
    this.emit('copy', response);
  }.bind(this));

  socket.on('rename', function(response) {
    this.emit('rename', response);
  }.bind(this));

  socket.on('remove', function(response) {
    this.emit('remove', response);
  }.bind(this));

  socket.on('readfile', function(response) {
    this.emit('readfile', response);
  }.bind(this));

  socket.on('writefile', function(response) {
    this.emit('writefile', response);
  }.bind(this));

  socket.on('connection', function(response) {
    this.emit('connection', response);
  }.bind(this));

  this._socket = socket;

}
FileSystem.prototype.mkdir = function(path, callback) {
  this._socket.emit('mkdir', path, callback);
};
FileSystem.prototype.mkfile = function(path, callback) {
  this._socket.emit('mkfile', path, callback);
};
FileSystem.prototype.copy = function(source, destination, callback) {
  this._socket.emit('copy', source, destination, callback);
};
FileSystem.prototype.rename = function(oldPath, newPath, callback) {
  this._socket.emit('rename', oldPath, newPath, callback);
};
FileSystem.prototype.remove = function(path, callback) {
  this._socket.emit('remove', path, callback);
};
FileSystem.prototype.readFile = function(path, callback) {
  this._socket.emit('readfile', path, callback);
};
FileSystem.prototype.writeFile = function(path, contents, callback) {
  this._socket.emit('writefile', path, contents, callback);
};

emitter(FileSystem.prototype);


var socket = io.connect(utils.urlRoot() + '/fs');

var fileSystem = new FileSystem(socket);

fileSystem.on('connection', function(data) {
  console.log('fs connected' + data);
});


module.exports = fileSystem;

},{"../../shared/utils":30,"emitter-component":1}],19:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');

module.exports = function($stateProvider) {

  $stateProvider
    .state('app.fs', {
      abstract: true,
      //url: 'fs',
      // controller: 'FsCtrl',
      //templateUrl: '/client/fs/views/index.html',
    })
    .state('app.fs.finder', {
      url: '/finder',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app'
          controller: 'FsFinderCtrl',
          templateUrl: '/client/fs/views/finder.html'
        }
      }
    })
    .state('app.fs.finder.file', {
      url: '/file/:path',
      controller: 'FsFileCtrl',
      templateUrl: '/client/fs/views/file.html',
      resolve: {
        filePromise: ['$q', '$stateParams',
          function($q, $stateParams) {
            var deferred = $q.defer();
            var path = utils.decodeString($stateParams.path);
            filesystem.readFile(path, function(res) {
              deferred.resolve(res.data);
            });
            return deferred.promise;
          }
        ]
      }
    })
    .state('app.fs.dir', {
      url: '/dir/:path',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app',
          controller: 'FsDirCtrl',
          templateUrl: '/client/fs/views/dir.html',
          resolve: {
            dir: ['$stateParams',
              function($stateParams) {
                var path = utils.decodeString($stateParams.path);
                return watcher.map[path];
              }
            ]
          }
        }
      }
    });

};

},{"../../../../shared/utils":30,"../../file-system":18,"../../file-system-watcher":17}],20:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],21:[function(require,module,exports){
module.exports = function($scope, file, fileService) {
  $scope.file = file;
};

},{}],22:[function(require,module,exports){
var p = require('path');
var filesystem = require('../../file-system');
var utils = require('../../../../shared/utils');
var FinderModel = require('../models/finder');

module.exports = function($scope, $state, $log, dialog, fileService, responseHandler) {

  var expanded = Object.create(null);

  $scope.treeData = {
    showMenu: false
  };
  $scope.active = null;
  $scope.pasteBuffer = null;

  var path = $state.params.path ? decodeURIComponent($state.params.path) : null;
  var model = $scope.model;


  model.watcher.on('change', function() {
    finder.tree = model.tree;
    console.log('fs change');
    $scope.$apply();
  });

  var finder = new FinderModel(model.tree, path ? model.list.find(function(item) {
    return item.path === path;
  }) : null);

  $scope.finder = finder;

  function genericFileSystemCallback(response) {
    // notify of any errors, otherwise silent.
    // The File System Watcher will handle the state changes in the file system
    if (response.err) {
      dialog.alert({
        title: 'File System Error',
        message: JSON.stringify(response.err)
      });
    }
  }

  $scope.rightClickNode = function(e, fso) {
    console.log('RClicked ' + fso.name);
    $scope.menuX = e.pageX;
    $scope.menuY = e.pageY;
    $scope.active = fso;
    $scope.treeData.showMenu = true;
  };

  $scope.clickNode = function(fso) {


    $scope.active = fso;

    finder.active = fso;

    if (!fso.isDirectory) {
      $state.go('app.fs.finder.file', {
        path: utils.encodeString(fso.path)
      });
    }
  };
  
  $scope.delete = function(e, fso) {

    e.preventDefault();

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, genericFileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Rename ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Please enter a new name',
      defaultValue: fso.name,
      placeholder: fso.isDirectory ? 'Folder name' : 'File name'
    }).then(function(value) {
      var oldPath = fso.path;
      var newPath = p.resolve(fso.dir, value);
      filesystem.rename(oldPath, newPath, genericFileSystemCallback);
    }, function() {
      $log.info('Rename modal dismissed');
    });

  };

  $scope.mkfile = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new file',
      placeholder: 'File name',
      message: 'Please enter the new file name'
    }).then(function(value) {
      filesystem.mkfile(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make file modal dismissed');
    });

  };

  $scope.mkdir = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new folder',
      placeholder: 'Folder name',
      message: 'Please enter the new folder name'
    }).then(function(value) {
      filesystem.mkdir(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make directory modal dismissed');
    });

  };

  $scope.paste = function(e, fso) {

    e.preventDefault();

    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(e, active) {
    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer && active.isDirectory) {
      if (!pasteBuffer.fso.isDirectory) {
        return true;
      } else if (active.path.toLowerCase().indexOf(pasteBuffer.fso.path.toLowerCase()) !== 0) { // disallow pasting into self or a decendent
        return true;
      }
    }
    return false;
  };

  $scope.setPasteBuffer = function(e, fso, op) {

    e.preventDefault();

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };

  $scope.notModules = function(fso) {
    return fso.isDirectory && (fso.name === 'node_modules' || fso.name === 'bower_components') ? false : true;
  };

  $scope.nodeModules = function(fso) {
    return fso.isDirectory && fso.name === 'node_modules' ? true : false;
  };
};

},{"../../../../shared/utils":30,"../../file-system":18,"../models/finder":26,"path":31}],23:[function(require,module,exports){
module.exports = function($scope) {

};

},{}],24:[function(require,module,exports){
var p = require('path');
var filesystem = require('../../file-system');

module.exports = function($scope, $modal, $log, dialog, responseHandler) {

  var expanded = Object.create(null);

  $scope.treeData = {
    showMenu: false
  };
  $scope.active = null;
  $scope.pasteBuffer = null;

  function genericFileSystemCallback(response) {
    // notify of any errors, otherwise silent.
    // The File System Watcher will handle the state changes in the file system
    if (response.err) {
      dialog.alert({
        title: 'File System Error',
        message: JSON.stringify(response.err)
      });
    }
  }

  $scope.getClassName = function(fso) {
    var classes = ['fso'];
    classes.push(fso.isDirectory ? 'dir' : 'file');

    if (fso === $scope.active) {
      classes.push('active');
    }

    return classes.join(' ');
  };

  $scope.getIconClassName = function(fso) {
    var classes = ['fa'];

    if (fso.isDirectory) {
      classes.push($scope.isExpanded(fso) ? 'fa-folder-open' : 'fa-folder');
    } else {
      classes.push('fa-file-o');
    }

    return classes.join(' ');
  };

  $scope.isExpanded = function(fso) {
    return !!expanded[fso.path];
  };

  $scope.rightClickNode = function(e, fso) {
    console.log('RClicked ' + fso.name);
    $scope.menuX = e.pageX;
    $scope.menuY = e.pageY;
    $scope.active = fso;
    $scope.treeData.showMenu = true;
  };

  $scope.clickNode = function(e, fso) {
    e.preventDefault();
    e.stopPropagation();

    $scope.active = fso;

    if (fso.isDirectory) {
      var isExpanded = $scope.isExpanded(fso);
      if (isExpanded) {
        delete expanded[fso.path];
      } else {
        expanded[fso.path] = true;
      }
    } else {
      $scope.open(fso);
    }

    return false;
  };

  $scope.delete = function(e, fso) {

    e.preventDefault();

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, genericFileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Rename ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Please enter a new name',
      defaultValue: fso.name,
      placeholder: fso.isDirectory ? 'Folder name' : 'File name'
    }).then(function(value) {
      var oldPath = fso.path;
      var newPath = p.resolve(fso.dir, value);
      filesystem.rename(oldPath, newPath, genericFileSystemCallback);
    }, function() {
      $log.info('Rename modal dismissed');
    });

  };

  $scope.mkfile = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new file',
      placeholder: 'File name',
      message: 'Please enter the new file name'
    }).then(function(value) {
      filesystem.mkfile(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make file modal dismissed');
    });

  };

  $scope.mkdir = function(e, fso) {

    e.preventDefault();

    dialog.prompt({
      title: 'Add new folder',
      placeholder: 'Folder name',
      message: 'Please enter the new folder name'
    }).then(function(value) {
      filesystem.mkdir(p.resolve(fso.path, value), genericFileSystemCallback);
    }, function() {
      $log.info('Make directory modal dismissed');
    });

  };

  $scope.paste = function(e, fso) {

    e.preventDefault();

    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(e, active) {
    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer && active.isDirectory) {
      if (!pasteBuffer.fso.isDirectory) {
        return true;
      } else if (active.path.toLowerCase().indexOf(pasteBuffer.fso.path.toLowerCase()) !== 0) { // disallow pasting into self or a decendent
        return true;
      }
    }
    return false;
  };

  $scope.setPasteBuffer = function(e, fso, op) {

    e.preventDefault();

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };

  $scope.notModules = function(fso) {
    return fso.isDirectory && (fso.name === 'node_modules' || fso.name === 'bower_components') ? false : true;
  };

  $scope.nodeModules = function(fso) {
    return fso.isDirectory && fso.name === 'node_modules' ? true : false;
  };
};

},{"../../file-system":18,"path":31}],25:[function(require,module,exports){
var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.controller('FsCtrl', [
  '$scope',
  require('./controllers')
]);

mod.controller('FsFinderCtrl', [
  '$scope',
  '$state',
  '$log',
  'DialogService',
  'FileService',
  'ResponseHandler',
  require('./controllers/finder')
]);

mod.controller('FsFileCtrl', [
  '$scope',
  'filePromise',
  'FileService',
  require('./controllers/file')
]);

mod.controller('FsDirCtrl', [
  '$scope',
  'dir',
  'FileService',
  require('./controllers/dir')
]);

mod.controller('FsTreeCtrl', [
  '$scope',
  '$modal',
  '$log',
  'DialogService',
  'ResponseHandler',
  require('./controllers/tree')
]);

module.exports = mod;

},{"./config":19,"./controllers":23,"./controllers/dir":20,"./controllers/file":21,"./controllers/finder":22,"./controllers/tree":24,"./module":27}],26:[function(require,module,exports){
function FinderModel(tree, active) {
  this.tree = tree;
  this.active = active;
}
FinderModel.prototype._readCols = function() {

  var tree = this._tree;
  var active = this._active;
  //var activeIsDir = active.isDirectory;

  var cols = [];

  if (active) {

    var curr = active.isDirectory ? active : active.parent;
    do {
      cols.unshift(curr.children);
      curr = curr.parent;
    } while (curr);

    cols.shift();

  } else {
    cols.push(tree.children);
  }

  return cols;

};
FinderModel.prototype.getClassName = function(fso) {
  var classes = ['fso'];
  classes.push(fso.isDirectory ? 'dir' : 'file');

  if (fso === this.active) {
    classes.push('active');
  }

  return classes.join(' ');
};
FinderModel.prototype.getIconClassName = function(fso) {
  var classes = ['fa'];

  if (fso.isDirectory) {
    classes.push(this.isExpanded(fso) ? 'fa-folder-open' : 'fa-folder');
  } else {
    classes.push('fa-file-o');
  }

  return classes.join(' ');
};
FinderModel.prototype.isHighlighted = function(fso) {
  var active = this._active;
  var isHighlighted = false;

  if (fso === active) {
    return true;
  } else if (active && fso.isDirectory) {
    // check if it is an ancestor
    var r = active;
    while (r.parent) {
      if (r === fso) {
        return true;
      }
      r = r.parent;
    }
  }

  return false;
};
FinderModel.prototype.isExpanded = function(dir) {
  return this.isHighlighted(dir);
};

Object.defineProperties(FinderModel.prototype, {
  tree: {
    set: function(value) {
      this._tree = value;
      this._cols = this._readCols();
    }
  },
  active: {
    get: function() {
      return this._active;
    },
    set: function(value) {
      this._active = value;
      this._cols = this._readCols();
    }
  },
  cols: {
    get: function() {
      return this._cols;
    }
  }
});


module.exports = FinderModel;

},{}],27:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],28:[function(require,module,exports){


window.app = require('./app');


//window.fs = require('./fs');

// // **********//*
// // Shims
// // ***********
require('./array');
//
// // ***********
// // Directives
// // ***********
// require('./app/directives/negate');
// require('./app/directives/focus');
// require('./app/directives/db-diagram');
// require('./app/directives/right-click');
// // require('./app/directives/behave');
//
//
// // ***********
// // Controllers
// // ***********
//
// // dialog controllers
// require('./controllers/confirm');
// require('./controllers/alert');
// require('./controllers/prompt');
//
// // home controllers
// require('./home/controllers/home');
// require('./home/controllers/tree');
// require('./home/controllers/file');
// require('./home/controllers/finder');
//
// // db model controllers
// require('./controllers/key');
// require('./controllers/array-def');
// require('./controllers/schema');
// require('./controllers/model');
// require('./controllers/db');
//
//
// // api model controllers
// require('./api/controllers/api');
// require('./api/controllers/controller');
// require('./api/controllers/handler');
// require('./api/controllers/route');
// require('./api/controllers/action');
// require('./api/controllers/diagram');
// require('./api/controllers/add-resource');
//
//
// // main app controller
// require('./app/controllers/app');
//
//
// // ***********
// // Services
// // ***********
// require('./services/dialog');

},{"./app":4,"./array":9}],29:[function(require,module,exports){
var p = require('path');

var FileSystemObject = function(path, stat) {
  this.name = p.basename(path) || path;
  this.path = path;
  this.dir = p.dirname(path);
  this.isDirectory = typeof stat === 'boolean' ? stat : stat.isDirectory();
  this.ext = p.extname(path);
};
FileSystemObject.prototype = {
  get isFile() {
    return !this.isDirectory;
  }
};
module.exports = FileSystemObject;
},{"path":31}],30:[function(require,module,exports){
/* global dialog */

module.exports = {
  rndstr: function() {
    return (+new Date()).toString(36);
  },
  getuid: function() {
    return Math.round((Math.random() * 1e7)).toString();
  },
  getuidstr: function() {
    return (+new Date()).toString(36);
  },
  urlRoot: function() {
    var location = window.location;
    return location.protocol + '//' + location.host;
  },
  encodeString: function(str) {
    return btoa(encodeURIComponent(str));
  },
  decodeString: function(str) {
    return decodeURIComponent(atob(str));
  },
  extend: function extend(origin, add) {
    // Don't do anything if add isn't an object
    if (!add || typeof add !== 'object') {
      return origin;
    }

    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  },
  ui: {
    responseHandler: function(fn) {
      return function(rsp, showError) {
        showError = showError || true;
        if (rsp.err) {
          if (showError) {
            dialog.alert({
              title: 'Error',
              message: JSON.stringify(rsp.err)
            });
          }
        } else {
          fn(rsp.data);
        }
      };
    }
  }
};

},{}],31:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("q+64fw"))
},{"q+64fw":32}],32:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[28])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2VtaXR0ZXItY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9maWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9yZXNwb25zZS1oYW5kbGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FycmF5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9hbGVydC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvY29uZmlybS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL3Byb21wdC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL21vZHVsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvc2VydmljZXMvZGlhbG9nLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLXdhdGNoZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZmlsZS1zeXN0ZW0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29uZmlnL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2Rpci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy90cmVlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL21vZGVscy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9zaGFyZWQvZmlsZS1zeXN0ZW0tb2JqZWN0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9zaGFyZWQvdXRpbHMuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vKipcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XG59O1xuXG4vKipcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub24gPVxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgKHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdKVxuICAgIC5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgZnVuY3Rpb24gb24oKSB7XG4gICAgc2VsZi5vZmYoZXZlbnQsIG9uKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgb24uZm4gPSBmbjtcbiAgdGhpcy5vbihldmVudCwgb24pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICAvLyBhbGxcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcblxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXG4gIHZhciBjYjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xuICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge01peGVkfSAuLi5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlcikge1xuXG4gIC8vJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuXG4gIC8vIEZvciBhbnkgdW5tYXRjaGVkIHVybCwgcmVkaXJlY3QgdG8gL1xuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcCcsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgY29udHJvbGxlcjogJ0FwcEN0cmwnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2FwcC92aWV3cy9pbmRleC5odG1sJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZnNQcm9taXNlOiBbJyRxJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIGZpbGVzeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlc3lzdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBmc1dhdGNoZXJQcm9taXNlOiBbJyRxJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh3YXRjaGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5ob21lJywge1xuICAgICAgdXJsOiAnJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvYXBwLmh0bWwnLFxuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGJTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2RiJywge1xuICAgICAgICB1cmw6ICcvZGInLFxuICAgICAgICBjb250cm9sbGVyOiAnRGJDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdNb2RlbEN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgbW9kZWxQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZWRpdCcsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLWVkaXRvci5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgICB1cmw6ICcvOnNjaGVtYUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTY2hlbWFDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvc2NoZW1hLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgICB1cmw6ICcvOmtleUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdLZXlDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwva2V5Lmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcjZGlhZ3JhbScsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICAvL2NvbnRyb2xsZXI6ICdEaWFncmFtQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnYXBpJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2FwaS86YXBpTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgYXBpUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gd2luZG93Ll9hcGk7IC8vJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChhcGkvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGktaG9tZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJy9kaWFncmFtJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaURpYWdyYW1DdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvZGlhZ3JhbS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvY29udHJvbGxlcidcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86Y29udHJvbGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDb250cm9sbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtLmhhbmRsZXInLCB7XG4gICAgICAgIHVybDogJy86aGFuZGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAneEBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hhbmRsZXJAYXBpLmNvbnRyb2xsZXIuaXRlbSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdoYW5kbGVyJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaS5jb250cm9sbGVyLml0ZW0nLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9yb3V0ZSdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUtaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbS5hY3Rpb24nLCB7XG4gICAgICAgIHVybDogJy86YWN0aW9uSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUFjdGlvbkN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYWN0aW9uLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbn07XG4iLCJ2YXIgQXBwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvYXBwJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBmcywgd2F0Y2hlciwgRmlsZVNlcnZpY2UsIGRpYWxvZykge1xuXG4gIHZhciBtb2RlbCA9IG5ldyBBcHBNb2RlbCh7XG4gICAgZnM6IGZzLFxuICAgIHdhdGNoZXI6IHdhdGNoZXJcbiAgfSk7XG5cbiAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG5cbiAgRmlsZVNlcnZpY2UucmVhZEZpbGUoJy9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9wYWNrYWdlLmpzb24nKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgIG1vZGVsLnBhY2thZ2UgPSByZXM7XG4gIH0pO1xuXG4gIEZpbGVTZXJ2aWNlLnJlYWRGaWxlKCcvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2QvcmVhZG1lLm1kJykudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gIH0pO1xuXG4gICRzY29wZS5lbmNvZGVQYXRoID0gdXRpbHMuZW5jb2RlU3RyaW5nO1xuICAkc2NvcGUuZGVjb2RlUGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZztcbn07XG4iLCIvLyB2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtJyk7XG4vLyB2YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbi8vIHZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG4vLyBMb2FkIE1vZHVsZSBEZXBlbmRlbmNpZXNcbnJlcXVpcmUoJy4uL2RpYWxvZycpO1xucmVxdWlyZSgnLi4vZnMnKTtcblxudmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5zZXJ2aWNlKCdGaWxlU2VydmljZScsIFtcbiAgJyRxJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9maWxlJylcbl0pO1xuXG5tb2Quc2VydmljZSgnUmVzcG9uc2VIYW5kbGVyJywgW1xuICAnRGlhbG9nU2VydmljZScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0FwcEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJ2ZzUHJvbWlzZScsXG4gICdmc1dhdGNoZXJQcm9taXNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG4vLyBBQ0UgR2xvYmFsIERlZmF1bHRzXG5tb2QucnVuKFsndWlBY2VDb25maWcnLFxuICBmdW5jdGlvbih1aUFjZUNvbmZpZykge1xuICAgIHVpQWNlQ29uZmlnLmFjZSA9IHt9O1xuICAgIGFuZ3VsYXIuZXh0ZW5kKHVpQWNlQ29uZmlnLmFjZSwge1xuICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgc2hvd0d1dHRlcjogdHJ1ZSxcbiAgICAgIG1vZGU6ICdqYXZhc2NyaXB0JyxcbiAgICAgIHJlcXVpcmU6IFsnYWNlL2V4dC9sYW5ndWFnZV90b29scyddLFxuICAgICAgYWR2YW5jZWQ6IHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5dKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gICckbG9jYXRpb25Qcm92aWRlcicsXG4gICckdXJsUm91dGVyUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxuLy8gbW9kLmRpcmVjdGl2ZShcImZpbGVFZGl0b3JcIiwgW1xuLy8gICBmdW5jdGlvbigpIHtcbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxuLy8gICAgICAgdGVtcGxhdGU6ICc8ZGl2Pnt7ZmlsZS5jb250ZW50fX08L2Rpdj4nLFxuLy8gICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4vLyAgICAgICAgIC8vc2NvcGVbYXR0cnMuYWxsUGhvbmVzXTtcbi8vICAgICAgIH1cbi8vICAgICB9O1xuLy8gICB9XG4vLyBdKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJmdW5jdGlvbiBBcHBNb2RlbChkYXRhKSB7XG4gIGRhdGEgPSBkYXRhIHx8IHt9O1xuICB0aGlzLmZzID0gZGF0YS5mcztcbiAgdGhpcy53YXRjaGVyID0gZGF0YS53YXRjaGVyO1xufVxuQXBwTW9kZWwucHJvdG90eXBlLmNvdW50RmlsZXMgPSBmdW5jdGlvbihleHQpIHtcbiAgcmV0dXJuIHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAhaXRlbS5pc0RpcmVjdG9yeSAmJiBpdGVtLmV4dCA9PT0gZXh0O1xuICB9KS5sZW5ndGg7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLl9yZWFkRGVwZW5kZW5jaWVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBkZXBzID0gW107XG4gIHZhciBwYWNrYWdlSlNPTiA9IHRoaXMuX3BhY2thZ2VKU09OO1xuICBpZiAocGFja2FnZUpTT04pIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhY2thZ2VKU09OLmRlcGVuZGVuY2llcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IGtleXNbaV07XG4gICAgICB2YXIgdmVyc2lvbiA9IHBhY2thZ2VKU09OLmRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIGRlcHMucHVzaCh7IG5hbWU6IG5hbWUsIHZlcnNpb246IHZlcnNpb24gfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXBzO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwcE1vZGVsLnByb3RvdHlwZSwge1xuICBtYXA6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5tYXA7XG4gICAgfVxuICB9LFxuICBsaXN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci50cmVlWzBdLmNoaWxkcmVuWzBdO1xuICAgIH1cbiAgfSxcbiAganNDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuanMnKTtcbiAgICB9XG4gIH0sXG4gIGNzc0NvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvdW50RmlsZXMoJy5jc3MnKTtcbiAgICB9XG4gIH0sXG4gIGh0bWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuaHRtbCcpO1xuICAgIH1cbiAgfSxcbiAgdG90YWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0Lmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIHBhY2thZ2U6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhY2thZ2U7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9wYWNrYWdlID0gdmFsdWU7XG4gICAgICB0aGlzLl9wYWNrYWdlSlNPTiA9IEpTT04ucGFyc2UodmFsdWUuY29udGVudHMpO1xuICAgICAgdGhpcy5fZGVwZW5kZW5jaWVzID0gdGhpcy5fcmVhZERlcGVuZGVuY2llcygpO1xuICAgIH1cbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZXBlbmRlbmNpZXM7XG4gICAgfVxuICB9LFxuICByZWFkbWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWRtZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuX3JlYWRtZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwTW9kZWw7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gICd1aS5yb3V0ZXInLFxuICAndWkuYm9vdHN0cmFwJyxcbiAgJ3VpLmFjZScsXG4gICdldmdlbnluZXUubWFya2Rvd24tcHJldmlldycsXG4gICdtaWNoaUtvbm8nLFxuICAnZGlhbG9nJyxcbiAgJ2ZzJ1xuXSk7XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHEpIHtcbiAgcmV0dXJuIHtcbiAgICByZWFkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgZmlsZXN5c3RlbS5yZWFkRmlsZShmaWxlLCBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgaWYgKHJlcy5lcnIpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVzLmVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaWFsb2cpIHtcbiAgcmV0dXJuIHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG4iLCJBcnJheS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKG9sZEluZGV4LCBuZXdJbmRleCkge1xuXG4gIGlmIChpc05hTihuZXdJbmRleCkgfHwgaXNOYU4ob2xkSW5kZXgpIHx8IG9sZEluZGV4IDwgMCB8fCBvbGRJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChuZXdJbmRleCA8IDApIHtcbiAgICBuZXdJbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIGlmIChuZXdJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIG5ld0luZGV4ID0gMDtcbiAgfVxuXG4gIHRoaXMuc3BsaWNlKG5ld0luZGV4LCAwLCB0aGlzLnNwbGljZShvbGRJbmRleCwgMSlbMF0pO1xuXG4gIHJldHVybiBuZXdJbmRleDtcbn07XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xuXG4gICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5kaXNtaXNzKCdjYW5jZWwnKTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWxlcnQ6IHJlcXVpcmUoJy4vYWxlcnQnKSxcbiAgY29uZmlybTogcmVxdWlyZSgnLi9jb25maXJtJyksXG4gIHByb21wdDogcmVxdWlyZSgnLi9wcm9tcHQnKVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLnBsYWNlaG9sZGVyID0gZGF0YS5wbGFjZWhvbGRlcjtcbiAgJHNjb3BlLmlucHV0ID0ge1xuICAgIHZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZVxuICB9O1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCRzY29wZS5pbnB1dC52YWx1ZSk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsInZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xudmFyIGNvbnRyb2xsZXJzID0gcmVxdWlyZSgnLi9jb250cm9sbGVycycpO1xuXG5tb2QuY29udHJvbGxlcignQWxlcnRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5hbGVydFxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdDb25maXJtQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWxJbnN0YW5jZScsXG4gICdkYXRhJyxcbiAgY29udHJvbGxlcnMuY29uZmlybVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdQcm9tcHRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5wcm9tcHRcbl0pO1xuXG5tb2Quc2VydmljZSgnRGlhbG9nU2VydmljZScsIFtcbiAgJyRtb2RhbCcsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2RpYWxvZycsIFtcbiAgJ3VpLmJvb3RzdHJhcCdcbl0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkbW9kYWwpIHtcblxuICB2YXIgc2VydmljZSA9IHt9O1xuXG4gIHNlcnZpY2UuYWxlcnQgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9hbGVydC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdBbGVydEN0cmwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2VcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkucmVzdWx0O1xuXG4gIH07XG5cbiAgc2VydmljZS5jb25maXJtID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9kaWFsb2cvdmlld3MvY29uZmlybS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdDb25maXJtQ3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB2YXIgc29ja2V0ID0gaW8uY29ubmVjdCh1dGlscy51cmxSb290KCkgKyAnL2Zzd2F0Y2gnKTtcblxuICBzb2NrZXQub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG5cbiAgICBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdXRpbHMuZXh0ZW5kKHRoaXMuX3dhdGNoZWQsIGRhdGEpO1xuXG4gICAgdGhpcy5lbWl0KCdjb25uZWN0aW9uJywgdGhpcy5fd2F0Y2hlZCk7XG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignYWRkJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXSA9IGRhdGE7XG5cbiAgICB0aGlzLmVtaXQoJ2FkZCcsIGRhdGEpO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZERpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF0gPSBkYXRhO1xuXG4gICAgdGhpcy5lbWl0KCdhZGREaXInLCByZXMuZGF0YSk7XG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY2hhbmdlJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgdGhpcy5lbWl0KCdtb2RpZmllZCcsIGRhdGEpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCd1bmxpbmsnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgIGlmIChmc28pIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG4gICAgICB0aGlzLmVtaXQoJ3VubGluaycsIGZzbyk7XG4gICAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rRGlyJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuICAgICAgdGhpcy5lbWl0KCd1bmxpbmtEaXInLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgcmVzLmVycik7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XG59XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaWxlU3lzdGVtV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgbWFwOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93YXRjaGVkO1xuICAgIH1cbiAgfSxcbiAgbGlzdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGlzdCA9IFtdO1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBsaXN0LnB1c2godGhpcy5fd2F0Y2hlZFtrZXlzW2ldXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJlZWlmeSh0aGlzLl93YXRjaGVkLCAncGF0aCcsICdkaXInLCAnY2hpbGRyZW4nKTtcbiAgICB9XG4gIH1cbn0pO1xuZW1pdHRlcihGaWxlU3lzdGVtV2F0Y2hlci5wcm90b3R5cGUpO1xuXG52YXIgRmlsZVN5c3RlbVdhdGNoZXIgPSBuZXcgRmlsZVN5c3RlbVdhdGNoZXIoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWxlU3lzdGVtV2F0Y2hlcjtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdlbWl0dGVyLWNvbXBvbmVudCcpOztcblxuLypcbiAqIEZpbGVTeXN0ZW0gY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmlsZVN5c3RlbShzb2NrZXQpIHtcblxuICBzb2NrZXQub24oJ21rZGlyJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ21rZGlyJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignbWtmaWxlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ21rZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2NvcHknLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnY29weScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbmFtZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW5hbWUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZW1vdmUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgncmVtb3ZlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVhZGZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgncmVhZGZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCd3cml0ZWZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnd3JpdGVmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb25uZWN0aW9uJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuX3NvY2tldCA9IHNvY2tldDtcblxufVxuRmlsZVN5c3RlbS5wcm90b3R5cGUubWtkaXIgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtkaXInLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUubWtmaWxlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ21rZmlsZScsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oc291cmNlLCBkZXN0aW5hdGlvbiwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ2NvcHknLCBzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVuYW1lID0gZnVuY3Rpb24ob2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3JlbmFtZScsIG9sZFBhdGgsIG5ld1BhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVtb3ZlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3JlYWRmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLndyaXRlRmlsZSA9IGZ1bmN0aW9uKHBhdGgsIGNvbnRlbnRzLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnd3JpdGVmaWxlJywgcGF0aCwgY29udGVudHMsIGNhbGxiYWNrKTtcbn07XG5cbmVtaXR0ZXIoRmlsZVN5c3RlbS5wcm90b3R5cGUpO1xuXG5cbnZhciBzb2NrZXQgPSBpby5jb25uZWN0KHV0aWxzLnVybFJvb3QoKSArICcvZnMnKTtcblxudmFyIGZpbGVTeXN0ZW0gPSBuZXcgRmlsZVN5c3RlbShzb2NrZXQpO1xuXG5maWxlU3lzdGVtLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oZGF0YSkge1xuICBjb25zb2xlLmxvZygnZnMgY29ubmVjdGVkJyArIGRhdGEpO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmaWxlU3lzdGVtO1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAuZnMnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIC8vdXJsOiAnZnMnLFxuICAgICAgLy8gY29udHJvbGxlcjogJ0ZzQ3RybCcsXG4gICAgICAvL3RlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9pbmRleC5odG1sJyxcbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlcicsIHtcbiAgICAgIHVybDogJy9maW5kZXInLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNGaW5kZXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZmluZGVyLmh0bWwnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgdXJsOiAnL2ZpbGUvOnBhdGgnLFxuICAgICAgY29udHJvbGxlcjogJ0ZzRmlsZUN0cmwnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbGUuaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGZpbGVQcm9taXNlOiBbJyRxJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgZnVuY3Rpb24oJHEsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHZhciBwYXRoID0gdXRpbHMuZGVjb2RlU3RyaW5nKCRzdGF0ZVBhcmFtcy5wYXRoKTtcbiAgICAgICAgICAgIGZpbGVzeXN0ZW0ucmVhZEZpbGUocGF0aCwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzLmRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmRpcicsIHtcbiAgICAgIHVybDogJy9kaXIvOnBhdGgnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRGlyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2Rpci5odG1sJyxcbiAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsIGRpciwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmRpciA9IGRpcjtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgZmlsZSwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmZpbGUgPSBmaWxlO1xufTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmluZGVyTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvZmluZGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2csIGRpYWxvZywgZmlsZVNlcnZpY2UsIHJlc3BvbnNlSGFuZGxlcikge1xuXG4gIHZhciBleHBhbmRlZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgJHNjb3BlLnRyZWVEYXRhID0ge1xuICAgIHNob3dNZW51OiBmYWxzZVxuICB9O1xuICAkc2NvcGUuYWN0aXZlID0gbnVsbDtcbiAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB2YXIgcGF0aCA9ICRzdGF0ZS5wYXJhbXMucGF0aCA/IGRlY29kZVVSSUNvbXBvbmVudCgkc3RhdGUucGFyYW1zLnBhdGgpIDogbnVsbDtcbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG5cbiAgbW9kZWwud2F0Y2hlci5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgZmluZGVyLnRyZWUgPSBtb2RlbC50cmVlO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG4gIHZhciBmaW5kZXIgPSBuZXcgRmluZGVyTW9kZWwobW9kZWwudHJlZSwgcGF0aCA/IG1vZGVsLmxpc3QuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ucGF0aCA9PT0gcGF0aDtcbiAgfSkgOiBudWxsKTtcblxuICAkc2NvcGUuZmluZGVyID0gZmluZGVyO1xuXG4gIGZ1bmN0aW9uIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLnJpZ2h0Q2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgY29uc29sZS5sb2coJ1JDbGlja2VkICcgKyBmc28ubmFtZSk7XG4gICAgJHNjb3BlLm1lbnVYID0gZS5wYWdlWDtcbiAgICAkc2NvcGUubWVudVkgPSBlLnBhZ2VZO1xuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG4gICAgJHNjb3BlLnRyZWVEYXRhLnNob3dNZW51ID0gdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUuY2xpY2tOb2RlID0gZnVuY3Rpb24oZnNvKSB7XG5cblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBmaW5kZXIuYWN0aXZlID0gZnNvO1xuXG4gICAgaWYgKCFmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICRzdGF0ZS5nbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZnNvLnBhdGgpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIFxuICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdEZWxldGUgWycgKyBmc28ubmFtZSArICddLiBBcmUgeW91IHN1cmU/J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbW92ZShmc28ucGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ1JlbmFtZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2ZpbGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZpbGUnLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGaWxlIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZmlsZShwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZmlsZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2RpciA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRm9sZGVyIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZvbGRlciBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtkaXIocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY29weScpIHtcbiAgICAgIGZpbGVzeXN0ZW0uY29weShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjdXQnKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH1cblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgfTtcblxuICAkc2NvcGUuc2hvd1Bhc3RlID0gZnVuY3Rpb24oZSwgYWN0aXZlKSB7XG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyICYmIGFjdGl2ZS5pc0RpcmVjdG9yeSkge1xuICAgICAgaWYgKCFwYXN0ZUJ1ZmZlci5mc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXN0ZUJ1ZmZlci5mc28ucGF0aC50b0xvd2VyQ2FzZSgpKSAhPT0gMCkgeyAvLyBkaXNhbGxvdyBwYXN0aW5nIGludG8gc2VsZiBvciBhIGRlY2VuZGVudFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5zZXRQYXN0ZUJ1ZmZlciA9IGZ1bmN0aW9uKGUsIGZzbywgb3ApIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IHtcbiAgICAgIGZzbzogZnNvLFxuICAgICAgb3A6IG9wXG4gICAgfTtcblxuICB9O1xuXG4gICRzY29wZS5ub3RNb2R1bGVzID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuIGZzby5pc0RpcmVjdG9yeSAmJiAoZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnIHx8IGZzby5uYW1lID09PSAnYm93ZXJfY29tcG9uZW50cycpID8gZmFsc2UgOiB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5ub2RlTW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlKSB7XG5cbn07XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbCwgJGxvZywgZGlhbG9nLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICB2YXIgZXhwYW5kZWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICRzY29wZS50cmVlRGF0YSA9IHtcbiAgICBzaG93TWVudTogZmFsc2VcbiAgfTtcbiAgJHNjb3BlLmFjdGl2ZSA9IG51bGw7XG4gICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgZnVuY3Rpb24gZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayhyZXNwb25zZSkge1xuICAgIC8vIG5vdGlmeSBvZiBhbnkgZXJyb3JzLCBvdGhlcndpc2Ugc2lsZW50LlxuICAgIC8vIFRoZSBGaWxlIFN5c3RlbSBXYXRjaGVyIHdpbGwgaGFuZGxlIHRoZSBzdGF0ZSBjaGFuZ2VzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgIGlmIChyZXNwb25zZS5lcnIpIHtcbiAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZS5lcnIpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkc2NvcGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICAgIGNsYXNzZXMucHVzaChmc28uaXNEaXJlY3RvcnkgPyAnZGlyJyA6ICdmaWxlJyk7XG5cbiAgICBpZiAoZnNvID09PSAkc2NvcGUuYWN0aXZlKSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHZhciBjbGFzc2VzID0gWydmYSddO1xuXG4gICAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKCRzY29wZS5pc0V4cGFuZGVkKGZzbykgPyAnZmEtZm9sZGVyLW9wZW4nIDogJ2ZhLWZvbGRlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2ZhLWZpbGUtbycpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuaXNFeHBhbmRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiAhIWV4cGFuZGVkW2Zzby5wYXRoXTtcbiAgfTtcblxuICAkc2NvcGUucmlnaHRDbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBjb25zb2xlLmxvZygnUkNsaWNrZWQgJyArIGZzby5uYW1lKTtcbiAgICAkc2NvcGUubWVudVggPSBlLnBhZ2VYO1xuICAgICRzY29wZS5tZW51WSA9IGUucGFnZVk7XG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcbiAgICAkc2NvcGUudHJlZURhdGEuc2hvd01lbnUgPSB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5jbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICB2YXIgaXNFeHBhbmRlZCA9ICRzY29wZS5pc0V4cGFuZGVkKGZzbyk7XG4gICAgICBpZiAoaXNFeHBhbmRlZCkge1xuICAgICAgICBkZWxldGUgZXhwYW5kZWRbZnNvLnBhdGhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhwYW5kZWRbZnNvLnBhdGhdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgJHNjb3BlLm9wZW4oZnNvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdEZWxldGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucmVuYW1lID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnUmVuYW1lICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciBhIG5ldyBuYW1lJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogZnNvLm5hbWUsXG4gICAgICBwbGFjZWhvbGRlcjogZnNvLmlzRGlyZWN0b3J5ID8gJ0ZvbGRlciBuYW1lJyA6ICdGaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIG9sZFBhdGggPSBmc28ucGF0aDtcbiAgICAgIHZhciBuZXdQYXRoID0gcC5yZXNvbHZlKGZzby5kaXIsIHZhbHVlKTtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKG9sZFBhdGgsIG5ld1BhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdSZW5hbWUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtmaWxlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmaWxlJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRmlsZSBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2ZpbGUocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBkaXJlY3RvcnkgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucGFzdGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2NvcHknKSB7XG4gICAgICBmaWxlc3lzdGVtLmNvcHkocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY3V0Jykge1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIH07XG5cbiAgJHNjb3BlLnNob3dQYXN0ZSA9IGZ1bmN0aW9uKGUsIGFjdGl2ZSkge1xuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlciAmJiBhY3RpdmUuaXNEaXJlY3RvcnkpIHtcbiAgICAgIGlmICghcGFzdGVCdWZmZXIuZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGFzdGVCdWZmZXIuZnNvLnBhdGgudG9Mb3dlckNhc2UoKSkgIT09IDApIHsgLy8gZGlzYWxsb3cgcGFzdGluZyBpbnRvIHNlbGYgb3IgYSBkZWNlbmRlbnRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuc2V0UGFzdGVCdWZmZXIgPSBmdW5jdGlvbihlLCBmc28sIG9wKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSB7XG4gICAgICBmc286IGZzbyxcbiAgICAgIG9wOiBvcFxuICAgIH07XG5cbiAgfTtcblxuICAkc2NvcGUubm90TW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgKGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBmc28ubmFtZSA9PT0gJ2Jvd2VyX2NvbXBvbmVudHMnKSA/IGZhbHNlIDogdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUubm9kZU1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbn07XG4iLCJ2YXIgbW9kID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRmluZGVyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmluZGVyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaWxlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdmaWxlUHJvbWlzZScsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmlsZScpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRGlyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdkaXInLFxuICAnRmlsZVNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzVHJlZUN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsJyxcbiAgJyRsb2cnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdSZXNwb25zZUhhbmRsZXInLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3RyZWUnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwiZnVuY3Rpb24gRmluZGVyTW9kZWwodHJlZSwgYWN0aXZlKSB7XG4gIHRoaXMudHJlZSA9IHRyZWU7XG4gIHRoaXMuYWN0aXZlID0gYWN0aXZlO1xufVxuRmluZGVyTW9kZWwucHJvdG90eXBlLl9yZWFkQ29scyA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciB0cmVlID0gdGhpcy5fdHJlZTtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgLy92YXIgYWN0aXZlSXNEaXIgPSBhY3RpdmUuaXNEaXJlY3Rvcnk7XG5cbiAgdmFyIGNvbHMgPSBbXTtcblxuICBpZiAoYWN0aXZlKSB7XG5cbiAgICB2YXIgY3VyciA9IGFjdGl2ZS5pc0RpcmVjdG9yeSA/IGFjdGl2ZSA6IGFjdGl2ZS5wYXJlbnQ7XG4gICAgZG8ge1xuICAgICAgY29scy51bnNoaWZ0KGN1cnIuY2hpbGRyZW4pO1xuICAgICAgY3VyciA9IGN1cnIucGFyZW50O1xuICAgIH0gd2hpbGUgKGN1cnIpO1xuXG4gICAgY29scy5zaGlmdCgpO1xuXG4gIH0gZWxzZSB7XG4gICAgY29scy5wdXNoKHRyZWUuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIGNvbHM7XG5cbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBjbGFzc2VzID0gWydmc28nXTtcbiAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICBpZiAoZnNvID09PSB0aGlzLmFjdGl2ZSkge1xuICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmdldEljb25DbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgIGNsYXNzZXMucHVzaCh0aGlzLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3BlbicgOiAnZmEtZm9sZGVyJyk7XG4gIH0gZWxzZSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlLW8nKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICB2YXIgaXNIaWdobGlnaHRlZCA9IGZhbHNlO1xuXG4gIGlmIChmc28gPT09IGFjdGl2ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGFjdGl2ZSAmJiBmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAvLyBjaGVjayBpZiBpdCBpcyBhbiBhbmNlc3RvclxuICAgIHZhciByID0gYWN0aXZlO1xuICAgIHdoaWxlIChyLnBhcmVudCkge1xuICAgICAgaWYgKHIgPT09IGZzbykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHIgPSByLnBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihkaXIpIHtcbiAgcmV0dXJuIHRoaXMuaXNIaWdobGlnaHRlZChkaXIpO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmluZGVyTW9kZWwucHJvdG90eXBlLCB7XG4gIHRyZWU6IHtcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl90cmVlID0gdmFsdWU7XG4gICAgICB0aGlzLl9jb2xzID0gdGhpcy5fcmVhZENvbHMoKTtcbiAgICB9XG4gIH0sXG4gIGFjdGl2ZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fYWN0aXZlID0gdmFsdWU7XG4gICAgICB0aGlzLl9jb2xzID0gdGhpcy5fcmVhZENvbHMoKTtcbiAgICB9XG4gIH0sXG4gIGNvbHM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2NvbHM7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlck1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZnMnLCBbXSk7XG4iLCJcblxud2luZG93LmFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cblxuLy93aW5kb3cuZnMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbi8vIC8vICoqKioqKioqKiovLypcbi8vIC8vIFNoaW1zXG4vLyAvLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9hcnJheScpO1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBEaXJlY3RpdmVzXG4vLyAvLyAqKioqKioqKioqKlxuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9uZWdhdGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9yaWdodC1jbGljaycpO1xuLy8gLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9iZWhhdmUnKTtcbi8vXG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIENvbnRyb2xsZXJzXG4vLyAvLyAqKioqKioqKioqKlxuLy9cbi8vIC8vIGRpYWxvZyBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9jb25maXJtJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2FsZXJ0Jyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3Byb21wdCcpO1xuLy9cbi8vIC8vIGhvbWUgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9ob21lJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvdHJlZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbGUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9maW5kZXInKTtcbi8vXG4vLyAvLyBkYiBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9rZXknKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXJyYXktZGVmJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuLy9cbi8vXG4vLyAvLyBhcGkgbW9kZWwgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FwaScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvY29udHJvbGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvaGFuZGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvcm91dGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FjdGlvbicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWRkLXJlc291cmNlJyk7XG4vL1xuLy9cbi8vIC8vIG1haW4gYXBwIGNvbnRyb2xsZXJcbi8vIHJlcXVpcmUoJy4vYXBwL2NvbnRyb2xsZXJzL2FwcCcpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gU2VydmljZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL3NlcnZpY2VzL2RpYWxvZycpO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG5cbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gZnVuY3Rpb24ocGF0aCwgc3RhdCkge1xuICB0aGlzLm5hbWUgPSBwLmJhc2VuYW1lKHBhdGgpIHx8IHBhdGg7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuZGlyID0gcC5kaXJuYW1lKHBhdGgpO1xuICB0aGlzLmlzRGlyZWN0b3J5ID0gdHlwZW9mIHN0YXQgPT09ICdib29sZWFuJyA/IHN0YXQgOiBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gIHRoaXMuZXh0ID0gcC5leHRuYW1lKHBhdGgpO1xufTtcbkZpbGVTeXN0ZW1PYmplY3QucHJvdG90eXBlID0ge1xuICBnZXQgaXNGaWxlKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0RpcmVjdG9yeTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbU9iamVjdDsiLCIvKiBnbG9iYWwgZGlhbG9nICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBybmRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgZ2V0dWlkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5yYW5kb20oKSAqIDFlNykpLnRvU3RyaW5nKCk7XG4gIH0sXG4gIGdldHVpZHN0cjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xuICB9LFxuICB1cmxSb290OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG4gICAgcmV0dXJuIGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3Q7XG4gIH0sXG4gIGVuY29kZVN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIGJ0b2EoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpO1xuICB9LFxuICBkZWNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoYXRvYihzdHIpKTtcbiAgfSxcbiAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQob3JpZ2luLCBhZGQpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gICAgaWYgKCFhZGQgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBvcmlnaW47XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICAgIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luO1xuICB9LFxuICB1aToge1xuICAgIHJlc3BvbnNlSGFuZGxlcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihyc3AsIHNob3dFcnJvcikge1xuICAgICAgICBzaG93RXJyb3IgPSBzaG93RXJyb3IgfHwgdHJ1ZTtcbiAgICAgICAgaWYgKHJzcC5lcnIpIHtcbiAgICAgICAgICBpZiAoc2hvd0Vycm9yKSB7XG4gICAgICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocnNwLmVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmbihyc3AuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInErNjRmd1wiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
