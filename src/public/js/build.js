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

},{"../../../../shared/utils":32,"../../file-system":19,"../../file-system-watcher":18}],3:[function(require,module,exports){
var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');
var utils = require('../../../../shared/utils');

module.exports = function($scope, $state, fs, watcher, fileService, dialog, colorService) {

  var model = new AppModel({
    fs: fs,
    watcher: watcher
  });

  $scope.model = model;

  // Listen out for changes to the file system
  watcher.on('change', function() {
    $scope.model = model;
    console.log('fs change');
    $scope.$apply();
  });


  fileService.readFile('/Users/guest/Documents/tequid/vsd/package.json').then(function(res) {
    model.package = res;
  });

  fileService.readFile('/Users/guest/Documents/tequid/vsd/readme.md').then(function(res) {
    model.readme = res;
  });

  $scope.onSearchFormSubmit = function() {
    $state.go('app.fs.search', { q: searchForm.q.value });
  };

  $scope.fileUrl = function(file) {
    return $state.href('app.fs.finder.file', {
      path: utils.encodeString(file.path)
    });
  };

  $scope.dirUrl = function(dir) {
    return $state.href('app.fs.finder', {
      path: utils.encodeString(dir.path)
    });
  };

  // Color function used to create deterministic colors from a string
  $scope.color = function(item) {
    var str = (item instanceof FileSystemObject) ? item.ext : item;
    return str ? '#' + colorService(str).hex() : '';
  };
  $scope.colorText = function(item) {
    var str = (item instanceof FileSystemObject) ? item.ext : item;
    return str ? '#' + colorService(str).readable().hex() : '';
  };

  $scope.encodePath = utils.encodeString;
  $scope.decodePath = utils.decodeString;
};

},{"../../../../shared/file-system-object":31,"../../../../shared/utils":32,"../models/app":5}],4:[function(require,module,exports){
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

mod.service('ColorService', [
  require('./services/color')
]);

mod.controller('AppCtrl', [
  '$scope',
  '$state',
  'fsPromise',
  'fsWatcherPromise',
  'FileService',
  'DialogService',
  'ColorService',
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

mod.config( ['$compileProvider', function($compileProvider){
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob):|data:image\/)/);
}]);

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

},{"../dialog":15,"../fs":27,"./config":2,"./controllers":3,"./module":6,"./services/color":7,"./services/file":8,"./services/response-handler":9}],5:[function(require,module,exports){
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

},{"path":33}],6:[function(require,module,exports){
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
/**
 * colorTag v 0.1
 * by Ryan Quinn
 * https://github.com/mazondo/colorTag
 *
 * colorTag is used to generate a random color from a given string
 * The goal is to create deterministic, usable colors for the purpose
 * of adding color coding to tags
*/

function colorTag(tagString) {
	// were we given a string to work with?  If not, then just return false
	if (!tagString) {
		return false;
	}

	/**
	 * Return sthe luminosity difference between 2 rgb values
	 * anything greater than 5 is considered readable
	 */
	function luminosityDiff(rgb1, rgb2) {
  		var l1 = 0.2126 + Math.pow(rgb1.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb1.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb1.b/255, 2.2),
  			l2 = 0.2126 + Math.pow(rgb2.r/255, 2.2) +
  				 0.7152 * Math.pow(rgb2.g/255, 2.2) +
  				 0.0722 * Math.pow(rgb2.b/255, 2.2);

  		if (l1 > l2) {
  			return (l1 + 0.05) / (l2 + 0.05);
  		} else {
  			return (l2 + 0.05) / (l1 + 0.05);
  		}
	}

	/**
	 * This is the definition of a color for our purposes.  We've abstracted it out
	 * so that we can return new color objects when required
	*/
	function color(hexCode) {
		//were we given a hashtag?  remove it.
		var hexCode = hexCode.replace("#", "");
		return {
			/**
			 * Returns a simple hex string including hashtag
			 * of the color
			 */
			hex: function() {
				return hexCode;
			},

			/**
			 * Returns an RGB breakdown of the color provided
			 */
			rgb: function() {
				var bigint = parseInt(hexCode, 16);
				return {
					r: (bigint >> 16) & 255,
					g: (bigint >> 8) & 255,
					b: bigint & 255
				}
			},

			/**
			 * Given a list of hex color codes
			 * Determine which is the most readable
			 * We use the luminosity equation presented here:
			 * http://www.splitbrain.org/blog/2008-09/18-calculating_color_contrast_with_php
			 */
			readable: function() {
				// this is meant to be simplistic, if you don't give me more than
				// one color to work with, you're getting white or black.
				var comparators = (arguments.length > 1) ? arguments : ["#E1E1E1", "#464646"],
					originalRGB = this.rgb(),
					brightest = { difference: 0 };

				for (var i = 0; i < comparators.length; i++) {
					//calculate the difference between the original color and the one we were given
					var c = color(comparators[i]),
						l = luminosityDiff(originalRGB, c.rgb());

					// if it's brighter than the current brightest, store it to compare against later ones
					if (l > brightest.difference) {
						brightest = {
							difference: l,
							color: c
						}
					}
				}

				// return the brighest color
				return brightest.color;
			}

		}
	}

	// create the hex for the random string
    var hash = 0;
    for (var i = 0; i < tagString.length; i++) {
        hash = tagString.charCodeAt(i) + ((hash << 5) - hash);
    }
    hex = ""
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        hex += ('00' + value.toString(16)).substr(-2);
    }

    return color(hex);
}


module.exports = function() {
  return colorTag;
};

},{}],8:[function(require,module,exports){
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

},{"../../file-system":19}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };
};

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
module.exports = {
  alert: require('./alert'),
  confirm: require('./confirm'),
  prompt: require('./prompt')
};

},{"./alert":11,"./confirm":12,"./prompt":14}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./controllers":13,"./module":16,"./services/dialog":17}],16:[function(require,module,exports){
module.exports = angular.module('dialog', [
  'ui.bootstrap'
]);

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"../../shared/file-system-object":31,"../../shared/utils":32,"emitter-component":1}],19:[function(require,module,exports){
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

},{"../../shared/utils":32,"emitter-component":1}],20:[function(require,module,exports){
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
      url: '/finder?path',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app'
          controller: 'FsFinderCtrl',
          templateUrl: '/client/fs/views/finder.html'
        }
      }
    })
    .state('app.fs.finder.file', {
      url: '/file',
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
    .state('app.fs.search', {
      url: '/search?q',
      views: {
        '@app': { // Target the ui-view='' in parent state 'app',
          controller: 'FsSearchCtrl',
          templateUrl: '/client/fs/views/search.html',
          // resolve: {
          //   dir: ['$stateParams',
          //     function($stateParams) {
          //       var path = utils.decodeString($stateParams.path);
          //       return watcher.map[path];
          //     }
          //   ]
          // }
        }
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

},{"../../../../shared/utils":32,"../../file-system":19,"../../file-system-watcher":18}],21:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],22:[function(require,module,exports){
module.exports = function($scope, file, fileService) {
  var isUtf8 = !(file.contents instanceof ArrayBuffer);

  $scope.file = file;

  var model = $scope.model;

  var fso = model.map[file.path];

  // ensure the finder is set the the right fso
  $scope.finder.active = fso;

  model.addRecentFile(fso);

  var viewer;

  $scope.viewer = 'ace';

  $scope.aceOptions = function() {
    var mode;

    var modes = {
      ".js": "ace/mode/javascript",
      ".css": "ace/mode/css",
      ".html": "ace/mode/html",
      ".htm": "ace/mode/html",
      ".ejs": "ace/mode/html",
      ".json": "ace/mode/json",
      ".md": "ace/mode/markdown",
      ".coffee": "ace/mode/coffee",
      ".jade": "ace/mode/jade",
      ".php": "ace/mode/php",
      ".py": "ace/mode/python",
      ".scss": "ace/mode/sass",
      ".txt": "ace/mode/text",
      ".typescript": "ace/mode/typescript",
      ".xml": "ace/mode/xml"
    };

    mode = modes[file.ext];

    if (mode) {
      mode = mode.substr(9);
    }

    return {
      mode: mode
    };
  };


  function imgUrl() {
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array( file.contents );
    var blob = new Blob( [ arrayBufferView ], { type: "image/" + file.ext.substr(1) } );
    var urlCreator = window.URL || window.webkitURL;
    var url = urlCreator.createObjectURL( blob );
    return url;
  }

  if (!isUtf8) {

    $scope.viewer = '';

    switch (file.ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.ico':
      $scope.viewer = 'img';
      $scope.imgUrl = imgUrl();
      break;
    default:

    }

  }


};

},{}],23:[function(require,module,exports){
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

  var path = $state.params.path ? utils.decodeString($state.params.path) : null;
  var model = $scope.model;

  var finder = new FinderModel(path ? model.list.find(function(item) {
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

},{"../../../../shared/utils":32,"../../file-system":19,"../models/finder":28,"path":33}],24:[function(require,module,exports){
module.exports = function($scope) {

};

},{}],25:[function(require,module,exports){
module.exports = function($scope, $state) {
  $scope.model.q = $state.params.q;
};

},{}],26:[function(require,module,exports){
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

},{"../../file-system":19,"path":33}],27:[function(require,module,exports){
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

mod.controller('FsSearchCtrl', [
  '$scope',
  '$state',
  require('./controllers/search')
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

},{"./config":20,"./controllers":24,"./controllers/dir":21,"./controllers/file":22,"./controllers/finder":23,"./controllers/search":25,"./controllers/tree":26,"./module":29}],28:[function(require,module,exports){
function FinderModel(active) {
  // this.tree = tree;
  this.active = active;
}
FinderModel.prototype._readCols = function(tree) {

  //var tree = this._tree;
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
    classes.push(this.isExpanded(fso) ? 'fa-folder-open-o' : 'fa-folder-o');
  } else {
    classes.push('fa-file');
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
FinderModel.prototype.cols = function(tree) {
  return this._readCols(tree);
};


Object.defineProperties(FinderModel.prototype, {
  active: {
    get: function() {
      return this._active;
    },
    set: function(value) {
      this._active = value;
    }
  }
});


module.exports = FinderModel;

},{}],29:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],30:[function(require,module,exports){


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

},{"./app":4,"./array":10}],31:[function(require,module,exports){
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
},{"path":33}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
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
},{"q+64fw":34}],34:[function(require,module,exports){
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

},{}]},{},[30])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2VtaXR0ZXItY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9jb2xvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcnJheS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvYWxlcnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2NvbmZpcm0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS13YXRjaGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9kaXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvc2VhcmNoLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3RyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDak1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFGQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8qKlxuICogRXhwb3NlIGBFbWl0dGVyYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICBpZiAob2JqKSByZXR1cm4gbWl4aW4ob2JqKTtcbn07XG5cbi8qKlxuICogTWl4aW4gdGhlIGVtaXR0ZXIgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIEVtaXR0ZXIucHJvdG90eXBlKSB7XG4gICAgb2JqW2tleV0gPSBFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XG5FbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICAodGhpcy5fY2FsbGJhY2tzW2V2ZW50XSA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW10pXG4gICAgLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICBmdW5jdGlvbiBvbigpIHtcbiAgICBzZWxmLm9mZihldmVudCwgb24pO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBvbi5mbiA9IGZuO1xuICB0aGlzLm9uKGV2ZW50LCBvbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIC8vIGFsbFxuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBzcGVjaWZpYyBldmVudFxuICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xuXG4gIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcbiAgaWYgKDEgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcbiAgdmFyIGNiO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIGNiID0gY2FsbGJhY2tzW2ldO1xuICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XG4gICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpXG4gICAgLCBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuXG4gIGlmIChjYWxsYmFja3MpIHtcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICByZXR1cm4gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICByZXR1cm4gISEgdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcbn07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyKSB7XG5cbiAgLy8kbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG5cbiAgLy8gRm9yIGFueSB1bm1hdGNoZWQgdXJsLCByZWRpcmVjdCB0byAvXG4gICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcblxuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYXBwJywge1xuICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICBjb250cm9sbGVyOiAnQXBwQ3RybCcsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2luZGV4Lmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBmc1Byb21pc2U6IFsnJHEnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRxKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgZmlsZXN5c3RlbS5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGZpbGVzeXN0ZW0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF0sXG4gICAgICAgIGZzV2F0Y2hlclByb21pc2U6IFsnJHEnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRxKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgd2F0Y2hlci5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHdhdGNoZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmhvbWUnLCB7XG4gICAgICB1cmw6ICcnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2FwcC92aWV3cy9hcHAuaHRtbCcsXG4gICAgfSk7XG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXJEYlN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnZGInLCB7XG4gICAgICAgIHVybDogJy9kYicsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdEYkN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbCcsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy86bW9kZWxOYW1lJyxcbiAgICAgICAgY29udHJvbGxlcjogJ01vZGVsQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBtb2RlbFByb21pc2U6IFsnJGh0dHAnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnLycgKyAkc3RhdGVQYXJhbXMubW9kZWxOYW1lICsgJy5qc29uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChkYi5tb2RlbC8pXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwtZWRpdG9yLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEnLCB7XG4gICAgICAgIHVybDogJy86c2NoZW1hSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgICAgY29udHJvbGxlcjogJ1NjaGVtYUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9zY2hlbWEuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLnNjaGVtYS5rZXknLCB7XG4gICAgICAgIHVybDogJy86a2V5SWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgICAgY29udHJvbGxlcjogJ0tleUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9rZXkuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJyNkaWFncmFtJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIC8vY29udHJvbGxlcjogJ0RpYWdyYW1DdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvZGItZGlhZ3JhbS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyQXBpU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlclxuICAgICAgLnN0YXRlKCdhcGknLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvYXBpLzphcGlOYW1lJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGkuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBhcGlQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiB3aW5kb3cuX2FwaTsgLy8kaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsIC8vIERlZmF1bHQuIFdpbGwgYmUgdXNlZCBpbiBwbGFjZSBvZiBhYnN0cmFjdCBwYXJlbnQgaW4gdGhlIGNhc2Ugb2YgaGl0dGluZyB0aGUgaW5kZXggKGFwaS8pXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FwaS1ob21lLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuZGlhZ3JhbScsIHtcbiAgICAgICAgdXJsOiAnL2RpYWdyYW0nLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpRGlhZ3JhbUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9kaWFncmFtLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlcicsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9jb250cm9sbGVyJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIuaG9tZScsIHtcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2NvbnRyb2xsZXItaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIuaXRlbScsIHtcbiAgICAgICAgdXJsOiAnLzpjb250cm9sbGVySWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUNvbnRyb2xsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2NvbnRyb2xsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0uaGFuZGxlcicsIHtcbiAgICAgICAgdXJsOiAnLzpoYW5kbGVySWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICd4QGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlIYW5kbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9oYW5kbGVyLmh0bWwnXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaGFuZGxlckBhcGkuY29udHJvbGxlci5pdGVtJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9J2hhbmRsZXInIGluIHBhcmVudCBzdGF0ZSAnYXBpLmNvbnRyb2xsZXIuaXRlbScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL3JvdXRlJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9yb3V0ZS1ob21lLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbScsIHtcbiAgICAgICAgdXJsOiAnLzpyb3V0ZUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlSb3V0ZUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5pdGVtLmFjdGlvbicsIHtcbiAgICAgICAgdXJsOiAnLzphY3Rpb25JZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpQWN0aW9uQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hY3Rpb24uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxufTtcbiIsInZhciBBcHBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9hcHAnKTtcbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsIGZzLCB3YXRjaGVyLCBmaWxlU2VydmljZSwgZGlhbG9nLCBjb2xvclNlcnZpY2UpIHtcblxuICB2YXIgbW9kZWwgPSBuZXcgQXBwTW9kZWwoe1xuICAgIGZzOiBmcyxcbiAgICB3YXRjaGVyOiB3YXRjaGVyXG4gIH0pO1xuXG4gICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuXG4gIC8vIExpc3RlbiBvdXQgZm9yIGNoYW5nZXMgdG8gdGhlIGZpbGUgc3lzdGVtXG4gIHdhdGNoZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG5cbiAgZmlsZVNlcnZpY2UucmVhZEZpbGUoJy9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9wYWNrYWdlLmpzb24nKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgIG1vZGVsLnBhY2thZ2UgPSByZXM7XG4gIH0pO1xuXG4gIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKCcvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2QvcmVhZG1lLm1kJykudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gIH0pO1xuXG4gICRzY29wZS5vblNlYXJjaEZvcm1TdWJtaXQgPSBmdW5jdGlvbigpIHtcbiAgICAkc3RhdGUuZ28oJ2FwcC5mcy5zZWFyY2gnLCB7IHE6IHNlYXJjaEZvcm0ucS52YWx1ZSB9KTtcbiAgfTtcblxuICAkc2NvcGUuZmlsZVVybCA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgIHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmaWxlLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmRpclVybCA9IGZ1bmN0aW9uKGRpcikge1xuICAgIHJldHVybiAkc3RhdGUuaHJlZignYXBwLmZzLmZpbmRlcicsIHtcbiAgICAgIHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhkaXIucGF0aClcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb2xvciBmdW5jdGlvbiB1c2VkIHRvIGNyZWF0ZSBkZXRlcm1pbmlzdGljIGNvbG9ycyBmcm9tIGEgc3RyaW5nXG4gICRzY29wZS5jb2xvciA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgc3RyID0gKGl0ZW0gaW5zdGFuY2VvZiBGaWxlU3lzdGVtT2JqZWN0KSA/IGl0ZW0uZXh0IDogaXRlbTtcbiAgICByZXR1cm4gc3RyID8gJyMnICsgY29sb3JTZXJ2aWNlKHN0cikuaGV4KCkgOiAnJztcbiAgfTtcbiAgJHNjb3BlLmNvbG9yVGV4dCA9IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgc3RyID0gKGl0ZW0gaW5zdGFuY2VvZiBGaWxlU3lzdGVtT2JqZWN0KSA/IGl0ZW0uZXh0IDogaXRlbTtcbiAgICByZXR1cm4gc3RyID8gJyMnICsgY29sb3JTZXJ2aWNlKHN0cikucmVhZGFibGUoKS5oZXgoKSA6ICcnO1xuICB9O1xuXG4gICRzY29wZS5lbmNvZGVQYXRoID0gdXRpbHMuZW5jb2RlU3RyaW5nO1xuICAkc2NvcGUuZGVjb2RlUGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZztcbn07XG4iLCIvLyB2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtJyk7XG4vLyB2YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbi8vIHZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG4vLyBMb2FkIE1vZHVsZSBEZXBlbmRlbmNpZXNcbnJlcXVpcmUoJy4uL2RpYWxvZycpO1xucmVxdWlyZSgnLi4vZnMnKTtcblxudmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5zZXJ2aWNlKCdGaWxlU2VydmljZScsIFtcbiAgJyRxJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9maWxlJylcbl0pO1xuXG5tb2Quc2VydmljZSgnUmVzcG9uc2VIYW5kbGVyJywgW1xuICAnRGlhbG9nU2VydmljZScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlcicpXG5dKTtcblxubW9kLnNlcnZpY2UoJ0NvbG9yU2VydmljZScsIFtcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9jb2xvcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0FwcEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJ2ZzUHJvbWlzZScsXG4gICdmc1dhdGNoZXJQcm9taXNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnQ29sb3JTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxuLy8gQUNFIEdsb2JhbCBEZWZhdWx0c1xubW9kLnJ1bihbJ3VpQWNlQ29uZmlnJyxcbiAgZnVuY3Rpb24odWlBY2VDb25maWcpIHtcbiAgICB1aUFjZUNvbmZpZy5hY2UgPSB7fTtcbiAgICBhbmd1bGFyLmV4dGVuZCh1aUFjZUNvbmZpZy5hY2UsIHtcbiAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgIHNob3dHdXR0ZXI6IHRydWUsXG4gICAgICBtb2RlOiAnamF2YXNjcmlwdCcsXG4gICAgICByZXF1aXJlOiBbJ2FjZS9leHQvbGFuZ3VhZ2VfdG9vbHMnXSxcbiAgICAgIGFkdmFuY2VkOiB7XG4gICAgICAgIGVuYWJsZVNuaXBwZXRzOiB0cnVlLFxuICAgICAgICBlbmFibGVCYXNpY0F1dG9jb21wbGV0aW9uOiB0cnVlLFxuICAgICAgICBlbmFibGVMaXZlQXV0b2NvbXBsZXRpb246IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXSk7XG5cbm1vZC5jb25maWcoW1xuICAnJHN0YXRlUHJvdmlkZXInLFxuICAnJGxvY2F0aW9uUHJvdmlkZXInLFxuICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgcmVxdWlyZSgnLi9jb25maWcnKVxuXSk7XG5cbm1vZC5jb25maWcoIFsnJGNvbXBpbGVQcm92aWRlcicsIGZ1bmN0aW9uKCRjb21waWxlUHJvdmlkZXIpe1xuICAkY29tcGlsZVByb3ZpZGVyLmltZ1NyY1Nhbml0aXphdGlvbldoaXRlbGlzdCgvXlxccyooKGh0dHBzP3xmdHB8ZmlsZXxibG9iKTp8ZGF0YTppbWFnZVxcLykvKTtcbn1dKTtcblxuLy8gbW9kLmRpcmVjdGl2ZShcImZpbGVFZGl0b3JcIiwgW1xuLy8gICBmdW5jdGlvbigpIHtcbi8vICAgICByZXR1cm4ge1xuLy8gICAgICAgcmVzdHJpY3Q6IFwiQVwiLFxuLy8gICAgICAgdGVtcGxhdGU6ICc8ZGl2Pnt7ZmlsZS5jb250ZW50fX08L2Rpdj4nLFxuLy8gICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG4vLyAgICAgICAgIC8vc2NvcGVbYXR0cnMuYWxsUGhvbmVzXTtcbi8vICAgICAgIH1cbi8vICAgICB9O1xuLy8gICB9XG4vLyBdKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxuZnVuY3Rpb24gQXBwTW9kZWwoZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5mcyA9IGRhdGEuZnM7XG4gIHRoaXMud2F0Y2hlciA9IGRhdGEud2F0Y2hlcjtcblxuICB0aGlzLl9yZWNlbnRGaWxlcyA9IFtdO1xufVxuQXBwTW9kZWwucHJvdG90eXBlLmFkZFJlY2VudEZpbGUgPSBmdW5jdGlvbihmaWxlKSB7XG4gIHZhciByZWNlbnQgPSB0aGlzLl9yZWNlbnRGaWxlcztcbiAgdmFyIGlkeCA9IHJlY2VudC5pbmRleE9mKGZpbGUucGF0aCk7XG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgcmVjZW50Lm1vdmUoaWR4LCAwKTtcbiAgfSBlbHNlIHtcbiAgICByZWNlbnQudW5zaGlmdChmaWxlLnBhdGgpO1xuICAgIHJlY2VudC5sZW5ndGggPSBNYXRoLm1pbih0aGlzLl9yZWNlbnRGaWxlcy5sZW5ndGgsIDIwKTtcbiAgfVxufTtcblxuQXBwTW9kZWwucHJvdG90eXBlLmNvdW50RmlsZXMgPSBmdW5jdGlvbihleHQpIHtcbiAgcmV0dXJuIHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAhaXRlbS5pc0RpcmVjdG9yeSAmJiBpdGVtLmV4dCA9PT0gZXh0O1xuICB9KS5sZW5ndGg7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmNsZWFyUmVjZW50RmlsZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fcmVjZW50RmlsZXMubGVuZ3RoID0gMDtcbn07XG5BcHBNb2RlbC5wcm90b3R5cGUuZ2V0UmVsYXRpdmVQYXRoID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcC5yZWxhdGl2ZSh0aGlzLnRyZWUucGF0aCwgcGF0aCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLl9yZWFkRGVwZW5kZW5jaWVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBkZXBzID0gW107XG4gIHZhciBwYWNrYWdlSlNPTiA9IHRoaXMuX3BhY2thZ2VKU09OO1xuICBpZiAocGFja2FnZUpTT04pIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHBhY2thZ2VKU09OLmRlcGVuZGVuY2llcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IGtleXNbaV07XG4gICAgICB2YXIgdmVyc2lvbiA9IHBhY2thZ2VKU09OLmRlcGVuZGVuY2llc1tuYW1lXTtcbiAgICAgIGRlcHMucHVzaCh7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIHZlcnNpb246IHZlcnNpb25cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVwcztcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhBcHBNb2RlbC5wcm90b3R5cGUsIHtcbiAgbWFwOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubWFwO1xuICAgIH1cbiAgfSxcbiAgbGlzdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy53YXRjaGVyLmxpc3Q7XG4gICAgfVxuICB9LFxuICB0cmVlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIudHJlZVswXS5jaGlsZHJlblswXTtcbiAgICB9XG4gIH0sXG4gIHJlY2VudEZpbGVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByZWNlbnQgPSB0aGlzLl9yZWNlbnRGaWxlcztcblxuICAgICAgLy8gY2xlYW4gYW55IGZpbGVzIHRoYXQgbWF5IG5vIGxvbmdlciBleGlzdFxuICAgICAgdmFyIGkgPSByZWNlbnQubGVuZ3RoO1xuICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICBpZiAoIXRoaXMubWFwW3JlY2VudFtpXV0pIHtcbiAgICAgICAgICByZWNlbnQuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZWNlbnQubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwW2l0ZW1dO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICB9XG4gIH0sXG4gIGpzQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmpzJyk7XG4gICAgfVxuICB9LFxuICBjc3NDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuY3NzJyk7XG4gICAgfVxuICB9LFxuICBodG1sQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmh0bWwnKTtcbiAgICB9XG4gIH0sXG4gIHRvdGFsQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdC5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYWNrYWdlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFja2FnZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fcGFja2FnZUpTT04gPSBKU09OLnBhcnNlKHZhbHVlLmNvbnRlbnRzKTtcbiAgICAgIHRoaXMuX2RlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXMoKTtcbiAgICB9XG4gIH0sXG4gIGRlcGVuZGVuY2llczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGVwZW5kZW5jaWVzO1xuICAgIH1cbiAgfSxcbiAgcmVhZG1lOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkbWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9yZWFkbWUgPSB2YWx1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcE1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICAndWkucm91dGVyJyxcbiAgJ3VpLmJvb3RzdHJhcCcsXG4gICd1aS5hY2UnLFxuICAnZXZnZW55bmV1Lm1hcmtkb3duLXByZXZpZXcnLFxuICAnbWljaGlLb25vJyxcbiAgJ2RpYWxvZycsXG4gICdmcydcbl0pO1xuIiwiLyoqXG4gKiBjb2xvclRhZyB2IDAuMVxuICogYnkgUnlhbiBRdWlublxuICogaHR0cHM6Ly9naXRodWIuY29tL21hem9uZG8vY29sb3JUYWdcbiAqXG4gKiBjb2xvclRhZyBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgcmFuZG9tIGNvbG9yIGZyb20gYSBnaXZlbiBzdHJpbmdcbiAqIFRoZSBnb2FsIGlzIHRvIGNyZWF0ZSBkZXRlcm1pbmlzdGljLCB1c2FibGUgY29sb3JzIGZvciB0aGUgcHVycG9zZVxuICogb2YgYWRkaW5nIGNvbG9yIGNvZGluZyB0byB0YWdzXG4qL1xuXG5mdW5jdGlvbiBjb2xvclRhZyh0YWdTdHJpbmcpIHtcblx0Ly8gd2VyZSB3ZSBnaXZlbiBhIHN0cmluZyB0byB3b3JrIHdpdGg/ICBJZiBub3QsIHRoZW4ganVzdCByZXR1cm4gZmFsc2Vcblx0aWYgKCF0YWdTdHJpbmcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIHN0aGUgbHVtaW5vc2l0eSBkaWZmZXJlbmNlIGJldHdlZW4gMiByZ2IgdmFsdWVzXG5cdCAqIGFueXRoaW5nIGdyZWF0ZXIgdGhhbiA1IGlzIGNvbnNpZGVyZWQgcmVhZGFibGVcblx0ICovXG5cdGZ1bmN0aW9uIGx1bWlub3NpdHlEaWZmKHJnYjEsIHJnYjIpIHtcbiAgXHRcdHZhciBsMSA9IDAuMjEyNiArIE1hdGgucG93KHJnYjEuci8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjcxNTIgKiBNYXRoLnBvdyhyZ2IxLmcvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC4wNzIyICogTWF0aC5wb3cocmdiMS5iLzI1NSwgMi4yKSxcbiAgXHRcdFx0bDIgPSAwLjIxMjYgKyBNYXRoLnBvdyhyZ2IyLnIvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC43MTUyICogTWF0aC5wb3cocmdiMi5nLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuMDcyMiAqIE1hdGgucG93KHJnYjIuYi8yNTUsIDIuMik7XG5cbiAgXHRcdGlmIChsMSA+IGwyKSB7XG4gIFx0XHRcdHJldHVybiAobDEgKyAwLjA1KSAvIChsMiArIDAuMDUpO1xuICBcdFx0fSBlbHNlIHtcbiAgXHRcdFx0cmV0dXJuIChsMiArIDAuMDUpIC8gKGwxICsgMC4wNSk7XG4gIFx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogVGhpcyBpcyB0aGUgZGVmaW5pdGlvbiBvZiBhIGNvbG9yIGZvciBvdXIgcHVycG9zZXMuICBXZSd2ZSBhYnN0cmFjdGVkIGl0IG91dFxuXHQgKiBzbyB0aGF0IHdlIGNhbiByZXR1cm4gbmV3IGNvbG9yIG9iamVjdHMgd2hlbiByZXF1aXJlZFxuXHQqL1xuXHRmdW5jdGlvbiBjb2xvcihoZXhDb2RlKSB7XG5cdFx0Ly93ZXJlIHdlIGdpdmVuIGEgaGFzaHRhZz8gIHJlbW92ZSBpdC5cblx0XHR2YXIgaGV4Q29kZSA9IGhleENvZGUucmVwbGFjZShcIiNcIiwgXCJcIik7XG5cdFx0cmV0dXJuIHtcblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhIHNpbXBsZSBoZXggc3RyaW5nIGluY2x1ZGluZyBoYXNodGFnXG5cdFx0XHQgKiBvZiB0aGUgY29sb3Jcblx0XHRcdCAqL1xuXHRcdFx0aGV4OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGhleENvZGU7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgYW4gUkdCIGJyZWFrZG93biBvZiB0aGUgY29sb3IgcHJvdmlkZWRcblx0XHRcdCAqL1xuXHRcdFx0cmdiOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGJpZ2ludCA9IHBhcnNlSW50KGhleENvZGUsIDE2KTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRyOiAoYmlnaW50ID4+IDE2KSAmIDI1NSxcblx0XHRcdFx0XHRnOiAoYmlnaW50ID4+IDgpICYgMjU1LFxuXHRcdFx0XHRcdGI6IGJpZ2ludCAmIDI1NVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdpdmVuIGEgbGlzdCBvZiBoZXggY29sb3IgY29kZXNcblx0XHRcdCAqIERldGVybWluZSB3aGljaCBpcyB0aGUgbW9zdCByZWFkYWJsZVxuXHRcdFx0ICogV2UgdXNlIHRoZSBsdW1pbm9zaXR5IGVxdWF0aW9uIHByZXNlbnRlZCBoZXJlOlxuXHRcdFx0ICogaHR0cDovL3d3dy5zcGxpdGJyYWluLm9yZy9ibG9nLzIwMDgtMDkvMTgtY2FsY3VsYXRpbmdfY29sb3JfY29udHJhc3Rfd2l0aF9waHBcblx0XHRcdCAqL1xuXHRcdFx0cmVhZGFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyB0aGlzIGlzIG1lYW50IHRvIGJlIHNpbXBsaXN0aWMsIGlmIHlvdSBkb24ndCBnaXZlIG1lIG1vcmUgdGhhblxuXHRcdFx0XHQvLyBvbmUgY29sb3IgdG8gd29yayB3aXRoLCB5b3UncmUgZ2V0dGluZyB3aGl0ZSBvciBibGFjay5cblx0XHRcdFx0dmFyIGNvbXBhcmF0b3JzID0gKGFyZ3VtZW50cy5sZW5ndGggPiAxKSA/IGFyZ3VtZW50cyA6IFtcIiNFMUUxRTFcIiwgXCIjNDY0NjQ2XCJdLFxuXHRcdFx0XHRcdG9yaWdpbmFsUkdCID0gdGhpcy5yZ2IoKSxcblx0XHRcdFx0XHRicmlnaHRlc3QgPSB7IGRpZmZlcmVuY2U6IDAgfTtcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhcmF0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Ly9jYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgb3JpZ2luYWwgY29sb3IgYW5kIHRoZSBvbmUgd2Ugd2VyZSBnaXZlblxuXHRcdFx0XHRcdHZhciBjID0gY29sb3IoY29tcGFyYXRvcnNbaV0pLFxuXHRcdFx0XHRcdFx0bCA9IGx1bWlub3NpdHlEaWZmKG9yaWdpbmFsUkdCLCBjLnJnYigpKTtcblxuXHRcdFx0XHRcdC8vIGlmIGl0J3MgYnJpZ2h0ZXIgdGhhbiB0aGUgY3VycmVudCBicmlnaHRlc3QsIHN0b3JlIGl0IHRvIGNvbXBhcmUgYWdhaW5zdCBsYXRlciBvbmVzXG5cdFx0XHRcdFx0aWYgKGwgPiBicmlnaHRlc3QuZGlmZmVyZW5jZSkge1xuXHRcdFx0XHRcdFx0YnJpZ2h0ZXN0ID0ge1xuXHRcdFx0XHRcdFx0XHRkaWZmZXJlbmNlOiBsLFxuXHRcdFx0XHRcdFx0XHRjb2xvcjogY1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJldHVybiB0aGUgYnJpZ2hlc3QgY29sb3Jcblx0XHRcdFx0cmV0dXJuIGJyaWdodGVzdC5jb2xvcjtcblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG5cdC8vIGNyZWF0ZSB0aGUgaGV4IGZvciB0aGUgcmFuZG9tIHN0cmluZ1xuICAgIHZhciBoYXNoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZ1N0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBoYXNoID0gdGFnU3RyaW5nLmNoYXJDb2RlQXQoaSkgKyAoKGhhc2ggPDwgNSkgLSBoYXNoKTtcbiAgICB9XG4gICAgaGV4ID0gXCJcIlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IChoYXNoID4+IChpICogOCkpICYgMHhGRjtcbiAgICAgICAgaGV4ICs9ICgnMDAnICsgdmFsdWUudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTIpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xvcihoZXgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjb2xvclRhZztcbn07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHEpIHtcbiAgcmV0dXJuIHtcbiAgICByZWFkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgZmlsZXN5c3RlbS5yZWFkRmlsZShmaWxlLCBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgaWYgKHJlcy5lcnIpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVzLmVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaWFsb2cpIHtcbiAgcmV0dXJuIHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG4iLCJBcnJheS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKG9sZEluZGV4LCBuZXdJbmRleCkge1xuXG4gIGlmIChpc05hTihuZXdJbmRleCkgfHwgaXNOYU4ob2xkSW5kZXgpIHx8IG9sZEluZGV4IDwgMCB8fCBvbGRJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChuZXdJbmRleCA8IDApIHtcbiAgICBuZXdJbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIGlmIChuZXdJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIG5ld0luZGV4ID0gMDtcbiAgfVxuXG4gIHRoaXMuc3BsaWNlKG5ld0luZGV4LCAwLCB0aGlzLnNwbGljZShvbGRJbmRleCwgMSlbMF0pO1xuXG4gIHJldHVybiBuZXdJbmRleDtcbn07XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xuXG4gICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5kaXNtaXNzKCdjYW5jZWwnKTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWxlcnQ6IHJlcXVpcmUoJy4vYWxlcnQnKSxcbiAgY29uZmlybTogcmVxdWlyZSgnLi9jb25maXJtJyksXG4gIHByb21wdDogcmVxdWlyZSgnLi9wcm9tcHQnKVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLnBsYWNlaG9sZGVyID0gZGF0YS5wbGFjZWhvbGRlcjtcbiAgJHNjb3BlLmlucHV0ID0ge1xuICAgIHZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZVxuICB9O1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCRzY29wZS5pbnB1dC52YWx1ZSk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsInZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xudmFyIGNvbnRyb2xsZXJzID0gcmVxdWlyZSgnLi9jb250cm9sbGVycycpO1xuXG5tb2QuY29udHJvbGxlcignQWxlcnRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5hbGVydFxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdDb25maXJtQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWxJbnN0YW5jZScsXG4gICdkYXRhJyxcbiAgY29udHJvbGxlcnMuY29uZmlybVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdQcm9tcHRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5wcm9tcHRcbl0pO1xuXG5tb2Quc2VydmljZSgnRGlhbG9nU2VydmljZScsIFtcbiAgJyRtb2RhbCcsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2RpYWxvZycsIFtcbiAgJ3VpLmJvb3RzdHJhcCdcbl0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkbW9kYWwpIHtcblxuICB2YXIgc2VydmljZSA9IHt9O1xuXG4gIHNlcnZpY2UuYWxlcnQgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9hbGVydC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdBbGVydEN0cmwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2VcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkucmVzdWx0O1xuXG4gIH07XG5cbiAgc2VydmljZS5jb25maXJtID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9kaWFsb2cvdmlld3MvY29uZmlybS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdDb25maXJtQ3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB0aGlzLl9saXN0ID0gbnVsbDtcbiAgdGhpcy5fdHJlZSA9IG51bGw7XG5cbiAgdmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mc3dhdGNoJyk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy91dGlscy5leHRlbmQodGhpcy5fd2F0Y2hlZCwgZGF0YSk7XG5cbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCB0aGlzLl93YXRjaGVkKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGQnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdID0gZnNvO1xuXG4gICAgdGhpcy5lbWl0KCdhZGQnLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZERpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCB0cnVlKTtcblxuICAgIHRoaXMuX3dhdGNoZWRbZnNvLnBhdGhdID0gZnNvO1xuXG4gICAgdGhpcy5lbWl0KCdhZGREaXInLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgLy8gY2hlY2sgd2UgZ290IHNvbWV0aGluZ1xuICAgIGlmIChmc28pIHtcbiAgICAgIHRoaXMuZW1pdCgnbW9kaWZpZWQnLCBmc28pO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuICAgICAgdGhpcy5lbWl0KCd1bmxpbmsnLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGlua0RpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcbiAgICAgIHRoaXMuZW1pdCgndW5saW5rRGlyJywgZnNvKTtcbiAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG4gICAgfVxuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdlcnJvcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHJlcy5lcnIpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gIHRoaXMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpc3QgPSBudWxsO1xuICAgIHRoaXMuX3RyZWUgPSBudWxsO1xuICB9KTtcblxufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9saXN0KSB7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fbGlzdC5wdXNoKHRoaXMuX3dhdGNoZWRba2V5c1tpXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3RyZWUpIHtcbiAgICAgICAgdGhpcy5fdHJlZSA9IHRyZWVpZnkodGhpcy5fd2F0Y2hlZCwgJ3BhdGgnLCAnZGlyJywgJ2NoaWxkcmVuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgfVxufSk7XG5lbWl0dGVyKEZpbGVTeXN0ZW1XYXRjaGVyLnByb3RvdHlwZSk7XG5cbnZhciBGaWxlU3lzdGVtV2F0Y2hlciA9IG5ldyBGaWxlU3lzdGVtV2F0Y2hlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1XYXRjaGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItY29tcG9uZW50Jyk7O1xuXG4vKlxuICogRmlsZVN5c3RlbSBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGaWxlU3lzdGVtKHNvY2tldCkge1xuXG4gIHNvY2tldC5vbignbWtkaXInLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtkaXInLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdta2ZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29weScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb3B5JywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVuYW1lJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbmFtZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW1vdmUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZWFkZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZWFkZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3dyaXRlZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCd3cml0ZWZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG59XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2RpciA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2RpcicsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2ZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnY29weScsIHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVuYW1lJywgb2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW1vdmUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVhZGZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUud3JpdGVGaWxlID0gZnVuY3Rpb24ocGF0aCwgY29udGVudHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCd3cml0ZWZpbGUnLCBwYXRoLCBjb250ZW50cywgY2FsbGJhY2spO1xufTtcblxuZW1pdHRlcihGaWxlU3lzdGVtLnByb3RvdHlwZSk7XG5cblxudmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mcycpO1xuXG52YXIgZmlsZVN5c3RlbSA9IG5ldyBGaWxlU3lzdGVtKHNvY2tldCk7XG5cbmZpbGVTeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdmcyBjb25uZWN0ZWQnICsgZGF0YSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZpbGVTeXN0ZW07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcC5mcycsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgLy91cmw6ICdmcycsXG4gICAgICAvLyBjb250cm9sbGVyOiAnRnNDdHJsJyxcbiAgICAgIC8vdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2luZGV4Lmh0bWwnLFxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZmluZGVyJywge1xuICAgICAgdXJsOiAnL2ZpbmRlcj9wYXRoJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRmluZGVyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbmRlci5odG1sJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgIHVybDogJy9maWxlJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdGc0ZpbGVDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9maWxlLmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBmaWxlUHJvbWlzZTogWyckcScsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRxLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG4gICAgICAgICAgICBmaWxlc3lzdGVtLnJlYWRGaWxlKHBhdGgsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlcy5kYXRhKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5zZWFyY2gnLCB7XG4gICAgICB1cmw6ICcvc2VhcmNoP3EnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzU2VhcmNoQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL3NlYXJjaC5odG1sJyxcbiAgICAgICAgICAvLyByZXNvbHZlOiB7XG4gICAgICAgICAgLy8gICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAvLyAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgLy8gICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgIC8vICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgIC8vICAgXVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZGlyJywge1xuICAgICAgdXJsOiAnL2Rpci86cGF0aCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJyxcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNEaXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZGlyLmh0bWwnLFxuICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGRpcjogWyckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhdGNoZXIubWFwW3BhdGhdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgZGlyLCBmaWxlU2VydmljZSkge1xuICAkc2NvcGUuZGlyID0gZGlyO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCBmaWxlLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gIShmaWxlLmNvbnRlbnRzIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpO1xuXG4gICRzY29wZS5maWxlID0gZmlsZTtcblxuICB2YXIgbW9kZWwgPSAkc2NvcGUubW9kZWw7XG5cbiAgdmFyIGZzbyA9IG1vZGVsLm1hcFtmaWxlLnBhdGhdO1xuXG4gIC8vIGVuc3VyZSB0aGUgZmluZGVyIGlzIHNldCB0aGUgdGhlIHJpZ2h0IGZzb1xuICAkc2NvcGUuZmluZGVyLmFjdGl2ZSA9IGZzbztcblxuICBtb2RlbC5hZGRSZWNlbnRGaWxlKGZzbyk7XG5cbiAgdmFyIHZpZXdlcjtcblxuICAkc2NvcGUudmlld2VyID0gJ2FjZSc7XG5cbiAgJHNjb3BlLmFjZU9wdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbW9kZTtcblxuICAgIHZhciBtb2RlcyA9IHtcbiAgICAgIFwiLmpzXCI6IFwiYWNlL21vZGUvamF2YXNjcmlwdFwiLFxuICAgICAgXCIuY3NzXCI6IFwiYWNlL21vZGUvY3NzXCIsXG4gICAgICBcIi5odG1sXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICAgICAgXCIuaHRtXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICAgICAgXCIuZWpzXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICAgICAgXCIuanNvblwiOiBcImFjZS9tb2RlL2pzb25cIixcbiAgICAgIFwiLm1kXCI6IFwiYWNlL21vZGUvbWFya2Rvd25cIixcbiAgICAgIFwiLmNvZmZlZVwiOiBcImFjZS9tb2RlL2NvZmZlZVwiLFxuICAgICAgXCIuamFkZVwiOiBcImFjZS9tb2RlL2phZGVcIixcbiAgICAgIFwiLnBocFwiOiBcImFjZS9tb2RlL3BocFwiLFxuICAgICAgXCIucHlcIjogXCJhY2UvbW9kZS9weXRob25cIixcbiAgICAgIFwiLnNjc3NcIjogXCJhY2UvbW9kZS9zYXNzXCIsXG4gICAgICBcIi50eHRcIjogXCJhY2UvbW9kZS90ZXh0XCIsXG4gICAgICBcIi50eXBlc2NyaXB0XCI6IFwiYWNlL21vZGUvdHlwZXNjcmlwdFwiLFxuICAgICAgXCIueG1sXCI6IFwiYWNlL21vZGUveG1sXCJcbiAgICB9O1xuXG4gICAgbW9kZSA9IG1vZGVzW2ZpbGUuZXh0XTtcblxuICAgIGlmIChtb2RlKSB7XG4gICAgICBtb2RlID0gbW9kZS5zdWJzdHIoOSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZGU6IG1vZGVcbiAgICB9O1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gaW1nVXJsKCkge1xuICAgIC8vIE9idGFpbiBhIGJsb2I6IFVSTCBmb3IgdGhlIGltYWdlIGRhdGEuXG4gICAgdmFyIGFycmF5QnVmZmVyVmlldyA9IG5ldyBVaW50OEFycmF5KCBmaWxlLmNvbnRlbnRzICk7XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYiggWyBhcnJheUJ1ZmZlclZpZXcgXSwgeyB0eXBlOiBcImltYWdlL1wiICsgZmlsZS5leHQuc3Vic3RyKDEpIH0gKTtcbiAgICB2YXIgdXJsQ3JlYXRvciA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICB2YXIgdXJsID0gdXJsQ3JlYXRvci5jcmVhdGVPYmplY3RVUkwoIGJsb2IgKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgaWYgKCFpc1V0ZjgpIHtcblxuICAgICRzY29wZS52aWV3ZXIgPSAnJztcblxuICAgIHN3aXRjaCAoZmlsZS5leHQpIHtcbiAgICBjYXNlICcucG5nJzpcbiAgICBjYXNlICcuanBnJzpcbiAgICBjYXNlICcuanBlZyc6XG4gICAgY2FzZSAnLmdpZic6XG4gICAgY2FzZSAnLmljbyc6XG4gICAgICAkc2NvcGUudmlld2VyID0gJ2ltZyc7XG4gICAgICAkc2NvcGUuaW1nVXJsID0gaW1nVXJsKCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuXG4gICAgfVxuXG4gIH1cblxuXG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaW5kZXJNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9maW5kZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvZywgZGlhbG9nLCBmaWxlU2VydmljZSwgcmVzcG9uc2VIYW5kbGVyKSB7XG5cbiAgdmFyIGV4cGFuZGVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAkc2NvcGUudHJlZURhdGEgPSB7XG4gICAgc2hvd01lbnU6IGZhbHNlXG4gIH07XG4gICRzY29wZS5hY3RpdmUgPSBudWxsO1xuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIHZhciBwYXRoID0gJHN0YXRlLnBhcmFtcy5wYXRoID8gdXRpbHMuZGVjb2RlU3RyaW5nKCRzdGF0ZS5wYXJhbXMucGF0aCkgOiBudWxsO1xuICB2YXIgbW9kZWwgPSAkc2NvcGUubW9kZWw7XG5cbiAgdmFyIGZpbmRlciA9IG5ldyBGaW5kZXJNb2RlbChwYXRoID8gbW9kZWwubGlzdC5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBwYXRoO1xuICB9KSA6IG51bGwpO1xuXG4gICRzY29wZS5maW5kZXIgPSBmaW5kZXI7XG5cbiAgZnVuY3Rpb24gZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayhyZXNwb25zZSkge1xuICAgIC8vIG5vdGlmeSBvZiBhbnkgZXJyb3JzLCBvdGhlcndpc2Ugc2lsZW50LlxuICAgIC8vIFRoZSBGaWxlIFN5c3RlbSBXYXRjaGVyIHdpbGwgaGFuZGxlIHRoZSBzdGF0ZSBjaGFuZ2VzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgIGlmIChyZXNwb25zZS5lcnIpIHtcbiAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZS5lcnIpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkc2NvcGUucmlnaHRDbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBjb25zb2xlLmxvZygnUkNsaWNrZWQgJyArIGZzby5uYW1lKTtcbiAgICAkc2NvcGUubWVudVggPSBlLnBhZ2VYO1xuICAgICRzY29wZS5tZW51WSA9IGUucGFnZVk7XG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcbiAgICAkc2NvcGUudHJlZURhdGEuc2hvd01lbnUgPSB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5jbGlja05vZGUgPSBmdW5jdGlvbihmc28pIHtcblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBmaW5kZXIuYWN0aXZlID0gZnNvO1xuXG4gICAgaWYgKCFmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICRzdGF0ZS5nbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZnNvLnBhdGgpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdEZWxldGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucmVuYW1lID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnUmVuYW1lICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciBhIG5ldyBuYW1lJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogZnNvLm5hbWUsXG4gICAgICBwbGFjZWhvbGRlcjogZnNvLmlzRGlyZWN0b3J5ID8gJ0ZvbGRlciBuYW1lJyA6ICdGaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIG9sZFBhdGggPSBmc28ucGF0aDtcbiAgICAgIHZhciBuZXdQYXRoID0gcC5yZXNvbHZlKGZzby5kaXIsIHZhbHVlKTtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKG9sZFBhdGgsIG5ld1BhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdSZW5hbWUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtmaWxlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmaWxlJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRmlsZSBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2ZpbGUocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBkaXJlY3RvcnkgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucGFzdGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2NvcHknKSB7XG4gICAgICBmaWxlc3lzdGVtLmNvcHkocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY3V0Jykge1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIH07XG5cbiAgJHNjb3BlLnNob3dQYXN0ZSA9IGZ1bmN0aW9uKGUsIGFjdGl2ZSkge1xuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlciAmJiBhY3RpdmUuaXNEaXJlY3RvcnkpIHtcbiAgICAgIGlmICghcGFzdGVCdWZmZXIuZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGFzdGVCdWZmZXIuZnNvLnBhdGgudG9Mb3dlckNhc2UoKSkgIT09IDApIHsgLy8gZGlzYWxsb3cgcGFzdGluZyBpbnRvIHNlbGYgb3IgYSBkZWNlbmRlbnRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuc2V0UGFzdGVCdWZmZXIgPSBmdW5jdGlvbihlLCBmc28sIG9wKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSB7XG4gICAgICBmc286IGZzbyxcbiAgICAgIG9wOiBvcFxuICAgIH07XG5cbiAgfTtcblxuICAkc2NvcGUubm90TW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgKGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBmc28ubmFtZSA9PT0gJ2Jvd2VyX2NvbXBvbmVudHMnKSA/IGZhbHNlIDogdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUubm9kZU1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSkge1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSkge1xuICAkc2NvcGUubW9kZWwucSA9ICRzdGF0ZS5wYXJhbXMucTtcbn07XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbCwgJGxvZywgZGlhbG9nLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICB2YXIgZXhwYW5kZWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICRzY29wZS50cmVlRGF0YSA9IHtcbiAgICBzaG93TWVudTogZmFsc2VcbiAgfTtcbiAgJHNjb3BlLmFjdGl2ZSA9IG51bGw7XG4gICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgZnVuY3Rpb24gZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayhyZXNwb25zZSkge1xuICAgIC8vIG5vdGlmeSBvZiBhbnkgZXJyb3JzLCBvdGhlcndpc2Ugc2lsZW50LlxuICAgIC8vIFRoZSBGaWxlIFN5c3RlbSBXYXRjaGVyIHdpbGwgaGFuZGxlIHRoZSBzdGF0ZSBjaGFuZ2VzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgIGlmIChyZXNwb25zZS5lcnIpIHtcbiAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZS5lcnIpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkc2NvcGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICAgIGNsYXNzZXMucHVzaChmc28uaXNEaXJlY3RvcnkgPyAnZGlyJyA6ICdmaWxlJyk7XG5cbiAgICBpZiAoZnNvID09PSAkc2NvcGUuYWN0aXZlKSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHZhciBjbGFzc2VzID0gWydmYSddO1xuXG4gICAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKCRzY29wZS5pc0V4cGFuZGVkKGZzbykgPyAnZmEtZm9sZGVyLW9wZW4nIDogJ2ZhLWZvbGRlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2ZhLWZpbGUtbycpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuaXNFeHBhbmRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiAhIWV4cGFuZGVkW2Zzby5wYXRoXTtcbiAgfTtcblxuICAkc2NvcGUucmlnaHRDbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBjb25zb2xlLmxvZygnUkNsaWNrZWQgJyArIGZzby5uYW1lKTtcbiAgICAkc2NvcGUubWVudVggPSBlLnBhZ2VYO1xuICAgICRzY29wZS5tZW51WSA9IGUucGFnZVk7XG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcbiAgICAkc2NvcGUudHJlZURhdGEuc2hvd01lbnUgPSB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5jbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICB2YXIgaXNFeHBhbmRlZCA9ICRzY29wZS5pc0V4cGFuZGVkKGZzbyk7XG4gICAgICBpZiAoaXNFeHBhbmRlZCkge1xuICAgICAgICBkZWxldGUgZXhwYW5kZWRbZnNvLnBhdGhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhwYW5kZWRbZnNvLnBhdGhdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgJHNjb3BlLm9wZW4oZnNvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdEZWxldGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucmVuYW1lID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnUmVuYW1lICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciBhIG5ldyBuYW1lJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogZnNvLm5hbWUsXG4gICAgICBwbGFjZWhvbGRlcjogZnNvLmlzRGlyZWN0b3J5ID8gJ0ZvbGRlciBuYW1lJyA6ICdGaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIG9sZFBhdGggPSBmc28ucGF0aDtcbiAgICAgIHZhciBuZXdQYXRoID0gcC5yZXNvbHZlKGZzby5kaXIsIHZhbHVlKTtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKG9sZFBhdGgsIG5ld1BhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdSZW5hbWUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtmaWxlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmaWxlJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRmlsZSBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2ZpbGUocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBkaXJlY3RvcnkgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucGFzdGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2NvcHknKSB7XG4gICAgICBmaWxlc3lzdGVtLmNvcHkocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY3V0Jykge1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIH07XG5cbiAgJHNjb3BlLnNob3dQYXN0ZSA9IGZ1bmN0aW9uKGUsIGFjdGl2ZSkge1xuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlciAmJiBhY3RpdmUuaXNEaXJlY3RvcnkpIHtcbiAgICAgIGlmICghcGFzdGVCdWZmZXIuZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGFzdGVCdWZmZXIuZnNvLnBhdGgudG9Mb3dlckNhc2UoKSkgIT09IDApIHsgLy8gZGlzYWxsb3cgcGFzdGluZyBpbnRvIHNlbGYgb3IgYSBkZWNlbmRlbnRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuc2V0UGFzdGVCdWZmZXIgPSBmdW5jdGlvbihlLCBmc28sIG9wKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSB7XG4gICAgICBmc286IGZzbyxcbiAgICAgIG9wOiBvcFxuICAgIH07XG5cbiAgfTtcblxuICAkc2NvcGUubm90TW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgKGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBmc28ubmFtZSA9PT0gJ2Jvd2VyX2NvbXBvbmVudHMnKSA/IGZhbHNlIDogdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUubm9kZU1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbn07XG4iLCJ2YXIgbW9kID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRmluZGVyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmluZGVyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaWxlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdmaWxlUHJvbWlzZScsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmlsZScpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzU2VhcmNoQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NlYXJjaCcpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRGlyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdkaXInLFxuICAnRmlsZVNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzVHJlZUN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsJyxcbiAgJyRsb2cnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdSZXNwb25zZUhhbmRsZXInLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3RyZWUnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwiZnVuY3Rpb24gRmluZGVyTW9kZWwoYWN0aXZlKSB7XG4gIC8vIHRoaXMudHJlZSA9IHRyZWU7XG4gIHRoaXMuYWN0aXZlID0gYWN0aXZlO1xufVxuRmluZGVyTW9kZWwucHJvdG90eXBlLl9yZWFkQ29scyA9IGZ1bmN0aW9uKHRyZWUpIHtcblxuICAvL3ZhciB0cmVlID0gdGhpcy5fdHJlZTtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgLy92YXIgYWN0aXZlSXNEaXIgPSBhY3RpdmUuaXNEaXJlY3Rvcnk7XG5cbiAgdmFyIGNvbHMgPSBbXTtcblxuICBpZiAoYWN0aXZlKSB7XG5cbiAgICB2YXIgY3VyciA9IGFjdGl2ZS5pc0RpcmVjdG9yeSA/IGFjdGl2ZSA6IGFjdGl2ZS5wYXJlbnQ7XG4gICAgZG8ge1xuICAgICAgY29scy51bnNoaWZ0KGN1cnIuY2hpbGRyZW4pO1xuICAgICAgY3VyciA9IGN1cnIucGFyZW50O1xuICAgIH0gd2hpbGUgKGN1cnIpO1xuXG4gICAgY29scy5zaGlmdCgpO1xuXG4gIH0gZWxzZSB7XG4gICAgY29scy5wdXNoKHRyZWUuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIGNvbHM7XG5cbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBjbGFzc2VzID0gWydmc28nXTtcbiAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICBpZiAoZnNvID09PSB0aGlzLmFjdGl2ZSkge1xuICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmdldEljb25DbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgIGNsYXNzZXMucHVzaCh0aGlzLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3Blbi1vJyA6ICdmYS1mb2xkZXItbycpO1xuICB9IGVsc2Uge1xuICAgIGNsYXNzZXMucHVzaCgnZmEtZmlsZScpO1xuICB9XG5cbiAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5pc0hpZ2hsaWdodGVkID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBhY3RpdmUgPSB0aGlzLl9hY3RpdmU7XG4gIHZhciBpc0hpZ2hsaWdodGVkID0gZmFsc2U7XG5cbiAgaWYgKGZzbyA9PT0gYWN0aXZlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoYWN0aXZlICYmIGZzby5pc0RpcmVjdG9yeSkge1xuICAgIC8vIGNoZWNrIGlmIGl0IGlzIGFuIGFuY2VzdG9yXG4gICAgdmFyIHIgPSBhY3RpdmU7XG4gICAgd2hpbGUgKHIucGFyZW50KSB7XG4gICAgICBpZiAociA9PT0gZnNvKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgciA9IHIucGFyZW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuaXNFeHBhbmRlZCA9IGZ1bmN0aW9uKGRpcikge1xuICByZXR1cm4gdGhpcy5pc0hpZ2hsaWdodGVkKGRpcik7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmNvbHMgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHJldHVybiB0aGlzLl9yZWFkQ29scyh0cmVlKTtcbn07XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmluZGVyTW9kZWwucHJvdG90eXBlLCB7XG4gIGFjdGl2ZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fYWN0aXZlID0gdmFsdWU7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlck1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZnMnLCBbXSk7XG4iLCJcblxud2luZG93LmFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cblxuLy93aW5kb3cuZnMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbi8vIC8vICoqKioqKioqKiovLypcbi8vIC8vIFNoaW1zXG4vLyAvLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9hcnJheScpO1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBEaXJlY3RpdmVzXG4vLyAvLyAqKioqKioqKioqKlxuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9uZWdhdGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9yaWdodC1jbGljaycpO1xuLy8gLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9iZWhhdmUnKTtcbi8vXG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIENvbnRyb2xsZXJzXG4vLyAvLyAqKioqKioqKioqKlxuLy9cbi8vIC8vIGRpYWxvZyBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9jb25maXJtJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2FsZXJ0Jyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3Byb21wdCcpO1xuLy9cbi8vIC8vIGhvbWUgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9ob21lJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvdHJlZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbGUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9maW5kZXInKTtcbi8vXG4vLyAvLyBkYiBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9rZXknKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXJyYXktZGVmJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuLy9cbi8vXG4vLyAvLyBhcGkgbW9kZWwgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FwaScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvY29udHJvbGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvaGFuZGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvcm91dGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FjdGlvbicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWRkLXJlc291cmNlJyk7XG4vL1xuLy9cbi8vIC8vIG1haW4gYXBwIGNvbnRyb2xsZXJcbi8vIHJlcXVpcmUoJy4vYXBwL2NvbnRyb2xsZXJzL2FwcCcpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gU2VydmljZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL3NlcnZpY2VzL2RpYWxvZycpO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG5cbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gZnVuY3Rpb24ocGF0aCwgc3RhdCkge1xuICB0aGlzLm5hbWUgPSBwLmJhc2VuYW1lKHBhdGgpIHx8IHBhdGg7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuZGlyID0gcC5kaXJuYW1lKHBhdGgpO1xuICB0aGlzLmlzRGlyZWN0b3J5ID0gdHlwZW9mIHN0YXQgPT09ICdib29sZWFuJyA/IHN0YXQgOiBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gIHRoaXMuZXh0ID0gcC5leHRuYW1lKHBhdGgpO1xufTtcbkZpbGVTeXN0ZW1PYmplY3QucHJvdG90eXBlID0ge1xuICBnZXQgaXNGaWxlKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0RpcmVjdG9yeTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbU9iamVjdDsiLCIvKiBnbG9iYWwgZGlhbG9nICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBybmRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgZ2V0dWlkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5yYW5kb20oKSAqIDFlNykpLnRvU3RyaW5nKCk7XG4gIH0sXG4gIGdldHVpZHN0cjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xuICB9LFxuICB1cmxSb290OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG4gICAgcmV0dXJuIGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3Q7XG4gIH0sXG4gIGVuY29kZVN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIGJ0b2EoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpO1xuICB9LFxuICBkZWNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoYXRvYihzdHIpKTtcbiAgfSxcbiAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQob3JpZ2luLCBhZGQpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gICAgaWYgKCFhZGQgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBvcmlnaW47XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICAgIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luO1xuICB9LFxuICB1aToge1xuICAgIHJlc3BvbnNlSGFuZGxlcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihyc3AsIHNob3dFcnJvcikge1xuICAgICAgICBzaG93RXJyb3IgPSBzaG93RXJyb3IgfHwgdHJ1ZTtcbiAgICAgICAgaWYgKHJzcC5lcnIpIHtcbiAgICAgICAgICBpZiAoc2hvd0Vycm9yKSB7XG4gICAgICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocnNwLmVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmbihyc3AuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInErNjRmd1wiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
