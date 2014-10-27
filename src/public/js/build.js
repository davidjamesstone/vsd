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
      templateUrl: '/client/app/views/app.html'
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

  var packageFile = model.packageFile;
  if (packageFile) {
    fileService.readFile(packageFile.path).then(function(res) {
      model.package = res;
    });
  }

  var readmeFile = model.readmeFile;
  if (readmeFile) {
    fileService.readFile(readmeFile.path).then(function(res) {
      model.readme = res;
    });
  }

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
var utils = require('../../../../shared/utils');

function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;

  this._recentFiles = [];
}
AppModel.prototype.addRecentFile = function(file) {
  var recent = this._recentFiles;
  var idx = recent.findIndex(function(item) {
    return item.path === file.path;
  });
  if (idx !== -1) {
    recent.move(idx, 0);
  } else {
    recent.unshift({ path: file.path, time: Date.now() });
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
AppModel.prototype._readDependencies = function(dev) {
  var deps = [];
  var packageJSON = this._packageJSON;
  if (packageJSON) {
    var depKey = packageJSON[dev ? 'devDependencies' : 'dependencies'];
    var keys = Object.keys(depKey);
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var version = depKey[name];
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
        if (!this.map[recent[i].path]) {
          recent.splice(i, 1);
        }
      }

      var entries = [];


      return recent.map(function(item) {
        return this.map[item.path];
      }, this);

      return entries;
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
      this._devDependencies = this._readDependencies(true);
    }
  },
  packageFile: {
    get: function() {
      return this.tree.children.find(function(item) {
        return item.name.toLowerCase() === 'package.json';
      });
    }
  },
  hasPackageFile: {
    get: function() {
      return !!this.packageFile;
    }
  },
  dependencies: {
    get: function() {
      return this._dependencies;
    }
  },
  devDependencies: {
    get: function() {
      return this._devDependencies;
    }
  },
  readme: {
    get: function() {
      return this._readme;
    },
    set: function(value) {
      this._readme = value;
    }
  },
  readmeFile: {
    get: function() {
      return this.tree.children.find(function(item) {
        return  /^readme.(md|markdown)$/.test(item.name.toLowerCase());
      });
    }
  },
  hasReadmeFile: {
    get: function() {
      return !!this.readmeFile;
    }
  }

});

