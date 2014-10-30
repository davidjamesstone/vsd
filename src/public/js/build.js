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

},{"../../../../shared/utils":34,"../../file-system":19,"../../file-system-watcher":18}],3:[function(require,module,exports){
var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');
var utils = require('../../../../shared/utils');

module.exports = function($scope, $state, fs, watcher, fileService, dialog, colorService, sessionService) {

  var model = new AppModel({
    fs: fs,
    watcher: watcher,
    sessionService: sessionService
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
  //
  // $scope.fileUrl = function(file) {
  //   return $state.href('app.fs.finder.file', {
  //     path: utils.encodeString(file.path || file)
  //   });
  // };

  $scope.gotoFile = function(file) {
    return $state.transitionTo('app.fs.finder.file', {
      path: utils.encodeString(file.path || file)
    });
  };

  $scope.fileParams = function(file) {
    return { path: utils.encodeString(file.path)};
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

  $scope.contentClass = function(item) {
    return 'qsdsa';
  };


  function saveSession(session) {
    var path = session.path;
    var editSession = session.data;
    var contents = editSession.getValue();

    console.log('writeFile', path);

    fs.writeFile(path, contents, function(rsp) {

      if (rsp.err) {

        dialog.alert({
          title: 'File System Write Error',
          message: JSON.stringify(rsp.err)
        });

        console.log('writeFile Failed', path, rsp.err);

      } else {

        console.log('writeFile Succeeded', path);

        session.markClean();
        $scope.$apply();
      }
    });
  }


  $scope.saveSession = function(session) {
    saveSession(session);
  };
  $scope.saveAllSessions = function() {
    var sessions = sessionService.dirty;

    sessions.forEach(function(item) {
      saveSession(item);
    });
  };

  $scope.encodePath = utils.encodeString;
  $scope.decodePath = utils.decodeString;
};

},{"../../../../shared/file-system-object":33,"../../../../shared/utils":34,"../models/app":5}],4:[function(require,module,exports){
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
  'SessionService',
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
  this.sessions = data.sessionService;

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
  return p.relative(this.tree.dir, path);
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

      return recent.map(function(item) {
        return this.map[item.path];
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

},{"../../../../shared/utils":34,"path":35}],6:[function(require,module,exports){
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

    console.log('Watcher connection');

    this.emit('connection', this._watched);
    this.emit('change');

  }.bind(this));

  socket.on('add', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, false);

    this._watched[data.path] = fso;

    console.log('Watcher add', fso);

    this.emit('add', fso);
    this.emit('change');

  }.bind(this));

  socket.on('addDir', function(res) {

    var data = res.data;
    var fso = new FileSystemObject(data.path, true);

    this._watched[fso.path] = fso;

    console.log('Watcher addDir', fso);

    this.emit('addDir', fso);
    this.emit('change');

  }.bind(this));

  socket.on('change', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    // check we got something
    if (fso) {

      console.log('Watcher change', fso);

      this.emit('modified', fso);
    }

  }.bind(this));

  socket.on('unlink', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];

      console.log('Watcher unlink', fso);

      this.emit('unlink', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('unlinkDir', function(res) {

    var data = res.data;
    var fso = this._watched[data.path];

    if (fso) {
      delete this._watched[data.path];

      console.log('Watcher unlinkDir', fso);

      this.emit('unlinkDir', fso);
      this.emit('change');
    }

  }.bind(this));

  socket.on('error', function(res) {

    console.log('Watcher error', res.err);

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

},{"../../shared/file-system-object":33,"../../shared/utils":34,"emitter-component":1}],19:[function(require,module,exports){
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
  console.log('fs connected', data);
});


module.exports = fileSystem;

},{"../../shared/utils":34,"emitter-component":1}],20:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');
var EditSession = ace.require('ace/edit_session').EditSession;
var UndoManager = ace.require('ace/undomanager').UndoManager;

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
        session: ['$q', '$stateParams', 'FileService', 'SessionService',
          function($q, $stateParams, fileService, sessionService) {
            var deferred = $q.defer();
            var path = utils.decodeString($stateParams.path);

            console.log('Requested file ' + path);
            
            var session = sessionService.findSession(path);

            if (session) {

              console.log('Using found session.');
              deferred.resolve(session);

            } else {

              console.log('Reading file for new session.');
              fileService.readFile(path).then(function(file) {

                var isUtf8 = !(file.contents instanceof ArrayBuffer);

                var sessionData;
                if (isUtf8) {
                  sessionData = new EditSession(file.contents, modes[file.ext]);
                  sessionData.setUndoManager(new UndoManager());
                } else {
                  sessionData = file.contents;
                }

                session = sessionService.addSession(path, sessionData, isUtf8);

                deferred.resolve(session);

              });
            }
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

},{"../../../../shared/utils":34,"../../file-system":19,"../../file-system-watcher":18}],21:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],22:[function(require,module,exports){
module.exports = function($scope, session, fileService) {
  var isUtf8 = session.isUtf8;


  var model = $scope.model;

  var file = model.map[session.path];

  $scope.file = file;

  // ensure the finder is set the the right fso
  $scope.finder.active = file;

  model.addRecentFile(file);

  function imgUrl() {
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array(session.data);
    var blob = new Blob([arrayBufferView], {
      type: 'image/' + file.ext.substr(1)
    });
    var urlCreator = window.URL || window.webkitURL;
    var url = urlCreator.createObjectURL(blob);
    return url;
  }

  if (isUtf8) {

    $scope.viewer = 'ace';
    $scope.$parent.showEditor = true;

    if ($scope.editor) {
      $scope.editor.setSession(session.data);
      var doc = session.data.getDocument();
    $scope.editor.setOption("maxLines", 600 /*doc.getLength()*/);
    }

  } else {

    $scope.viewer = '';
    $scope.$parent.showEditor = false;

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
  $scope.showEditor = false;

  $scope.aceLoaded = function(editor) {

    $scope.editor = editor;

  };
  
  $scope.aceChanged = function(editor) {

    $scope.$apply();

  };

//
//   if (!$scope.editor) {
//     console.log('created editor');
//     $scope.editor = ace.edit("ace");
//     $scope.editor.getSession().setMode("ace/mode/javascript");
//   }
// $scope.$on('$destroy', function () {
//   console.log('destroy');
//   //$scope.editor.getSession().$stopWorker();
//   $scope.editor.setSession(null);
//   $scope.editor.destroy();
// });

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

},{"../../../../shared/utils":34,"../../file-system":19,"../models/finder":28,"path":35}],24:[function(require,module,exports){
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

},{"../../file-system":19,"path":35}],27:[function(require,module,exports){
var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.service('SessionService', [
  require('./services/session')
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
  'session',
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

},{"./config":20,"./controllers":24,"./controllers/dir":21,"./controllers/file":22,"./controllers/finder":23,"./controllers/search":25,"./controllers/tree":26,"./module":30,"./services/session":31}],28:[function(require,module,exports){
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
function Session(data) {
  data = data || {};
  this.path = data.path;
  this.time = data.time;
  this.data = data.data || {};
  this.isUtf8 = data.isUtf8;
}
Session.prototype.markClean = function() {
  if (this.data.getUndoManager) {
    this.data.getUndoManager().markClean();
  }
};
Object.defineProperties(Session.prototype, {
  isDirty: {
    get: function() {
      if (this.data.getUndoManager) {
        return !this.data.getUndoManager().isClean();
      }
    }
  }
});
module.exports = Session;

},{}],30:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],31:[function(require,module,exports){
var Session = require('../models/session');
var fsw = require('../../file-system-watcher');

var Sessions = function(map) {
  this._sessions = [];
  this._map = map;
};
Sessions.prototype.findSession = function(path) {
  var sessions = this._sessions;

  return sessions.find(function(item) {
    return item.path === path;
  });

};
Sessions.prototype.addSession = function(path, data, isUtf8) {

  if (this.findSession(path)) {
    throw new Error('Session for path exists already.');
  }

  var sessions = this._sessions;
  var session = new Session({
    path: path,
    time: Date.now(),
    data: data,
    isUtf8: isUtf8
  });
  sessions.unshift(session);

  return session;
};

Object.defineProperties(Sessions.prototype, {
  sessions: {
    get: function() {
      var sessions = this._sessions;
      return sessions;
      // var map = this._map;
      //
      // // clean any files that may no longer exist
      // // var i = sessions.length;
      // // while (i--) {
      // //   if (!map[sessions[i].path]) {
      // //     sessions.splice(i, 1);
      // //   }
      // // }
      //
      // return sessions.map(function(item) {
      //   return map[item.path];
      // }, this);

    }
  },
  dirty: {
    get: function() {
      var sessions = this._sessions;
      return this.sessions.filter(function(item) {
        return item.isDirty;
      });
    }
  }
});


/*
 * module exports
 */
module.exports = function() {

  var sessions = new Sessions(fsw.map);
  return sessions;

};

},{"../../file-system-watcher":18,"../models/session":29}],32:[function(require,module,exports){


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

},{"./app":4,"./array":10}],33:[function(require,module,exports){
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

},{"path":35}],34:[function(require,module,exports){
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

},{}],35:[function(require,module,exports){
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
},{"q+64fw":36}],36:[function(require,module,exports){
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

},{}]},{},[32])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2VtaXR0ZXItY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9jb2xvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcnJheS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvYWxlcnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2NvbmZpcm0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS13YXRjaGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9kaXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvc2VhcmNoLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3RyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2RlbHMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvc2VydmljZXMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL3V0aWxzLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwTUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHNlbGYub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9cbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6ICdBcHBDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvaW5kZXguaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGZzUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBmaWxlc3lzdGVtLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZXN5c3RlbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgZnNXYXRjaGVyUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB3YXRjaGVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUod2F0Y2hlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuaG9tZScsIHtcbiAgICAgIHVybDogJycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2FwcC5odG1sJ1xuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGJTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2RiJywge1xuICAgICAgICB1cmw6ICcvZGInLFxuICAgICAgICBjb250cm9sbGVyOiAnRGJDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdNb2RlbEN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgbW9kZWxQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZWRpdCcsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLWVkaXRvci5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgICB1cmw6ICcvOnNjaGVtYUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTY2hlbWFDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvc2NoZW1hLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgICB1cmw6ICcvOmtleUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdLZXlDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwva2V5Lmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcjZGlhZ3JhbScsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICAvL2NvbnRyb2xsZXI6ICdEaWFncmFtQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnYXBpJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2FwaS86YXBpTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgYXBpUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gd2luZG93Ll9hcGk7IC8vJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChhcGkvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGktaG9tZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJy9kaWFncmFtJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaURpYWdyYW1DdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvZGlhZ3JhbS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvY29udHJvbGxlcidcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86Y29udHJvbGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDb250cm9sbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtLmhhbmRsZXInLCB7XG4gICAgICAgIHVybDogJy86aGFuZGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAneEBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hhbmRsZXJAYXBpLmNvbnRyb2xsZXIuaXRlbSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdoYW5kbGVyJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaS5jb250cm9sbGVyLml0ZW0nLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9yb3V0ZSdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUtaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbS5hY3Rpb24nLCB7XG4gICAgICAgIHVybDogJy86YWN0aW9uSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUFjdGlvbkN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYWN0aW9uLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbn07XG4iLCJ2YXIgQXBwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvYXBwJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBmcywgd2F0Y2hlciwgZmlsZVNlcnZpY2UsIGRpYWxvZywgY29sb3JTZXJ2aWNlLCBzZXNzaW9uU2VydmljZSkge1xuXG4gIHZhciBtb2RlbCA9IG5ldyBBcHBNb2RlbCh7XG4gICAgZnM6IGZzLFxuICAgIHdhdGNoZXI6IHdhdGNoZXIsXG4gICAgc2Vzc2lvblNlcnZpY2U6IHNlc3Npb25TZXJ2aWNlXG4gIH0pO1xuXG4gICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuXG4gIC8vIExpc3RlbiBvdXQgZm9yIGNoYW5nZXMgdG8gdGhlIGZpbGUgc3lzdGVtXG4gIHdhdGNoZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG4gIHZhciBwYWNrYWdlRmlsZSA9IG1vZGVsLnBhY2thZ2VGaWxlO1xuICBpZiAocGFja2FnZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShwYWNrYWdlRmlsZS5wYXRoKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgbW9kZWwucGFja2FnZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIHZhciByZWFkbWVGaWxlID0gbW9kZWwucmVhZG1lRmlsZTtcbiAgaWYgKHJlYWRtZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShyZWFkbWVGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gICAgfSk7XG4gIH1cblxuICAkc2NvcGUub25TZWFyY2hGb3JtU3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgJHN0YXRlLmdvKCdhcHAuZnMuc2VhcmNoJywgeyBxOiBzZWFyY2hGb3JtLnEudmFsdWUgfSk7XG4gIH07XG4gIC8vXG4gIC8vICRzY29wZS5maWxlVXJsID0gZnVuY3Rpb24oZmlsZSkge1xuICAvLyAgIHJldHVybiAkc3RhdGUuaHJlZignYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAvLyAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAvLyAgIH0pO1xuICAvLyB9O1xuXG4gICRzY29wZS5nb3RvRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25UbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5maWxlUGFyYW1zID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIHJldHVybiB7IHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmaWxlLnBhdGgpfTtcbiAgfTtcblxuXG4gICRzY29wZS5kaXJVcmwgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZGlyLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29sb3IgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYyBjb2xvcnMgZnJvbSBhIHN0cmluZ1xuICAkc2NvcGUuY29sb3IgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLmhleCgpIDogJyc7XG4gIH07XG4gICRzY29wZS5jb2xvclRleHQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLnJlYWRhYmxlKCkuaGV4KCkgOiAnJztcbiAgfTtcblxuICAkc2NvcGUuY29udGVudENsYXNzID0gZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAncXNkc2EnO1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gc2F2ZVNlc3Npb24oc2Vzc2lvbikge1xuICAgIHZhciBwYXRoID0gc2Vzc2lvbi5wYXRoO1xuICAgIHZhciBlZGl0U2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcbiAgICB2YXIgY29udGVudHMgPSBlZGl0U2Vzc2lvbi5nZXRWYWx1ZSgpO1xuXG4gICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZScsIHBhdGgpO1xuXG4gICAgZnMud3JpdGVGaWxlKHBhdGgsIGNvbnRlbnRzLCBmdW5jdGlvbihyc3ApIHtcblxuICAgICAgaWYgKHJzcC5lcnIpIHtcblxuICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gV3JpdGUgRXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZUZpbGUgRmFpbGVkJywgcGF0aCwgcnNwLmVycik7XG5cbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZSBTdWNjZWVkZWQnLCBwYXRoKTtcblxuICAgICAgICBzZXNzaW9uLm1hcmtDbGVhbigpO1xuICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gICRzY29wZS5zYXZlU2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBzYXZlU2Vzc2lvbihzZXNzaW9uKTtcbiAgfTtcbiAgJHNjb3BlLnNhdmVBbGxTZXNzaW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZXNzaW9ucyA9IHNlc3Npb25TZXJ2aWNlLmRpcnR5O1xuXG4gICAgc2Vzc2lvbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBzYXZlU2Vzc2lvbihpdGVtKTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuZW5jb2RlUGF0aCA9IHV0aWxzLmVuY29kZVN0cmluZztcbiAgJHNjb3BlLmRlY29kZVBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmc7XG59O1xuIiwiLy8gdmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbScpO1xuLy8gdmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG4vLyB2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxuLy8gTG9hZCBNb2R1bGUgRGVwZW5kZW5jaWVzXG5yZXF1aXJlKCcuLi9kaWFsb2cnKTtcbnJlcXVpcmUoJy4uL2ZzJyk7XG5cbnZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xuXG5tb2Quc2VydmljZSgnRmlsZVNlcnZpY2UnLCBbXG4gICckcScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvZmlsZScpXG5dKTtcblxubW9kLnNlcnZpY2UoJ1Jlc3BvbnNlSGFuZGxlcicsIFtcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICByZXF1aXJlKCcuL3NlcnZpY2VzL3Jlc3BvbnNlLWhhbmRsZXInKVxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdDb2xvclNlcnZpY2UnLCBbXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvY29sb3InKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdBcHBDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICdmc1Byb21pc2UnLFxuICAnZnNXYXRjaGVyUHJvbWlzZScsXG4gICdGaWxlU2VydmljZScsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0NvbG9yU2VydmljZScsXG4gICdTZXNzaW9uU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMnKVxuXSk7XG5cbi8vIEFDRSBHbG9iYWwgRGVmYXVsdHNcbm1vZC5ydW4oWyd1aUFjZUNvbmZpZycsXG4gIGZ1bmN0aW9uKHVpQWNlQ29uZmlnKSB7XG4gICAgdWlBY2VDb25maWcuYWNlID0ge307XG4gICAgYW5ndWxhci5leHRlbmQodWlBY2VDb25maWcuYWNlLCB7XG4gICAgICB1c2VXcmFwTW9kZTogZmFsc2UsXG4gICAgICBzaG93R3V0dGVyOiB0cnVlLFxuICAgICAgbW9kZTogJ2phdmFzY3JpcHQnLFxuICAgICAgcmVxdWlyZTogWydhY2UvZXh0L2xhbmd1YWdlX3Rvb2xzJ10sXG4gICAgICBhZHZhbmNlZDoge1xuICAgICAgICBlbmFibGVTbmlwcGV0czogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQmFzaWNBdXRvY29tcGxldGlvbjogdHJ1ZSxcbiAgICAgICAgZW5hYmxlTGl2ZUF1dG9jb21wbGV0aW9uOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH1cbl0pO1xuXG5tb2QuY29uZmlnKFtcbiAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgJyRsb2NhdGlvblByb3ZpZGVyJyxcbiAgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2QuY29uZmlnKCBbJyRjb21waWxlUHJvdmlkZXInLCBmdW5jdGlvbigkY29tcGlsZVByb3ZpZGVyKXtcbiAgJGNvbXBpbGVQcm92aWRlci5pbWdTcmNTYW5pdGl6YXRpb25XaGl0ZWxpc3QoL15cXHMqKChodHRwcz98ZnRwfGZpbGV8YmxvYik6fGRhdGE6aW1hZ2VcXC8pLyk7XG59XSk7XG5cbi8vIG1vZC5kaXJlY3RpdmUoXCJmaWxlRWRpdG9yXCIsIFtcbi8vICAgZnVuY3Rpb24oKSB7XG4vLyAgICAgcmV0dXJuIHtcbi8vICAgICAgIHJlc3RyaWN0OiBcIkFcIixcbi8vICAgICAgIHRlbXBsYXRlOiAnPGRpdj57e2ZpbGUuY29udGVudH19PC9kaXY+Jyxcbi8vICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuLy8gICAgICAgICAvL3Njb3BlW2F0dHJzLmFsbFBob25lc107XG4vLyAgICAgICB9XG4vLyAgICAgfTtcbi8vICAgfVxuLy8gXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcblxuZnVuY3Rpb24gQXBwTW9kZWwoZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5mcyA9IGRhdGEuZnM7XG4gIHRoaXMud2F0Y2hlciA9IGRhdGEud2F0Y2hlcjtcbiAgdGhpcy5zZXNzaW9ucyA9IGRhdGEuc2Vzc2lvblNlcnZpY2U7XG5cbiAgdGhpcy5fcmVjZW50RmlsZXMgPSBbXTtcbn1cbkFwcE1vZGVsLnByb3RvdHlwZS5hZGRSZWNlbnRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG4gIHZhciBpZHggPSByZWNlbnQuZmluZEluZGV4KGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBmaWxlLnBhdGg7XG4gIH0pO1xuICBpZiAoaWR4ICE9PSAtMSkge1xuICAgIHJlY2VudC5tb3ZlKGlkeCwgMCk7XG4gIH0gZWxzZSB7XG4gICAgcmVjZW50LnVuc2hpZnQoeyBwYXRoOiBmaWxlLnBhdGgsIHRpbWU6IERhdGUubm93KCkgfSk7XG4gICAgcmVjZW50Lmxlbmd0aCA9IE1hdGgubWluKHRoaXMuX3JlY2VudEZpbGVzLmxlbmd0aCwgMjApO1xuICB9XG59O1xuXG5BcHBNb2RlbC5wcm90b3R5cGUuY291bnRGaWxlcyA9IGZ1bmN0aW9uKGV4dCkge1xuICByZXR1cm4gdGhpcy5saXN0LmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuICFpdGVtLmlzRGlyZWN0b3J5ICYmIGl0ZW0uZXh0ID09PSBleHQ7XG4gIH0pLmxlbmd0aDtcbn07XG5BcHBNb2RlbC5wcm90b3R5cGUuY2xlYXJSZWNlbnRGaWxlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9yZWNlbnRGaWxlcy5sZW5ndGggPSAwO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5nZXRSZWxhdGl2ZVBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwLnJlbGF0aXZlKHRoaXMudHJlZS5kaXIsIHBhdGgpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5fcmVhZERlcGVuZGVuY2llcyA9IGZ1bmN0aW9uKGRldikge1xuICB2YXIgZGVwcyA9IFtdO1xuICB2YXIgcGFja2FnZUpTT04gPSB0aGlzLl9wYWNrYWdlSlNPTjtcbiAgaWYgKHBhY2thZ2VKU09OKSB7XG4gICAgdmFyIGRlcEtleSA9IHBhY2thZ2VKU09OW2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyddO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVwS2V5KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0ga2V5c1tpXTtcbiAgICAgIHZhciB2ZXJzaW9uID0gZGVwS2V5W25hbWVdO1xuICAgICAgZGVwcy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXBzO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwcE1vZGVsLnByb3RvdHlwZSwge1xuICBtYXA6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5tYXA7XG4gICAgfVxuICB9LFxuICBsaXN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci50cmVlWzBdLmNoaWxkcmVuWzBdO1xuICAgIH1cbiAgfSxcbiAgcmVjZW50RmlsZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuXG4gICAgICAvLyBjbGVhbiBhbnkgZmlsZXMgdGhhdCBtYXkgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICB2YXIgaSA9IHJlY2VudC5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGlmICghdGhpcy5tYXBbcmVjZW50W2ldLnBhdGhdKSB7XG4gICAgICAgICAgcmVjZW50LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVjZW50Lm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcFtpdGVtLnBhdGhdO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICB9XG4gIH0sXG4gIGpzQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmpzJyk7XG4gICAgfVxuICB9LFxuICBjc3NDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuY3NzJyk7XG4gICAgfVxuICB9LFxuICBodG1sQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmh0bWwnKTtcbiAgICB9XG4gIH0sXG4gIHRvdGFsQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdC5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYWNrYWdlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFja2FnZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fcGFja2FnZUpTT04gPSBKU09OLnBhcnNlKHZhbHVlLmNvbnRlbnRzKTtcbiAgICAgIHRoaXMuX2RlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXMoKTtcbiAgICAgIHRoaXMuX2RldkRlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXModHJ1ZSk7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmVlLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdwYWNrYWdlLmpzb24nO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBoYXNQYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnBhY2thZ2VGaWxlO1xuICAgIH1cbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZXBlbmRlbmNpZXM7XG4gICAgfVxuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RldkRlcGVuZGVuY2llcztcbiAgICB9XG4gIH0sXG4gIHJlYWRtZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZG1lO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcmVhZG1lID0gdmFsdWU7XG4gICAgfVxuICB9LFxuICByZWFkbWVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyZWUuY2hpbGRyZW4uZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiAgL15yZWFkbWUuKG1kfG1hcmtkb3duKSQvLnRlc3QoaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBoYXNSZWFkbWVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMucmVhZG1lRmlsZTtcbiAgICB9XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwTW9kZWw7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gICd1aS5yb3V0ZXInLFxuICAndWkuYm9vdHN0cmFwJyxcbiAgJ3VpLmFjZScsXG4gICdldmdlbnluZXUubWFya2Rvd24tcHJldmlldycsXG4gICdtaWNoaUtvbm8nLFxuICAnZGlhbG9nJyxcbiAgJ2ZzJ1xuXSk7XG4iLCIvKipcbiAqIGNvbG9yVGFnIHYgMC4xXG4gKiBieSBSeWFuIFF1aW5uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWF6b25kby9jb2xvclRhZ1xuICpcbiAqIGNvbG9yVGFnIGlzIHVzZWQgdG8gZ2VuZXJhdGUgYSByYW5kb20gY29sb3IgZnJvbSBhIGdpdmVuIHN0cmluZ1xuICogVGhlIGdvYWwgaXMgdG8gY3JlYXRlIGRldGVybWluaXN0aWMsIHVzYWJsZSBjb2xvcnMgZm9yIHRoZSBwdXJwb3NlXG4gKiBvZiBhZGRpbmcgY29sb3IgY29kaW5nIHRvIHRhZ3NcbiovXG5cbmZ1bmN0aW9uIGNvbG9yVGFnKHRhZ1N0cmluZykge1xuXHQvLyB3ZXJlIHdlIGdpdmVuIGEgc3RyaW5nIHRvIHdvcmsgd2l0aD8gIElmIG5vdCwgdGhlbiBqdXN0IHJldHVybiBmYWxzZVxuXHRpZiAoIXRhZ1N0cmluZykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm4gc3RoZSBsdW1pbm9zaXR5IGRpZmZlcmVuY2UgYmV0d2VlbiAyIHJnYiB2YWx1ZXNcblx0ICogYW55dGhpbmcgZ3JlYXRlciB0aGFuIDUgaXMgY29uc2lkZXJlZCByZWFkYWJsZVxuXHQgKi9cblx0ZnVuY3Rpb24gbHVtaW5vc2l0eURpZmYocmdiMSwgcmdiMikge1xuICBcdFx0dmFyIGwxID0gMC4yMTI2ICsgTWF0aC5wb3cocmdiMS5yLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuNzE1MiAqIE1hdGgucG93KHJnYjEuZy8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjA3MjIgKiBNYXRoLnBvdyhyZ2IxLmIvMjU1LCAyLjIpLFxuICBcdFx0XHRsMiA9IDAuMjEyNiArIE1hdGgucG93KHJnYjIuci8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjcxNTIgKiBNYXRoLnBvdyhyZ2IyLmcvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC4wNzIyICogTWF0aC5wb3cocmdiMi5iLzI1NSwgMi4yKTtcblxuICBcdFx0aWYgKGwxID4gbDIpIHtcbiAgXHRcdFx0cmV0dXJuIChsMSArIDAuMDUpIC8gKGwyICsgMC4wNSk7XG4gIFx0XHR9IGVsc2Uge1xuICBcdFx0XHRyZXR1cm4gKGwyICsgMC4wNSkgLyAobDEgKyAwLjA1KTtcbiAgXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBUaGlzIGlzIHRoZSBkZWZpbml0aW9uIG9mIGEgY29sb3IgZm9yIG91ciBwdXJwb3Nlcy4gIFdlJ3ZlIGFic3RyYWN0ZWQgaXQgb3V0XG5cdCAqIHNvIHRoYXQgd2UgY2FuIHJldHVybiBuZXcgY29sb3Igb2JqZWN0cyB3aGVuIHJlcXVpcmVkXG5cdCovXG5cdGZ1bmN0aW9uIGNvbG9yKGhleENvZGUpIHtcblx0XHQvL3dlcmUgd2UgZ2l2ZW4gYSBoYXNodGFnPyAgcmVtb3ZlIGl0LlxuXHRcdHZhciBoZXhDb2RlID0gaGV4Q29kZS5yZXBsYWNlKFwiI1wiLCBcIlwiKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIGEgc2ltcGxlIGhleCBzdHJpbmcgaW5jbHVkaW5nIGhhc2h0YWdcblx0XHRcdCAqIG9mIHRoZSBjb2xvclxuXHRcdFx0ICovXG5cdFx0XHRoZXg6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaGV4Q29kZTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhbiBSR0IgYnJlYWtkb3duIG9mIHRoZSBjb2xvciBwcm92aWRlZFxuXHRcdFx0ICovXG5cdFx0XHRyZ2I6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYmlnaW50ID0gcGFyc2VJbnQoaGV4Q29kZSwgMTYpO1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHI6IChiaWdpbnQgPj4gMTYpICYgMjU1LFxuXHRcdFx0XHRcdGc6IChiaWdpbnQgPj4gOCkgJiAyNTUsXG5cdFx0XHRcdFx0YjogYmlnaW50ICYgMjU1XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogR2l2ZW4gYSBsaXN0IG9mIGhleCBjb2xvciBjb2Rlc1xuXHRcdFx0ICogRGV0ZXJtaW5lIHdoaWNoIGlzIHRoZSBtb3N0IHJlYWRhYmxlXG5cdFx0XHQgKiBXZSB1c2UgdGhlIGx1bWlub3NpdHkgZXF1YXRpb24gcHJlc2VudGVkIGhlcmU6XG5cdFx0XHQgKiBodHRwOi8vd3d3LnNwbGl0YnJhaW4ub3JnL2Jsb2cvMjAwOC0wOS8xOC1jYWxjdWxhdGluZ19jb2xvcl9jb250cmFzdF93aXRoX3BocFxuXHRcdFx0ICovXG5cdFx0XHRyZWFkYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIHRoaXMgaXMgbWVhbnQgdG8gYmUgc2ltcGxpc3RpYywgaWYgeW91IGRvbid0IGdpdmUgbWUgbW9yZSB0aGFuXG5cdFx0XHRcdC8vIG9uZSBjb2xvciB0byB3b3JrIHdpdGgsIHlvdSdyZSBnZXR0aW5nIHdoaXRlIG9yIGJsYWNrLlxuXHRcdFx0XHR2YXIgY29tcGFyYXRvcnMgPSAoYXJndW1lbnRzLmxlbmd0aCA+IDEpID8gYXJndW1lbnRzIDogW1wiI0UxRTFFMVwiLCBcIiM0NjQ2NDZcIl0sXG5cdFx0XHRcdFx0b3JpZ2luYWxSR0IgPSB0aGlzLnJnYigpLFxuXHRcdFx0XHRcdGJyaWdodGVzdCA9IHsgZGlmZmVyZW5jZTogMCB9O1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGFyYXRvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHQvL2NhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjb2xvciBhbmQgdGhlIG9uZSB3ZSB3ZXJlIGdpdmVuXG5cdFx0XHRcdFx0dmFyIGMgPSBjb2xvcihjb21wYXJhdG9yc1tpXSksXG5cdFx0XHRcdFx0XHRsID0gbHVtaW5vc2l0eURpZmYob3JpZ2luYWxSR0IsIGMucmdiKCkpO1xuXG5cdFx0XHRcdFx0Ly8gaWYgaXQncyBicmlnaHRlciB0aGFuIHRoZSBjdXJyZW50IGJyaWdodGVzdCwgc3RvcmUgaXQgdG8gY29tcGFyZSBhZ2FpbnN0IGxhdGVyIG9uZXNcblx0XHRcdFx0XHRpZiAobCA+IGJyaWdodGVzdC5kaWZmZXJlbmNlKSB7XG5cdFx0XHRcdFx0XHRicmlnaHRlc3QgPSB7XG5cdFx0XHRcdFx0XHRcdGRpZmZlcmVuY2U6IGwsXG5cdFx0XHRcdFx0XHRcdGNvbG9yOiBjXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcmV0dXJuIHRoZSBicmlnaGVzdCBjb2xvclxuXHRcdFx0XHRyZXR1cm4gYnJpZ2h0ZXN0LmNvbG9yO1xuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG5cblx0Ly8gY3JlYXRlIHRoZSBoZXggZm9yIHRoZSByYW5kb20gc3RyaW5nXG4gICAgdmFyIGhhc2ggPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnU3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGhhc2ggPSB0YWdTdHJpbmcuY2hhckNvZGVBdChpKSArICgoaGFzaCA8PCA1KSAtIGhhc2gpO1xuICAgIH1cbiAgICBoZXggPSBcIlwiXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gKGhhc2ggPj4gKGkgKiA4KSkgJiAweEZGO1xuICAgICAgICBoZXggKz0gKCcwMCcgKyB2YWx1ZS50b1N0cmluZygxNikpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbG9yKGhleCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGNvbG9yVGFnO1xufTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkcSkge1xuICByZXR1cm4ge1xuICAgIHJlYWRGaWxlOiBmdW5jdGlvbihmaWxlKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICBmaWxlc3lzdGVtLnJlYWRGaWxlKGZpbGUsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICBpZiAocmVzLmVycikge1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXMuZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlcy5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRpYWxvZykge1xuICByZXR1cm4ge1xuICAgIHJlc3BvbnNlSGFuZGxlcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihyc3AsIHNob3dFcnJvcikge1xuICAgICAgICBzaG93RXJyb3IgPSBzaG93RXJyb3IgfHwgdHJ1ZTtcbiAgICAgICAgaWYgKHJzcC5lcnIpIHtcbiAgICAgICAgICBpZiAoc2hvd0Vycm9yKSB7XG4gICAgICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocnNwLmVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmbihyc3AuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcbiIsIkFycmF5LnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24ob2xkSW5kZXgsIG5ld0luZGV4KSB7XG5cbiAgaWYgKGlzTmFOKG5ld0luZGV4KSB8fCBpc05hTihvbGRJbmRleCkgfHwgb2xkSW5kZXggPCAwIHx8IG9sZEluZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG5ld0luZGV4IDwgMCkge1xuICAgIG5ld0luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICB9IGVsc2UgaWYgKG5ld0luZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgbmV3SW5kZXggPSAwO1xuICB9XG5cbiAgdGhpcy5zcGxpY2UobmV3SW5kZXgsIDAsIHRoaXMuc3BsaWNlKG9sZEluZGV4LCAxKVswXSk7XG5cbiAgcmV0dXJuIG5ld0luZGV4O1xufTtcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICBBcnJheS5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIGlmICh0aGlzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9O1xufVxuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhbGVydDogcmVxdWlyZSgnLi9hbGVydCcpLFxuICBjb25maXJtOiByZXF1aXJlKCcuL2NvbmZpcm0nKSxcbiAgcHJvbXB0OiByZXF1aXJlKCcuL3Byb21wdCcpXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAkc2NvcGUucGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyO1xuICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gIH07XG5cbiAgJHNjb3BlLm9rID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgfTtcblxuICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG52YXIgY29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLmFsZXJ0XG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5jb25maXJtXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ1Byb21wdEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLnByb21wdFxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdEaWFsb2dTZXJ2aWNlJywgW1xuICAnJG1vZGFsJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZGlhbG9nJywgW1xuICAndWkuYm9vdHN0cmFwJ1xuXSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gIHZhciBzZXJ2aWNlID0ge307XG5cbiAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL2FsZXJ0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLmNvbmZpcm0gPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9jb25maXJtLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpcm1DdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHNlcnZpY2UucHJvbXB0ID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9kaWFsb2cvdmlld3MvcHJvbXB0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ1Byb21wdEN0cmwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2UsXG4gICAgICAgICAgICBkZWZhdWx0VmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGRhdGEucGxhY2Vob2xkZXJcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkucmVzdWx0O1xuXG4gIH07XG5cbiAgcmV0dXJuIHNlcnZpY2U7XG5cbn07XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdCcpO1xudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdlbWl0dGVyLWNvbXBvbmVudCcpO1xuXG4vKlxuICogRmlsZVN5c3RlbVdhdGNoZXIgY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmlsZVN5c3RlbVdhdGNoZXIoKSB7XG5cbiAgdGhpcy5fd2F0Y2hlZCA9IHt9O1xuXG4gIHRoaXMuX2xpc3QgPSBudWxsO1xuICB0aGlzLl90cmVlID0gbnVsbDtcblxuICB2YXIgc29ja2V0ID0gaW8uY29ubmVjdCh1dGlscy51cmxSb290KCkgKyAnL2Zzd2F0Y2gnKTtcblxuICBzb2NrZXQub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG5cbiAgICBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICB0aGlzLl93YXRjaGVkW2tleV0gPSBuZXcgRmlsZVN5c3RlbU9iamVjdChrZXksIGRhdGFba2V5XS5pc0RpcmVjdG9yeSk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvL3V0aWxzLmV4dGVuZCh0aGlzLl93YXRjaGVkLCBkYXRhKTtcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGNvbm5lY3Rpb24nKTtcblxuICAgIHRoaXMuZW1pdCgnY29ubmVjdGlvbicsIHRoaXMuX3dhdGNoZWQpO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZCcsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCBmYWxzZSk7XG5cbiAgICB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF0gPSBmc287XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBhZGQnLCBmc28pO1xuXG4gICAgdGhpcy5lbWl0KCdhZGQnLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZERpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCB0cnVlKTtcblxuICAgIHRoaXMuX3dhdGNoZWRbZnNvLnBhdGhdID0gZnNvO1xuXG4gICAgY29uc29sZS5sb2coJ1dhdGNoZXIgYWRkRGlyJywgZnNvKTtcblxuICAgIHRoaXMuZW1pdCgnYWRkRGlyJywgZnNvKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgIC8vIGNoZWNrIHdlIGdvdCBzb21ldGhpbmdcbiAgICBpZiAoZnNvKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGNoYW5nZScsIGZzbyk7XG5cbiAgICAgIHRoaXMuZW1pdCgnbW9kaWZpZWQnLCBmc28pO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciB1bmxpbmsnLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ3VubGluaycsIGZzbyk7XG4gICAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rRGlyJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciB1bmxpbmtEaXInLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ3VubGlua0RpcicsIGZzbyk7XG4gICAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignZXJyb3InLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGVycm9yJywgcmVzLmVycik7XG5cbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgcmVzLmVycik7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgdGhpcy5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGlzdCA9IG51bGw7XG4gICAgdGhpcy5fdHJlZSA9IG51bGw7XG4gIH0pO1xuXG59XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaWxlU3lzdGVtV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgbWFwOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93YXRjaGVkO1xuICAgIH1cbiAgfSxcbiAgbGlzdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXRoaXMuX2xpc3QpIHtcbiAgICAgICAgdGhpcy5fbGlzdCA9IFtdO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuX3dhdGNoZWQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLl9saXN0LnB1c2godGhpcy5fd2F0Y2hlZFtrZXlzW2ldXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9saXN0O1xuICAgIH1cbiAgfSxcbiAgdHJlZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG5cbiAgICAgIGZ1bmN0aW9uIHRyZWVpZnkobGlzdCwgaWRBdHRyLCBwYXJlbnRBdHRyLCBjaGlsZHJlbkF0dHIpIHtcblxuICAgICAgICB2YXIgdHJlZUxpc3QgPSBbXTtcbiAgICAgICAgdmFyIGxvb2t1cCA9IHt9O1xuICAgICAgICB2YXIgcGF0aCwgb2JqO1xuXG4gICAgICAgIGZvciAocGF0aCBpbiBsaXN0KSB7XG5cbiAgICAgICAgICBvYmogPSBsaXN0W3BhdGhdO1xuICAgICAgICAgIG9iai5sYWJlbCA9IG9iai5uYW1lO1xuICAgICAgICAgIGxvb2t1cFtvYmpbaWRBdHRyXV0gPSBvYmo7XG4gICAgICAgICAgb2JqW2NoaWxkcmVuQXR0cl0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAocGF0aCBpbiBsaXN0KSB7XG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICB2YXIgcGFyZW50ID0gbG9va3VwW29ialtwYXJlbnRBdHRyXV07XG4gICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgb2JqLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgICAgIGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dW2NoaWxkcmVuQXR0cl0ucHVzaChvYmopO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmVlTGlzdC5wdXNoKG9iaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRyZWVMaXN0O1xuXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5fdHJlZSkge1xuICAgICAgICB0aGlzLl90cmVlID0gdHJlZWlmeSh0aGlzLl93YXRjaGVkLCAncGF0aCcsICdkaXInLCAnY2hpbGRyZW4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3RyZWU7XG4gICAgfVxuICB9XG59KTtcbmVtaXR0ZXIoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlKTtcblxudmFyIEZpbGVTeXN0ZW1XYXRjaGVyID0gbmV3IEZpbGVTeXN0ZW1XYXRjaGVyKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbVdhdGNoZXI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTs7XG5cbi8qXG4gKiBGaWxlU3lzdGVtIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW0oc29ja2V0KSB7XG5cbiAgc29ja2V0Lm9uKCdta2RpcicsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdta2RpcicsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ21rZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdta2ZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb3B5JywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2NvcHknLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZW5hbWUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgncmVuYW1lJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVtb3ZlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbW92ZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlYWRmaWxlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlYWRmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignd3JpdGVmaWxlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3dyaXRlZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnY29ubmVjdGlvbicsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XG5cbn1cbkZpbGVTeXN0ZW0ucHJvdG90eXBlLm1rZGlyID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ21rZGlyJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLm1rZmlsZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2ZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdjb3B5Jywgc291cmNlLCBkZXN0aW5hdGlvbiwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG9sZFBhdGgsIG5ld1BhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW5hbWUnLCBvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3JlbW92ZScsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZWFkZmlsZScsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS53cml0ZUZpbGUgPSBmdW5jdGlvbihwYXRoLCBjb250ZW50cywgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3dyaXRlZmlsZScsIHBhdGgsIGNvbnRlbnRzLCBjYWxsYmFjayk7XG59O1xuXG5lbWl0dGVyKEZpbGVTeXN0ZW0ucHJvdG90eXBlKTtcblxuXG52YXIgc29ja2V0ID0gaW8uY29ubmVjdCh1dGlscy51cmxSb290KCkgKyAnL2ZzJyk7XG5cbnZhciBmaWxlU3lzdGVtID0gbmV3IEZpbGVTeXN0ZW0oc29ja2V0KTtcblxuZmlsZVN5c3RlbS5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgY29uc29sZS5sb2coJ2ZzIGNvbm5lY3RlZCcsIGRhdGEpO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmaWxlU3lzdGVtO1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBFZGl0U2Vzc2lvbiA9IGFjZS5yZXF1aXJlKCdhY2UvZWRpdF9zZXNzaW9uJykuRWRpdFNlc3Npb247XG52YXIgVW5kb01hbmFnZXIgPSBhY2UucmVxdWlyZSgnYWNlL3VuZG9tYW5hZ2VyJykuVW5kb01hbmFnZXI7XG5cbnZhciBtb2RlcyA9IHtcbiAgXCIuanNcIjogXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIsXG4gIFwiLmNzc1wiOiBcImFjZS9tb2RlL2Nzc1wiLFxuICBcIi5odG1sXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICBcIi5odG1cIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gIFwiLmVqc1wiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgXCIuanNvblwiOiBcImFjZS9tb2RlL2pzb25cIixcbiAgXCIubWRcIjogXCJhY2UvbW9kZS9tYXJrZG93blwiLFxuICBcIi5jb2ZmZWVcIjogXCJhY2UvbW9kZS9jb2ZmZWVcIixcbiAgXCIuamFkZVwiOiBcImFjZS9tb2RlL2phZGVcIixcbiAgXCIucGhwXCI6IFwiYWNlL21vZGUvcGhwXCIsXG4gIFwiLnB5XCI6IFwiYWNlL21vZGUvcHl0aG9uXCIsXG4gIFwiLnNjc3NcIjogXCJhY2UvbW9kZS9zYXNzXCIsXG4gIFwiLnR4dFwiOiBcImFjZS9tb2RlL3RleHRcIixcbiAgXCIudHlwZXNjcmlwdFwiOiBcImFjZS9tb2RlL3R5cGVzY3JpcHRcIixcbiAgXCIueG1sXCI6IFwiYWNlL21vZGUveG1sXCJcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAuZnMnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIC8vdXJsOiAnZnMnLFxuICAgICAgLy8gY29udHJvbGxlcjogJ0ZzQ3RybCcsXG4gICAgICAvL3RlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9pbmRleC5odG1sJyxcbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlcicsIHtcbiAgICAgIHVybDogJy9maW5kZXInLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNGaW5kZXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZmluZGVyLmh0bWwnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgdXJsOiAnL2ZpbGUvOnBhdGgnLFxuICAgICAgY29udHJvbGxlcjogJ0ZzRmlsZUN0cmwnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbGUuaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIHNlc3Npb246IFsnJHEnLCAnJHN0YXRlUGFyYW1zJywgJ0ZpbGVTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSwgJHN0YXRlUGFyYW1zLCBmaWxlU2VydmljZSwgc2Vzc2lvblNlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0ZWQgZmlsZSAnICsgcGF0aCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuZmluZFNlc3Npb24ocGF0aCk7XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uKSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIGZvdW5kIHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlYWRpbmcgZmlsZSBmb3IgbmV3IHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhdGgpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzVXRmOCA9ICEoZmlsZS5jb250ZW50cyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uRGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVdGY4KSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IG5ldyBFZGl0U2Vzc2lvbihmaWxlLmNvbnRlbnRzLCBtb2Rlc1tmaWxlLmV4dF0pO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VW5kb01hbmFnZXIobmV3IFVuZG9NYW5hZ2VyKCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IGZpbGUuY29udGVudHM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmFkZFNlc3Npb24ocGF0aCwgc2Vzc2lvbkRhdGEsIGlzVXRmOCk7XG5cbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNlc3Npb24pO1xuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5zZWFyY2gnLCB7XG4gICAgICB1cmw6ICcvc2VhcmNoP3EnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzU2VhcmNoQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL3NlYXJjaC5odG1sJyxcbiAgICAgICAgICAvLyByZXNvbHZlOiB7XG4gICAgICAgICAgLy8gICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAvLyAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgLy8gICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgIC8vICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgIC8vICAgXVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZGlyJywge1xuICAgICAgdXJsOiAnL2Rpci86cGF0aCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJyxcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNEaXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZGlyLmh0bWwnLFxuICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGRpcjogWyckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhdGNoZXIubWFwW3BhdGhdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgZGlyLCBmaWxlU2VydmljZSkge1xuICAkc2NvcGUuZGlyID0gZGlyO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCBzZXNzaW9uLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gc2Vzc2lvbi5pc1V0Zjg7XG5cblxuICB2YXIgbW9kZWwgPSAkc2NvcGUubW9kZWw7XG5cbiAgdmFyIGZpbGUgPSBtb2RlbC5tYXBbc2Vzc2lvbi5wYXRoXTtcblxuICAkc2NvcGUuZmlsZSA9IGZpbGU7XG5cbiAgLy8gZW5zdXJlIHRoZSBmaW5kZXIgaXMgc2V0IHRoZSB0aGUgcmlnaHQgZnNvXG4gICRzY29wZS5maW5kZXIuYWN0aXZlID0gZmlsZTtcblxuICBtb2RlbC5hZGRSZWNlbnRGaWxlKGZpbGUpO1xuXG4gIGZ1bmN0aW9uIGltZ1VybCgpIHtcbiAgICAvLyBPYnRhaW4gYSBibG9iOiBVUkwgZm9yIHRoZSBpbWFnZSBkYXRhLlxuICAgIHZhciBhcnJheUJ1ZmZlclZpZXcgPSBuZXcgVWludDhBcnJheShzZXNzaW9uLmRhdGEpO1xuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2FycmF5QnVmZmVyVmlld10sIHtcbiAgICAgIHR5cGU6ICdpbWFnZS8nICsgZmlsZS5leHQuc3Vic3RyKDEpXG4gICAgfSk7XG4gICAgdmFyIHVybENyZWF0b3IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgdmFyIHVybCA9IHVybENyZWF0b3IuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBpZiAoaXNVdGY4KSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJ2FjZSc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IHRydWU7XG5cbiAgICBpZiAoJHNjb3BlLmVkaXRvcikge1xuICAgICAgJHNjb3BlLmVkaXRvci5zZXRTZXNzaW9uKHNlc3Npb24uZGF0YSk7XG4gICAgICB2YXIgZG9jID0gc2Vzc2lvbi5kYXRhLmdldERvY3VtZW50KCk7XG4gICAgJHNjb3BlLmVkaXRvci5zZXRPcHRpb24oXCJtYXhMaW5lc1wiLCA2MDAgLypkb2MuZ2V0TGVuZ3RoKCkqLyk7XG4gICAgfVxuXG4gIH0gZWxzZSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJyc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IGZhbHNlO1xuXG4gICAgc3dpdGNoIChmaWxlLmV4dCkge1xuICAgICAgY2FzZSAnLnBuZyc6XG4gICAgICBjYXNlICcuanBnJzpcbiAgICAgIGNhc2UgJy5qcGVnJzpcbiAgICAgIGNhc2UgJy5naWYnOlxuICAgICAgY2FzZSAnLmljbyc6XG4gICAgICAgICRzY29wZS52aWV3ZXIgPSAnaW1nJztcbiAgICAgICAgJHNjb3BlLmltZ1VybCA9IGltZ1VybCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG5cbiAgICB9XG4gIH1cblxuXG5cbn07XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIEZpbmRlck1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL2ZpbmRlcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkbG9nLCBkaWFsb2csIGZpbGVTZXJ2aWNlLCByZXNwb25zZUhhbmRsZXIpIHtcblxuICB2YXIgZXhwYW5kZWQgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICRzY29wZS50cmVlRGF0YSA9IHtcbiAgICBzaG93TWVudTogZmFsc2VcbiAgfTtcbiAgJHNjb3BlLmFjdGl2ZSA9IG51bGw7XG4gICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG4gICRzY29wZS5zaG93RWRpdG9yID0gZmFsc2U7XG5cbiAgJHNjb3BlLmFjZUxvYWRlZCA9IGZ1bmN0aW9uKGVkaXRvcikge1xuXG4gICAgJHNjb3BlLmVkaXRvciA9IGVkaXRvcjtcblxuICB9O1xuICBcbiAgJHNjb3BlLmFjZUNoYW5nZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcblxuICAgICRzY29wZS4kYXBwbHkoKTtcblxuICB9O1xuXG4vL1xuLy8gICBpZiAoISRzY29wZS5lZGl0b3IpIHtcbi8vICAgICBjb25zb2xlLmxvZygnY3JlYXRlZCBlZGl0b3InKTtcbi8vICAgICAkc2NvcGUuZWRpdG9yID0gYWNlLmVkaXQoXCJhY2VcIik7XG4vLyAgICAgJHNjb3BlLmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0TW9kZShcImFjZS9tb2RlL2phdmFzY3JpcHRcIik7XG4vLyAgIH1cbi8vICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24gKCkge1xuLy8gICBjb25zb2xlLmxvZygnZGVzdHJveScpO1xuLy8gICAvLyRzY29wZS5lZGl0b3IuZ2V0U2Vzc2lvbigpLiRzdG9wV29ya2VyKCk7XG4vLyAgICRzY29wZS5lZGl0b3Iuc2V0U2Vzc2lvbihudWxsKTtcbi8vICAgJHNjb3BlLmVkaXRvci5kZXN0cm95KCk7XG4vLyB9KTtcblxuICB2YXIgcGF0aCA9ICRzdGF0ZS5wYXJhbXMucGF0aCA/IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGUucGFyYW1zLnBhdGgpIDogbnVsbDtcbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaW5kZXIgPSBuZXcgRmluZGVyTW9kZWwocGF0aCA/IG1vZGVsLmxpc3QuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ucGF0aCA9PT0gcGF0aDtcbiAgfSkgOiBtb2RlbC50cmVlKTtcblxuICAkc2NvcGUuZmluZGVyID0gZmluZGVyO1xuXG4gIGZ1bmN0aW9uIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLnJpZ2h0Q2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgY29uc29sZS5sb2coJ1JDbGlja2VkICcgKyBmc28ubmFtZSk7XG4gICAgJHNjb3BlLm1lbnVYID0gZS5wYWdlWDtcbiAgICAkc2NvcGUubWVudVkgPSBlLnBhZ2VZO1xuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG4gICAgJHNjb3BlLnRyZWVEYXRhLnNob3dNZW51ID0gdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUuY2xpY2tOb2RlID0gZnVuY3Rpb24oZnNvKSB7XG5cbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuXG4gICAgZmluZGVyLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmICghZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZzby5wYXRoKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5kZWxldGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5jb25maXJtKHtcbiAgICAgIHRpdGxlOiAnRGVsZXRlICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ0RlbGV0ZSBbJyArIGZzby5uYW1lICsgJ10uIEFyZSB5b3Ugc3VyZT8nXG4gICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVtb3ZlKGZzby5wYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnRGVsZXRlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnJlbmFtZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ1JlbmFtZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgYSBuZXcgbmFtZScsXG4gICAgICBkZWZhdWx0VmFsdWU6IGZzby5uYW1lLFxuICAgICAgcGxhY2Vob2xkZXI6IGZzby5pc0RpcmVjdG9yeSA/ICdGb2xkZXIgbmFtZScgOiAnRmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBvbGRQYXRoID0gZnNvLnBhdGg7XG4gICAgICB2YXIgbmV3UGF0aCA9IHAucmVzb2x2ZShmc28uZGlyLCB2YWx1ZSk7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShvbGRQYXRoLCBuZXdQYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBmaWxlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZGlyID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmb2xkZXInLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGb2xkZXIgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZm9sZGVyIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2RpcihwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZGlyZWN0b3J5IG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnBhc3RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihlLCBhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIgJiYgYWN0aXZlLmlzRGlyZWN0b3J5KSB7XG4gICAgICBpZiAoIXBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlLnBhdGgudG9Mb3dlckNhc2UoKS5pbmRleE9mKHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCkpICE9PSAwKSB7IC8vIGRpc2FsbG93IHBhc3RpbmcgaW50byBzZWxmIG9yIGEgZGVjZW5kZW50XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZSwgZnNvLCBvcCkge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG5cbiAgJHNjb3BlLm5vdE1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIChmc28ubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycgfHwgZnNvLm5hbWUgPT09ICdib3dlcl9jb21wb25lbnRzJykgPyBmYWxzZSA6IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLm5vZGVNb2R1bGVzID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuIGZzby5pc0RpcmVjdG9yeSAmJiBmc28ubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycgPyB0cnVlIDogZmFsc2U7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUpIHtcblxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUpIHtcbiAgJHNjb3BlLm1vZGVsLnEgPSAkc3RhdGUucGFyYW1zLnE7XG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWwsICRsb2csIGRpYWxvZywgcmVzcG9uc2VIYW5kbGVyKSB7XG5cbiAgdmFyIGV4cGFuZGVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAkc2NvcGUudHJlZURhdGEgPSB7XG4gICAgc2hvd01lbnU6IGZhbHNlXG4gIH07XG4gICRzY29wZS5hY3RpdmUgPSBudWxsO1xuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLmdldENsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHZhciBjbGFzc2VzID0gWydmc28nXTtcbiAgICBjbGFzc2VzLnB1c2goZnNvLmlzRGlyZWN0b3J5ID8gJ2RpcicgOiAnZmlsZScpO1xuXG4gICAgaWYgKGZzbyA9PT0gJHNjb3BlLmFjdGl2ZSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKCdhY3RpdmUnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gIH07XG5cbiAgJHNjb3BlLmdldEljb25DbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgICB2YXIgY2xhc3NlcyA9IFsnZmEnXTtcblxuICAgIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgIGNsYXNzZXMucHVzaCgkc2NvcGUuaXNFeHBhbmRlZChmc28pID8gJ2ZhLWZvbGRlci1vcGVuJyA6ICdmYS1mb2xkZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlLW8nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gIH07XG5cbiAgJHNjb3BlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gISFleHBhbmRlZFtmc28ucGF0aF07XG4gIH07XG5cbiAgJHNjb3BlLnJpZ2h0Q2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgY29uc29sZS5sb2coJ1JDbGlja2VkICcgKyBmc28ubmFtZSk7XG4gICAgJHNjb3BlLm1lbnVYID0gZS5wYWdlWDtcbiAgICAkc2NvcGUubWVudVkgPSBlLnBhZ2VZO1xuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG4gICAgJHNjb3BlLnRyZWVEYXRhLnNob3dNZW51ID0gdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUuY2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuXG4gICAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgdmFyIGlzRXhwYW5kZWQgPSAkc2NvcGUuaXNFeHBhbmRlZChmc28pO1xuICAgICAgaWYgKGlzRXhwYW5kZWQpIHtcbiAgICAgICAgZGVsZXRlIGV4cGFuZGVkW2Zzby5wYXRoXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4cGFuZGVkW2Zzby5wYXRoXSA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS5vcGVuKGZzbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5kZWxldGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5jb25maXJtKHtcbiAgICAgIHRpdGxlOiAnRGVsZXRlICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ0RlbGV0ZSBbJyArIGZzby5uYW1lICsgJ10uIEFyZSB5b3Ugc3VyZT8nXG4gICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVtb3ZlKGZzby5wYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnRGVsZXRlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnJlbmFtZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ1JlbmFtZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgYSBuZXcgbmFtZScsXG4gICAgICBkZWZhdWx0VmFsdWU6IGZzby5uYW1lLFxuICAgICAgcGxhY2Vob2xkZXI6IGZzby5pc0RpcmVjdG9yeSA/ICdGb2xkZXIgbmFtZScgOiAnRmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBvbGRQYXRoID0gZnNvLnBhdGg7XG4gICAgICB2YXIgbmV3UGF0aCA9IHAucmVzb2x2ZShmc28uZGlyLCB2YWx1ZSk7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShvbGRQYXRoLCBuZXdQYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBmaWxlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZGlyID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmb2xkZXInLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGb2xkZXIgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZm9sZGVyIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2RpcihwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZGlyZWN0b3J5IG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnBhc3RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihlLCBhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIgJiYgYWN0aXZlLmlzRGlyZWN0b3J5KSB7XG4gICAgICBpZiAoIXBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlLnBhdGgudG9Mb3dlckNhc2UoKS5pbmRleE9mKHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCkpICE9PSAwKSB7IC8vIGRpc2FsbG93IHBhc3RpbmcgaW50byBzZWxmIG9yIGEgZGVjZW5kZW50XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZSwgZnNvLCBvcCkge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG5cbiAgJHNjb3BlLm5vdE1vZHVsZXMgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gZnNvLmlzRGlyZWN0b3J5ICYmIChmc28ubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycgfHwgZnNvLm5hbWUgPT09ICdib3dlcl9jb21wb25lbnRzJykgPyBmYWxzZSA6IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLm5vZGVNb2R1bGVzID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuIGZzby5pc0RpcmVjdG9yeSAmJiBmc28ubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycgPyB0cnVlIDogZmFsc2U7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5jb25maWcoW1xuICAnJHN0YXRlUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxubW9kLnNlcnZpY2UoJ1Nlc3Npb25TZXJ2aWNlJywgW1xuICByZXF1aXJlKCcuL3NlcnZpY2VzL3Nlc3Npb24nKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0N0cmwnLCBbXG4gICckc2NvcGUnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaW5kZXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gICckbG9nJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnRmlsZVNlcnZpY2UnLFxuICAnUmVzcG9uc2VIYW5kbGVyJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maW5kZXInKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0ZpbGVDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJ3Nlc3Npb24nLFxuICAnRmlsZVNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2ZpbGUnKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc1NlYXJjaEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9zZWFyY2gnKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0RpckN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnZGlyJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXInKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc1RyZWVDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbCcsXG4gICckbG9nJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnUmVzcG9uc2VIYW5kbGVyJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy90cmVlJylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsImZ1bmN0aW9uIEZpbmRlck1vZGVsKGFjdGl2ZSkge1xuICAvLyB0aGlzLnRyZWUgPSB0cmVlO1xuICB0aGlzLmFjdGl2ZSA9IGFjdGl2ZTtcbn1cbkZpbmRlck1vZGVsLnByb3RvdHlwZS5fcmVhZENvbHMgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgLy92YXIgdHJlZSA9IHRoaXMuX3RyZWU7XG4gIHZhciBhY3RpdmUgPSB0aGlzLl9hY3RpdmU7XG4gIC8vdmFyIGFjdGl2ZUlzRGlyID0gYWN0aXZlLmlzRGlyZWN0b3J5O1xuXG4gIHZhciBjb2xzID0gW107XG5cbiAgaWYgKGFjdGl2ZSkge1xuXG4gICAgdmFyIGN1cnIgPSBhY3RpdmUuaXNEaXJlY3RvcnkgPyBhY3RpdmUgOiBhY3RpdmUucGFyZW50O1xuICAgIGRvIHtcbiAgICAgIGNvbHMudW5zaGlmdChjdXJyLmNoaWxkcmVuKTtcbiAgICAgIGN1cnIgPSBjdXJyLnBhcmVudDtcbiAgICB9IHdoaWxlIChjdXJyKTtcblxuICAgIGNvbHMuc2hpZnQoKTtcblxuICB9IGVsc2Uge1xuICAgIGNvbHMucHVzaCh0cmVlLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHJldHVybiBjb2xzO1xuXG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmdldENsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgY2xhc3NlcyA9IFsnZnNvJ107XG4gIGNsYXNzZXMucHVzaChmc28uaXNEaXJlY3RvcnkgPyAnZGlyJyA6ICdmaWxlJyk7XG5cbiAgaWYgKGZzbyA9PT0gdGhpcy5hY3RpdmUpIHtcbiAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpO1xuICB9XG5cbiAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5nZXRJY29uQ2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBjbGFzc2VzID0gWydmYSddO1xuXG4gIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICBjbGFzc2VzLnB1c2godGhpcy5pc0V4cGFuZGVkKGZzbykgPyAnZmEtZm9sZGVyLW9wZW4tbycgOiAnZmEtZm9sZGVyLW8nKTtcbiAgfSBlbHNlIHtcbiAgICBjbGFzc2VzLnB1c2goJ2ZhLWZpbGUnKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICB2YXIgaXNIaWdobGlnaHRlZCA9IGZhbHNlO1xuXG4gIGlmIChmc28gPT09IGFjdGl2ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGFjdGl2ZSAmJiBmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAvLyBjaGVjayBpZiBpdCBpcyBhbiBhbmNlc3RvclxuICAgIHZhciByID0gYWN0aXZlO1xuICAgIHdoaWxlIChyLnBhcmVudCkge1xuICAgICAgaWYgKHIgPT09IGZzbykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHIgPSByLnBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihkaXIpIHtcbiAgcmV0dXJuIHRoaXMuaXNIaWdobGlnaHRlZChkaXIpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5jb2xzID0gZnVuY3Rpb24odHJlZSkge1xuICByZXR1cm4gdGhpcy5fcmVhZENvbHModHJlZSk7XG59O1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEZpbmRlck1vZGVsLnByb3RvdHlwZSwge1xuICBhY3RpdmU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuX2FjdGl2ZSA9IHZhbHVlO1xuICAgIH1cbiAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBGaW5kZXJNb2RlbDtcbiIsImZ1bmN0aW9uIFNlc3Npb24oZGF0YSkge1xuICBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdGhpcy5wYXRoID0gZGF0YS5wYXRoO1xuICB0aGlzLnRpbWUgPSBkYXRhLnRpbWU7XG4gIHRoaXMuZGF0YSA9IGRhdGEuZGF0YSB8fCB7fTtcbiAgdGhpcy5pc1V0ZjggPSBkYXRhLmlzVXRmODtcbn1cblNlc3Npb24ucHJvdG90eXBlLm1hcmtDbGVhbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKSB7XG4gICAgdGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKCkubWFya0NsZWFuKCk7XG4gIH1cbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9uLnByb3RvdHlwZSwge1xuICBpc0RpcnR5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIpIHtcbiAgICAgICAgcmV0dXJuICF0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIoKS5pc0NsZWFuKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbm1vZHVsZS5leHBvcnRzID0gU2Vzc2lvbjtcbiIsIm1vZHVsZS5leHBvcnRzID0gYW5ndWxhci5tb2R1bGUoJ2ZzJywgW10pO1xuIiwidmFyIFNlc3Npb24gPSByZXF1aXJlKCcuLi9tb2RlbHMvc2Vzc2lvbicpO1xudmFyIGZzdyA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcblxudmFyIFNlc3Npb25zID0gZnVuY3Rpb24obWFwKSB7XG4gIHRoaXMuX3Nlc3Npb25zID0gW107XG4gIHRoaXMuX21hcCA9IG1hcDtcbn07XG5TZXNzaW9ucy5wcm90b3R5cGUuZmluZFNlc3Npb24gPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuXG4gIHJldHVybiBzZXNzaW9ucy5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBwYXRoO1xuICB9KTtcblxufTtcblNlc3Npb25zLnByb3RvdHlwZS5hZGRTZXNzaW9uID0gZnVuY3Rpb24ocGF0aCwgZGF0YSwgaXNVdGY4KSB7XG5cbiAgaWYgKHRoaXMuZmluZFNlc3Npb24ocGF0aCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nlc3Npb24gZm9yIHBhdGggZXhpc3RzIGFscmVhZHkuJyk7XG4gIH1cblxuICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcbiAgdmFyIHNlc3Npb24gPSBuZXcgU2Vzc2lvbih7XG4gICAgcGF0aDogcGF0aCxcbiAgICB0aW1lOiBEYXRlLm5vdygpLFxuICAgIGRhdGE6IGRhdGEsXG4gICAgaXNVdGY4OiBpc1V0ZjhcbiAgfSk7XG4gIHNlc3Npb25zLnVuc2hpZnQoc2Vzc2lvbik7XG5cbiAgcmV0dXJuIHNlc3Npb247XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZXNzaW9ucy5wcm90b3R5cGUsIHtcbiAgc2Vzc2lvbnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gc2Vzc2lvbnM7XG4gICAgICAvLyB2YXIgbWFwID0gdGhpcy5fbWFwO1xuICAgICAgLy9cbiAgICAgIC8vIC8vIGNsZWFuIGFueSBmaWxlcyB0aGF0IG1heSBubyBsb25nZXIgZXhpc3RcbiAgICAgIC8vIC8vIHZhciBpID0gc2Vzc2lvbnMubGVuZ3RoO1xuICAgICAgLy8gLy8gd2hpbGUgKGktLSkge1xuICAgICAgLy8gLy8gICBpZiAoIW1hcFtzZXNzaW9uc1tpXS5wYXRoXSkge1xuICAgICAgLy8gLy8gICAgIHNlc3Npb25zLnNwbGljZShpLCAxKTtcbiAgICAgIC8vIC8vICAgfVxuICAgICAgLy8gLy8gfVxuICAgICAgLy9cbiAgICAgIC8vIHJldHVybiBzZXNzaW9ucy5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgLy8gICByZXR1cm4gbWFwW2l0ZW0ucGF0aF07XG4gICAgICAvLyB9LCB0aGlzKTtcblxuICAgIH1cbiAgfSxcbiAgZGlydHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gICAgICByZXR1cm4gdGhpcy5zZXNzaW9ucy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5pc0RpcnR5O1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcblxuXG4vKlxuICogbW9kdWxlIGV4cG9ydHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgc2Vzc2lvbnMgPSBuZXcgU2Vzc2lvbnMoZnN3Lm1hcCk7XG4gIHJldHVybiBzZXNzaW9ucztcblxufTtcbiIsIlxuXG53aW5kb3cuYXBwID0gcmVxdWlyZSgnLi9hcHAnKTtcblxuXG4vL3dpbmRvdy5mcyA9IHJlcXVpcmUoJy4vZnMnKTtcblxuLy8gLy8gKioqKioqKioqKi8vKlxuLy8gLy8gU2hpbXNcbi8vIC8vICoqKioqKioqKioqXG5yZXF1aXJlKCcuL2FycmF5Jyk7XG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIERpcmVjdGl2ZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL25lZ2F0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9mb2N1cycpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9kYi1kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL3JpZ2h0LWNsaWNrJyk7XG4vLyAvLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL2JlaGF2ZScpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gQ29udHJvbGxlcnNcbi8vIC8vICoqKioqKioqKioqXG4vL1xuLy8gLy8gZGlhbG9nIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2NvbmZpcm0nKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYWxlcnQnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvcHJvbXB0Jyk7XG4vL1xuLy8gLy8gaG9tZSBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2hvbWUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy90cmVlJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvZmlsZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbmRlcicpO1xuLy9cbi8vIC8vIGRiIG1vZGVsIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2tleScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9hcnJheS1kZWYnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2NoZW1hJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL21vZGVsJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2RiJyk7XG4vL1xuLy9cbi8vIC8vIGFwaSBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYXBpJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9jb250cm9sbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9oYW5kbGVyJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9yb3V0ZScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWN0aW9uJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9kaWFncmFtJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9hZGQtcmVzb3VyY2UnKTtcbi8vXG4vL1xuLy8gLy8gbWFpbiBhcHAgY29udHJvbGxlclxuLy8gcmVxdWlyZSgnLi9hcHAvY29udHJvbGxlcnMvYXBwJyk7XG4vL1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBTZXJ2aWNlc1xuLy8gLy8gKioqKioqKioqKipcbi8vIHJlcXVpcmUoJy4vc2VydmljZXMvZGlhbG9nJyk7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcblxudmFyIEZpbGVTeXN0ZW1PYmplY3QgPSBmdW5jdGlvbihwYXRoLCBzdGF0KSB7XG4gIHRoaXMubmFtZSA9IHAuYmFzZW5hbWUocGF0aCkgfHwgcGF0aDtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy5kaXIgPSBwLmRpcm5hbWUocGF0aCk7XG4gIHRoaXMuaXNEaXJlY3RvcnkgPSB0eXBlb2Ygc3RhdCA9PT0gJ2Jvb2xlYW4nID8gc3RhdCA6IHN0YXQuaXNEaXJlY3RvcnkoKTtcbiAgdGhpcy5leHQgPSBwLmV4dG5hbWUocGF0aCk7XG4gIHRoaXMuc3RhdCA9IHN0YXQ7XG59O1xuRmlsZVN5c3RlbU9iamVjdC5wcm90b3R5cGUgPSB7XG4gIGdldCBpc0ZpbGUoKSB7XG4gICAgcmV0dXJuICF0aGlzLmlzRGlyZWN0b3J5O1xuICB9XG59O1xubW9kdWxlLmV4cG9ydHMgPSBGaWxlU3lzdGVtT2JqZWN0O1xuIiwiLyogZ2xvYmFsIGRpYWxvZyAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcm5kc3RyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygzNik7XG4gIH0sXG4gIGdldHVpZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucmFuZG9tKCkgKiAxZTcpKS50b1N0cmluZygpO1xuICB9LFxuICBnZXR1aWRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgdXJsUm9vdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxvY2F0aW9uID0gd2luZG93LmxvY2F0aW9uO1xuICAgIHJldHVybiBsb2NhdGlvbi5wcm90b2NvbCArICcvLycgKyBsb2NhdGlvbi5ob3N0O1xuICB9LFxuICBlbmNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBidG9hKGVuY29kZVVSSUNvbXBvbmVudChzdHIpKTtcbiAgfSxcbiAgZGVjb2RlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGF0b2Ioc3RyKSk7XG4gIH0sXG4gIGV4dGVuZDogZnVuY3Rpb24gZXh0ZW5kKG9yaWdpbiwgYWRkKSB7XG4gICAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICAgIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gb3JpZ2luO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfSxcbiAgdWk6IHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxufTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIikpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iXX0=
