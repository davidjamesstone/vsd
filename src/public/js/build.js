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

},{"../../../../shared/utils":35,"../../file-system":20,"../../file-system-watcher":19}],3:[function(require,module,exports){
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

},{"../../../../shared/file-system-object":34,"../../../../shared/utils":35,"../models/app":6}],4:[function(require,module,exports){
module.exports = function($parse) {
  return function($scope, $element, attrs) {
    var fn = $parse(attrs.ngScrolled);
    var el = $element[0];

    $scope.$watch(function() {
      el.scrollLeft = el.scrollWidth;
    });

  };
};

},{}],5:[function(require,module,exports){
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
      showPrintMargin: false,
      showGutter: true,
      setAutoScrollEditorIntoView: true,
      maxLines: 600,
      minLines: 5,
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

mod.directive('ngScrolled', [
  '$parse',
  require('./directives/scrolled')
]);

module.exports = mod;

},{"../dialog":16,"../fs":28,"./config":2,"./controllers":3,"./directives/scrolled":4,"./module":7,"./services/color":8,"./services/file":9,"./services/response-handler":10}],6:[function(require,module,exports){
var p = require('path');
var utils = require('../../../../shared/utils');

function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;
  this.sessions = data.sessionService;

  this.title = 'Title';
  this.subTitle = 'Subtitle';

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

},{"../../../../shared/utils":35,"path":36}],7:[function(require,module,exports){
module.exports = angular.module('app', [
  'ui.router',
  'ui.bootstrap',
  'ui.ace',
  'evgenyneu.markdown-preview',
  'michiKono',
  'dialog',
  'fs'
]);

},{}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){
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

},{"../../file-system":20}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };
};

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
module.exports = {
  alert: require('./alert'),
  confirm: require('./confirm'),
  prompt: require('./prompt')
};

},{"./alert":12,"./confirm":13,"./prompt":15}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{"./controllers":14,"./module":17,"./services/dialog":18}],17:[function(require,module,exports){
module.exports = angular.module('dialog', [
  'ui.bootstrap'
]);

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"../../shared/file-system-object":34,"../../shared/utils":35,"emitter-component":1}],20:[function(require,module,exports){
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

},{"../../shared/utils":35,"emitter-component":1}],21:[function(require,module,exports){
var filesystem = require('../../file-system');
var watcher = require('../../file-system-watcher');
var utils = require('../../../../shared/utils');
var EditSession = ace.require('ace/edit_session').EditSession;
var UndoManager = ace.require('ace/undomanager').UndoManager;

var modes = {
  ".js": "ace/mode/javascript",
  ".css": "ace/mode/css",
  ".scss": "ace/mode/scss",
  ".less": "ace/mode/less",
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

},{"../../../../shared/utils":35,"../../file-system":20,"../../file-system-watcher":19}],22:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],23:[function(require,module,exports){
module.exports = function($scope, session, fileService) {
  var isUtf8 = session.isUtf8;

  var model = $scope.model;

  var file = model.map[session.path];

  // ensure the finder is set the the right fso
  $scope.finder.active = file;

  model.addRecentFile(file);

  function imgBlobUrl() {
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
    $scope.$parent.editorSession = session.data;

    // if the editor exists, load the editSession we just assigned
    if ($scope.$parent.editor) {
      $scope.$parent.loadSession();
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
        $scope.imgUrl = imgBlobUrl();
        break;
    }
  }


};

},{}],24:[function(require,module,exports){
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

    // load the editorSession if one has already been defined (in FileCtrl)
    if ($scope.editorSession) {
      $scope.loadSession();
    }

  };

  $scope.loadSession = function() {
    $scope.editor.setSession($scope.editorSession);
  };

  $scope.aceChanged = function(editor) {
    // Don't remove. Simply handling this causes the $digest we want to update the UI
    console.log('Finder editor changed');
  };

  $scope.aceBlured = function(editor) {

    //$scope.$apply();

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

},{"../../../../shared/utils":35,"../../file-system":20,"../models/finder":29,"path":36}],25:[function(require,module,exports){
module.exports = function($scope) {

};

},{}],26:[function(require,module,exports){
module.exports = function($scope, $state) {
  $scope.model.q = $state.params.q;
};

},{}],27:[function(require,module,exports){
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

},{"../../file-system":20,"path":36}],28:[function(require,module,exports){
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

},{"./config":21,"./controllers":25,"./controllers/dir":22,"./controllers/file":23,"./controllers/finder":24,"./controllers/search":26,"./controllers/tree":27,"./module":31,"./services/session":32}],29:[function(require,module,exports){
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

},{}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],32:[function(require,module,exports){
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

},{"../../file-system-watcher":19,"../models/session":30}],33:[function(require,module,exports){


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

},{"./app":5,"./array":11}],34:[function(require,module,exports){
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

},{"path":36}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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
},{"q+64fw":37}],37:[function(require,module,exports){
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

},{}]},{},[33])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2VtaXR0ZXItY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9jb25maWcvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9kaXJlY3RpdmVzL3Njcm9sbGVkLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9jb2xvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcnJheS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvYWxlcnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2NvbmZpcm0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS13YXRjaGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9kaXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvc2VhcmNoLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3RyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2RlbHMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvc2VydmljZXMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL3V0aWxzLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHNlbGYub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9cbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6ICdBcHBDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvaW5kZXguaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGZzUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBmaWxlc3lzdGVtLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZXN5c3RlbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgZnNXYXRjaGVyUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB3YXRjaGVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUod2F0Y2hlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuaG9tZScsIHtcbiAgICAgIHVybDogJycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2FwcC5odG1sJ1xuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGJTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2RiJywge1xuICAgICAgICB1cmw6ICcvZGInLFxuICAgICAgICBjb250cm9sbGVyOiAnRGJDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdNb2RlbEN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgbW9kZWxQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZWRpdCcsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLWVkaXRvci5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgICB1cmw6ICcvOnNjaGVtYUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTY2hlbWFDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvc2NoZW1hLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgICB1cmw6ICcvOmtleUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdLZXlDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwva2V5Lmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcjZGlhZ3JhbScsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICAvL2NvbnRyb2xsZXI6ICdEaWFncmFtQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnYXBpJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2FwaS86YXBpTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgYXBpUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gd2luZG93Ll9hcGk7IC8vJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChhcGkvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGktaG9tZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJy9kaWFncmFtJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaURpYWdyYW1DdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvZGlhZ3JhbS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvY29udHJvbGxlcidcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86Y29udHJvbGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDb250cm9sbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtLmhhbmRsZXInLCB7XG4gICAgICAgIHVybDogJy86aGFuZGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAneEBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hhbmRsZXJAYXBpLmNvbnRyb2xsZXIuaXRlbSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdoYW5kbGVyJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaS5jb250cm9sbGVyLml0ZW0nLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9yb3V0ZSdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUtaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbS5hY3Rpb24nLCB7XG4gICAgICAgIHVybDogJy86YWN0aW9uSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUFjdGlvbkN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYWN0aW9uLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbn07XG4iLCJ2YXIgQXBwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvYXBwJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBmcywgd2F0Y2hlciwgZmlsZVNlcnZpY2UsIGRpYWxvZywgY29sb3JTZXJ2aWNlLCBzZXNzaW9uU2VydmljZSkge1xuXG4gIHZhciBtb2RlbCA9IG5ldyBBcHBNb2RlbCh7XG4gICAgZnM6IGZzLFxuICAgIHdhdGNoZXI6IHdhdGNoZXIsXG4gICAgc2Vzc2lvblNlcnZpY2U6IHNlc3Npb25TZXJ2aWNlXG4gIH0pO1xuXG4gICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuXG4gIC8vIExpc3RlbiBvdXQgZm9yIGNoYW5nZXMgdG8gdGhlIGZpbGUgc3lzdGVtXG4gIHdhdGNoZXIub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5tb2RlbCA9IG1vZGVsO1xuICAgIGNvbnNvbGUubG9nKCdmcyBjaGFuZ2UnKTtcbiAgICAkc2NvcGUuJGFwcGx5KCk7XG4gIH0pO1xuXG4gIHZhciBwYWNrYWdlRmlsZSA9IG1vZGVsLnBhY2thZ2VGaWxlO1xuICBpZiAocGFja2FnZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShwYWNrYWdlRmlsZS5wYXRoKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgbW9kZWwucGFja2FnZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gIHZhciByZWFkbWVGaWxlID0gbW9kZWwucmVhZG1lRmlsZTtcbiAgaWYgKHJlYWRtZUZpbGUpIHtcbiAgICBmaWxlU2VydmljZS5yZWFkRmlsZShyZWFkbWVGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5yZWFkbWUgPSByZXM7XG4gICAgfSk7XG4gIH1cblxuICAkc2NvcGUub25TZWFyY2hGb3JtU3VibWl0ID0gZnVuY3Rpb24oKSB7XG4gICAgJHN0YXRlLmdvKCdhcHAuZnMuc2VhcmNoJywgeyBxOiBzZWFyY2hGb3JtLnEudmFsdWUgfSk7XG4gIH07XG4gIC8vXG4gIC8vICRzY29wZS5maWxlVXJsID0gZnVuY3Rpb24oZmlsZSkge1xuICAvLyAgIHJldHVybiAkc3RhdGUuaHJlZignYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAvLyAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAvLyAgIH0pO1xuICAvLyB9O1xuXG4gICRzY29wZS5nb3RvRmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgICByZXR1cm4gJHN0YXRlLnRyYW5zaXRpb25UbygnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZpbGUucGF0aCB8fCBmaWxlKVxuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5maWxlUGFyYW1zID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIHJldHVybiB7IHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmaWxlLnBhdGgpfTtcbiAgfTtcblxuXG4gICRzY29wZS5kaXJVcmwgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZGlyLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29sb3IgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYyBjb2xvcnMgZnJvbSBhIHN0cmluZ1xuICAkc2NvcGUuY29sb3IgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLmhleCgpIDogJyc7XG4gIH07XG4gICRzY29wZS5jb2xvclRleHQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLnJlYWRhYmxlKCkuaGV4KCkgOiAnJztcbiAgfTtcblxuICAkc2NvcGUuY29udGVudENsYXNzID0gZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAncXNkc2EnO1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gc2F2ZVNlc3Npb24oc2Vzc2lvbikge1xuICAgIHZhciBwYXRoID0gc2Vzc2lvbi5wYXRoO1xuICAgIHZhciBlZGl0U2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcbiAgICB2YXIgY29udGVudHMgPSBlZGl0U2Vzc2lvbi5nZXRWYWx1ZSgpO1xuXG4gICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZScsIHBhdGgpO1xuXG4gICAgZnMud3JpdGVGaWxlKHBhdGgsIGNvbnRlbnRzLCBmdW5jdGlvbihyc3ApIHtcblxuICAgICAgaWYgKHJzcC5lcnIpIHtcblxuICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gV3JpdGUgRXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZUZpbGUgRmFpbGVkJywgcGF0aCwgcnNwLmVycik7XG5cbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZSBTdWNjZWVkZWQnLCBwYXRoKTtcblxuICAgICAgICBzZXNzaW9uLm1hcmtDbGVhbigpO1xuICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuXG4gICRzY29wZS5zYXZlU2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb24pIHtcbiAgICBzYXZlU2Vzc2lvbihzZXNzaW9uKTtcbiAgfTtcbiAgJHNjb3BlLnNhdmVBbGxTZXNzaW9ucyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZXNzaW9ucyA9IHNlc3Npb25TZXJ2aWNlLmRpcnR5O1xuXG4gICAgc2Vzc2lvbnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICBzYXZlU2Vzc2lvbihpdGVtKTtcbiAgICB9KTtcbiAgfTtcblxuICAkc2NvcGUuZW5jb2RlUGF0aCA9IHV0aWxzLmVuY29kZVN0cmluZztcbiAgJHNjb3BlLmRlY29kZVBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmc7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkcGFyc2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm5nU2Nyb2xsZWQpO1xuICAgIHZhciBlbCA9ICRlbGVtZW50WzBdO1xuXG4gICAgJHNjb3BlLiR3YXRjaChmdW5jdGlvbigpIHtcbiAgICAgIGVsLnNjcm9sbExlZnQgPSBlbC5zY3JvbGxXaWR0aDtcbiAgICB9KTtcblxuICB9O1xufTtcbiIsIi8vIHZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vZmlsZS1zeXN0ZW0nKTtcbi8vIHZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xuLy8gdmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbi8vIExvYWQgTW9kdWxlIERlcGVuZGVuY2llc1xucmVxdWlyZSgnLi4vZGlhbG9nJyk7XG5yZXF1aXJlKCcuLi9mcycpO1xuXG52YXIgbW9kID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxubW9kLnNlcnZpY2UoJ0ZpbGVTZXJ2aWNlJywgW1xuICAnJHEnLFxuICByZXF1aXJlKCcuL3NlcnZpY2VzL2ZpbGUnKVxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdSZXNwb25zZUhhbmRsZXInLCBbXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9yZXNwb25zZS1oYW5kbGVyJylcbl0pO1xuXG5tb2Quc2VydmljZSgnQ29sb3JTZXJ2aWNlJywgW1xuICByZXF1aXJlKCcuL3NlcnZpY2VzL2NvbG9yJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignQXBwQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnZnNQcm9taXNlJyxcbiAgJ2ZzV2F0Y2hlclByb21pc2UnLFxuICAnRmlsZVNlcnZpY2UnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdDb2xvclNlcnZpY2UnLFxuICAnU2Vzc2lvblNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJylcbl0pO1xuXG4vLyBBQ0UgR2xvYmFsIERlZmF1bHRzXG5tb2QucnVuKFsndWlBY2VDb25maWcnLFxuICBmdW5jdGlvbih1aUFjZUNvbmZpZykge1xuICAgIHVpQWNlQ29uZmlnLmFjZSA9IHt9O1xuICAgIGFuZ3VsYXIuZXh0ZW5kKHVpQWNlQ29uZmlnLmFjZSwge1xuICAgICAgdXNlV3JhcE1vZGU6IGZhbHNlLFxuICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgIHNob3dHdXR0ZXI6IHRydWUsXG4gICAgICBzZXRBdXRvU2Nyb2xsRWRpdG9ySW50b1ZpZXc6IHRydWUsXG4gICAgICBtYXhMaW5lczogNjAwLFxuICAgICAgbWluTGluZXM6IDUsXG4gICAgICBtb2RlOiAnamF2YXNjcmlwdCcsXG4gICAgICByZXF1aXJlOiBbJ2FjZS9leHQvbGFuZ3VhZ2VfdG9vbHMnXSxcbiAgICAgIGFkdmFuY2VkOiB7XG4gICAgICAgIGVuYWJsZVNuaXBwZXRzOiB0cnVlLFxuICAgICAgICBlbmFibGVCYXNpY0F1dG9jb21wbGV0aW9uOiB0cnVlLFxuICAgICAgICBlbmFibGVMaXZlQXV0b2NvbXBsZXRpb246IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXSk7XG5cbm1vZC5jb25maWcoW1xuICAnJHN0YXRlUHJvdmlkZXInLFxuICAnJGxvY2F0aW9uUHJvdmlkZXInLFxuICAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgcmVxdWlyZSgnLi9jb25maWcnKVxuXSk7XG5cbm1vZC5jb25maWcoIFsnJGNvbXBpbGVQcm92aWRlcicsIGZ1bmN0aW9uKCRjb21waWxlUHJvdmlkZXIpe1xuICAkY29tcGlsZVByb3ZpZGVyLmltZ1NyY1Nhbml0aXphdGlvbldoaXRlbGlzdCgvXlxccyooKGh0dHBzP3xmdHB8ZmlsZXxibG9iKTp8ZGF0YTppbWFnZVxcLykvKTtcbn1dKTtcblxubW9kLmRpcmVjdGl2ZSgnbmdTY3JvbGxlZCcsIFtcbiAgJyRwYXJzZScsXG4gIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9zY3JvbGxlZCcpXG5dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJ2YXIgcCA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG5mdW5jdGlvbiBBcHBNb2RlbChkYXRhKSB7XG4gIGRhdGEgPSBkYXRhIHx8IHt9O1xuICB0aGlzLmZzID0gZGF0YS5mcztcbiAgdGhpcy53YXRjaGVyID0gZGF0YS53YXRjaGVyO1xuICB0aGlzLnNlc3Npb25zID0gZGF0YS5zZXNzaW9uU2VydmljZTtcblxuICB0aGlzLnRpdGxlID0gJ1RpdGxlJztcbiAgdGhpcy5zdWJUaXRsZSA9ICdTdWJ0aXRsZSc7XG5cbiAgdGhpcy5fcmVjZW50RmlsZXMgPSBbXTtcbn1cbkFwcE1vZGVsLnByb3RvdHlwZS5hZGRSZWNlbnRGaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG4gIHZhciBpZHggPSByZWNlbnQuZmluZEluZGV4KGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5wYXRoID09PSBmaWxlLnBhdGg7XG4gIH0pO1xuICBpZiAoaWR4ICE9PSAtMSkge1xuICAgIHJlY2VudC5tb3ZlKGlkeCwgMCk7XG4gIH0gZWxzZSB7XG4gICAgcmVjZW50LnVuc2hpZnQoeyBwYXRoOiBmaWxlLnBhdGgsIHRpbWU6IERhdGUubm93KCkgfSk7XG4gICAgcmVjZW50Lmxlbmd0aCA9IE1hdGgubWluKHRoaXMuX3JlY2VudEZpbGVzLmxlbmd0aCwgMjApO1xuICB9XG59O1xuXG5BcHBNb2RlbC5wcm90b3R5cGUuY291bnRGaWxlcyA9IGZ1bmN0aW9uKGV4dCkge1xuICByZXR1cm4gdGhpcy5saXN0LmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuICFpdGVtLmlzRGlyZWN0b3J5ICYmIGl0ZW0uZXh0ID09PSBleHQ7XG4gIH0pLmxlbmd0aDtcbn07XG5BcHBNb2RlbC5wcm90b3R5cGUuY2xlYXJSZWNlbnRGaWxlcyA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9yZWNlbnRGaWxlcy5sZW5ndGggPSAwO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5nZXRSZWxhdGl2ZVBhdGggPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwLnJlbGF0aXZlKHRoaXMudHJlZS5kaXIsIHBhdGgpO1xufTtcbkFwcE1vZGVsLnByb3RvdHlwZS5fcmVhZERlcGVuZGVuY2llcyA9IGZ1bmN0aW9uKGRldikge1xuICB2YXIgZGVwcyA9IFtdO1xuICB2YXIgcGFja2FnZUpTT04gPSB0aGlzLl9wYWNrYWdlSlNPTjtcbiAgaWYgKHBhY2thZ2VKU09OKSB7XG4gICAgdmFyIGRlcEtleSA9IHBhY2thZ2VKU09OW2RldiA/ICdkZXZEZXBlbmRlbmNpZXMnIDogJ2RlcGVuZGVuY2llcyddO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVwS2V5KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0ga2V5c1tpXTtcbiAgICAgIHZhciB2ZXJzaW9uID0gZGVwS2V5W25hbWVdO1xuICAgICAgZGVwcy5wdXNoKHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvblxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXBzO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwcE1vZGVsLnByb3RvdHlwZSwge1xuICBtYXA6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5tYXA7XG4gICAgfVxuICB9LFxuICBsaXN0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLndhdGNoZXIubGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci50cmVlWzBdLmNoaWxkcmVuWzBdO1xuICAgIH1cbiAgfSxcbiAgcmVjZW50RmlsZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuXG4gICAgICAvLyBjbGVhbiBhbnkgZmlsZXMgdGhhdCBtYXkgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICB2YXIgaSA9IHJlY2VudC5sZW5ndGg7XG4gICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIGlmICghdGhpcy5tYXBbcmVjZW50W2ldLnBhdGhdKSB7XG4gICAgICAgICAgcmVjZW50LnNwbGljZShpLCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVjZW50Lm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1hcFtpdGVtLnBhdGhdO1xuICAgICAgfSwgdGhpcyk7XG5cbiAgICB9XG4gIH0sXG4gIGpzQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmpzJyk7XG4gICAgfVxuICB9LFxuICBjc3NDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuY3NzJyk7XG4gICAgfVxuICB9LFxuICBodG1sQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuY291bnRGaWxlcygnLmh0bWwnKTtcbiAgICB9XG4gIH0sXG4gIHRvdGFsQ291bnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubGlzdC5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYWNrYWdlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcGFja2FnZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fcGFja2FnZUpTT04gPSBKU09OLnBhcnNlKHZhbHVlLmNvbnRlbnRzKTtcbiAgICAgIHRoaXMuX2RlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXMoKTtcbiAgICAgIHRoaXMuX2RldkRlcGVuZGVuY2llcyA9IHRoaXMuX3JlYWREZXBlbmRlbmNpZXModHJ1ZSk7XG4gICAgfVxuICB9LFxuICBwYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50cmVlLmNoaWxkcmVuLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdwYWNrYWdlLmpzb24nO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBoYXNQYWNrYWdlRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnBhY2thZ2VGaWxlO1xuICAgIH1cbiAgfSxcbiAgZGVwZW5kZW5jaWVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZXBlbmRlbmNpZXM7XG4gICAgfVxuICB9LFxuICBkZXZEZXBlbmRlbmNpZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RldkRlcGVuZGVuY2llcztcbiAgICB9XG4gIH0sXG4gIHJlYWRtZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fcmVhZG1lO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fcmVhZG1lID0gdmFsdWU7XG4gICAgfVxuICB9LFxuICByZWFkbWVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyZWUuY2hpbGRyZW4uZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiAgL15yZWFkbWUuKG1kfG1hcmtkb3duKSQvLnRlc3QoaXRlbS5uYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBoYXNSZWFkbWVGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMucmVhZG1lRmlsZTtcbiAgICB9XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwTW9kZWw7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbXG4gICd1aS5yb3V0ZXInLFxuICAndWkuYm9vdHN0cmFwJyxcbiAgJ3VpLmFjZScsXG4gICdldmdlbnluZXUubWFya2Rvd24tcHJldmlldycsXG4gICdtaWNoaUtvbm8nLFxuICAnZGlhbG9nJyxcbiAgJ2ZzJ1xuXSk7XG4iLCIvKipcbiAqIGNvbG9yVGFnIHYgMC4xXG4gKiBieSBSeWFuIFF1aW5uXG4gKiBodHRwczovL2dpdGh1Yi5jb20vbWF6b25kby9jb2xvclRhZ1xuICpcbiAqIGNvbG9yVGFnIGlzIHVzZWQgdG8gZ2VuZXJhdGUgYSByYW5kb20gY29sb3IgZnJvbSBhIGdpdmVuIHN0cmluZ1xuICogVGhlIGdvYWwgaXMgdG8gY3JlYXRlIGRldGVybWluaXN0aWMsIHVzYWJsZSBjb2xvcnMgZm9yIHRoZSBwdXJwb3NlXG4gKiBvZiBhZGRpbmcgY29sb3IgY29kaW5nIHRvIHRhZ3NcbiovXG5cbmZ1bmN0aW9uIGNvbG9yVGFnKHRhZ1N0cmluZykge1xuXHQvLyB3ZXJlIHdlIGdpdmVuIGEgc3RyaW5nIHRvIHdvcmsgd2l0aD8gIElmIG5vdCwgdGhlbiBqdXN0IHJldHVybiBmYWxzZVxuXHRpZiAoIXRhZ1N0cmluZykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm4gc3RoZSBsdW1pbm9zaXR5IGRpZmZlcmVuY2UgYmV0d2VlbiAyIHJnYiB2YWx1ZXNcblx0ICogYW55dGhpbmcgZ3JlYXRlciB0aGFuIDUgaXMgY29uc2lkZXJlZCByZWFkYWJsZVxuXHQgKi9cblx0ZnVuY3Rpb24gbHVtaW5vc2l0eURpZmYocmdiMSwgcmdiMikge1xuICBcdFx0dmFyIGwxID0gMC4yMTI2ICsgTWF0aC5wb3cocmdiMS5yLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuNzE1MiAqIE1hdGgucG93KHJnYjEuZy8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjA3MjIgKiBNYXRoLnBvdyhyZ2IxLmIvMjU1LCAyLjIpLFxuICBcdFx0XHRsMiA9IDAuMjEyNiArIE1hdGgucG93KHJnYjIuci8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjcxNTIgKiBNYXRoLnBvdyhyZ2IyLmcvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC4wNzIyICogTWF0aC5wb3cocmdiMi5iLzI1NSwgMi4yKTtcblxuICBcdFx0aWYgKGwxID4gbDIpIHtcbiAgXHRcdFx0cmV0dXJuIChsMSArIDAuMDUpIC8gKGwyICsgMC4wNSk7XG4gIFx0XHR9IGVsc2Uge1xuICBcdFx0XHRyZXR1cm4gKGwyICsgMC4wNSkgLyAobDEgKyAwLjA1KTtcbiAgXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBUaGlzIGlzIHRoZSBkZWZpbml0aW9uIG9mIGEgY29sb3IgZm9yIG91ciBwdXJwb3Nlcy4gIFdlJ3ZlIGFic3RyYWN0ZWQgaXQgb3V0XG5cdCAqIHNvIHRoYXQgd2UgY2FuIHJldHVybiBuZXcgY29sb3Igb2JqZWN0cyB3aGVuIHJlcXVpcmVkXG5cdCovXG5cdGZ1bmN0aW9uIGNvbG9yKGhleENvZGUpIHtcblx0XHQvL3dlcmUgd2UgZ2l2ZW4gYSBoYXNodGFnPyAgcmVtb3ZlIGl0LlxuXHRcdHZhciBoZXhDb2RlID0gaGV4Q29kZS5yZXBsYWNlKFwiI1wiLCBcIlwiKTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIGEgc2ltcGxlIGhleCBzdHJpbmcgaW5jbHVkaW5nIGhhc2h0YWdcblx0XHRcdCAqIG9mIHRoZSBjb2xvclxuXHRcdFx0ICovXG5cdFx0XHRoZXg6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gaGV4Q29kZTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhbiBSR0IgYnJlYWtkb3duIG9mIHRoZSBjb2xvciBwcm92aWRlZFxuXHRcdFx0ICovXG5cdFx0XHRyZ2I6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYmlnaW50ID0gcGFyc2VJbnQoaGV4Q29kZSwgMTYpO1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdHI6IChiaWdpbnQgPj4gMTYpICYgMjU1LFxuXHRcdFx0XHRcdGc6IChiaWdpbnQgPj4gOCkgJiAyNTUsXG5cdFx0XHRcdFx0YjogYmlnaW50ICYgMjU1XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogR2l2ZW4gYSBsaXN0IG9mIGhleCBjb2xvciBjb2Rlc1xuXHRcdFx0ICogRGV0ZXJtaW5lIHdoaWNoIGlzIHRoZSBtb3N0IHJlYWRhYmxlXG5cdFx0XHQgKiBXZSB1c2UgdGhlIGx1bWlub3NpdHkgZXF1YXRpb24gcHJlc2VudGVkIGhlcmU6XG5cdFx0XHQgKiBodHRwOi8vd3d3LnNwbGl0YnJhaW4ub3JnL2Jsb2cvMjAwOC0wOS8xOC1jYWxjdWxhdGluZ19jb2xvcl9jb250cmFzdF93aXRoX3BocFxuXHRcdFx0ICovXG5cdFx0XHRyZWFkYWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vIHRoaXMgaXMgbWVhbnQgdG8gYmUgc2ltcGxpc3RpYywgaWYgeW91IGRvbid0IGdpdmUgbWUgbW9yZSB0aGFuXG5cdFx0XHRcdC8vIG9uZSBjb2xvciB0byB3b3JrIHdpdGgsIHlvdSdyZSBnZXR0aW5nIHdoaXRlIG9yIGJsYWNrLlxuXHRcdFx0XHR2YXIgY29tcGFyYXRvcnMgPSAoYXJndW1lbnRzLmxlbmd0aCA+IDEpID8gYXJndW1lbnRzIDogW1wiI0UxRTFFMVwiLCBcIiM0NjQ2NDZcIl0sXG5cdFx0XHRcdFx0b3JpZ2luYWxSR0IgPSB0aGlzLnJnYigpLFxuXHRcdFx0XHRcdGJyaWdodGVzdCA9IHsgZGlmZmVyZW5jZTogMCB9O1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY29tcGFyYXRvcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHQvL2NhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIHRoZSBvcmlnaW5hbCBjb2xvciBhbmQgdGhlIG9uZSB3ZSB3ZXJlIGdpdmVuXG5cdFx0XHRcdFx0dmFyIGMgPSBjb2xvcihjb21wYXJhdG9yc1tpXSksXG5cdFx0XHRcdFx0XHRsID0gbHVtaW5vc2l0eURpZmYob3JpZ2luYWxSR0IsIGMucmdiKCkpO1xuXG5cdFx0XHRcdFx0Ly8gaWYgaXQncyBicmlnaHRlciB0aGFuIHRoZSBjdXJyZW50IGJyaWdodGVzdCwgc3RvcmUgaXQgdG8gY29tcGFyZSBhZ2FpbnN0IGxhdGVyIG9uZXNcblx0XHRcdFx0XHRpZiAobCA+IGJyaWdodGVzdC5kaWZmZXJlbmNlKSB7XG5cdFx0XHRcdFx0XHRicmlnaHRlc3QgPSB7XG5cdFx0XHRcdFx0XHRcdGRpZmZlcmVuY2U6IGwsXG5cdFx0XHRcdFx0XHRcdGNvbG9yOiBjXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gcmV0dXJuIHRoZSBicmlnaGVzdCBjb2xvclxuXHRcdFx0XHRyZXR1cm4gYnJpZ2h0ZXN0LmNvbG9yO1xuXHRcdFx0fVxuXG5cdFx0fVxuXHR9XG5cblx0Ly8gY3JlYXRlIHRoZSBoZXggZm9yIHRoZSByYW5kb20gc3RyaW5nXG4gICAgdmFyIGhhc2ggPSAwO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFnU3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGhhc2ggPSB0YWdTdHJpbmcuY2hhckNvZGVBdChpKSArICgoaGFzaCA8PCA1KSAtIGhhc2gpO1xuICAgIH1cbiAgICBoZXggPSBcIlwiXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcbiAgICAgICAgdmFyIHZhbHVlID0gKGhhc2ggPj4gKGkgKiA4KSkgJiAweEZGO1xuICAgICAgICBoZXggKz0gKCcwMCcgKyB2YWx1ZS50b1N0cmluZygxNikpLnN1YnN0cigtMik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbG9yKGhleCk7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGNvbG9yVGFnO1xufTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkcSkge1xuICByZXR1cm4ge1xuICAgIHJlYWRGaWxlOiBmdW5jdGlvbihmaWxlKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICBmaWxlc3lzdGVtLnJlYWRGaWxlKGZpbGUsIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICBpZiAocmVzLmVycikge1xuICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXMuZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlcy5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgfTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRpYWxvZykge1xuICByZXR1cm4ge1xuICAgIHJlc3BvbnNlSGFuZGxlcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihyc3AsIHNob3dFcnJvcikge1xuICAgICAgICBzaG93RXJyb3IgPSBzaG93RXJyb3IgfHwgdHJ1ZTtcbiAgICAgICAgaWYgKHJzcC5lcnIpIHtcbiAgICAgICAgICBpZiAoc2hvd0Vycm9yKSB7XG4gICAgICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocnNwLmVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmbihyc3AuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9O1xufTtcbiIsIkFycmF5LnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24ob2xkSW5kZXgsIG5ld0luZGV4KSB7XG5cbiAgaWYgKGlzTmFOKG5ld0luZGV4KSB8fCBpc05hTihvbGRJbmRleCkgfHwgb2xkSW5kZXggPCAwIHx8IG9sZEluZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG5ld0luZGV4IDwgMCkge1xuICAgIG5ld0luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICB9IGVsc2UgaWYgKG5ld0luZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgbmV3SW5kZXggPSAwO1xuICB9XG5cbiAgdGhpcy5zcGxpY2UobmV3SW5kZXgsIDAsIHRoaXMuc3BsaWNlKG9sZEluZGV4LCAxKVswXSk7XG5cbiAgcmV0dXJuIG5ld0luZGV4O1xufTtcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICBBcnJheS5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIGlmICh0aGlzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9O1xufVxuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kSW5kZXgpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmRJbmRleCA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICByZXR1cm4gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIC0xO1xuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhbGVydDogcmVxdWlyZSgnLi9hbGVydCcpLFxuICBjb25maXJtOiByZXF1aXJlKCcuL2NvbmZpcm0nKSxcbiAgcHJvbXB0OiByZXF1aXJlKCcuL3Byb21wdCcpXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAkc2NvcGUucGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyO1xuICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gIH07XG5cbiAgJHNjb3BlLm9rID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgfTtcblxuICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG52YXIgY29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLmFsZXJ0XG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5jb25maXJtXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ1Byb21wdEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLnByb21wdFxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdEaWFsb2dTZXJ2aWNlJywgW1xuICAnJG1vZGFsJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZGlhbG9nJywgW1xuICAndWkuYm9vdHN0cmFwJ1xuXSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gIHZhciBzZXJ2aWNlID0ge307XG5cbiAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL2FsZXJ0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLmNvbmZpcm0gPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9jb25maXJtLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpcm1DdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHNlcnZpY2UucHJvbXB0ID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9kaWFsb2cvdmlld3MvcHJvbXB0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ1Byb21wdEN0cmwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdGl0bGU6IGRhdGEudGl0bGUsXG4gICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2UsXG4gICAgICAgICAgICBkZWZhdWx0VmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGRhdGEucGxhY2Vob2xkZXJcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkucmVzdWx0O1xuXG4gIH07XG5cbiAgcmV0dXJuIHNlcnZpY2U7XG5cbn07XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdCcpO1xudmFyIGVtaXR0ZXIgPSByZXF1aXJlKCdlbWl0dGVyLWNvbXBvbmVudCcpO1xuXG4vKlxuICogRmlsZVN5c3RlbVdhdGNoZXIgY29uc3RydWN0b3JcbiAqL1xuZnVuY3Rpb24gRmlsZVN5c3RlbVdhdGNoZXIoKSB7XG5cbiAgdGhpcy5fd2F0Y2hlZCA9IHt9O1xuXG4gIHRoaXMuX2xpc3QgPSBudWxsO1xuICB0aGlzLl90cmVlID0gbnVsbDtcblxuICB2YXIgc29ja2V0ID0gaW8uY29ubmVjdCh1dGlscy51cmxSb290KCkgKyAnL2Zzd2F0Y2gnKTtcblxuICBzb2NrZXQub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG5cbiAgICBPYmplY3Qua2V5cyhkYXRhKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICB0aGlzLl93YXRjaGVkW2tleV0gPSBuZXcgRmlsZVN5c3RlbU9iamVjdChrZXksIGRhdGFba2V5XS5pc0RpcmVjdG9yeSk7XG4gICAgfSwgdGhpcyk7XG5cbiAgICAvL3V0aWxzLmV4dGVuZCh0aGlzLl93YXRjaGVkLCBkYXRhKTtcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGNvbm5lY3Rpb24nKTtcblxuICAgIHRoaXMuZW1pdCgnY29ubmVjdGlvbicsIHRoaXMuX3dhdGNoZWQpO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZCcsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCBmYWxzZSk7XG5cbiAgICB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF0gPSBmc287XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBhZGQnLCBmc28pO1xuXG4gICAgdGhpcy5lbWl0KCdhZGQnLCBmc28pO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2FkZERpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gbmV3IEZpbGVTeXN0ZW1PYmplY3QoZGF0YS5wYXRoLCB0cnVlKTtcblxuICAgIHRoaXMuX3dhdGNoZWRbZnNvLnBhdGhdID0gZnNvO1xuXG4gICAgY29uc29sZS5sb2coJ1dhdGNoZXIgYWRkRGlyJywgZnNvKTtcblxuICAgIHRoaXMuZW1pdCgnYWRkRGlyJywgZnNvKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgIC8vIGNoZWNrIHdlIGdvdCBzb21ldGhpbmdcbiAgICBpZiAoZnNvKSB7XG5cbiAgICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGNoYW5nZScsIGZzbyk7XG5cbiAgICAgIHRoaXMuZW1pdCgnbW9kaWZpZWQnLCBmc28pO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciB1bmxpbmsnLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ3VubGluaycsIGZzbyk7XG4gICAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigndW5saW5rRGlyJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICBpZiAoZnNvKSB7XG4gICAgICBkZWxldGUgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciB1bmxpbmtEaXInLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ3VubGlua0RpcicsIGZzbyk7XG4gICAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuICAgIH1cblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignZXJyb3InLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGVycm9yJywgcmVzLmVycik7XG5cbiAgICB0aGlzLmVtaXQoJ2Vycm9yJywgcmVzLmVycik7XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgdGhpcy5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fbGlzdCA9IG51bGw7XG4gICAgdGhpcy5fdHJlZSA9IG51bGw7XG4gIH0pO1xuXG59XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaWxlU3lzdGVtV2F0Y2hlci5wcm90b3R5cGUsIHtcbiAgbWFwOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93YXRjaGVkO1xuICAgIH1cbiAgfSxcbiAgbGlzdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoIXRoaXMuX2xpc3QpIHtcbiAgICAgICAgdGhpcy5fbGlzdCA9IFtdO1xuICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuX3dhdGNoZWQpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLl9saXN0LnB1c2godGhpcy5fd2F0Y2hlZFtrZXlzW2ldXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLl9saXN0O1xuICAgIH1cbiAgfSxcbiAgdHJlZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG5cbiAgICAgIGZ1bmN0aW9uIHRyZWVpZnkobGlzdCwgaWRBdHRyLCBwYXJlbnRBdHRyLCBjaGlsZHJlbkF0dHIpIHtcblxuICAgICAgICB2YXIgdHJlZUxpc3QgPSBbXTtcbiAgICAgICAgdmFyIGxvb2t1cCA9IHt9O1xuICAgICAgICB2YXIgcGF0aCwgb2JqO1xuXG4gICAgICAgIGZvciAocGF0aCBpbiBsaXN0KSB7XG5cbiAgICAgICAgICBvYmogPSBsaXN0W3BhdGhdO1xuICAgICAgICAgIG9iai5sYWJlbCA9IG9iai5uYW1lO1xuICAgICAgICAgIGxvb2t1cFtvYmpbaWRBdHRyXV0gPSBvYmo7XG4gICAgICAgICAgb2JqW2NoaWxkcmVuQXR0cl0gPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAocGF0aCBpbiBsaXN0KSB7XG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICB2YXIgcGFyZW50ID0gbG9va3VwW29ialtwYXJlbnRBdHRyXV07XG4gICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgb2JqLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgICAgIGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dW2NoaWxkcmVuQXR0cl0ucHVzaChvYmopO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0cmVlTGlzdC5wdXNoKG9iaik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRyZWVMaXN0O1xuXG4gICAgICB9XG5cbiAgICAgIGlmICghdGhpcy5fdHJlZSkge1xuICAgICAgICB0aGlzLl90cmVlID0gdHJlZWlmeSh0aGlzLl93YXRjaGVkLCAncGF0aCcsICdkaXInLCAnY2hpbGRyZW4nKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuX3RyZWU7XG4gICAgfVxuICB9XG59KTtcbmVtaXR0ZXIoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlKTtcblxudmFyIEZpbGVTeXN0ZW1XYXRjaGVyID0gbmV3IEZpbGVTeXN0ZW1XYXRjaGVyKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbVdhdGNoZXI7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTs7XG5cbi8qXG4gKiBGaWxlU3lzdGVtIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW0oc29ja2V0KSB7XG5cbiAgc29ja2V0Lm9uKCdta2RpcicsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdta2RpcicsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ21rZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdta2ZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb3B5JywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2NvcHknLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZW5hbWUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgncmVuYW1lJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVtb3ZlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbW92ZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlYWRmaWxlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlYWRmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignd3JpdGVmaWxlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3dyaXRlZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnY29ubmVjdGlvbicsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLl9zb2NrZXQgPSBzb2NrZXQ7XG5cbn1cbkZpbGVTeXN0ZW0ucHJvdG90eXBlLm1rZGlyID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ21rZGlyJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLm1rZmlsZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2ZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdjb3B5Jywgc291cmNlLCBkZXN0aW5hdGlvbiwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbmFtZSA9IGZ1bmN0aW9uKG9sZFBhdGgsIG5ld1BhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW5hbWUnLCBvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24ocGF0aCwgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3JlbW92ZScsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZWFkZmlsZScsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS53cml0ZUZpbGUgPSBmdW5jdGlvbihwYXRoLCBjb250ZW50cywgY2FsbGJhY2spIHtcbiAgdGhpcy5fc29ja2V0LmVtaXQoJ3dyaXRlZmlsZScsIHBhdGgsIGNvbnRlbnRzLCBjYWxsYmFjayk7XG59O1xuXG5lbWl0dGVyKEZpbGVTeXN0ZW0ucHJvdG90eXBlKTtcblxuXG52YXIgc29ja2V0ID0gaW8uY29ubmVjdCh1dGlscy51cmxSb290KCkgKyAnL2ZzJyk7XG5cbnZhciBmaWxlU3lzdGVtID0gbmV3IEZpbGVTeXN0ZW0oc29ja2V0KTtcblxuZmlsZVN5c3RlbS5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgY29uc29sZS5sb2coJ2ZzIGNvbm5lY3RlZCcsIGRhdGEpO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmaWxlU3lzdGVtO1xuIiwidmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHdhdGNoZXIgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBFZGl0U2Vzc2lvbiA9IGFjZS5yZXF1aXJlKCdhY2UvZWRpdF9zZXNzaW9uJykuRWRpdFNlc3Npb247XG52YXIgVW5kb01hbmFnZXIgPSBhY2UucmVxdWlyZSgnYWNlL3VuZG9tYW5hZ2VyJykuVW5kb01hbmFnZXI7XG5cbnZhciBtb2RlcyA9IHtcbiAgXCIuanNcIjogXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIsXG4gIFwiLmNzc1wiOiBcImFjZS9tb2RlL2Nzc1wiLFxuICBcIi5zY3NzXCI6IFwiYWNlL21vZGUvc2Nzc1wiLFxuICBcIi5sZXNzXCI6IFwiYWNlL21vZGUvbGVzc1wiLFxuICBcIi5odG1sXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICBcIi5odG1cIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gIFwiLmVqc1wiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgXCIuanNvblwiOiBcImFjZS9tb2RlL2pzb25cIixcbiAgXCIubWRcIjogXCJhY2UvbW9kZS9tYXJrZG93blwiLFxuICBcIi5jb2ZmZWVcIjogXCJhY2UvbW9kZS9jb2ZmZWVcIixcbiAgXCIuamFkZVwiOiBcImFjZS9tb2RlL2phZGVcIixcbiAgXCIucGhwXCI6IFwiYWNlL21vZGUvcGhwXCIsXG4gIFwiLnB5XCI6IFwiYWNlL21vZGUvcHl0aG9uXCIsXG4gIFwiLnNjc3NcIjogXCJhY2UvbW9kZS9zYXNzXCIsXG4gIFwiLnR4dFwiOiBcImFjZS9tb2RlL3RleHRcIixcbiAgXCIudHlwZXNjcmlwdFwiOiBcImFjZS9tb2RlL3R5cGVzY3JpcHRcIixcbiAgXCIueG1sXCI6IFwiYWNlL21vZGUveG1sXCJcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAuZnMnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIC8vdXJsOiAnZnMnLFxuICAgICAgLy8gY29udHJvbGxlcjogJ0ZzQ3RybCcsXG4gICAgICAvL3RlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9pbmRleC5odG1sJyxcbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlcicsIHtcbiAgICAgIHVybDogJy9maW5kZXInLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNGaW5kZXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZmluZGVyLmh0bWwnXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmZpbmRlci5maWxlJywge1xuICAgICAgdXJsOiAnL2ZpbGUvOnBhdGgnLFxuICAgICAgY29udHJvbGxlcjogJ0ZzRmlsZUN0cmwnLFxuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbGUuaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIHNlc3Npb246IFsnJHEnLCAnJHN0YXRlUGFyYW1zJywgJ0ZpbGVTZXJ2aWNlJywgJ1Nlc3Npb25TZXJ2aWNlJyxcbiAgICAgICAgICBmdW5jdGlvbigkcSwgJHN0YXRlUGFyYW1zLCBmaWxlU2VydmljZSwgc2Vzc2lvblNlcnZpY2UpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZXF1ZXN0ZWQgZmlsZSAnICsgcGF0aCk7XG5cbiAgICAgICAgICAgIHZhciBzZXNzaW9uID0gc2Vzc2lvblNlcnZpY2UuZmluZFNlc3Npb24ocGF0aCk7XG5cbiAgICAgICAgICAgIGlmIChzZXNzaW9uKSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VzaW5nIGZvdW5kIHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoc2Vzc2lvbik7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlYWRpbmcgZmlsZSBmb3IgbmV3IHNlc3Npb24uJyk7XG4gICAgICAgICAgICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhdGgpLnRoZW4oZnVuY3Rpb24oZmlsZSkge1xuXG4gICAgICAgICAgICAgICAgdmFyIGlzVXRmOCA9ICEoZmlsZS5jb250ZW50cyBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcblxuICAgICAgICAgICAgICAgIHZhciBzZXNzaW9uRGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVdGY4KSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IG5ldyBFZGl0U2Vzc2lvbihmaWxlLmNvbnRlbnRzLCBtb2Rlc1tmaWxlLmV4dF0pO1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEuc2V0VW5kb01hbmFnZXIobmV3IFVuZG9NYW5hZ2VyKCkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzZXNzaW9uRGF0YSA9IGZpbGUuY29udGVudHM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmFkZFNlc3Npb24ocGF0aCwgc2Vzc2lvbkRhdGEsIGlzVXRmOCk7XG5cbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNlc3Npb24pO1xuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5zZWFyY2gnLCB7XG4gICAgICB1cmw6ICcvc2VhcmNoP3EnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzU2VhcmNoQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL3NlYXJjaC5odG1sJyxcbiAgICAgICAgICAvLyByZXNvbHZlOiB7XG4gICAgICAgICAgLy8gICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAvLyAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgLy8gICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgIC8vICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgIC8vICAgXVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuZGlyJywge1xuICAgICAgdXJsOiAnL2Rpci86cGF0aCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGFwcCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBwJyxcbiAgICAgICAgICBjb250cm9sbGVyOiAnRnNEaXJDdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvZGlyLmh0bWwnLFxuICAgICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGRpcjogWyckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgICBmdW5jdGlvbigkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aCA9IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGVQYXJhbXMucGF0aCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhdGNoZXIubWFwW3BhdGhdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgZGlyLCBmaWxlU2VydmljZSkge1xuICAkc2NvcGUuZGlyID0gZGlyO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCBzZXNzaW9uLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gc2Vzc2lvbi5pc1V0Zjg7XG5cbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaWxlID0gbW9kZWwubWFwW3Nlc3Npb24ucGF0aF07XG5cbiAgLy8gZW5zdXJlIHRoZSBmaW5kZXIgaXMgc2V0IHRoZSB0aGUgcmlnaHQgZnNvXG4gICRzY29wZS5maW5kZXIuYWN0aXZlID0gZmlsZTtcblxuICBtb2RlbC5hZGRSZWNlbnRGaWxlKGZpbGUpO1xuXG4gIGZ1bmN0aW9uIGltZ0Jsb2JVcmwoKSB7XG4gICAgLy8gT2J0YWluIGEgYmxvYjogVVJMIGZvciB0aGUgaW1hZ2UgZGF0YS5cbiAgICB2YXIgYXJyYXlCdWZmZXJWaWV3ID0gbmV3IFVpbnQ4QXJyYXkoc2Vzc2lvbi5kYXRhKTtcbiAgICB2YXIgYmxvYiA9IG5ldyBCbG9iKFthcnJheUJ1ZmZlclZpZXddLCB7XG4gICAgICB0eXBlOiAnaW1hZ2UvJyArIGZpbGUuZXh0LnN1YnN0cigxKVxuICAgIH0pO1xuICAgIHZhciB1cmxDcmVhdG9yID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuICAgIHZhciB1cmwgPSB1cmxDcmVhdG9yLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgaWYgKGlzVXRmOCkge1xuXG4gICAgJHNjb3BlLnZpZXdlciA9ICdhY2UnO1xuICAgICRzY29wZS4kcGFyZW50LnNob3dFZGl0b3IgPSB0cnVlO1xuICAgICRzY29wZS4kcGFyZW50LmVkaXRvclNlc3Npb24gPSBzZXNzaW9uLmRhdGE7XG5cbiAgICAvLyBpZiB0aGUgZWRpdG9yIGV4aXN0cywgbG9hZCB0aGUgZWRpdFNlc3Npb24gd2UganVzdCBhc3NpZ25lZFxuICAgIGlmICgkc2NvcGUuJHBhcmVudC5lZGl0b3IpIHtcbiAgICAgICRzY29wZS4kcGFyZW50LmxvYWRTZXNzaW9uKCk7XG4gICAgfVxuXG4gIH0gZWxzZSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJyc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IGZhbHNlO1xuXG4gICAgc3dpdGNoIChmaWxlLmV4dCkge1xuICAgICAgY2FzZSAnLnBuZyc6XG4gICAgICBjYXNlICcuanBnJzpcbiAgICAgIGNhc2UgJy5qcGVnJzpcbiAgICAgIGNhc2UgJy5naWYnOlxuICAgICAgY2FzZSAnLmljbyc6XG4gICAgICAgICRzY29wZS52aWV3ZXIgPSAnaW1nJztcbiAgICAgICAgJHNjb3BlLmltZ1VybCA9IGltZ0Jsb2JVcmwoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cblxufTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmluZGVyTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvZmluZGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRsb2csIGRpYWxvZywgZmlsZVNlcnZpY2UsIHJlc3BvbnNlSGFuZGxlcikge1xuXG4gIHZhciBleHBhbmRlZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgJHNjb3BlLnRyZWVEYXRhID0ge1xuICAgIHNob3dNZW51OiBmYWxzZVxuICB9O1xuICAkc2NvcGUuYWN0aXZlID0gbnVsbDtcbiAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcbiAgJHNjb3BlLnNob3dFZGl0b3IgPSBmYWxzZTtcblxuICAkc2NvcGUuYWNlTG9hZGVkID0gZnVuY3Rpb24oZWRpdG9yKSB7XG5cbiAgICAkc2NvcGUuZWRpdG9yID0gZWRpdG9yO1xuXG4gICAgLy8gbG9hZCB0aGUgZWRpdG9yU2Vzc2lvbiBpZiBvbmUgaGFzIGFscmVhZHkgYmVlbiBkZWZpbmVkIChpbiBGaWxlQ3RybClcbiAgICBpZiAoJHNjb3BlLmVkaXRvclNlc3Npb24pIHtcbiAgICAgICRzY29wZS5sb2FkU2Vzc2lvbigpO1xuICAgIH1cblxuICB9O1xuXG4gICRzY29wZS5sb2FkU2Vzc2lvbiA9IGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5lZGl0b3Iuc2V0U2Vzc2lvbigkc2NvcGUuZWRpdG9yU2Vzc2lvbik7XG4gIH07XG5cbiAgJHNjb3BlLmFjZUNoYW5nZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAvLyBEb24ndCByZW1vdmUuIFNpbXBseSBoYW5kbGluZyB0aGlzIGNhdXNlcyB0aGUgJGRpZ2VzdCB3ZSB3YW50IHRvIHVwZGF0ZSB0aGUgVUlcbiAgICBjb25zb2xlLmxvZygnRmluZGVyIGVkaXRvciBjaGFuZ2VkJyk7XG4gIH07XG5cbiAgJHNjb3BlLmFjZUJsdXJlZCA9IGZ1bmN0aW9uKGVkaXRvcikge1xuXG4gICAgLy8kc2NvcGUuJGFwcGx5KCk7XG5cbiAgfTtcblxuLy9cbi8vICAgaWYgKCEkc2NvcGUuZWRpdG9yKSB7XG4vLyAgICAgY29uc29sZS5sb2coJ2NyZWF0ZWQgZWRpdG9yJyk7XG4vLyAgICAgJHNjb3BlLmVkaXRvciA9IGFjZS5lZGl0KFwiYWNlXCIpO1xuLy8gICAgICRzY29wZS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldE1vZGUoXCJhY2UvbW9kZS9qYXZhc2NyaXB0XCIpO1xuLy8gICB9XG4vLyAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uICgpIHtcbi8vICAgY29uc29sZS5sb2coJ2Rlc3Ryb3knKTtcbi8vICAgLy8kc2NvcGUuZWRpdG9yLmdldFNlc3Npb24oKS4kc3RvcFdvcmtlcigpO1xuLy8gICAkc2NvcGUuZWRpdG9yLnNldFNlc3Npb24obnVsbCk7XG4vLyAgICRzY29wZS5lZGl0b3IuZGVzdHJveSgpO1xuLy8gfSk7XG5cbiAgdmFyIHBhdGggPSAkc3RhdGUucGFyYW1zLnBhdGggPyB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlLnBhcmFtcy5wYXRoKSA6IG51bGw7XG4gIHZhciBtb2RlbCA9ICRzY29wZS5tb2RlbDtcblxuICB2YXIgZmluZGVyID0gbmV3IEZpbmRlck1vZGVsKHBhdGggPyBtb2RlbC5saXN0LmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IHBhdGg7XG4gIH0pIDogbW9kZWwudHJlZSk7XG5cbiAgJHNjb3BlLmZpbmRlciA9IGZpbmRlcjtcblxuICBmdW5jdGlvbiBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKHJlc3BvbnNlKSB7XG4gICAgLy8gbm90aWZ5IG9mIGFueSBlcnJvcnMsIG90aGVyd2lzZSBzaWxlbnQuXG4gICAgLy8gVGhlIEZpbGUgU3lzdGVtIFdhdGNoZXIgd2lsbCBoYW5kbGUgdGhlIHN0YXRlIGNoYW5nZXMgaW4gdGhlIGZpbGUgc3lzdGVtXG4gICAgaWYgKHJlc3BvbnNlLmVycikge1xuICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdGaWxlIFN5c3RlbSBFcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmVycilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gICRzY29wZS5yaWdodENsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGNvbnNvbGUubG9nKCdSQ2xpY2tlZCAnICsgZnNvLm5hbWUpO1xuICAgICRzY29wZS5tZW51WCA9IGUucGFnZVg7XG4gICAgJHNjb3BlLm1lbnVZID0gZS5wYWdlWTtcbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuICAgICRzY29wZS50cmVlRGF0YS5zaG93TWVudSA9IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcblxuICAgIGZpbmRlci5hY3RpdmUgPSBmc287XG5cbiAgICBpZiAoIWZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgJHN0YXRlLmdvKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gICAgICAgIHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmc28ucGF0aClcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdEZWxldGUgWycgKyBmc28ubmFtZSArICddLiBBcmUgeW91IHN1cmU/J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbW92ZShmc28ucGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ1JlbmFtZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2ZpbGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZpbGUnLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGaWxlIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZmlsZShwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZmlsZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2RpciA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRm9sZGVyIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZvbGRlciBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtkaXIocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY29weScpIHtcbiAgICAgIGZpbGVzeXN0ZW0uY29weShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjdXQnKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH1cblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgfTtcblxuICAkc2NvcGUuc2hvd1Bhc3RlID0gZnVuY3Rpb24oZSwgYWN0aXZlKSB7XG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyICYmIGFjdGl2ZS5pc0RpcmVjdG9yeSkge1xuICAgICAgaWYgKCFwYXN0ZUJ1ZmZlci5mc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXN0ZUJ1ZmZlci5mc28ucGF0aC50b0xvd2VyQ2FzZSgpKSAhPT0gMCkgeyAvLyBkaXNhbGxvdyBwYXN0aW5nIGludG8gc2VsZiBvciBhIGRlY2VuZGVudFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5zZXRQYXN0ZUJ1ZmZlciA9IGZ1bmN0aW9uKGUsIGZzbywgb3ApIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IHtcbiAgICAgIGZzbzogZnNvLFxuICAgICAgb3A6IG9wXG4gICAgfTtcblxuICB9O1xuXG4gICRzY29wZS5ub3RNb2R1bGVzID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuIGZzby5pc0RpcmVjdG9yeSAmJiAoZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnIHx8IGZzby5uYW1lID09PSAnYm93ZXJfY29tcG9uZW50cycpID8gZmFsc2UgOiB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5ub2RlTW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlKSB7XG5cbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlKSB7XG4gICRzY29wZS5tb2RlbC5xID0gJHN0YXRlLnBhcmFtcy5xO1xufTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIGZpbGVzeXN0ZW0gPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJG1vZGFsLCAkbG9nLCBkaWFsb2csIHJlc3BvbnNlSGFuZGxlcikge1xuXG4gIHZhciBleHBhbmRlZCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgJHNjb3BlLnRyZWVEYXRhID0ge1xuICAgIHNob3dNZW51OiBmYWxzZVxuICB9O1xuICAkc2NvcGUuYWN0aXZlID0gbnVsbDtcbiAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICBmdW5jdGlvbiBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKHJlc3BvbnNlKSB7XG4gICAgLy8gbm90aWZ5IG9mIGFueSBlcnJvcnMsIG90aGVyd2lzZSBzaWxlbnQuXG4gICAgLy8gVGhlIEZpbGUgU3lzdGVtIFdhdGNoZXIgd2lsbCBoYW5kbGUgdGhlIHN0YXRlIGNoYW5nZXMgaW4gdGhlIGZpbGUgc3lzdGVtXG4gICAgaWYgKHJlc3BvbnNlLmVycikge1xuICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgdGl0bGU6ICdGaWxlIFN5c3RlbSBFcnJvcicsXG4gICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmVycilcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gICRzY29wZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgICB2YXIgY2xhc3NlcyA9IFsnZnNvJ107XG4gICAgY2xhc3Nlcy5wdXNoKGZzby5pc0RpcmVjdG9yeSA/ICdkaXInIDogJ2ZpbGUnKTtcblxuICAgIGlmIChmc28gPT09ICRzY29wZS5hY3RpdmUpIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnYWN0aXZlJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5nZXRJY29uQ2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgdmFyIGNsYXNzZXMgPSBbJ2ZhJ107XG5cbiAgICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICBjbGFzc2VzLnB1c2goJHNjb3BlLmlzRXhwYW5kZWQoZnNvKSA/ICdmYS1mb2xkZXItb3BlbicgOiAnZmEtZm9sZGVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNsYXNzZXMucHVzaCgnZmEtZmlsZS1vJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xuICB9O1xuXG4gICRzY29wZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuICEhZXhwYW5kZWRbZnNvLnBhdGhdO1xuICB9O1xuXG4gICRzY29wZS5yaWdodENsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGNvbnNvbGUubG9nKCdSQ2xpY2tlZCAnICsgZnNvLm5hbWUpO1xuICAgICRzY29wZS5tZW51WCA9IGUucGFnZVg7XG4gICAgJHNjb3BlLm1lbnVZID0gZS5wYWdlWTtcbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuICAgICRzY29wZS50cmVlRGF0YS5zaG93TWVudSA9IHRydWU7XG4gIH07XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgJHNjb3BlLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgIHZhciBpc0V4cGFuZGVkID0gJHNjb3BlLmlzRXhwYW5kZWQoZnNvKTtcbiAgICAgIGlmIChpc0V4cGFuZGVkKSB7XG4gICAgICAgIGRlbGV0ZSBleHBhbmRlZFtmc28ucGF0aF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHBhbmRlZFtmc28ucGF0aF0gPSB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAkc2NvcGUub3Blbihmc28pO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcblxuICAkc2NvcGUuZGVsZXRlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICB0aXRsZTogJ0RlbGV0ZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdEZWxldGUgWycgKyBmc28ubmFtZSArICddLiBBcmUgeW91IHN1cmU/J1xuICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbW92ZShmc28ucGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ0RlbGV0ZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5yZW5hbWUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdSZW5hbWUgJyArIChmc28uaXNEaXJlY3RvcnkgPyAnZm9sZGVyJyA6ICdmaWxlJyksXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIGEgbmV3IG5hbWUnLFxuICAgICAgZGVmYXVsdFZhbHVlOiBmc28ubmFtZSxcbiAgICAgIHBsYWNlaG9sZGVyOiBmc28uaXNEaXJlY3RvcnkgPyAnRm9sZGVyIG5hbWUnIDogJ0ZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB2YXIgb2xkUGF0aCA9IGZzby5wYXRoO1xuICAgICAgdmFyIG5ld1BhdGggPSBwLnJlc29sdmUoZnNvLmRpciwgdmFsdWUpO1xuICAgICAgZmlsZXN5c3RlbS5yZW5hbWUob2xkUGF0aCwgbmV3UGF0aCwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ1JlbmFtZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2ZpbGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5wcm9tcHQoe1xuICAgICAgdGl0bGU6ICdBZGQgbmV3IGZpbGUnLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGaWxlIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZpbGUgbmFtZSdcbiAgICB9KS50aGVuKGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmaWxlc3lzdGVtLm1rZmlsZShwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZmlsZSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5ta2RpciA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZm9sZGVyJyxcbiAgICAgIHBsYWNlaG9sZGVyOiAnRm9sZGVyIG5hbWUnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBlbnRlciB0aGUgbmV3IGZvbGRlciBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtkaXIocC5yZXNvbHZlKGZzby5wYXRoLCB2YWx1ZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0sIGZ1bmN0aW9uKCkge1xuICAgICAgJGxvZy5pbmZvKCdNYWtlIGRpcmVjdG9yeSBtb2RhbCBkaXNtaXNzZWQnKTtcbiAgICB9KTtcblxuICB9O1xuXG4gICRzY29wZS5wYXN0ZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyLm9wID09PSAnY29weScpIHtcbiAgICAgIGZpbGVzeXN0ZW0uY29weShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH0gZWxzZSBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjdXQnKSB7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShwYXN0ZUJ1ZmZlci5mc28ucGF0aCwgcC5yZXNvbHZlKGZzby5wYXRoLCBwYXN0ZUJ1ZmZlci5mc28ubmFtZSksIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2spO1xuICAgIH1cblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IG51bGw7XG5cbiAgfTtcblxuICAkc2NvcGUuc2hvd1Bhc3RlID0gZnVuY3Rpb24oZSwgYWN0aXZlKSB7XG4gICAgdmFyIHBhc3RlQnVmZmVyID0gJHNjb3BlLnBhc3RlQnVmZmVyO1xuXG4gICAgaWYgKHBhc3RlQnVmZmVyICYmIGFjdGl2ZS5pc0RpcmVjdG9yeSkge1xuICAgICAgaWYgKCFwYXN0ZUJ1ZmZlci5mc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGVsc2UgaWYgKGFjdGl2ZS5wYXRoLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihwYXN0ZUJ1ZmZlci5mc28ucGF0aC50b0xvd2VyQ2FzZSgpKSAhPT0gMCkgeyAvLyBkaXNhbGxvdyBwYXN0aW5nIGludG8gc2VsZiBvciBhIGRlY2VuZGVudFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5zZXRQYXN0ZUJ1ZmZlciA9IGZ1bmN0aW9uKGUsIGZzbywgb3ApIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICRzY29wZS5wYXN0ZUJ1ZmZlciA9IHtcbiAgICAgIGZzbzogZnNvLFxuICAgICAgb3A6IG9wXG4gICAgfTtcblxuICB9O1xuXG4gICRzY29wZS5ub3RNb2R1bGVzID0gZnVuY3Rpb24oZnNvKSB7XG4gICAgcmV0dXJuIGZzby5pc0RpcmVjdG9yeSAmJiAoZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnIHx8IGZzby5uYW1lID09PSAnYm93ZXJfY29tcG9uZW50cycpID8gZmFsc2UgOiB0cnVlO1xuICB9O1xuXG4gICRzY29wZS5ub2RlTW9kdWxlcyA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHJldHVybiBmc28uaXNEaXJlY3RvcnkgJiYgZnNvLm5hbWUgPT09ICdub2RlX21vZHVsZXMnID8gdHJ1ZSA6IGZhbHNlO1xuICB9O1xufTtcbiIsInZhciBtb2QgPSByZXF1aXJlKCcuL21vZHVsZScpO1xuXG5tb2QuY29uZmlnKFtcbiAgJyRzdGF0ZVByb3ZpZGVyJyxcbiAgcmVxdWlyZSgnLi9jb25maWcnKVxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdTZXNzaW9uU2VydmljZScsIFtcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9zZXNzaW9uJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRmluZGVyQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckc3RhdGUnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZmluZGVyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNGaWxlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICdzZXNzaW9uJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9maWxlJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNTZWFyY2hDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRzdGF0ZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvc2VhcmNoJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNEaXJDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJ2RpcicsXG4gICdGaWxlU2VydmljZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGlyJylcbl0pO1xuXG5tb2QuY29udHJvbGxlcignRnNUcmVlQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gICckbW9kYWwnLFxuICAnJGxvZycsXG4gICdEaWFsb2dTZXJ2aWNlJyxcbiAgJ1Jlc3BvbnNlSGFuZGxlcicsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvdHJlZScpXG5dKTtcblxubW9kdWxlLmV4cG9ydHMgPSBtb2Q7XG4iLCJmdW5jdGlvbiBGaW5kZXJNb2RlbChhY3RpdmUpIHtcbiAgLy8gdGhpcy50cmVlID0gdHJlZTtcbiAgdGhpcy5hY3RpdmUgPSBhY3RpdmU7XG59XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuX3JlYWRDb2xzID0gZnVuY3Rpb24odHJlZSkge1xuXG4gIC8vdmFyIHRyZWUgPSB0aGlzLl90cmVlO1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICAvL3ZhciBhY3RpdmVJc0RpciA9IGFjdGl2ZS5pc0RpcmVjdG9yeTtcblxuICB2YXIgY29scyA9IFtdO1xuXG4gIGlmIChhY3RpdmUpIHtcblxuICAgIHZhciBjdXJyID0gYWN0aXZlLmlzRGlyZWN0b3J5ID8gYWN0aXZlIDogYWN0aXZlLnBhcmVudDtcbiAgICBkbyB7XG4gICAgICBjb2xzLnVuc2hpZnQoY3Vyci5jaGlsZHJlbik7XG4gICAgICBjdXJyID0gY3Vyci5wYXJlbnQ7XG4gICAgfSB3aGlsZSAoY3Vycik7XG5cbiAgICBjb2xzLnNoaWZ0KCk7XG5cbiAgfSBlbHNlIHtcbiAgICBjb2xzLnB1c2godHJlZS5jaGlsZHJlbik7XG4gIH1cblxuICByZXR1cm4gY29scztcblxufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5nZXRDbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGNsYXNzZXMgPSBbJ2ZzbyddO1xuICBjbGFzc2VzLnB1c2goZnNvLmlzRGlyZWN0b3J5ID8gJ2RpcicgOiAnZmlsZScpO1xuXG4gIGlmIChmc28gPT09IHRoaXMuYWN0aXZlKSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdhY3RpdmUnKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuZ2V0SWNvbkNsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgY2xhc3NlcyA9IFsnZmEnXTtcblxuICBpZiAoZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgY2xhc3Nlcy5wdXNoKHRoaXMuaXNFeHBhbmRlZChmc28pID8gJ2ZhLWZvbGRlci1vcGVuLW8nIDogJ2ZhLWZvbGRlci1vJyk7XG4gIH0gZWxzZSB7XG4gICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlJyk7XG4gIH1cblxuICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzSGlnaGxpZ2h0ZWQgPSBmdW5jdGlvbihmc28pIHtcbiAgdmFyIGFjdGl2ZSA9IHRoaXMuX2FjdGl2ZTtcbiAgdmFyIGlzSGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblxuICBpZiAoZnNvID09PSBhY3RpdmUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChhY3RpdmUgJiYgZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgLy8gY2hlY2sgaWYgaXQgaXMgYW4gYW5jZXN0b3JcbiAgICB2YXIgciA9IGFjdGl2ZTtcbiAgICB3aGlsZSAoci5wYXJlbnQpIHtcbiAgICAgIGlmIChyID09PSBmc28pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByID0gci5wYXJlbnQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5pc0V4cGFuZGVkID0gZnVuY3Rpb24oZGlyKSB7XG4gIHJldHVybiB0aGlzLmlzSGlnaGxpZ2h0ZWQoZGlyKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuY29scyA9IGZ1bmN0aW9uKHRyZWUpIHtcbiAgcmV0dXJuIHRoaXMuX3JlYWRDb2xzKHRyZWUpO1xufTtcblxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhGaW5kZXJNb2RlbC5wcm90b3R5cGUsIHtcbiAgYWN0aXZlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9hY3RpdmUgPSB2YWx1ZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRmluZGVyTW9kZWw7XG4iLCJmdW5jdGlvbiBTZXNzaW9uKGRhdGEpIHtcbiAgZGF0YSA9IGRhdGEgfHwge307XG4gIHRoaXMucGF0aCA9IGRhdGEucGF0aDtcbiAgdGhpcy50aW1lID0gZGF0YS50aW1lO1xuICB0aGlzLmRhdGEgPSBkYXRhLmRhdGEgfHwge307XG4gIHRoaXMuaXNVdGY4ID0gZGF0YS5pc1V0Zjg7XG59XG5TZXNzaW9uLnByb3RvdHlwZS5tYXJrQ2xlYW4gPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMuZGF0YS5nZXRVbmRvTWFuYWdlcikge1xuICAgIHRoaXMuZGF0YS5nZXRVbmRvTWFuYWdlcigpLm1hcmtDbGVhbigpO1xuICB9XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU2Vzc2lvbi5wcm90b3R5cGUsIHtcbiAgaXNEaXJ0eToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKSB7XG4gICAgICAgIHJldHVybiAhdGhpcy5kYXRhLmdldFVuZG9NYW5hZ2VyKCkuaXNDbGVhbigpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5tb2R1bGUuZXhwb3J0cyA9IFNlc3Npb247XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGFuZ3VsYXIubW9kdWxlKCdmcycsIFtdKTtcbiIsInZhciBTZXNzaW9uID0gcmVxdWlyZSgnLi4vbW9kZWxzL3Nlc3Npb24nKTtcbnZhciBmc3cgPSByZXF1aXJlKCcuLi8uLi9maWxlLXN5c3RlbS13YXRjaGVyJyk7XG5cbnZhciBTZXNzaW9ucyA9IGZ1bmN0aW9uKG1hcCkge1xuICB0aGlzLl9zZXNzaW9ucyA9IFtdO1xuICB0aGlzLl9tYXAgPSBtYXA7XG59O1xuU2Vzc2lvbnMucHJvdG90eXBlLmZpbmRTZXNzaW9uID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcblxuICByZXR1cm4gc2Vzc2lvbnMuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ucGF0aCA9PT0gcGF0aDtcbiAgfSk7XG5cbn07XG5TZXNzaW9ucy5wcm90b3R5cGUuYWRkU2Vzc2lvbiA9IGZ1bmN0aW9uKHBhdGgsIGRhdGEsIGlzVXRmOCkge1xuXG4gIGlmICh0aGlzLmZpbmRTZXNzaW9uKHBhdGgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdTZXNzaW9uIGZvciBwYXRoIGV4aXN0cyBhbHJlYWR5LicpO1xuICB9XG5cbiAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG4gIHZhciBzZXNzaW9uID0gbmV3IFNlc3Npb24oe1xuICAgIHBhdGg6IHBhdGgsXG4gICAgdGltZTogRGF0ZS5ub3coKSxcbiAgICBkYXRhOiBkYXRhLFxuICAgIGlzVXRmODogaXNVdGY4XG4gIH0pO1xuICBzZXNzaW9ucy51bnNoaWZ0KHNlc3Npb24pO1xuXG4gIHJldHVybiBzZXNzaW9uO1xufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU2Vzc2lvbnMucHJvdG90eXBlLCB7XG4gIHNlc3Npb25zOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuICAgICAgcmV0dXJuIHNlc3Npb25zO1xuICAgICAgLy8gdmFyIG1hcCA9IHRoaXMuX21hcDtcbiAgICAgIC8vXG4gICAgICAvLyAvLyBjbGVhbiBhbnkgZmlsZXMgdGhhdCBtYXkgbm8gbG9uZ2VyIGV4aXN0XG4gICAgICAvLyAvLyB2YXIgaSA9IHNlc3Npb25zLmxlbmd0aDtcbiAgICAgIC8vIC8vIHdoaWxlIChpLS0pIHtcbiAgICAgIC8vIC8vICAgaWYgKCFtYXBbc2Vzc2lvbnNbaV0ucGF0aF0pIHtcbiAgICAgIC8vIC8vICAgICBzZXNzaW9ucy5zcGxpY2UoaSwgMSk7XG4gICAgICAvLyAvLyAgIH1cbiAgICAgIC8vIC8vIH1cbiAgICAgIC8vXG4gICAgICAvLyByZXR1cm4gc2Vzc2lvbnMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIC8vICAgcmV0dXJuIG1hcFtpdGVtLnBhdGhdO1xuICAgICAgLy8gfSwgdGhpcyk7XG5cbiAgICB9XG4gIH0sXG4gIGRpcnR5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuICAgICAgcmV0dXJuIHRoaXMuc2Vzc2lvbnMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uaXNEaXJ0eTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufSk7XG5cblxuLypcbiAqIG1vZHVsZSBleHBvcnRzXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG5cbiAgdmFyIHNlc3Npb25zID0gbmV3IFNlc3Npb25zKGZzdy5tYXApO1xuICByZXR1cm4gc2Vzc2lvbnM7XG5cbn07XG4iLCJcblxud2luZG93LmFwcCA9IHJlcXVpcmUoJy4vYXBwJyk7XG5cblxuLy93aW5kb3cuZnMgPSByZXF1aXJlKCcuL2ZzJyk7XG5cbi8vIC8vICoqKioqKioqKiovLypcbi8vIC8vIFNoaW1zXG4vLyAvLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9hcnJheScpO1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBEaXJlY3RpdmVzXG4vLyAvLyAqKioqKioqKioqKlxuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9uZWdhdGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9yaWdodC1jbGljaycpO1xuLy8gLy8gcmVxdWlyZSgnLi9hcHAvZGlyZWN0aXZlcy9iZWhhdmUnKTtcbi8vXG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIENvbnRyb2xsZXJzXG4vLyAvLyAqKioqKioqKioqKlxuLy9cbi8vIC8vIGRpYWxvZyBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9jb25maXJtJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2FsZXJ0Jyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3Byb21wdCcpO1xuLy9cbi8vIC8vIGhvbWUgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9ob21lJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvdHJlZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL2ZpbGUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9maW5kZXInKTtcbi8vXG4vLyAvLyBkYiBtb2RlbCBjb250cm9sbGVyc1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9rZXknKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXJyYXktZGVmJyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuLy9cbi8vXG4vLyAvLyBhcGkgbW9kZWwgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FwaScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvY29udHJvbGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvaGFuZGxlcicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvcm91dGUnKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FjdGlvbicpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuLy8gcmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYWRkLXJlc291cmNlJyk7XG4vL1xuLy9cbi8vIC8vIG1haW4gYXBwIGNvbnRyb2xsZXJcbi8vIHJlcXVpcmUoJy4vYXBwL2NvbnRyb2xsZXJzL2FwcCcpO1xuLy9cbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gU2VydmljZXNcbi8vIC8vICoqKioqKioqKioqXG4vLyByZXF1aXJlKCcuL3NlcnZpY2VzL2RpYWxvZycpO1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG5cbnZhciBGaWxlU3lzdGVtT2JqZWN0ID0gZnVuY3Rpb24ocGF0aCwgc3RhdCkge1xuICB0aGlzLm5hbWUgPSBwLmJhc2VuYW1lKHBhdGgpIHx8IHBhdGg7XG4gIHRoaXMucGF0aCA9IHBhdGg7XG4gIHRoaXMuZGlyID0gcC5kaXJuYW1lKHBhdGgpO1xuICB0aGlzLmlzRGlyZWN0b3J5ID0gdHlwZW9mIHN0YXQgPT09ICdib29sZWFuJyA/IHN0YXQgOiBzdGF0LmlzRGlyZWN0b3J5KCk7XG4gIHRoaXMuZXh0ID0gcC5leHRuYW1lKHBhdGgpO1xuICB0aGlzLnN0YXQgPSBzdGF0O1xufTtcbkZpbGVTeXN0ZW1PYmplY3QucHJvdG90eXBlID0ge1xuICBnZXQgaXNGaWxlKCkge1xuICAgIHJldHVybiAhdGhpcy5pc0RpcmVjdG9yeTtcbiAgfVxufTtcbm1vZHVsZS5leHBvcnRzID0gRmlsZVN5c3RlbU9iamVjdDtcbiIsIi8qIGdsb2JhbCBkaWFsb2cgKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHJuZHN0cjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xuICB9LFxuICBnZXR1aWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnJhbmRvbSgpICogMWU3KSkudG9TdHJpbmcoKTtcbiAgfSxcbiAgZ2V0dWlkc3RyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKCtuZXcgRGF0ZSgpKS50b1N0cmluZygzNik7XG4gIH0sXG4gIHVybFJvb3Q6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsb2NhdGlvbiA9IHdpbmRvdy5sb2NhdGlvbjtcbiAgICByZXR1cm4gbG9jYXRpb24ucHJvdG9jb2wgKyAnLy8nICsgbG9jYXRpb24uaG9zdDtcbiAgfSxcbiAgZW5jb2RlU3RyaW5nOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gYnRvYShlbmNvZGVVUklDb21wb25lbnQoc3RyKSk7XG4gIH0sXG4gIGRlY29kZVN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChhdG9iKHN0cikpO1xuICB9LFxuICBleHRlbmQ6IGZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAgIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgICBpZiAoIWFkZCB8fCB0eXBlb2YgYWRkICE9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIG9yaWdpbjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gICAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiBvcmlnaW47XG4gIH0sXG4gIHVpOiB7XG4gICAgcmVzcG9uc2VIYW5kbGVyOiBmdW5jdGlvbihmbikge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHJzcCwgc2hvd0Vycm9yKSB7XG4gICAgICAgIHNob3dFcnJvciA9IHNob3dFcnJvciB8fCB0cnVlO1xuICAgICAgICBpZiAocnNwLmVycikge1xuICAgICAgICAgIGlmIChzaG93RXJyb3IpIHtcbiAgICAgICAgICAgIGRpYWxvZy5hbGVydCh7XG4gICAgICAgICAgICAgIHRpdGxlOiAnRXJyb3InLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBKU09OLnN0cmluZ2lmeShyc3AuZXJyKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZuKHJzcC5kYXRhKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gIH1cbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicSs2NGZ3XCIpKSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIl19