module.exports = AppModel;

},{"../../../../shared/utils":32,"path":33}],6:[function(require,module,exports){
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

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(predicate) {
    if (this == null) {
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
        return i;
      }
    }
    return -1;
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
      onLoad : $scope.aceLoaded,
      mode: mode
    };
  };

  $scope.aceLoaded = function(_editor){
    // Editor part
    var _session = _editor.getSession();
    var _renderer = _editor.renderer;

    // Options
    _editor.setReadOnly(true);
    _session.setUndoManager(new ace.UndoManager());
    _renderer.setShowGutter(false);

    // Events
    _editor.on("changeSession", function(){  });
    _session.on("change", function(){  });
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
  }) : model.tree);

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
  this.stat = stat;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2VtaXR0ZXItY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9jb2xvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcnJheS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvYWxlcnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2NvbmZpcm0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS13YXRjaGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9kaXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvc2VhcmNoLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3RyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxS0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXG4vKipcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XG59O1xuXG4vKipcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub24gPVxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgKHRoaXMuX2NhbGxiYWNrc1tldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdKVxuICAgIC5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgZnVuY3Rpb24gb24oKSB7XG4gICAgc2VsZi5vZmYoZXZlbnQsIG9uKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgb24uZm4gPSBmbjtcbiAgdGhpcy5vbihldmVudCwgb24pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICAvLyBhbGxcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcblxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXG4gIHZhciBjYjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xuICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge01peGVkfSAuLi5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1tldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlcikge1xuXG4gIC8vJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuXG4gIC8vIEZvciBhbnkgdW5tYXRjaGVkIHVybCwgcmVkaXJlY3QgdG8gL1xuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcCcsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgY29udHJvbGxlcjogJ0FwcEN0cmwnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2FwcC92aWV3cy9pbmRleC5odG1sJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZnNQcm9taXNlOiBbJyRxJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIGZpbGVzeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShmaWxlc3lzdGVtKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdLFxuICAgICAgICBmc1dhdGNoZXJQcm9taXNlOiBbJyRxJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSkge1xuICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgIHdhdGNoZXIub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh3YXRjaGVyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5ob21lJywge1xuICAgICAgdXJsOiAnJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvYXBwLmh0bWwnXG4gICAgfSk7XG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXJEYlN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnZGInLCB7XG4gICAgICAgIHVybDogJy9kYicsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdEYkN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbCcsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy86bW9kZWxOYW1lJyxcbiAgICAgICAgY29udHJvbGxlcjogJ01vZGVsQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBtb2RlbFByb21pc2U6IFsnJGh0dHAnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnLycgKyAkc3RhdGVQYXJhbXMubW9kZWxOYW1lICsgJy5qc29uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChkYi5tb2RlbC8pXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwtZWRpdG9yLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEnLCB7XG4gICAgICAgIHVybDogJy86c2NoZW1hSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgICAgY29udHJvbGxlcjogJ1NjaGVtYUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9zY2hlbWEuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLnNjaGVtYS5rZXknLCB7XG4gICAgICAgIHVybDogJy86a2V5SWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgICAgY29udHJvbGxlcjogJ0tleUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9rZXkuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2RiLm1vZGVsLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJyNkaWFncmFtJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIC8vY29udHJvbGxlcjogJ0RpYWdyYW1DdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvZGItZGlhZ3JhbS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyQXBpU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlclxuICAgICAgLnN0YXRlKCdhcGknLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvYXBpLzphcGlOYW1lJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGkuaHRtbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBhcGlQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiB3aW5kb3cuX2FwaTsgLy8kaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsIC8vIERlZmF1bHQuIFdpbGwgYmUgdXNlZCBpbiBwbGFjZSBvZiBhYnN0cmFjdCBwYXJlbnQgaW4gdGhlIGNhc2Ugb2YgaGl0dGluZyB0aGUgaW5kZXggKGFwaS8pXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FwaS1ob21lLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuZGlhZ3JhbScsIHtcbiAgICAgICAgdXJsOiAnL2RpYWdyYW0nLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpRGlhZ3JhbUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9kaWFncmFtLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlcicsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9jb250cm9sbGVyJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIuaG9tZScsIHtcbiAgICAgICAgdXJsOiAnJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2NvbnRyb2xsZXItaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIuaXRlbScsIHtcbiAgICAgICAgdXJsOiAnLzpjb250cm9sbGVySWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUNvbnRyb2xsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2NvbnRyb2xsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0uaGFuZGxlcicsIHtcbiAgICAgICAgdXJsOiAnLzpoYW5kbGVySWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICd4QGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlIYW5kbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9oYW5kbGVyLmh0bWwnXG4gICAgICAgICAgfSxcbiAgICAgICAgICAnaGFuZGxlckBhcGkuY29udHJvbGxlci5pdGVtJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9J2hhbmRsZXInIGluIHBhcmVudCBzdGF0ZSAnYXBpLmNvbnRyb2xsZXIuaXRlbScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL3JvdXRlJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9yb3V0ZS1ob21lLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbScsIHtcbiAgICAgICAgdXJsOiAnLzpyb3V0ZUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlSb3V0ZUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5pdGVtLmFjdGlvbicsIHtcbiAgICAgICAgdXJsOiAnLzphY3Rpb25JZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpQWN0aW9uQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hY3Rpb24uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxufTtcbiIsInZhciBBcHBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9hcHAnKTtcbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsIGZzLCB3YXRjaGVyLCBmaWxlU2VydmljZSwgZGlhbG9nLCBjb2xvclNlcnZpY2UpIHtcblxuICB2YXIgbW9kZWwgPSBuZXcgQXBwTW9kZWwoe1xuICAgIGZzOiBmcyxcbiAgICB3YXRjaGVyOiB3YXRjaGVyXG4gIH0pO1xuXG4gICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuXG4gIC8vIExpc3RlbiBvdXQgZm9yIGNoYW5nZXMgdG8gdGhlIGZpbGUgc3lzdGVtXG4gIHdhdGNoZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG4gIHZhciBwYWNrYWdlRmlsZSA9IG1vZGVsLnBhY2thZ2VGaWxlO1xuICBpZiAocGFja2FnZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShwYWNrYWdlRmlsZS5wYXRoKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgbW9kZWwucGFja2FnZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIHZhciByZWFkbWVGaWxlID0gbW9kZWwucmVhZG1lRmlsZTtcbiAgaWYgKHJlYWRtZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShyZWFkbWVGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gICAgfSk7XG4gIH1cblxuICAkc2NvcGUub25TZWFyY2hGb3JtU3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgJHN0YXRlLmdvKCdhcHAuZnMuc2VhcmNoJywgeyBxOiBzZWFyY2hGb3JtLnEudmFsdWUgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmZpbGVVcmwgPSBmdW5jdGlvbihmaWxlKSB7XG4gICAgcmV0dXJuICRzdGF0ZS5ocmVmKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoKVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5kaXJVcmwgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZGlyLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29sb3IgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYyBjb2xvcnMgZnJvbSBhIHN0cmluZ1xuICAkc2NvcGUuY29sb3IgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLmhleCgpIDogJyc7XG4gIH07XG4gICRzY29wZS5jb2xvclRleHQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLnJlYWRhYmxlKCkuaGV4KCkgOiAnJztcbiAgfTtcblxuICAkc2NvcGUuZW5jb2RlUGF0aCA9IHV0aWxzLmVuY29kZVN0cmluZztcbiAgJHNjb3BlLmRlY29kZVBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmc7XG59O1xuIiwiLy8gdmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbScpO1xuLy8gdmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG4vLyB2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxuLy8gTG9hZCBNb2R1bGUgRGVwZW5kZW5jaWVzXG5yZXF1aXJlKCcuLi9kaWFsb2cnKTtcbnJlcXVpcmUoJy4uL2ZzJyk7XG5cbnZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xuXG5tb2Quc2VydmljZSgnRmlsZVNlcnZpY2UnLCBbXG4gICckcScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvZmlsZScpXG5dKTtcblxubW9kLnNlcnZpY2UoJ1Jlc3BvbnNlSGFuZGxlcicsIFtcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICByZXF1aXJlKCcuL3NlcnZpY2VzL3Jlc3BvbnNlLWhhbmRsZXInKVxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdDb2xvclNlcnZpY2UnLCBbXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvY29sb3InKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdBcHBDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICdmc1Byb21pc2UnLFxuICAnZnNXYXRjaGVyUHJvbWlzZScsXG4gICdGaWxlU2VydmljZScsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0NvbG9yU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMnKVxuXSk7XG5cbi8vIEFDRSBHbG9iYWwgRGVmYXVsdHNcbm1vZC5ydW4oWyd1aUFjZUNvbmZpZycsXG4gIGZ1bmN0aW9uKHVpQWNlQ29uZmlnKSB7XG4gICAgdWlBY2VDb25maWcuYWNlID0ge307XG4gICAgYW5ndWxhci5leHRlbmQodWlBY2VDb25maWcuYWNlLCB7XG4gICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICBzaG93R3V0dGVyOiB0cnVlLFxuICAgICAgbW9kZTogJ2phdmFzY3JpcHQnLFxuICAgICAgcmVxdWlyZTogWydhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzJ10sXG4gICAgICBhZHZhbmNlZDoge1xuICAgICAgICBlbmFibGVTbmlwcGV0czogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlTGl2ZUF1dG9jb21wbGV0aW9uOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbl0pO1xuXG5tb2QuY29uZmlnKFtcbiAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgJyRsb2NhdGlvblByb3ZpZGVyJyxcbiAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29uZmlnKCBbJyRjb21waWxlUHJvdmlkZXInLCBmdW5jdGlvbigkY29tcGlsZVByb3ZpZGVyKXtcbiAgJGNvbXBpbGVQcm92aWRlci5pbWdTcmNTYW5pdGl6YXRpb25XaGl0ZWxpc3QoL15cXHMqKChodHRwcz98ZnRwfGZpbGV8YmxvYik6fGRhdGE6aW1hZ2VcXC8pLyk7XG59XSk7XG5cbi8vIG1vZC5kaXJlY3RpdmUoXCJmaWxlRWRpdG9yXCIsIFtcbi8vICAgZnVuY3Rpb24oKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbi8vICAgICAgIHRlbXBsYXRlOiAnPGRpdj57e2ZpbGUuY29udGVudH19PC9kaXY+Jyxcbi8vICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuLy8gICAgICAgICAvL3Njb3BlW2F0dHJzLmFsbFBob25lc107XG4vLyAgICAgICB9XG4vLyAgICAgfTtcbi8vICAgfVxuLy8gXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxuZnVuY3Rpb24gQXBwTW9kZWwoZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5mcyA9IGRhdGEuZnM7XG4gIHRoaXMud2F0Y2hlciA9IGRhdGEud2F0Y2hlcjtcblxuICB0aGlzLl9yZWNlbnRGaWxlcyA9IFtdO1xufVxuQXBwTW9kZWwucHJvdG90eXBlLmFkZFJlY2VudEZpbGUgPSBmdW5jdGlvbihmaWxlKSB7XG4gIHZhciByZWNlbnQgPSB0aGlzLl9yZWNlbnRGaWxlcztcbiAgdmFyIGlkeCA9IHJlY2VudC5maW5kSW5kZXgoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IGZpbGUucGF0aDtcbiAgfSk7XG4gIGlmIChpZHggIT09IC0xKSB7XG4gICAgcmVjZW50Lm1vdmUoaWR4LCAwKTtcbiAgfSBlbHNlIHtcbiAgICByZWNlbnQudW5zaGlmdCh7IHBhdGg6IGZpbGUucGF0aCwgdGltZTogRGF0ZS5ub3coKSB9KTtcbiAgICByZWNlbnQubGVuZ3RoID0gTWF0aC5taW4odGhpcy5fcmVjZW50RmlsZXMubGVuZ3RoLCAyMCk7XG4gIH1cbn07XG5cbkFwcE1vZGVsLnByb3RvdHlwZS5jb3VudEZpbGVzID0gZnVuY3Rpb24oZXh0KSB7XG4gIHJldHVybiB0aGlzLmxpc3QuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gIWl0ZW0uaXNEaXJlY3RvcnkgJiYgaXRlbS5leHQgPT09IGV4dDtcbiAgfSkubGVuZ3RoO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5jbGVhclJlY2VudEZpbGVzID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3JlY2VudEZpbGVzLmxlbmd0aCA9IDA7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmdldFJlbGF0aXZlUGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHAucmVsYXRpdmUodGhpcy50cmVlLnBhdGgsIHBhdGgpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5fcmVhZERlcGVuZGVuY2llcyA9IGZ1bmN0aW9uKGRldikge1xuICB2YXIgZGVwcyA9IFtdO1xuICB2YXIgcGFja2FnZUpTT04gPSB0aGlzLl9wYWNrYWdlSlNPTjtcbiAgaWYgKHBhY2thZ2VKU09OKSB7XG4gICAgdmFyIGRlcEtleSA9IHBhY2thZ2VKU09OW2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyddO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVwS2V5KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0ga2V5c1tpXTtcbiAgICAgIHZhciB2ZXJzaW9uID0gZGVwS2V5W25hbWVdO1xuICAgICAgZGVwcy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXBzO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwcE1vZGVsLnByb3RvdHlwZSwge1xuICBtYXA6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5tYXA7XG4gICAgfVxuICB9LFxuICBsaXN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci50cmVlWzBdLmNoaWxkcmVuWzBdO1xuICAgIH1cbiAgfSxcbiAgcmVjZW50RmlsZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuXG4gICAgICAvLyBjbGVhbiBhbnkgZmlsZXMgdGhhdCBtYXkgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICB2YXIgaSA9IHJlY2VudC5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGlmICghdGhpcy5tYXBbcmVjZW50W2ldLnBhdGhdKSB7XG4gICAgICAgICAgcmVjZW50LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgZW50cmllcyA9IFtdO1xuXG5cbiAgICAgIHJldHVybiByZWNlbnQubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwW2l0ZW0ucGF0aF07XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfVxuICB9LFxuICBqc0NvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvdW50RmlsZXMoJy5qcycpO1xuICAgIH1cbiAgfSxcbiAgY3NzQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmNzcycpO1xuICAgIH1cbiAgfSxcbiAgaHRtbENvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvdW50RmlsZXMoJy5odG1sJyk7XG4gICAgfVxuICB9LFxuICB0b3RhbENvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmxpc3QubGVuZ3RoO1xuICAgIH1cbiAgfSxcbiAgcGFja2FnZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcGFja2FnZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuX3BhY2thZ2UgPSB2YWx1ZTtcbiAgICAgIHRoaXMuX3BhY2thZ2VKU09OID0gSlNPTi5wYXJzZSh2YWx1ZS5jb250ZW50cyk7XG4gICAgICB0aGlzLl9kZXBlbmRlbmNpZXMgPSB0aGlzLl9yZWFkRGVwZW5kZW5jaWVzKCk7XG4gICAgICB0aGlzLl9kZXZEZXBlbmRlbmNpZXMgPSB0aGlzLl9yZWFkRGVwZW5kZW5jaWVzKHRydWUpO1xuICAgIH1cbiAgfSxcbiAgcGFja2FnZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudHJlZS5jaGlsZHJlbi5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpID09PSAncGFja2FnZS5qc29uJztcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgaGFzUGFja2FnZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5wYWNrYWdlRmlsZTtcbiAgICB9XG4gIH0sXG4gIGRlcGVuZGVuY2llczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGVwZW5kZW5jaWVzO1xuICAgIH1cbiAgfSxcbiAgZGV2RGVwZW5kZW5jaWVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZXZEZXBlbmRlbmNpZXM7XG4gICAgfVxuICB9LFxuICByZWFkbWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3JlYWRtZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuX3JlYWRtZSA9IHZhbHVlO1xuICAgIH1cbiAgfSxcbiAgcmVhZG1lRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmVlLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gIC9ecmVhZG1lLihtZHxtYXJrZG93bikkLy50ZXN0KGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgaGFzUmVhZG1lRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnJlYWRtZUZpbGU7XG4gICAgfVxuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcE1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICAndWkucm91dGVyJyxcbiAgJ3VpLmJvb3RzdHJhcCcsXG4gICd1aS5hY2UnLFxuICAnZXZnZW55bmV1Lm1hcmtkb3duLXByZXZpZXcnLFxuICAnbWljaGlLb25vJyxcbiAgJ2RpYWxvZycsXG4gICdmcydcbl0pO1xuIiwiLyoqXG4gKiBjb2xvclRhZyB2IDAuMVxuICogYnkgUnlhbiBRdWlublxuICogaHR0cHM6Ly9naXRodWIuY29tL21hem9uZG8vY29sb3JUYWdcbiAqXG4gKiBjb2xvclRhZyBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgcmFuZG9tIGNvbG9yIGZyb20gYSBnaXZlbiBzdHJpbmdcbiAqIFRoZSBnb2FsIGlzIHRvIGNyZWF0ZSBkZXRlcm1pbmlzdGljLCB1c2FibGUgY29sb3JzIGZvciB0aGUgcHVycG9zZVxuICogb2YgYWRkaW5nIGNvbG9yIGNvZGluZyB0byB0YWdzXG4qL1xuXG5mdW5jdGlvbiBjb2xvclRhZyh0YWdTdHJpbmcpIHtcblx0Ly8gd2VyZSB3ZSBnaXZlbiBhIHN0cmluZyB0byB3b3JrIHdpdGg/ICBJZiBub3QsIHRoZW4ganVzdCByZXR1cm4gZmFsc2Vcblx0aWYgKCF0YWdTdHJpbmcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIHN0aGUgbHVtaW5vc2l0eSBkaWZmZXJlbmNlIGJldHdlZW4gMiByZ2IgdmFsdWVzXG5cdCAqIGFueXRoaW5nIGdyZWF0ZXIgdGhhbiA1IGlzIGNvbnNpZGVyZWQgcmVhZGFibGVcblx0ICovXG5cdGZ1bmN0aW9uIGx1bWlub3NpdHlEaWZmKHJnYjEsIHJnYjIpIHtcbiAgXHRcdHZhciBsMSA9IDAuMjEyNiArIE1hdGgucG93KHJnYjEuci8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjcxNTIgKiBNYXRoLnBvdyhyZ2IxLmcvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC4wNzIyICogTWF0aC5wb3cocmdiMS5iLzI1NSwgMi4yKSxcbiAgXHRcdFx0bDIgPSAwLjIxMjYgKyBNYXRoLnBvdyhyZ2IyLnIvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC43MTUyICogTWF0aC5wb3cocmdiMi5nLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuMDcyMiAqIE1hdGgucG93KHJnYjIuYi8yNTUsIDIuMik7XG5cbiAgXHRcdGlmIChsMSA+IGwyKSB7XG4gIFx0XHRcdHJldHVybiAobDEgKyAwLjA1KSAvIChsMiArIDAuMDUpO1xuICBcdFx0fSBlbHNlIHtcbiAgXHRcdFx0cmV0dXJuIChsMiArIDAuMDUpIC8gKGwxICsgMC4wNSk7XG4gIFx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogVGhpcyBpcyB0aGUgZGVmaW5pdGlvbiBvZiBhIGNvbG9yIGZvciBvdXIgcHVycG9zZXMuICBXZSd2ZSBhYnN0cmFjdGVkIGl0IG91dFxuXHQgKiBzbyB0aGF0IHdlIGNhbiByZXR1cm4gbmV3IGNvbG9yIG9iamVjdHMgd2hlbiByZXF1aXJlZFxuXHQqL1xuXHRmdW5jdGlvbiBjb2xvcihoZXhDb2RlKSB7XG5cdFx0Ly93ZXJlIHdlIGdpdmVuIGEgaGFzaHRhZz8gIHJlbW92ZSBpdC5cblx0XHR2YXIgaGV4Q29kZSA9IGhleENvZGUucmVwbGFjZShcIiNcIiwgXCJcIik7XG5cdFx0cmV0dXJuIHtcblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhIHNpbXBsZSBoZXggc3RyaW5nIGluY2x1ZGluZyBoYXNodGFnXG5cdFx0XHQgKiBvZiB0aGUgY29sb3Jcblx0XHRcdCAqL1xuXHRcdFx0aGV4OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGhleENvZGU7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgYW4gUkdCIGJyZWFrZG93biBvZiB0aGUgY29sb3IgcHJvdmlkZWRcblx0XHRcdCAqL1xuXHRcdFx0cmdiOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGJpZ2ludCA9IHBhcnNlSW50KGhleENvZGUsIDE2KTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRyOiAoYmlnaW50ID4+IDE2KSAmIDI1NSxcblx0XHRcdFx0XHRnOiAoYmlnaW50ID4+IDgpICYgMjU1LFxuXHRcdFx0XHRcdGI6IGJpZ2ludCAmIDI1NVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdpdmVuIGEgbGlzdCBvZiBoZXggY29sb3IgY29kZXNcblx0XHRcdCAqIERldGVybWluZSB3aGljaCBpcyB0aGUgbW9zdCByZWFkYWJsZVxuXHRcdFx0ICogV2UgdXNlIHRoZSBsdW1pbm9zaXR5IGVxdWF0aW9uIHByZXNlbnRlZCBoZXJlOlxuXHRcdFx0ICogaHR0cDovL3d3dy5zcGxpdGJyYWluLm9yZy9ibG9nLzIwMDgtMDkvMTgtY2FsY3VsYXRpbmdfY29sb3JfY29udHJhc3Rfd2l0aF9waHBcblx0XHRcdCAqL1xuXHRcdFx0cmVhZGFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyB0aGlzIGlzIG1lYW50IHRvIGJlIHNpbXBsaXN0aWMsIGlmIHlvdSBkb24ndCBnaXZlIG1lIG1vcmUgdGhhblxuXHRcdFx0XHQvLyBvbmUgY29sb3IgdG8gd29yayB3aXRoLCB5b3UncmUgZ2V0dGluZyB3aGl0ZSBvciBibGFjay5cblx0XHRcdFx0dmFyIGNvbXBhcmF0b3JzID0gKGFyZ3VtZW50cy5sZW5ndGggPiAxKSA/IGFyZ3VtZW50cyA6IFtcIiNFMUUxRTFcIiwgXCIjNDY0NjQ2XCJdLFxuXHRcdFx0XHRcdG9yaWdpbmFsUkdCID0gdGhpcy5yZ2IoKSxcblx0XHRcdFx0XHRicmlnaHRlc3QgPSB7IGRpZmZlcmVuY2U6IDAgfTtcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhcmF0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Ly9jYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgb3JpZ2luYWwgY29sb3IgYW5kIHRoZSBvbmUgd2Ugd2VyZSBnaXZlblxuXHRcdFx0XHRcdHZhciBjID0gY29sb3IoY29tcGFyYXRvcnNbaV0pLFxuXHRcdFx0XHRcdFx0bCA9IGx1bWlub3NpdHlEaWZmKG9yaWdpbmFsUkdCLCBjLnJnYigpKTtcblxuXHRcdFx0XHRcdC8vIGlmIGl0J3MgYnJpZ2h0ZXIgdGhhbiB0aGUgY3VycmVudCBicmlnaHRlc3QsIHN0b3JlIGl0IHRvIGNvbXBhcmUgYWdhaW5zdCBsYXRlciBvbmVzXG5cdFx0XHRcdFx0aWYgKGwgPiBicmlnaHRlc3QuZGlmZmVyZW5jZSkge1xuXHRcdFx0XHRcdFx0YnJpZ2h0ZXN0ID0ge1xuXHRcdFx0XHRcdFx0XHRkaWZmZXJlbmNlOiBsLFxuXHRcdFx0XHRcdFx0XHRjb2xvcjogY1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJldHVybiB0aGUgYnJpZ2hlc3QgY29sb3Jcblx0XHRcdFx0cmV0dXJuIGJyaWdodGVzdC5jb2xvcjtcblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG5cdC8vIGNyZWF0ZSB0aGUgaGV4IGZvciB0aGUgcmFuZG9tIHN0cmluZ1xuICAgIHZhciBoYXNoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZ1N0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBoYXNoID0gdGFnU3RyaW5nLmNoYXJDb2RlQXQoaSkgKyAoKGhhc2ggPDwgNSkgLSBoYXNoKTtcbiAgICB9XG4gICAgaGV4ID0gXCJcIlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IChoYXNoID4+IChpICogOCkpICYgMHhGRjtcbiAgICAgICAgaGV4ICs9ICgnMDAnICsgdmFsdWUudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTIpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xvcihoZXgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjb2xvclRhZztcbn07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHEpIHtcbiAgcmV0dXJuIHtcbiAgICByZWFkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgZmlsZXN5c3RlbS5yZWFkRmlsZShmaWxlLCBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgaWYgKHJlcy5lcnIpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVzLmVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaWFsb2cpIHtcbiAgcmV0dXJuIHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG4iLCJBcnJheS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKG9sZEluZGV4LCBuZXdJbmRleCkge1xuXG4gIGlmIChpc05hTihuZXdJbmRleCkgfHwgaXNOYU4ob2xkSW5kZXgpIHx8IG9sZEluZGV4IDwgMCB8fCBvbGRJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChuZXdJbmRleCA8IDApIHtcbiAgICBuZXdJbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIGlmIChuZXdJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIG5ld0luZGV4ID0gMDtcbiAgfVxuXG4gIHRoaXMuc3BsaWNlKG5ld0luZGV4LCAwLCB0aGlzLnNwbGljZShvbGRJbmRleCwgMSlbMF0pO1xuXG4gIHJldHVybiBuZXdJbmRleDtcbn07XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KSB7XG4gIEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXggPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xuXG4gICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5kaXNtaXNzKCdjYW5jZWwnKTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYWxlcnQ6IHJlcXVpcmUoJy4vYWxlcnQnKSxcbiAgY29uZmlybTogcmVxdWlyZSgnLi9jb25maXJtJyksXG4gIHByb21wdDogcmVxdWlyZSgnLi9wcm9tcHQnKVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLnBsYWNlaG9sZGVyID0gZGF0YS5wbGFjZWhvbGRlcjtcbiAgJHNjb3BlLmlucHV0ID0ge1xuICAgIHZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZVxuICB9O1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCRzY29wZS5pbnB1dC52YWx1ZSk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsInZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xudmFyIGNvbnRyb2xsZXJzID0gcmVxdWlyZSgnLi9jb250cm9sbGVycycpO1xuXG5tb2QuY29udHJvbGxlcignQWxlcnRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5hbGVydFxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdDb25maXJtQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWxJbnN0YW5jZScsXG4gICdkYXRhJyxcbiAgY29udHJvbGxlcnMuY29uZmlybVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdQcm9tcHRDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5wcm9tcHRcbl0pO1xuXG5tb2Quc2VydmljZSgnRGlhbG9nU2VydmljZScsIFtcbiAgJyRtb2RhbCcsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2RpYWxvZycsIFtcbiAgJ3VpLmJvb3RzdHJhcCdcbl0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkbW9kYWwpIHtcblxuICB2YXIgc2VydmljZSA9IHt9O1xuXG4gIHNlcnZpY2UuYWxlcnQgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9hbGVydC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdBbGVydEN0cmwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2VcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkucmVzdWx0O1xuXG4gIH07XG5cbiAgc2VydmljZS5jb25maXJtID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9kaWFsb2cvdmlld3MvY29uZmlybS5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdDb25maXJtQ3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB0aGlzLl9saXN0ID0gbnVsbDtcbiAgdGhpcy5fdHJlZSA9IG51bGw7XG5cbiAgdmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mc3dhdGNoJyk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy91dGlscy5leHRlbmQodGhpcy5fd2F0Y2hlZCwgZGF0YSk7XG5cbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCB0aGlzLl93YXRjaGVkKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGQnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdID0gZnNvO1xuXG4gICAgdGhpcy5lbWl0KCdhZGQnLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZERpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCB0cnVlKTtcblxuICAgIHRoaXMuX3dhdGNoZWRbZnNvLnBhdGhdID0gZnNvO1xuXG4gICAgdGhpcy5lbWl0KCdhZGREaXInLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgLy8gY2hlY2sgd2UgZ290IHNvbWV0aGluZ1xuICAgIGlmIChmc28pIHtcbiAgICAgIHRoaXMuZW1pdCgnbW9kaWZpZWQnLCBmc28pO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuICAgICAgdGhpcy5lbWl0KCd1bmxpbmsnLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGlua0RpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcbiAgICAgIHRoaXMuZW1pdCgndW5saW5rRGlyJywgZnNvKTtcbiAgICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG4gICAgfVxuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdlcnJvcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHJlcy5lcnIpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gIHRoaXMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpc3QgPSBudWxsO1xuICAgIHRoaXMuX3RyZWUgPSBudWxsO1xuICB9KTtcblxufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9saXN0KSB7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fbGlzdC5wdXNoKHRoaXMuX3dhdGNoZWRba2V5c1tpXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3RyZWUpIHtcbiAgICAgICAgdGhpcy5fdHJlZSA9IHRyZWVpZnkodGhpcy5fd2F0Y2hlZCwgJ3BhdGgnLCAnZGlyJywgJ2NoaWxkcmVuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgfVxufSk7XG5lbWl0dGVyKEZpbGVTeXN0ZW1XYXRjaGVyLnByb3RvdHlwZSk7XG5cbnZhciBGaWxlU3lzdGVtV2F0Y2hlciA9IG5ldyBGaWxlU3lzdGVtV2F0Y2hlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1XYXRjaGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItY29tcG9uZW50Jyk7O1xuXG4vKlxuICogRmlsZVN5c3RlbSBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGaWxlU3lzdGVtKHNvY2tldCkge1xuXG4gIHNvY2tldC5vbignbWtkaXInLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtkaXInLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdta2ZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29weScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb3B5JywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVuYW1lJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbmFtZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW1vdmUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZWFkZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZWFkZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3dyaXRlZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCd3cml0ZWZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG59XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2RpciA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2RpcicsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2ZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnY29weScsIHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVuYW1lJywgb2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW1vdmUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVhZGZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUud3JpdGVGaWxlID0gZnVuY3Rpb24ocGF0aCwgY29udGVudHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCd3cml0ZWZpbGUnLCBwYXRoLCBjb250ZW50cywgY2FsbGJhY2spO1xufTtcblxuZW1pdHRlcihGaWxlU3lzdGVtLnByb3RvdHlwZSk7XG5cblxudmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mcycpO1xuXG52YXIgZmlsZVN5c3RlbSA9IG5ldyBGaWxlU3lzdGVtKHNvY2tldCk7XG5cbmZpbGVTeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdmcyBjb25uZWN0ZWQnICsgZGF0YSk7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZpbGVTeXN0ZW07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgJHN0YXRlUHJvdmlkZXJcbiAgICAuc3RhdGUoJ2FwcC5mcycsIHtcbiAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgLy91cmw6ICdmcycsXG4gICAgICAvLyBjb250cm9sbGVyOiAnRnNDdHJsJyxcbiAgICAgIC8vdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2luZGV4Lmh0bWwnLFxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZmluZGVyJywge1xuICAgICAgdXJsOiAnL2ZpbmRlcicsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJ1xuICAgICAgICAgIGNvbnRyb2xsZXI6ICdGc0ZpbmRlckN0cmwnLFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9maW5kZXIuaHRtbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gICAgICB1cmw6ICcvZmlsZS86cGF0aCcsXG4gICAgICBjb250cm9sbGVyOiAnRnNGaWxlQ3RybCcsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZmlsZS5odG1sJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZmlsZVByb21pc2U6IFsnJHEnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgZmlsZXN5c3RlbS5yZWFkRmlsZShwYXRoLCBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuc2VhcmNoJywge1xuICAgICAgdXJsOiAnL3NlYXJjaD9xJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnLFxuICAgICAgICAgIGNvbnRyb2xsZXI6ICdGc1NlYXJjaEN0cmwnLFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9zZWFyY2guaHRtbCcsXG4gICAgICAgICAgLy8gcmVzb2x2ZToge1xuICAgICAgICAgIC8vICAgZGlyOiBbJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgLy8gICAgIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgIC8vICAgICAgIHZhciBwYXRoID0gdXRpbHMuZGVjb2RlU3RyaW5nKCRzdGF0ZVBhcmFtcy5wYXRoKTtcbiAgICAgICAgICAvLyAgICAgICByZXR1cm4gd2F0Y2hlci5tYXBbcGF0aF07XG4gICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAvLyAgIF1cbiAgICAgICAgICAvLyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmRpcicsIHtcbiAgICAgIHVybDogJy9kaXIvOnBhdGgnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRGlyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2Rpci5odG1sJyxcbiAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsIGRpciwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmRpciA9IGRpcjtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgZmlsZSwgZmlsZVNlcnZpY2UpIHtcbiAgdmFyIGlzVXRmOCA9ICEoZmlsZS5jb250ZW50cyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAkc2NvcGUuZmlsZSA9IGZpbGU7XG5cbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmc28gPSBtb2RlbC5tYXBbZmlsZS5wYXRoXTtcblxuICAvLyBlbnN1cmUgdGhlIGZpbmRlciBpcyBzZXQgdGhlIHRoZSByaWdodCBmc29cbiAgJHNjb3BlLmZpbmRlci5hY3RpdmUgPSBmc287XG5cbiAgbW9kZWwuYWRkUmVjZW50RmlsZShmc28pO1xuXG4gIHZhciB2aWV3ZXI7XG5cbiAgJHNjb3BlLnZpZXdlciA9ICdhY2UnO1xuXG4gICRzY29wZS5hY2VPcHRpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG1vZGU7XG5cbiAgICB2YXIgbW9kZXMgPSB7XG4gICAgICBcIi5qc1wiOiBcImFjZS9tb2RlL2phdmFzY3JpcHRcIixcbiAgICAgIFwiLmNzc1wiOiBcImFjZS9tb2RlL2Nzc1wiLFxuICAgICAgXCIuaHRtbFwiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgICAgIFwiLmh0bVwiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgICAgIFwiLmVqc1wiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgICAgIFwiLmpzb25cIjogXCJhY2UvbW9kZS9qc29uXCIsXG4gICAgICBcIi5tZFwiOiBcImFjZS9tb2RlL21hcmtkb3duXCIsXG4gICAgICBcIi5jb2ZmZWVcIjogXCJhY2UvbW9kZS9jb2ZmZWVcIixcbiAgICAgIFwiLmphZGVcIjogXCJhY2UvbW9kZS9qYWRlXCIsXG4gICAgICBcIi5waHBcIjogXCJhY2UvbW9kZS9waHBcIixcbiAgICAgIFwiLnB5XCI6IFwiYWNlL21vZGUvcHl0aG9uXCIsXG4gICAgICBcIi5zY3NzXCI6IFwiYWNlL21vZGUvc2Fzc1wiLFxuICAgICAgXCIudHh0XCI6IFwiYWNlL21vZGUvdGV4dFwiLFxuICAgICAgXCIudHlwZXNjcmlwdFwiOiBcImFjZS9tb2RlL3R5cGVzY3JpcHRcIixcbiAgICAgIFwiLnhtbFwiOiBcImFjZS9tb2RlL3htbFwiXG4gICAgfTtcblxuICAgIG1vZGUgPSBtb2Rlc1tmaWxlLmV4dF07XG5cbiAgICBpZiAobW9kZSkge1xuICAgICAgbW9kZSA9IG1vZGUuc3Vic3RyKDkpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBvbkxvYWQgOiAkc2NvcGUuYWNlTG9hZGVkLFxuICAgICAgbW9kZTogbW9kZVxuICAgIH07XG4gIH07XG5cbiAgJHNjb3BlLmFjZUxvYWRlZCA9IGZ1bmN0aW9uKF9lZGl0b3Ipe1xuICAgIC8vIEVkaXRvciBwYXJ0XG4gICAgdmFyIF9zZXNzaW9uID0gX2VkaXRvci5nZXRTZXNzaW9uKCk7XG4gICAgdmFyIF9yZW5kZXJlciA9IF9lZGl0b3IucmVuZGVyZXI7XG5cbiAgICAvLyBPcHRpb25zXG4gICAgX2VkaXRvci5zZXRSZWFkT25seSh0cnVlKTtcbiAgICBfc2Vzc2lvbi5zZXRVbmRvTWFuYWdlcihuZXcgYWNlLlVuZG9NYW5hZ2VyKCkpO1xuICAgIF9yZW5kZXJlci5zZXRTaG93R3V0dGVyKGZhbHNlKTtcblxuICAgIC8vIEV2ZW50c1xuICAgIF9lZGl0b3Iub24oXCJjaGFuZ2VTZXNzaW9uXCIsIGZ1bmN0aW9uKCl7ICB9KTtcbiAgICBfc2Vzc2lvbi5vbihcImNoYW5nZVwiLCBmdW5jdGlvbigpeyAgfSk7XG4gIH07XG5cbiAgZnVuY3Rpb24gaW1nVXJsKCkge1xuICAgIC8vIE9idGFpbiBhIGJsb2I6IFVSTCBmb3IgdGhlIGltYWdlIGRhdGEuXG4gICAgdmFyIGFycmF5QnVmZmVyVmlldyA9IG5ldyBVaW50OEFycmF5KCBmaWxlLmNvbnRlbnRzICk7XG4gICAgdmFyIGJsb2IgPSBuZXcgQmxvYiggWyBhcnJheUJ1ZmZlclZpZXcgXSwgeyB0eXBlOiBcImltYWdlL1wiICsgZmlsZS5leHQuc3Vic3RyKDEpIH0gKTtcbiAgICB2YXIgdXJsQ3JlYXRvciA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICB2YXIgdXJsID0gdXJsQ3JlYXRvci5jcmVhdGVPYmplY3RVUkwoIGJsb2IgKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgaWYgKCFpc1V0ZjgpIHtcblxuICAgICRzY29wZS52aWV3ZXIgPSAnJztcblxuICAgIHN3aXRjaCAoZmlsZS5leHQpIHtcbiAgICBjYXNlICcucG5nJzpcbiAgICBjYXNlICcuanBnJzpcbiAgICBjYXNlICcuanBlZyc6XG4gICAgY2FzZSAnLmdpZic6XG4gICAgY2FzZSAnLmljbyc6XG4gICAgICAkc2NvcGUudmlld2VyID0gJ2ltZyc7XG4gICAgICAkc2NvcGUuaW1nVXJsID0gaW1nVXJsKCk7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuXG4gICAgfVxuXG4gIH1cblxuXG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaW5kZXJNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9maW5kZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvZywgZGlhbG9nLCBmaWxlU2VydmljZSwgcmVzcG9uc2VIYW5kbGVyKSB7XG5cbiAgdmFyIGV4cGFuZGVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAkc2NvcGUudHJlZURhdGEgPSB7XG4gICAgc2hvd01lbnU6IGZhbHNlXG4gIH07XG4gICRzY29wZS5hY3RpdmUgPSBudWxsO1xuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIHZhciBwYXRoID0gJHN0YXRlLnBhcmFtcy5wYXRoID8gdXRpbHMuZGVjb2RlU3RyaW5nKCRzdGF0ZS5wYXJhbXMucGF0aCkgOiBudWxsO1xuICB2YXIgbW9kZWwgPSAkc2NvcGUubW9kZWw7XG5cbiAgdmFyIGZpbmRlciA9IG5ldyBGaW5kZXJNb2RlbChwYXRoID8gbW9kZWwubGlzdC5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBwYXRoO1xuICB9KSA6IG1vZGVsLnRyZWUpO1xuXG4gICRzY29wZS5maW5kZXIgPSBmaW5kZXI7XG5cbiAgZnVuY3Rpb24gZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayhyZXNwb25zZSkge1xuICAgIC8vIG5vdGlmeSBvZiBhbnkgZXJyb3JzLCBvdGhlcndpc2Ugc2lsZW50LlxuICAgIC8vIFRoZSBGaWxlIFN5c3RlbSBXYXRjaGVyIHdpbGwgaGFuZGxlIHRoZSBzdGF0ZSBjaGFuZ2VzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgIGlmIChyZXNwb25zZS5lcnIpIHtcbiAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZS5lcnIpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkc2NvcGUucmlnaHRDbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBjb25zb2xlLmxvZygnUkNsaWNrZWQgJyArIGZzby5uYW1lKTtcbiAgICAkc2NvcGUubWVudVggPSBlLnBhZ2VYO1xuICAgICRzY29wZS5tZW51WSA9IGUucGFnZVk7XG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcbiAgICAkc2NvcGUudHJlZURhdGEuc2hvd01lbnUgPSB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5jbGlja05vZGUgPSBmdW5jdGlvbihmc28pIHtcblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBmaW5kZXIuYWN0aXZlID0gZnNvO1xuXG4gICAgaWYgKCFmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICRzdGF0ZS5nbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZnNvLnBhdGgpXG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdEZWxldGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucmVuYW1lID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnUmVuYW1lICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciBhIG5ldyBuYW1lJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogZnNvLm5hbWUsXG4gICAgICBwbGFjZWhvbGRlcjogZnNvLmlzRGlyZWN0b3J5ID8gJ0ZvbGRlciBuYW1lJyA6ICdGaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIG9sZFBhdGggPSBmc28ucGF0aDtcbiAgICAgIHZhciBuZXdQYXRoID0gcC5yZXNvbHZlKGZzby5kaXIsIHZhbHVlKTtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKG9sZFBhdGgsIG5ld1BhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdSZW5hbWUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtmaWxlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmaWxlJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRmlsZSBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2ZpbGUocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBkaXJlY3RvcnkgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucGFzdGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2NvcHknKSB7XG4gICAgICBmaWxlc3lzdGVtLmNvcHkocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY3V0Jykge1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIH07XG5cbiAgJHNjb3BlLnNob3dQYXN0ZSA9IGZ1bmN0aW9uKGUsIGFjdGl2ZSkge1xuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlciAmJiBhY3RpdmUuaXNEaXJlY3RvcnkpIHtcbiAgICAgIGlmICghcGFzdGVCdWZmZXIuZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGFzdGVCdWZmZXIuZnNvLnBhdGgudG9Mb3dlckNhc2UoKSkgIT09IDApIHsgLy8gZGlzYWxsb3cgcGFzdGluZyBpbnRvIHNlbGYgb3IgYSBkZWNlbmRlbnRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuc2V0UGFzdGVCdWZmZXIgPSBmdW5jdGlvbihlLCBmc28sIG9wKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSB7XG4gICAgICBmc286IGZzbyxcbiAgICAgIG9wOiBvcFxuICAgIH07XG5cbiAgfTtcblxuICAkc2NvcGUubm90TW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgKGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBmc28ubmFtZSA9PT0gJ2Jvd2VyX2NvbXBvbmVudHMnKSA/IGZhbHNlIDogdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUubm9kZU1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSkge1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSkge1xuICAkc2NvcGUubW9kZWwucSA9ICRzdGF0ZS5wYXJhbXMucTtcbn07XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbCwgJGxvZywgZGlhbG9nLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICB2YXIgZXhwYW5kZWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICRzY29wZS50cmVlRGF0YSA9IHtcbiAgICBzaG93TWVudTogZmFsc2VcbiAgfTtcbiAgJHNjb3BlLmFjdGl2ZSA9IG51bGw7XG4gICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgZnVuY3Rpb24gZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayhyZXNwb25zZSkge1xuICAgIC8vIG5vdGlmeSBvZiBhbnkgZXJyb3JzLCBvdGhlcndpc2Ugc2lsZW50LlxuICAgIC8vIFRoZSBGaWxlIFN5c3RlbSBXYXRjaGVyIHdpbGwgaGFuZGxlIHRoZSBzdGF0ZSBjaGFuZ2VzIGluIHRoZSBmaWxlIHN5c3RlbVxuICAgIGlmIChyZXNwb25zZS5lcnIpIHtcbiAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gRXJyb3InLFxuICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyZXNwb25zZS5lcnIpXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkc2NvcGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICAgIGNsYXNzZXMucHVzaChmc28uaXNEaXJlY3RvcnkgPyAnZGlyJyA6ICdmaWxlJyk7XG5cbiAgICBpZiAoZnNvID09PSAkc2NvcGUuYWN0aXZlKSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHZhciBjbGFzc2VzID0gWydmYSddO1xuXG4gICAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKCRzY29wZS5pc0V4cGFuZGVkKGZzbykgPyAnZmEtZm9sZGVyLW9wZW4nIDogJ2ZhLWZvbGRlcicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjbGFzc2VzLnB1c2goJ2ZhLWZpbGUtbycpO1xuICAgIH1cblxuICAgIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbiAgfTtcblxuICAkc2NvcGUuaXNFeHBhbmRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiAhIWV4cGFuZGVkW2Zzby5wYXRoXTtcbiAgfTtcblxuICAkc2NvcGUucmlnaHRDbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBjb25zb2xlLmxvZygnUkNsaWNrZWQgJyArIGZzby5uYW1lKTtcbiAgICAkc2NvcGUubWVudVggPSBlLnBhZ2VYO1xuICAgICRzY29wZS5tZW51WSA9IGUucGFnZVk7XG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcbiAgICAkc2NvcGUudHJlZURhdGEuc2hvd01lbnUgPSB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5jbGlja05vZGUgPSBmdW5jdGlvbihlLCBmc28pIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICB2YXIgaXNFeHBhbmRlZCA9ICRzY29wZS5pc0V4cGFuZGVkKGZzbyk7XG4gICAgICBpZiAoaXNFeHBhbmRlZCkge1xuICAgICAgICBkZWxldGUgZXhwYW5kZWRbZnNvLnBhdGhdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXhwYW5kZWRbZnNvLnBhdGhdID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgJHNjb3BlLm9wZW4oZnNvKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLmRlbGV0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgdGl0bGU6ICdEZWxldGUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnRGVsZXRlIFsnICsgZnNvLm5hbWUgKyAnXS4gQXJlIHlvdSBzdXJlPydcbiAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgZmlsZXN5c3RlbS5yZW1vdmUoZnNvLnBhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdEZWxldGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucmVuYW1lID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnUmVuYW1lICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciBhIG5ldyBuYW1lJyxcbiAgICAgIGRlZmF1bHRWYWx1ZTogZnNvLm5hbWUsXG4gICAgICBwbGFjZWhvbGRlcjogZnNvLmlzRGlyZWN0b3J5ID8gJ0ZvbGRlciBuYW1lJyA6ICdGaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdmFyIG9sZFBhdGggPSBmc28ucGF0aDtcbiAgICAgIHZhciBuZXdQYXRoID0gcC5yZXNvbHZlKGZzby5kaXIsIHZhbHVlKTtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKG9sZFBhdGgsIG5ld1BhdGgsIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdSZW5hbWUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtmaWxlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmaWxlJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRmlsZSBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmaWxlIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2ZpbGUocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGZpbGUgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUubWtkaXIgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZvbGRlcicsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZvbGRlciBuYW1lJyxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgdGhlIG5ldyBmb2xkZXIgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZGlyKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBkaXJlY3RvcnkgbW9kYWwgZGlzbWlzc2VkJyk7XG4gICAgfSk7XG5cbiAgfTtcblxuICAkc2NvcGUucGFzdGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2NvcHknKSB7XG4gICAgICBmaWxlc3lzdGVtLmNvcHkocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9IGVsc2UgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY3V0Jykge1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUocGFzdGVCdWZmZXIuZnNvLnBhdGgsIHAucmVzb2x2ZShmc28ucGF0aCwgcGFzdGVCdWZmZXIuZnNvLm5hbWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIH07XG5cbiAgJHNjb3BlLnNob3dQYXN0ZSA9IGZ1bmN0aW9uKGUsIGFjdGl2ZSkge1xuICAgIHZhciBwYXN0ZUJ1ZmZlciA9ICRzY29wZS5wYXN0ZUJ1ZmZlcjtcblxuICAgIGlmIChwYXN0ZUJ1ZmZlciAmJiBhY3RpdmUuaXNEaXJlY3RvcnkpIHtcbiAgICAgIGlmICghcGFzdGVCdWZmZXIuZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBlbHNlIGlmIChhY3RpdmUucGF0aC50b0xvd2VyQ2FzZSgpLmluZGV4T2YocGFzdGVCdWZmZXIuZnNvLnBhdGgudG9Mb3dlckNhc2UoKSkgIT09IDApIHsgLy8gZGlzYWxsb3cgcGFzdGluZyBpbnRvIHNlbGYgb3IgYSBkZWNlbmRlbnRcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuc2V0UGFzdGVCdWZmZXIgPSBmdW5jdGlvbihlLCBmc28sIG9wKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkc2NvcGUucGFzdGVCdWZmZXIgPSB7XG4gICAgICBmc286IGZzbyxcbiAgICAgIG9wOiBvcFxuICAgIH07XG5cbiAgfTtcblxuICAkc2NvcGUubm90TW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgKGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyB8fCBmc28ubmFtZSA9PT0gJ2Jvd2VyX2NvbXBvbmVudHMnKSA/IGZhbHNlIDogdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUubm9kZU1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIGZzby5uYW1lID09PSAnbm9kZV9tb2R1bGVzJyA/IHRydWUgOiBmYWxzZTtcbiAgfTtcbn07XG4iLCJ2YXIgbW9kID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRmluZGVyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmluZGVyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaWxlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdmaWxlUHJvbWlzZScsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmlsZScpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzU2VhcmNoQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NlYXJjaCcpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRGlyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdkaXInLFxuICAnRmlsZVNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RpcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzVHJlZUN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsJyxcbiAgJyRsb2cnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdSZXNwb25zZUhhbmRsZXInLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3RyZWUnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwiZnVuY3Rpb24gRmluZGVyTW9kZWwoYWN0aXZlKSB7XG4gIC8vIHRoaXMudHJlZSA9IHRyZWU7XG4gIHRoaXMuYWN0aXZlID0gYWN0aXZlO1xufVxuRmluZGVyTW9kZWwucHJvdG90eXBlLl9yZWFkQ29scyA9IGZ1bmN0aW9uKHRyZWUpIHtcblxuICAvL3ZhciB0cmVlID0gdGhpcy5fdHJlZTtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgLy92YXIgYWN0aXZlSXNEaXIgPSBhY3RpdmUuaXNEaXJlY3Rvcnk7XG5cbiAgdmFyIGNvbHMgPSBbXTtcblxuICBpZiAoYWN0aXZlKSB7XG5cbiAgICB2YXIgY3VyciA9IGFjdGl2ZS5pc0RpcmVjdG9yeSA/IGFjdGl2ZSA6IGFjdGl2ZS5wYXJlbnQ7XG4gICAgZG8ge1xuICAgICAgY29scy51bnNoaWZ0KGN1cnIuY2hpbGRyZW4pO1xuICAgICAgY3VyciA9IGN1cnIucGFyZW50O1xuICAgIH0gd2hpbGUgKGN1cnIpO1xuXG4gICAgY29scy5zaGlmdCgpO1xuXG4gIH0gZWxzZSB7XG4gICAgY29scy5wdXNoKHRyZWUuY2hpbGRyZW4pO1xuICB9XG5cbiAgcmV0dXJuIGNvbHM7XG5cbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0Q2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBjbGFzc2VzID0gWydmc28nXTtcbiAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICBpZiAoZnNvID09PSB0aGlzLmFjdGl2ZSkge1xuICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmdldEljb25DbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgIGNsYXNzZXMucHVzaCh0aGlzLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3Blbi1vJyA6ICdmYS1mb2xkZXItbycpO1xuICB9IGVsc2Uge1xuICAgIGNsYXNzZXMucHVzaCgnZmEtZmlsZScpO1xuICB9XG5cbiAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5pc0hpZ2hsaWdodGVkID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBhY3RpdmUgPSB0aGlzLl9hY3RpdmU7XG4gIHZhciBpc0hpZ2hsaWdodGVkID0gZmFsc2U7XG5cbiAgaWYgKGZzbyA9PT0gYWN0aXZlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoYWN0aXZlICYmIGZzby5pc0RpcmVjdG9yeSkge1xuICAgIC8vIGNoZWNrIGlmIGl0IGlzIGFuIGFuY2VzdG9yXG4gICAgdmFyIHIgPSBhY3RpdmU7XG4gICAgd2hpbGUgKHIucGFyZW50KSB7XG4gICAgICBpZiAociA9PT0gZnNvKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgciA9IHIucGFyZW50O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuaXNFeHBhbmRlZCA9IGZ1bmN0aW9uKGRpcikge1xuICByZXR1cm4gdGhpcy5pc0hpZ2hsaWdodGVkKGRpcik7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmNvbHMgPSBmdW5jdGlvbih0cmVlKSB7XG4gIHJldHVybiB0aGlzLl9yZWFkQ29scyh0cmVlKTtcbn07XG5cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmluZGVyTW9kZWwucHJvdG90eXBlLCB7XG4gIGFjdGl2ZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fYWN0aXZlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fYWN0aXZlID0gdmFsdWU7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlck1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZnMnLCBbXSk7XG4iLCJcblxud2luZG93LmFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cblxuLy93aW5kb3cuZnMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbi8vIC8vICoqKioqKioqKiovLypcbi8vIC8vIFNoaW1zXG4vLyAvLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9hcnJheScpO1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBEaXJlY3RpdmVzXG4vLyAvLyAqKioqKioqKioqKlxuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9uZWdhdGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9yaWdodC1jbGljaycpO1xuLy8gLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9iZWhhdmUnKTtcbi8vXG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIENvbnRyb2xsZXJzXG4vLyAvLyAqKioqKioqKioqKlxuLy9cbi8vIC8vIGRpYWxvZyBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9jb25maXJtJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2FsZXJ0Jyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3Byb21wdCcpO1xuLy9cbi8vIC8vIGhvbWUgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9ob21lJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvdHJlZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbGUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9maW5kZXInKTtcbi8vXG4vLyAvLyBkYiBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9rZXknKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXJyYXktZGVmJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuLy9cbi8vXG4vLyAvLyBhcGkgbW9kZWwgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FwaScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvY29udHJvbGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvaGFuZGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvcm91dGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FjdGlvbicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWRkLXJlc291cmNlJyk7XG4vL1xuLy9cbi8vIC8vIG1haW4gYXBwIGNvbnRyb2xsZXJcbi8vIHJlcXVpcmUoJy4vYXBwL2NvbnRyb2xsZXJzL2FwcCcpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gU2VydmljZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL3NlcnZpY2VzL2RpYWxvZycpO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG5cbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gZnVuY3Rpb24ocGF0aCwgc3RhdCkge1xuICB0aGlzLm5hbWUgPSBwLmJhc2VuYW1lKHBhdGgpIHx8IHBhdGg7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuZGlyID0gcC5kaXJuYW1lKHBhdGgpO1xuICB0aGlzLmlzRGlyZWN0b3J5ID0gdHlwZW9mIHN0YXQgPT09ICdib29sZWFuJyA/IHN0YXQgOiBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gIHRoaXMuZXh0ID0gcC5leHRuYW1lKHBhdGgpO1xuICB0aGlzLnN0YXQgPSBzdGF0O1xufTtcbkZpbGVTeXN0ZW1PYmplY3QucHJvdG90eXBlID0ge1xuICBnZXQgaXNGaWxlKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0RpcmVjdG9yeTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbU9iamVjdDtcbiIsIi8qIGdsb2JhbCBkaWFsb2cgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHJuZHN0cjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xuICB9LFxuICBnZXR1aWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnJhbmRvbSgpICogMWU3KSkudG9TdHJpbmcoKTtcbiAgfSxcbiAgZ2V0dWlkc3RyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygzNik7XG4gIH0sXG4gIHVybFJvb3Q6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbiAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdDtcbiAgfSxcbiAgZW5jb2RlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gYnRvYShlbmNvZGVVUklDb21wb25lbnQoc3RyKSk7XG4gIH0sXG4gIGRlY29kZVN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChhdG9iKHN0cikpO1xuICB9LFxuICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgICBpZiAoIWFkZCB8fCB0eXBlb2YgYWRkICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG9yaWdpbjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gICAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiBvcmlnaW47XG4gIH0sXG4gIHVpOiB7XG4gICAgcmVzcG9uc2VIYW5kbGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJzcCwgc2hvd0Vycm9yKSB7XG4gICAgICAgIHNob3dFcnJvciA9IHNob3dFcnJvciB8fCB0cnVlO1xuICAgICAgICBpZiAocnNwLmVycikge1xuICAgICAgICAgIGlmIChzaG93RXJyb3IpIHtcbiAgICAgICAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyc3AuZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZuKHJzcC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH1cbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicSs2NGZ3XCIpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
