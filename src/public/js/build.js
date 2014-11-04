(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

/// Serialize the a name value pair into a cookie string suitable for
/// http headers. An optional options object specified cookie parameters
///
/// serialize('foo', 'bar', { httpOnly: true })
///   => "foo=bar; httpOnly"
///
/// @param {String} name
/// @param {String} val
/// @param {Object} options
/// @return {String}
var serialize = function(name, val, opt){
    opt = opt || {};
    var enc = opt.encode || encode;
    var pairs = [name + '=' + enc(val)];

    if (null != opt.maxAge) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge)) throw new Error('maxAge should be a Number');
        pairs.push('Max-Age=' + maxAge);
    }

    if (opt.domain) pairs.push('Domain=' + opt.domain);
    if (opt.path) pairs.push('Path=' + opt.path);
    if (opt.expires) pairs.push('Expires=' + opt.expires.toUTCString());
    if (opt.httpOnly) pairs.push('HttpOnly');
    if (opt.secure) pairs.push('Secure');

    return pairs.join('; ');
};

/// Parse the given cookie header string into an object
/// The object has the various cookies as keys(names) => values
/// @param {String} str
/// @return {Object}
var parse = function(str, opt) {
    opt = opt || {};
    var obj = {}
    var pairs = str.split(/; */);
    var dec = opt.decode || decode;

    pairs.forEach(function(pair) {
        var eq_idx = pair.indexOf('=')

        // skip things that don't look like key=value
        if (eq_idx < 0) {
            return;
        }

        var key = pair.substr(0, eq_idx).trim()
        var val = pair.substr(++eq_idx, pair.length).trim();

        // quoted values
        if ('"' == val[0]) {
            val = val.slice(1, -1);
        }

        // only assign once
        if (undefined == obj[key]) {
            try {
                obj[key] = dec(val);
            } catch (e) {
                obj[key] = val;
            }
        }
    });

    return obj;
};

var encode = encodeURIComponent;
var decode = decodeURIComponent;

module.exports.serialize = serialize;
module.exports.parse = parse;

},{}],2:[function(require,module,exports){

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

},{}],3:[function(require,module,exports){
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

},{"../../../../shared/utils":37,"../../file-system":22,"../../file-system-watcher":21}],4:[function(require,module,exports){
var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');
var utils = require('../../../../shared/utils');
var parseCookie = require('cookie').parse;

module.exports = function($scope, $state, fs, watcher, fileService, dialog, colorService, sessionService) {

  var model = new AppModel({
    fs: fs,
    watcher: watcher,
    sessionService: sessionService,
    recentFiles: angular.fromJson(parseCookie(document.cookie).recentFiles)
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
    $state.go('app.fs.search', {
      q: searchForm.q.value
    });
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
    return {
      path: utils.encodeString(file.path)
    };
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

  function saveSession(session, callback) {
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

        callback(rsp.err);
        console.log('writeFile Failed', path, rsp.err);

      } else {

        console.log('writeFile Succeeded', path);

        session.markClean();

        if (callback) {
          callback(null, session);
        }

        //$scope.$apply();
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

  $scope.removeRecentFile = function(entry) {

    // find related session
    var sessions = model.sessions;
    var session = sessions.findSession(entry.path);
    if (session) {

      if (session.isDirty) {

        dialog.confirm({
          title: 'Save File',
          message: 'File has changed. Would you like to Save [' + model.getRelativePath(session.path) + ']',
          okButtonText: 'Yes',
          cancelButtonText: 'No'
        }).then(function() {
          saveSession(session, function(err, session) {
            if (!err) {
              model.removeRecentFile(entry);
              sessions.removeSession(session);
              $scope.$broadcast('recent-removed', entry);
            }
          });
        }, function(value) {
          console.log('Remove recent (save) modal dismissed', value);
          // Check if clicked 'No', otherwise do nothing
          if (value === 'cancel') {
            model.removeRecentFile(entry);
            sessions.removeSession(session);
            $scope.$broadcast('recent-removed', entry);
          }
        });

        return;
      }

      sessions.removeSession(session);

    }

    model.removeRecentFile(entry);
    $scope.$broadcast('recent-removed', entry);

  };


  window.onbeforeunload = function() {
    if (sessionService.dirty.length) {
      return 'You have unsaved changes. Are you sure you want to leave.';
    }
  };

  $scope.encodePath = utils.encodeString;
  $scope.decodePath = utils.decodeString;
};

},{"../../../../shared/file-system-object":36,"../../../../shared/utils":37,"../models/app":8,"cookie":1}],5:[function(require,module,exports){
module.exports = function () {
  return function($scope, $element, attrs) {
    $scope.$watch(attrs.ngScrolledIntoView, function(value) {
      if (value) {
        var el = $element[0];
        el.scrollIntoView(false);
      }
    });
  };
};

},{}],6:[function(require,module,exports){
module.exports = function($parse) {
  return function($scope, $element, attrs) {
    var fn = $parse(attrs.ngScrolledLeft);
    var el = $element[0];

    $scope.$watch(function() {
      el.scrollLeft = el.scrollWidth;
    });

  };
};

},{}],7:[function(require,module,exports){
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
      minLines: 15,
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

mod.directive('ngScrolledIntoView', [
  '$parse',
  require('./directives/scrolled-into-view')
]);

module.exports = mod;

},{"../dialog":18,"../fs":30,"./config":3,"./controllers":4,"./directives/scrolled":6,"./directives/scrolled-into-view":5,"./module":9,"./services/color":10,"./services/file":11,"./services/response-handler":12}],8:[function(require,module,exports){
var p = require('path');
var utils = require('../../../../shared/utils');
var cookie = require('cookie');

function AppModel(data) {
  data = data || {};
  this.fs = data.fs;
  this.watcher = data.watcher;
  this.sessions = data.sessionService;

  this.title = 'Title';
  this.subTitle = 'Subtitle';

  this._recentFiles = data.recentFiles || [];
}
AppModel.prototype.addRecentFile = function(file) {
  var recent = this._recentFiles;
  var idx = recent.findIndex(function(item) {
    return item.path === file.path;
  });
  if (idx !== -1) {
    recent.move(idx, 0);
  } else {
    recent.unshift({
      path: file.path,
      time: Date.now()
    });
    recent.length = Math.min(this._recentFiles.length, 20);
  }

  this.storeRecentFiles();
};
AppModel.prototype.removeRecentFile = function(entry) {
  var recent = this._recentFiles;
  var idx = recent.indexOf(entry);

  if (idx !== -1) {
    recent.splice(idx, 1);
    this.storeRecentFiles();
    return true;
  }
  return false;
};
AppModel.prototype.storeRecentFiles = function() {
  var cookieExpires = new Date();
  cookieExpires.setFullYear(cookieExpires.getFullYear() + 1);

  document.cookie = cookie.serialize('recentFiles', angular.toJson(this.recentFiles), {
    expires: cookieExpires
  });
};

AppModel.prototype.countFiles = function(ext) {
  return this.list.filter(function(item) {
    return !item.isDirectory && item.ext === ext;
  }).length;
};
AppModel.prototype.clearRecentFiles = function() {
  this._recentFiles.length = 0;
  this.storeRecentFiles();
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
      return recent;
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
        return /^readme.(md|markdown)$/.test(item.name.toLowerCase());
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

},{"../../../../shared/utils":37,"cookie":1,"path":38}],9:[function(require,module,exports){
module.exports = angular.module('app', [
  'ui.router',
  'ui.bootstrap',
  'ui.ace',
  'evgenyneu.markdown-preview',
  'michiKono',
  'dialog',
  'fs'
]);

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"../../file-system":22}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;

  $scope.ok = function() {
    $modalInstance.close();
  };
};

},{}],15:[function(require,module,exports){
module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;
  $scope.okButtonText = data.okButtonText || 'OK';
  $scope.cancelButtonText = data.cancelButtonText || 'Cancel';

  $scope.ok = function() {
    $modalInstance.close();
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};

},{}],16:[function(require,module,exports){
module.exports = {
  alert: require('./alert'),
  confirm: require('./confirm'),
  prompt: require('./prompt')
};

},{"./alert":14,"./confirm":15,"./prompt":17}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{"./controllers":16,"./module":19,"./services/dialog":20}],19:[function(require,module,exports){
module.exports = angular.module('dialog', [
  'ui.bootstrap'
]);

},{}],20:[function(require,module,exports){
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
            message: data.message,
            okButtonText: data.okButtonText,
            cancelButtonText: data.cancelButtonText
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

},{}],21:[function(require,module,exports){
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

},{"../../shared/file-system-object":36,"../../shared/utils":37,"emitter-component":2}],22:[function(require,module,exports){
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

},{"../../shared/utils":37,"emitter-component":2}],23:[function(require,module,exports){
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

},{"../../../../shared/utils":37,"../../file-system":22,"../../file-system-watcher":21}],24:[function(require,module,exports){
module.exports = function($scope, dir, fileService) {
  $scope.dir = dir;
};

},{}],25:[function(require,module,exports){
module.exports = function($scope, $state, session, fileService) {
  var isUtf8 = session.isUtf8;

  var model = $scope.model;

  var file = model.map[session.path];

  // ensure the finder is set the the right fso
  $scope.finder.active = file;

  // Handle the case of the file being removed from recentFiles.
  $scope.$on('recent-removed', function(e, data) {
    if (data.path === file.path) { // this should always be the case
      if (model.recentFiles.length) {
        var mostRecentEntry = model.recentFiles[0];
        var mostRecentFile = model.map[mostRecentEntry.path];
        $scope.gotoFile(mostRecentFile);
      } else {
        $scope.$parent.showEditor = false;
        $scope.finder.active = model.map[file.dir];
        $state.go('app.fs.finder');
      }
    }
  });

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

},{}],26:[function(require,module,exports){
var p = require('path');
var filesystem = require('../../file-system');
var utils = require('../../../../shared/utils');
var FinderModel = require('../models/finder');

module.exports = function($scope, $state, $log, dialog, fileService, responseHandler) {

  var expanded = Object.create(null);

  $scope.pasteBuffer = null;
  $scope.showEditor = false;

  $scope.aceLoaded = function(editor) {

    $scope.editor = editor;

    // load the editorSession if one has already been defined (like in child controller FileCtrl)
    if ($scope.editorSession) {
      $scope.loadSession();
    }

  };

  $scope.loadSession = function() {
    $scope.editor.setSession($scope.editorSession);
  };

  $scope.aceChanged = function(editor) {
    // Don't remove this. Simply handling this causes the $digest we want to update the UI
    console.log('Finder editor changed');
  };

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

  $scope.clickNode = function(fso) {

    finder.active = fso;

    if (!fso.isDirectory) {
      $state.go('app.fs.finder.file', {
        path: utils.encodeString(fso.path)
      });
    }
  };

  $scope.delete = function(fso) {

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, genericFileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(fso) {

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

  $scope.mkfile = function(fso) {

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

  $scope.mkdir = function(fso) {

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

  $scope.paste = function(fso) {

    var pasteBuffer = $scope.pasteBuffer;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(fso.path, pasteBuffer.fso.name), genericFileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(active) {
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

  $scope.setPasteBuffer = function(fso, op) {

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };
};

},{"../../../../shared/utils":37,"../../file-system":22,"../models/finder":31,"path":38}],27:[function(require,module,exports){
module.exports = function($scope) {

};

},{}],28:[function(require,module,exports){
module.exports = function($scope, $state) {
  $scope.model.q = $state.params.q;
};

},{}],29:[function(require,module,exports){
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

};

},{"../../file-system":22,"path":38}],30:[function(require,module,exports){
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
  '$state',
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

},{"./config":23,"./controllers":27,"./controllers/dir":24,"./controllers/file":25,"./controllers/finder":26,"./controllers/search":28,"./controllers/tree":29,"./module":33,"./services/session":34}],31:[function(require,module,exports){
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
      if (this._active.isFile) {
        this._activeFile = this._active;
      }
    }
  },
  activeFile: {
    get: function() {
      return this._activeFile;
    }
  }
});


module.exports = FinderModel;

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
module.exports = angular.module('fs', []);

},{}],34:[function(require,module,exports){
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
Sessions.prototype.removeSession = function(session) {

  var sessions = this._sessions;

  var idx = sessions.indexOf(session);
  if (idx !== -1) {
    sessions.splice(idx, 1);
    return true;
  }

  return false;
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

},{"../../file-system-watcher":21,"../models/session":32}],35:[function(require,module,exports){


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

},{"./app":7,"./array":13}],36:[function(require,module,exports){
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

},{"path":38}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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
},{"q+64fw":39}],39:[function(require,module,exports){
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

},{}]},{},[35])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2Nvb2tpZS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZW1pdHRlci1jb21wb25lbnQvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvYXBwL2RpcmVjdGl2ZXMvc2Nyb2xsZWQtaW50by12aWV3LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9kaXJlY3RpdmVzL3Njcm9sbGVkLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kZWxzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvbW9kdWxlLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2FwcC9zZXJ2aWNlcy9jb2xvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcHAvc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9hcnJheS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9kaWFsb2cvY29udHJvbGxlcnMvYWxlcnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2NvbmZpcm0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2NvbnRyb2xsZXJzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2RpYWxvZy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZGlhbG9nL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9maWxlLXN5c3RlbS13YXRjaGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZpbGUtc3lzdGVtLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbmZpZy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9kaXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvZmlsZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9jb250cm9sbGVycy9maW5kZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvY29udHJvbGxlcnMvc2VhcmNoLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvY2xpZW50L2ZzL2NvbnRyb2xsZXJzL3RyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvbW9kZWxzL2ZpbmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2RlbHMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9mcy9tb2R1bGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9jbGllbnQvZnMvc2VydmljZXMvc2Vzc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2NsaWVudC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL2ZpbGUtc3lzdGVtLW9iamVjdC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL3V0aWxzLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcbi8vLyBTZXJpYWxpemUgdGhlIGEgbmFtZSB2YWx1ZSBwYWlyIGludG8gYSBjb29raWUgc3RyaW5nIHN1aXRhYmxlIGZvclxuLy8vIGh0dHAgaGVhZGVycy4gQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3Qgc3BlY2lmaWVkIGNvb2tpZSBwYXJhbWV0ZXJzXG4vLy9cbi8vLyBzZXJpYWxpemUoJ2ZvbycsICdiYXInLCB7IGh0dHBPbmx5OiB0cnVlIH0pXG4vLy8gICA9PiBcImZvbz1iYXI7IGh0dHBPbmx5XCJcbi8vL1xuLy8vIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4vLy8gQHBhcmFtIHtTdHJpbmd9IHZhbFxuLy8vIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4vLy8gQHJldHVybiB7U3RyaW5nfVxudmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uKG5hbWUsIHZhbCwgb3B0KXtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdmFyIGVuYyA9IG9wdC5lbmNvZGUgfHwgZW5jb2RlO1xuICAgIHZhciBwYWlycyA9IFtuYW1lICsgJz0nICsgZW5jKHZhbCldO1xuXG4gICAgaWYgKG51bGwgIT0gb3B0Lm1heEFnZSkge1xuICAgICAgICB2YXIgbWF4QWdlID0gb3B0Lm1heEFnZSAtIDA7XG4gICAgICAgIGlmIChpc05hTihtYXhBZ2UpKSB0aHJvdyBuZXcgRXJyb3IoJ21heEFnZSBzaG91bGQgYmUgYSBOdW1iZXInKTtcbiAgICAgICAgcGFpcnMucHVzaCgnTWF4LUFnZT0nICsgbWF4QWdlKTtcbiAgICB9XG5cbiAgICBpZiAob3B0LmRvbWFpbikgcGFpcnMucHVzaCgnRG9tYWluPScgKyBvcHQuZG9tYWluKTtcbiAgICBpZiAob3B0LnBhdGgpIHBhaXJzLnB1c2goJ1BhdGg9JyArIG9wdC5wYXRoKTtcbiAgICBpZiAob3B0LmV4cGlyZXMpIHBhaXJzLnB1c2goJ0V4cGlyZXM9JyArIG9wdC5leHBpcmVzLnRvVVRDU3RyaW5nKCkpO1xuICAgIGlmIChvcHQuaHR0cE9ubHkpIHBhaXJzLnB1c2goJ0h0dHBPbmx5Jyk7XG4gICAgaWYgKG9wdC5zZWN1cmUpIHBhaXJzLnB1c2goJ1NlY3VyZScpO1xuXG4gICAgcmV0dXJuIHBhaXJzLmpvaW4oJzsgJyk7XG59O1xuXG4vLy8gUGFyc2UgdGhlIGdpdmVuIGNvb2tpZSBoZWFkZXIgc3RyaW5nIGludG8gYW4gb2JqZWN0XG4vLy8gVGhlIG9iamVjdCBoYXMgdGhlIHZhcmlvdXMgY29va2llcyBhcyBrZXlzKG5hbWVzKSA9PiB2YWx1ZXNcbi8vLyBAcGFyYW0ge1N0cmluZ30gc3RyXG4vLy8gQHJldHVybiB7T2JqZWN0fVxudmFyIHBhcnNlID0gZnVuY3Rpb24oc3RyLCBvcHQpIHtcbiAgICBvcHQgPSBvcHQgfHwge307XG4gICAgdmFyIG9iaiA9IHt9XG4gICAgdmFyIHBhaXJzID0gc3RyLnNwbGl0KC87ICovKTtcbiAgICB2YXIgZGVjID0gb3B0LmRlY29kZSB8fCBkZWNvZGU7XG5cbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKHBhaXIpIHtcbiAgICAgICAgdmFyIGVxX2lkeCA9IHBhaXIuaW5kZXhPZignPScpXG5cbiAgICAgICAgLy8gc2tpcCB0aGluZ3MgdGhhdCBkb24ndCBsb29rIGxpa2Uga2V5PXZhbHVlXG4gICAgICAgIGlmIChlcV9pZHggPCAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5ID0gcGFpci5zdWJzdHIoMCwgZXFfaWR4KS50cmltKClcbiAgICAgICAgdmFyIHZhbCA9IHBhaXIuc3Vic3RyKCsrZXFfaWR4LCBwYWlyLmxlbmd0aCkudHJpbSgpO1xuXG4gICAgICAgIC8vIHF1b3RlZCB2YWx1ZXNcbiAgICAgICAgaWYgKCdcIicgPT0gdmFsWzBdKSB7XG4gICAgICAgICAgICB2YWwgPSB2YWwuc2xpY2UoMSwgLTEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gb25seSBhc3NpZ24gb25jZVxuICAgICAgICBpZiAodW5kZWZpbmVkID09IG9ialtrZXldKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG9ialtrZXldID0gZGVjKHZhbCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgb2JqW2tleV0gPSB2YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBvYmo7XG59O1xuXG52YXIgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xudmFyIGRlY29kZSA9IGRlY29kZVVSSUNvbXBvbmVudDtcblxubW9kdWxlLmV4cG9ydHMuc2VyaWFsaXplID0gc2VyaWFsaXplO1xubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBwYXJzZTtcbiIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuXG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHNlbGYub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1tldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9cbiAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuXG4gICRzdGF0ZVByb3ZpZGVyXG4gICAgLnN0YXRlKCdhcHAnLCB7XG4gICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgIGNvbnRyb2xsZXI6ICdBcHBDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9hcHAvdmlld3MvaW5kZXguaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGZzUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBmaWxlc3lzdGVtLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZmlsZXN5c3RlbSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgZnNXYXRjaGVyUHJvbWlzZTogWyckcScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICB3YXRjaGVyLm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUod2F0Y2hlcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuaG9tZScsIHtcbiAgICAgIHVybDogJycsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvYXBwL3ZpZXdzL2FwcC5odG1sJ1xuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRGJTdGF0ZXMoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyXG4gICAgICAuc3RhdGUoJ2RiJywge1xuICAgICAgICB1cmw6ICcvZGInLFxuICAgICAgICBjb250cm9sbGVyOiAnRGJDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwnLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdNb2RlbEN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgbW9kZWxQcm9taXNlOiBbJyRodHRwJywgJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgICBmdW5jdGlvbigkaHR0cCwgJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuZWRpdCcsIHtcbiAgICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL21vZGVsLWVkaXRvci5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgICB1cmw6ICcvOnNjaGVtYUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTY2hlbWFDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvc2NoZW1hLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgICB1cmw6ICcvOmtleUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdLZXlDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwva2V5Lmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdkYi5tb2RlbC5kaWFncmFtJywge1xuICAgICAgICB1cmw6ICcjZGlhZ3JhbScsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BkYi5tb2RlbCc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnZGIubW9kZWwnXG4gICAgICAgICAgICAvL2NvbnRyb2xsZXI6ICdEaWFncmFtQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXJcbiAgICAgIC5zdGF0ZSgnYXBpJywge1xuICAgICAgICBhYnN0cmFjdDogdHJ1ZSxcbiAgICAgICAgdXJsOiAnL2FwaS86YXBpTmFtZScsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYXBpLmh0bWwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgYXBpUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgICAgZnVuY3Rpb24oJGh0dHAsICRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgICAgICByZXR1cm4gd2luZG93Ll9hcGk7IC8vJGh0dHAuZ2V0KCcvJyArICRzdGF0ZVBhcmFtcy5tb2RlbE5hbWUgKyAnLmpzb24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLCAvLyBEZWZhdWx0LiBXaWxsIGJlIHVzZWQgaW4gcGxhY2Ugb2YgYWJzdHJhY3QgcGFyZW50IGluIHRoZSBjYXNlIG9mIGhpdHRpbmcgdGhlIGluZGV4IChhcGkvKVxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9hcGktaG9tZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmRpYWdyYW0nLCB7XG4gICAgICAgIHVybDogJy9kaWFncmFtJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FwaURpYWdyYW1DdHJsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvZGlhZ3JhbS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGFic3RyYWN0OiB0cnVlLFxuICAgICAgICB1cmw6ICcvY29udHJvbGxlcidcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLmhvbWUnLCB7XG4gICAgICAgIHVybDogJycsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLWhvbWUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5jb250cm9sbGVyLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86Y29udHJvbGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnQGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PScnIGluIHBhcmVudCBzdGF0ZSAnYXBpJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlDb250cm9sbGVyQ3RybCcsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5pdGVtLmhhbmRsZXInLCB7XG4gICAgICAgIHVybDogJy86aGFuZGxlcklkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAneEBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpSGFuZGxlckN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvaGFuZGxlci5odG1sJ1xuICAgICAgICAgIH0sXG4gICAgICAgICAgJ2hhbmRsZXJAYXBpLmNvbnRyb2xsZXIuaXRlbSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdoYW5kbGVyJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaS5jb250cm9sbGVyLml0ZW0nLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUhhbmRsZXJDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2hhbmRsZXIuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZScsIHtcbiAgICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAgIHVybDogJy9yb3V0ZSdcbiAgICAgIH0pXG4gICAgICAuc3RhdGUoJ2FwaS5yb3V0ZS5ob21lJywge1xuICAgICAgICB1cmw6ICcnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUtaG9tZS5odG1sJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLnJvdXRlLml0ZW0nLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ0BhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwaScsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUuaXRlbS5hY3Rpb24nLCB7XG4gICAgICAgIHVybDogJy86YWN0aW9uSWQnLFxuICAgICAgICB2aWV3czoge1xuICAgICAgICAgICdAYXBpJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcGknLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ0FwaUFjdGlvbkN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvYWN0aW9uLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICB9XG5cbn07XG4iLCJ2YXIgQXBwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvYXBwJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIHBhcnNlQ29va2llID0gcmVxdWlyZSgnY29va2llJykucGFyc2U7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsIGZzLCB3YXRjaGVyLCBmaWxlU2VydmljZSwgZGlhbG9nLCBjb2xvclNlcnZpY2UsIHNlc3Npb25TZXJ2aWNlKSB7XG5cbiAgdmFyIG1vZGVsID0gbmV3IEFwcE1vZGVsKHtcbiAgICBmczogZnMsXG4gICAgd2F0Y2hlcjogd2F0Y2hlcixcbiAgICBzZXNzaW9uU2VydmljZTogc2Vzc2lvblNlcnZpY2UsXG4gICAgcmVjZW50RmlsZXM6IGFuZ3VsYXIuZnJvbUpzb24ocGFyc2VDb29raWUoZG9jdW1lbnQuY29va2llKS5yZWNlbnRGaWxlcylcbiAgfSk7XG5cbiAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG5cbiAgLy8gTGlzdGVuIG91dCBmb3IgY2hhbmdlcyB0byB0aGUgZmlsZSBzeXN0ZW1cbiAgd2F0Y2hlci5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG4gICAgY29uc29sZS5sb2coJ2ZzIGNoYW5nZScpO1xuICAgICRzY29wZS4kYXBwbHkoKTtcbiAgfSk7XG5cbiAgdmFyIHBhY2thZ2VGaWxlID0gbW9kZWwucGFja2FnZUZpbGU7XG4gIGlmIChwYWNrYWdlRmlsZSkge1xuICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHBhY2thZ2VGaWxlLnBhdGgpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBtb2RlbC5wYWNrYWdlID0gcmVzO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHJlYWRtZUZpbGUgPSBtb2RlbC5yZWFkbWVGaWxlO1xuICBpZiAocmVhZG1lRmlsZSkge1xuICAgIGZpbGVTZXJ2aWNlLnJlYWRGaWxlKHJlYWRtZUZpbGUucGF0aCkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIG1vZGVsLnJlYWRtZSA9IHJlcztcbiAgICB9KTtcbiAgfVxuXG4gICRzY29wZS5vblNlYXJjaEZvcm1TdWJtaXQgPSBmdW5jdGlvbigpIHtcbiAgICAkc3RhdGUuZ28oJ2FwcC5mcy5zZWFyY2gnLCB7XG4gICAgICBxOiBzZWFyY2hGb3JtLnEudmFsdWVcbiAgICB9KTtcbiAgfTtcbiAgLy9cbiAgLy8gJHNjb3BlLmZpbGVVcmwgPSBmdW5jdGlvbihmaWxlKSB7XG4gIC8vICAgcmV0dXJuICRzdGF0ZS5ocmVmKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gIC8vICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoIHx8IGZpbGUpXG4gIC8vICAgfSk7XG4gIC8vIH07XG5cbiAgJHNjb3BlLmdvdG9GaWxlID0gZnVuY3Rpb24oZmlsZSkge1xuICAgIHJldHVybiAkc3RhdGUudHJhbnNpdGlvblRvKCdhcHAuZnMuZmluZGVyLmZpbGUnLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZmlsZS5wYXRoIHx8IGZpbGUpXG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLmZpbGVQYXJhbXMgPSBmdW5jdGlvbihmaWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHBhdGg6IHV0aWxzLmVuY29kZVN0cmluZyhmaWxlLnBhdGgpXG4gICAgfTtcbiAgfTtcblxuXG4gICRzY29wZS5kaXJVcmwgPSBmdW5jdGlvbihkaXIpIHtcbiAgICByZXR1cm4gJHN0YXRlLmhyZWYoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICBwYXRoOiB1dGlscy5lbmNvZGVTdHJpbmcoZGlyLnBhdGgpXG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29sb3IgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZGV0ZXJtaW5pc3RpYyBjb2xvcnMgZnJvbSBhIHN0cmluZ1xuICAkc2NvcGUuY29sb3IgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLmhleCgpIDogJyc7XG4gIH07XG4gICRzY29wZS5jb2xvclRleHQgPSBmdW5jdGlvbihpdGVtKSB7XG4gICAgdmFyIHN0ciA9IChpdGVtIGluc3RhbmNlb2YgRmlsZVN5c3RlbU9iamVjdCkgPyBpdGVtLmV4dCA6IGl0ZW07XG4gICAgcmV0dXJuIHN0ciA/ICcjJyArIGNvbG9yU2VydmljZShzdHIpLnJlYWRhYmxlKCkuaGV4KCkgOiAnJztcbiAgfTtcblxuICBmdW5jdGlvbiBzYXZlU2Vzc2lvbihzZXNzaW9uLCBjYWxsYmFjaykge1xuICAgIHZhciBwYXRoID0gc2Vzc2lvbi5wYXRoO1xuICAgIHZhciBlZGl0U2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcbiAgICB2YXIgY29udGVudHMgPSBlZGl0U2Vzc2lvbi5nZXRWYWx1ZSgpO1xuXG4gICAgY29uc29sZS5sb2coJ3dyaXRlRmlsZScsIHBhdGgpO1xuXG4gICAgZnMud3JpdGVGaWxlKHBhdGgsIGNvbnRlbnRzLCBmdW5jdGlvbihyc3ApIHtcblxuICAgICAgaWYgKHJzcC5lcnIpIHtcblxuICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgIHRpdGxlOiAnRmlsZSBTeXN0ZW0gV3JpdGUgRXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNhbGxiYWNrKHJzcC5lcnIpO1xuICAgICAgICBjb25zb2xlLmxvZygnd3JpdGVGaWxlIEZhaWxlZCcsIHBhdGgsIHJzcC5lcnIpO1xuXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCd3cml0ZUZpbGUgU3VjY2VlZGVkJywgcGF0aCk7XG5cbiAgICAgICAgc2Vzc2lvbi5tYXJrQ2xlYW4oKTtcblxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBzZXNzaW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vJHNjb3BlLiRhcHBseSgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cblxuICAkc2NvcGUuc2F2ZVNlc3Npb24gPSBmdW5jdGlvbihzZXNzaW9uKSB7XG4gICAgc2F2ZVNlc3Npb24oc2Vzc2lvbik7XG4gIH07XG4gICRzY29wZS5zYXZlQWxsU2Vzc2lvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2Vzc2lvbnMgPSBzZXNzaW9uU2VydmljZS5kaXJ0eTtcblxuICAgIHNlc3Npb25zLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgICAgc2F2ZVNlc3Npb24oaXRlbSk7XG4gICAgfSk7XG4gIH07XG5cbiAgJHNjb3BlLnJlbW92ZVJlY2VudEZpbGUgPSBmdW5jdGlvbihlbnRyeSkge1xuXG4gICAgLy8gZmluZCByZWxhdGVkIHNlc3Npb25cbiAgICB2YXIgc2Vzc2lvbnMgPSBtb2RlbC5zZXNzaW9ucztcbiAgICB2YXIgc2Vzc2lvbiA9IHNlc3Npb25zLmZpbmRTZXNzaW9uKGVudHJ5LnBhdGgpO1xuICAgIGlmIChzZXNzaW9uKSB7XG5cbiAgICAgIGlmIChzZXNzaW9uLmlzRGlydHkpIHtcblxuICAgICAgICBkaWFsb2cuY29uZmlybSh7XG4gICAgICAgICAgdGl0bGU6ICdTYXZlIEZpbGUnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGhhcyBjaGFuZ2VkLiBXb3VsZCB5b3UgbGlrZSB0byBTYXZlIFsnICsgbW9kZWwuZ2V0UmVsYXRpdmVQYXRoKHNlc3Npb24ucGF0aCkgKyAnXScsXG4gICAgICAgICAgb2tCdXR0b25UZXh0OiAnWWVzJyxcbiAgICAgICAgICBjYW5jZWxCdXR0b25UZXh0OiAnTm8nXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2F2ZVNlc3Npb24oc2Vzc2lvbiwgZnVuY3Rpb24oZXJyLCBzZXNzaW9uKSB7XG4gICAgICAgICAgICBpZiAoIWVycikge1xuICAgICAgICAgICAgICBtb2RlbC5yZW1vdmVSZWNlbnRGaWxlKGVudHJ5KTtcbiAgICAgICAgICAgICAgc2Vzc2lvbnMucmVtb3ZlU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgICAgJHNjb3BlLiRicm9hZGNhc3QoJ3JlY2VudC1yZW1vdmVkJywgZW50cnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKCdSZW1vdmUgcmVjZW50IChzYXZlKSBtb2RhbCBkaXNtaXNzZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgLy8gQ2hlY2sgaWYgY2xpY2tlZCAnTm8nLCBvdGhlcndpc2UgZG8gbm90aGluZ1xuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJ2NhbmNlbCcpIHtcbiAgICAgICAgICAgIG1vZGVsLnJlbW92ZVJlY2VudEZpbGUoZW50cnkpO1xuICAgICAgICAgICAgc2Vzc2lvbnMucmVtb3ZlU2Vzc2lvbihzZXNzaW9uKTtcbiAgICAgICAgICAgICRzY29wZS4kYnJvYWRjYXN0KCdyZWNlbnQtcmVtb3ZlZCcsIGVudHJ5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2Vzc2lvbnMucmVtb3ZlU2Vzc2lvbihzZXNzaW9uKTtcblxuICAgIH1cblxuICAgIG1vZGVsLnJlbW92ZVJlY2VudEZpbGUoZW50cnkpO1xuICAgICRzY29wZS4kYnJvYWRjYXN0KCdyZWNlbnQtcmVtb3ZlZCcsIGVudHJ5KTtcblxuICB9O1xuXG5cbiAgd2luZG93Lm9uYmVmb3JldW5sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHNlc3Npb25TZXJ2aWNlLmRpcnR5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuICdZb3UgaGF2ZSB1bnNhdmVkIGNoYW5nZXMuIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBsZWF2ZS4nO1xuICAgIH1cbiAgfTtcblxuICAkc2NvcGUuZW5jb2RlUGF0aCA9IHV0aWxzLmVuY29kZVN0cmluZztcbiAgJHNjb3BlLmRlY29kZVBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmc7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbigkc2NvcGUsICRlbGVtZW50LCBhdHRycykge1xuICAgICRzY29wZS4kd2F0Y2goYXR0cnMubmdTY3JvbGxlZEludG9WaWV3LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgIHZhciBlbCA9ICRlbGVtZW50WzBdO1xuICAgICAgICBlbC5zY3JvbGxJbnRvVmlldyhmYWxzZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkcGFyc2UpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCRzY29wZSwgJGVsZW1lbnQsIGF0dHJzKSB7XG4gICAgdmFyIGZuID0gJHBhcnNlKGF0dHJzLm5nU2Nyb2xsZWRMZWZ0KTtcbiAgICB2YXIgZWwgPSAkZWxlbWVudFswXTtcblxuICAgICRzY29wZS4kd2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICBlbC5zY3JvbGxMZWZ0ID0gZWwuc2Nyb2xsV2lkdGg7XG4gICAgfSk7XG5cbiAgfTtcbn07XG4iLCIvLyB2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtJyk7XG4vLyB2YXIgd2F0Y2hlciA9IHJlcXVpcmUoJy4uL2ZpbGUtc3lzdGVtLXdhdGNoZXInKTtcbi8vIHZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xuXG4vLyBMb2FkIE1vZHVsZSBEZXBlbmRlbmNpZXNcbnJlcXVpcmUoJy4uL2RpYWxvZycpO1xucmVxdWlyZSgnLi4vZnMnKTtcblxudmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG5cbm1vZC5zZXJ2aWNlKCdGaWxlU2VydmljZScsIFtcbiAgJyRxJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9maWxlJylcbl0pO1xuXG5tb2Quc2VydmljZSgnUmVzcG9uc2VIYW5kbGVyJywgW1xuICAnRGlhbG9nU2VydmljZScsXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvcmVzcG9uc2UtaGFuZGxlcicpXG5dKTtcblxubW9kLnNlcnZpY2UoJ0NvbG9yU2VydmljZScsIFtcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9jb2xvcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0FwcEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJ2ZzUHJvbWlzZScsXG4gICdmc1dhdGNoZXJQcm9taXNlJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnQ29sb3JTZXJ2aWNlJyxcbiAgJ1Nlc3Npb25TZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycycpXG5dKTtcblxuLy8gQUNFIEdsb2JhbCBEZWZhdWx0c1xubW9kLnJ1bihbJ3VpQWNlQ29uZmlnJyxcbiAgZnVuY3Rpb24odWlBY2VDb25maWcpIHtcbiAgICB1aUFjZUNvbmZpZy5hY2UgPSB7fTtcbiAgICBhbmd1bGFyLmV4dGVuZCh1aUFjZUNvbmZpZy5hY2UsIHtcbiAgICAgIHVzZVdyYXBNb2RlOiBmYWxzZSxcbiAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICBzaG93R3V0dGVyOiB0cnVlLFxuICAgICAgc2V0QXV0b1Njcm9sbEVkaXRvckludG9WaWV3OiB0cnVlLFxuICAgICAgbWF4TGluZXM6IDYwMCxcbiAgICAgIG1pbkxpbmVzOiAxNSxcbiAgICAgIG1vZGU6ICdqYXZhc2NyaXB0JyxcbiAgICAgIHJlcXVpcmU6IFsnYWNlL2V4dC9sYW5ndWFnZV90b29scyddLFxuICAgICAgYWR2YW5jZWQ6IHtcbiAgICAgICAgZW5hYmxlU25pcHBldHM6IHRydWUsXG4gICAgICAgIGVuYWJsZUJhc2ljQXV0b2NvbXBsZXRpb246IHRydWUsXG4gICAgICAgIGVuYWJsZUxpdmVBdXRvY29tcGxldGlvbjogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5dKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gICckbG9jYXRpb25Qcm92aWRlcicsXG4gICckdXJsUm91dGVyUHJvdmlkZXInLFxuICByZXF1aXJlKCcuL2NvbmZpZycpXG5dKTtcblxubW9kLmNvbmZpZyggWyckY29tcGlsZVByb3ZpZGVyJywgZnVuY3Rpb24oJGNvbXBpbGVQcm92aWRlcil7XG4gICRjb21waWxlUHJvdmlkZXIuaW1nU3JjU2FuaXRpemF0aW9uV2hpdGVsaXN0KC9eXFxzKigoaHR0cHM/fGZ0cHxmaWxlfGJsb2IpOnxkYXRhOmltYWdlXFwvKS8pO1xufV0pO1xuXG5tb2QuZGlyZWN0aXZlKCduZ1Njcm9sbGVkJywgW1xuICAnJHBhcnNlJyxcbiAgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3Njcm9sbGVkJylcbl0pO1xuXG5tb2QuZGlyZWN0aXZlKCduZ1Njcm9sbGVkSW50b1ZpZXcnLCBbXG4gICckcGFyc2UnLFxuICByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvc2Nyb2xsZWQtaW50by12aWV3Jylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgY29va2llID0gcmVxdWlyZSgnY29va2llJyk7XG5cbmZ1bmN0aW9uIEFwcE1vZGVsKGRhdGEpIHtcbiAgZGF0YSA9IGRhdGEgfHwge307XG4gIHRoaXMuZnMgPSBkYXRhLmZzO1xuICB0aGlzLndhdGNoZXIgPSBkYXRhLndhdGNoZXI7XG4gIHRoaXMuc2Vzc2lvbnMgPSBkYXRhLnNlc3Npb25TZXJ2aWNlO1xuXG4gIHRoaXMudGl0bGUgPSAnVGl0bGUnO1xuICB0aGlzLnN1YlRpdGxlID0gJ1N1YnRpdGxlJztcblxuICB0aGlzLl9yZWNlbnRGaWxlcyA9IGRhdGEucmVjZW50RmlsZXMgfHwgW107XG59XG5BcHBNb2RlbC5wcm90b3R5cGUuYWRkUmVjZW50RmlsZSA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgdmFyIHJlY2VudCA9IHRoaXMuX3JlY2VudEZpbGVzO1xuICB2YXIgaWR4ID0gcmVjZW50LmZpbmRJbmRleChmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ucGF0aCA9PT0gZmlsZS5wYXRoO1xuICB9KTtcbiAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICByZWNlbnQubW92ZShpZHgsIDApO1xuICB9IGVsc2Uge1xuICAgIHJlY2VudC51bnNoaWZ0KHtcbiAgICAgIHBhdGg6IGZpbGUucGF0aCxcbiAgICAgIHRpbWU6IERhdGUubm93KClcbiAgICB9KTtcbiAgICByZWNlbnQubGVuZ3RoID0gTWF0aC5taW4odGhpcy5fcmVjZW50RmlsZXMubGVuZ3RoLCAyMCk7XG4gIH1cblxuICB0aGlzLnN0b3JlUmVjZW50RmlsZXMoKTtcbn07XG5BcHBNb2RlbC5wcm90b3R5cGUucmVtb3ZlUmVjZW50RmlsZSA9IGZ1bmN0aW9uKGVudHJ5KSB7XG4gIHZhciByZWNlbnQgPSB0aGlzLl9yZWNlbnRGaWxlcztcbiAgdmFyIGlkeCA9IHJlY2VudC5pbmRleE9mKGVudHJ5KTtcblxuICBpZiAoaWR4ICE9PSAtMSkge1xuICAgIHJlY2VudC5zcGxpY2UoaWR4LCAxKTtcbiAgICB0aGlzLnN0b3JlUmVjZW50RmlsZXMoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLnN0b3JlUmVjZW50RmlsZXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNvb2tpZUV4cGlyZXMgPSBuZXcgRGF0ZSgpO1xuICBjb29raWVFeHBpcmVzLnNldEZ1bGxZZWFyKGNvb2tpZUV4cGlyZXMuZ2V0RnVsbFllYXIoKSArIDEpO1xuXG4gIGRvY3VtZW50LmNvb2tpZSA9IGNvb2tpZS5zZXJpYWxpemUoJ3JlY2VudEZpbGVzJywgYW5ndWxhci50b0pzb24odGhpcy5yZWNlbnRGaWxlcyksIHtcbiAgICBleHBpcmVzOiBjb29raWVFeHBpcmVzXG4gIH0pO1xufTtcblxuQXBwTW9kZWwucHJvdG90eXBlLmNvdW50RmlsZXMgPSBmdW5jdGlvbihleHQpIHtcbiAgcmV0dXJuIHRoaXMubGlzdC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiAhaXRlbS5pc0RpcmVjdG9yeSAmJiBpdGVtLmV4dCA9PT0gZXh0O1xuICB9KS5sZW5ndGg7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmNsZWFyUmVjZW50RmlsZXMgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fcmVjZW50RmlsZXMubGVuZ3RoID0gMDtcbiAgdGhpcy5zdG9yZVJlY2VudEZpbGVzKCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLmdldFJlbGF0aXZlUGF0aCA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHAucmVsYXRpdmUodGhpcy50cmVlLmRpciwgcGF0aCk7XG59O1xuQXBwTW9kZWwucHJvdG90eXBlLl9yZWFkRGVwZW5kZW5jaWVzID0gZnVuY3Rpb24oZGV2KSB7XG4gIHZhciBkZXBzID0gW107XG4gIHZhciBwYWNrYWdlSlNPTiA9IHRoaXMuX3BhY2thZ2VKU09OO1xuICBpZiAocGFja2FnZUpTT04pIHtcbiAgICB2YXIgZGVwS2V5ID0gcGFja2FnZUpTT05bZGV2ID8gJ2RldkRlcGVuZGVuY2llcycgOiAnZGVwZW5kZW5jaWVzJ107XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkZXBLZXkpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBrZXlzW2ldO1xuICAgICAgdmFyIHZlcnNpb24gPSBkZXBLZXlbbmFtZV07XG4gICAgICBkZXBzLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlcHM7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQXBwTW9kZWwucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy53YXRjaGVyLm1hcDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMud2F0Y2hlci5saXN0O1xuICAgIH1cbiAgfSxcbiAgdHJlZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy53YXRjaGVyLnRyZWVbMF0uY2hpbGRyZW5bMF07XG4gICAgfVxuICB9LFxuICByZWNlbnRGaWxlczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmVjZW50ID0gdGhpcy5fcmVjZW50RmlsZXM7XG5cbiAgICAgIC8vIGNsZWFuIGFueSBmaWxlcyB0aGF0IG1heSBubyBsb25nZXIgZXhpc3RcbiAgICAgIHZhciBpID0gcmVjZW50Lmxlbmd0aDtcbiAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgaWYgKCF0aGlzLm1hcFtyZWNlbnRbaV0ucGF0aF0pIHtcbiAgICAgICAgICByZWNlbnQuc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVjZW50O1xuICAgIH1cbiAgfSxcbiAganNDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuanMnKTtcbiAgICB9XG4gIH0sXG4gIGNzc0NvdW50OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmNvdW50RmlsZXMoJy5jc3MnKTtcbiAgICB9XG4gIH0sXG4gIGh0bWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb3VudEZpbGVzKCcuaHRtbCcpO1xuICAgIH1cbiAgfSxcbiAgdG90YWxDb3VudDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0Lmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIHBhY2thZ2U6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhY2thZ2U7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9wYWNrYWdlID0gdmFsdWU7XG4gICAgICB0aGlzLl9wYWNrYWdlSlNPTiA9IEpTT04ucGFyc2UodmFsdWUuY29udGVudHMpO1xuICAgICAgdGhpcy5fZGVwZW5kZW5jaWVzID0gdGhpcy5fcmVhZERlcGVuZGVuY2llcygpO1xuICAgICAgdGhpcy5fZGV2RGVwZW5kZW5jaWVzID0gdGhpcy5fcmVhZERlcGVuZGVuY2llcyh0cnVlKTtcbiAgICB9XG4gIH0sXG4gIHBhY2thZ2VGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRyZWUuY2hpbGRyZW4uZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3BhY2thZ2UuanNvbic7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIGhhc1BhY2thZ2VGaWxlOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMucGFja2FnZUZpbGU7XG4gICAgfVxuICB9LFxuICBkZXBlbmRlbmNpZXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2RlcGVuZGVuY2llcztcbiAgICB9XG4gIH0sXG4gIGRldkRlcGVuZGVuY2llczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZGV2RGVwZW5kZW5jaWVzO1xuICAgIH1cbiAgfSxcbiAgcmVhZG1lOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9yZWFkbWU7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9yZWFkbWUgPSB2YWx1ZTtcbiAgICB9XG4gIH0sXG4gIHJlYWRtZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudHJlZS5jaGlsZHJlbi5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIC9ecmVhZG1lLihtZHxtYXJrZG93bikkLy50ZXN0KGl0ZW0ubmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgaGFzUmVhZG1lRmlsZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLnJlYWRtZUZpbGU7XG4gICAgfVxuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcE1vZGVsO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnYXBwJywgW1xuICAndWkucm91dGVyJyxcbiAgJ3VpLmJvb3RzdHJhcCcsXG4gICd1aS5hY2UnLFxuICAnZXZnZW55bmV1Lm1hcmtkb3duLXByZXZpZXcnLFxuICAnbWljaGlLb25vJyxcbiAgJ2RpYWxvZycsXG4gICdmcydcbl0pO1xuIiwiLyoqXG4gKiBjb2xvclRhZyB2IDAuMVxuICogYnkgUnlhbiBRdWlublxuICogaHR0cHM6Ly9naXRodWIuY29tL21hem9uZG8vY29sb3JUYWdcbiAqXG4gKiBjb2xvclRhZyBpcyB1c2VkIHRvIGdlbmVyYXRlIGEgcmFuZG9tIGNvbG9yIGZyb20gYSBnaXZlbiBzdHJpbmdcbiAqIFRoZSBnb2FsIGlzIHRvIGNyZWF0ZSBkZXRlcm1pbmlzdGljLCB1c2FibGUgY29sb3JzIGZvciB0aGUgcHVycG9zZVxuICogb2YgYWRkaW5nIGNvbG9yIGNvZGluZyB0byB0YWdzXG4qL1xuXG5mdW5jdGlvbiBjb2xvclRhZyh0YWdTdHJpbmcpIHtcblx0Ly8gd2VyZSB3ZSBnaXZlbiBhIHN0cmluZyB0byB3b3JrIHdpdGg/ICBJZiBub3QsIHRoZW4ganVzdCByZXR1cm4gZmFsc2Vcblx0aWYgKCF0YWdTdHJpbmcpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJuIHN0aGUgbHVtaW5vc2l0eSBkaWZmZXJlbmNlIGJldHdlZW4gMiByZ2IgdmFsdWVzXG5cdCAqIGFueXRoaW5nIGdyZWF0ZXIgdGhhbiA1IGlzIGNvbnNpZGVyZWQgcmVhZGFibGVcblx0ICovXG5cdGZ1bmN0aW9uIGx1bWlub3NpdHlEaWZmKHJnYjEsIHJnYjIpIHtcbiAgXHRcdHZhciBsMSA9IDAuMjEyNiArIE1hdGgucG93KHJnYjEuci8yNTUsIDIuMikgK1xuICBcdFx0XHRcdCAwLjcxNTIgKiBNYXRoLnBvdyhyZ2IxLmcvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC4wNzIyICogTWF0aC5wb3cocmdiMS5iLzI1NSwgMi4yKSxcbiAgXHRcdFx0bDIgPSAwLjIxMjYgKyBNYXRoLnBvdyhyZ2IyLnIvMjU1LCAyLjIpICtcbiAgXHRcdFx0XHQgMC43MTUyICogTWF0aC5wb3cocmdiMi5nLzI1NSwgMi4yKSArXG4gIFx0XHRcdFx0IDAuMDcyMiAqIE1hdGgucG93KHJnYjIuYi8yNTUsIDIuMik7XG5cbiAgXHRcdGlmIChsMSA+IGwyKSB7XG4gIFx0XHRcdHJldHVybiAobDEgKyAwLjA1KSAvIChsMiArIDAuMDUpO1xuICBcdFx0fSBlbHNlIHtcbiAgXHRcdFx0cmV0dXJuIChsMiArIDAuMDUpIC8gKGwxICsgMC4wNSk7XG4gIFx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogVGhpcyBpcyB0aGUgZGVmaW5pdGlvbiBvZiBhIGNvbG9yIGZvciBvdXIgcHVycG9zZXMuICBXZSd2ZSBhYnN0cmFjdGVkIGl0IG91dFxuXHQgKiBzbyB0aGF0IHdlIGNhbiByZXR1cm4gbmV3IGNvbG9yIG9iamVjdHMgd2hlbiByZXF1aXJlZFxuXHQqL1xuXHRmdW5jdGlvbiBjb2xvcihoZXhDb2RlKSB7XG5cdFx0Ly93ZXJlIHdlIGdpdmVuIGEgaGFzaHRhZz8gIHJlbW92ZSBpdC5cblx0XHR2YXIgaGV4Q29kZSA9IGhleENvZGUucmVwbGFjZShcIiNcIiwgXCJcIik7XG5cdFx0cmV0dXJuIHtcblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhIHNpbXBsZSBoZXggc3RyaW5nIGluY2x1ZGluZyBoYXNodGFnXG5cdFx0XHQgKiBvZiB0aGUgY29sb3Jcblx0XHRcdCAqL1xuXHRcdFx0aGV4OiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIGhleENvZGU7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgYW4gUkdCIGJyZWFrZG93biBvZiB0aGUgY29sb3IgcHJvdmlkZWRcblx0XHRcdCAqL1xuXHRcdFx0cmdiOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGJpZ2ludCA9IHBhcnNlSW50KGhleENvZGUsIDE2KTtcblx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRyOiAoYmlnaW50ID4+IDE2KSAmIDI1NSxcblx0XHRcdFx0XHRnOiAoYmlnaW50ID4+IDgpICYgMjU1LFxuXHRcdFx0XHRcdGI6IGJpZ2ludCAmIDI1NVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEdpdmVuIGEgbGlzdCBvZiBoZXggY29sb3IgY29kZXNcblx0XHRcdCAqIERldGVybWluZSB3aGljaCBpcyB0aGUgbW9zdCByZWFkYWJsZVxuXHRcdFx0ICogV2UgdXNlIHRoZSBsdW1pbm9zaXR5IGVxdWF0aW9uIHByZXNlbnRlZCBoZXJlOlxuXHRcdFx0ICogaHR0cDovL3d3dy5zcGxpdGJyYWluLm9yZy9ibG9nLzIwMDgtMDkvMTgtY2FsY3VsYXRpbmdfY29sb3JfY29udHJhc3Rfd2l0aF9waHBcblx0XHRcdCAqL1xuXHRcdFx0cmVhZGFibGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQvLyB0aGlzIGlzIG1lYW50IHRvIGJlIHNpbXBsaXN0aWMsIGlmIHlvdSBkb24ndCBnaXZlIG1lIG1vcmUgdGhhblxuXHRcdFx0XHQvLyBvbmUgY29sb3IgdG8gd29yayB3aXRoLCB5b3UncmUgZ2V0dGluZyB3aGl0ZSBvciBibGFjay5cblx0XHRcdFx0dmFyIGNvbXBhcmF0b3JzID0gKGFyZ3VtZW50cy5sZW5ndGggPiAxKSA/IGFyZ3VtZW50cyA6IFtcIiNFMUUxRTFcIiwgXCIjNDY0NjQ2XCJdLFxuXHRcdFx0XHRcdG9yaWdpbmFsUkdCID0gdGhpcy5yZ2IoKSxcblx0XHRcdFx0XHRicmlnaHRlc3QgPSB7IGRpZmZlcmVuY2U6IDAgfTtcblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNvbXBhcmF0b3JzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Ly9jYWxjdWxhdGUgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiB0aGUgb3JpZ2luYWwgY29sb3IgYW5kIHRoZSBvbmUgd2Ugd2VyZSBnaXZlblxuXHRcdFx0XHRcdHZhciBjID0gY29sb3IoY29tcGFyYXRvcnNbaV0pLFxuXHRcdFx0XHRcdFx0bCA9IGx1bWlub3NpdHlEaWZmKG9yaWdpbmFsUkdCLCBjLnJnYigpKTtcblxuXHRcdFx0XHRcdC8vIGlmIGl0J3MgYnJpZ2h0ZXIgdGhhbiB0aGUgY3VycmVudCBicmlnaHRlc3QsIHN0b3JlIGl0IHRvIGNvbXBhcmUgYWdhaW5zdCBsYXRlciBvbmVzXG5cdFx0XHRcdFx0aWYgKGwgPiBicmlnaHRlc3QuZGlmZmVyZW5jZSkge1xuXHRcdFx0XHRcdFx0YnJpZ2h0ZXN0ID0ge1xuXHRcdFx0XHRcdFx0XHRkaWZmZXJlbmNlOiBsLFxuXHRcdFx0XHRcdFx0XHRjb2xvcjogY1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIHJldHVybiB0aGUgYnJpZ2hlc3QgY29sb3Jcblx0XHRcdFx0cmV0dXJuIGJyaWdodGVzdC5jb2xvcjtcblx0XHRcdH1cblxuXHRcdH1cblx0fVxuXG5cdC8vIGNyZWF0ZSB0aGUgaGV4IGZvciB0aGUgcmFuZG9tIHN0cmluZ1xuICAgIHZhciBoYXNoID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhZ1N0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBoYXNoID0gdGFnU3RyaW5nLmNoYXJDb2RlQXQoaSkgKyAoKGhhc2ggPDwgNSkgLSBoYXNoKTtcbiAgICB9XG4gICAgaGV4ID0gXCJcIlxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IChoYXNoID4+IChpICogOCkpICYgMHhGRjtcbiAgICAgICAgaGV4ICs9ICgnMDAnICsgdmFsdWUudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTIpO1xuICAgIH1cblxuICAgIHJldHVybiBjb2xvcihoZXgpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjb2xvclRhZztcbn07XG4iLCJ2YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHEpIHtcbiAgcmV0dXJuIHtcbiAgICByZWFkRmlsZTogZnVuY3Rpb24oZmlsZSkge1xuICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgZmlsZXN5c3RlbS5yZWFkRmlsZShmaWxlLCBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgaWYgKHJlcy5lcnIpIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVzLmVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXMuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkaWFsb2cpIHtcbiAgcmV0dXJuIHtcbiAgICByZXNwb25zZUhhbmRsZXI6IGZ1bmN0aW9uKGZuKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24ocnNwLCBzaG93RXJyb3IpIHtcbiAgICAgICAgc2hvd0Vycm9yID0gc2hvd0Vycm9yIHx8IHRydWU7XG4gICAgICAgIGlmIChyc3AuZXJyKSB7XG4gICAgICAgICAgaWYgKHNob3dFcnJvcikge1xuICAgICAgICAgICAgZGlhbG9nLmFsZXJ0KHtcbiAgICAgICAgICAgICAgdGl0bGU6ICdFcnJvcicsXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHJzcC5lcnIpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm4ocnNwLmRhdGEpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG4iLCJBcnJheS5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKG9sZEluZGV4LCBuZXdJbmRleCkge1xuXG4gIGlmIChpc05hTihuZXdJbmRleCkgfHwgaXNOYU4ob2xkSW5kZXgpIHx8IG9sZEluZGV4IDwgMCB8fCBvbGRJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChuZXdJbmRleCA8IDApIHtcbiAgICBuZXdJbmRleCA9IHRoaXMubGVuZ3RoIC0gMTtcbiAgfSBlbHNlIGlmIChuZXdJbmRleCA+PSB0aGlzLmxlbmd0aCkge1xuICAgIG5ld0luZGV4ID0gMDtcbiAgfVxuXG4gIHRoaXMuc3BsaWNlKG5ld0luZGV4LCAwLCB0aGlzLnNwbGljZShvbGRJbmRleCwgMSlbMF0pO1xuXG4gIHJldHVybiBuZXdJbmRleDtcbn07XG5cbmlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgQXJyYXkucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJyYXkucHJvdG90eXBlLmZpbmQgY2FsbGVkIG9uIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aCA+Pj4gMDtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdmFsdWU7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZSA9IGxpc3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIGxpc3QpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZEluZGV4KSB7XG4gIEFycmF5LnByb3RvdHlwZS5maW5kSW5kZXggPSBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAkbW9kYWxJbnN0YW5jZS5jbG9zZSgpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcbiAgJHNjb3BlLm9rQnV0dG9uVGV4dCA9IGRhdGEub2tCdXR0b25UZXh0IHx8ICdPSyc7XG4gICRzY29wZS5jYW5jZWxCdXR0b25UZXh0ID0gZGF0YS5jYW5jZWxCdXR0b25UZXh0IHx8ICdDYW5jZWwnO1xuXG4gICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICB9O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhbGVydDogcmVxdWlyZSgnLi9hbGVydCcpLFxuICBjb25maXJtOiByZXF1aXJlKCcuL2NvbmZpcm0nKSxcbiAgcHJvbXB0OiByZXF1aXJlKCcuL3Byb21wdCcpXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG4gICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAkc2NvcGUucGxhY2Vob2xkZXIgPSBkYXRhLnBsYWNlaG9sZGVyO1xuICAkc2NvcGUuaW5wdXQgPSB7XG4gICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gIH07XG5cbiAgJHNjb3BlLm9rID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgfTtcblxuICAkc2NvcGUuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gIH07XG59O1xuIiwidmFyIG1vZCA9IHJlcXVpcmUoJy4vbW9kdWxlJyk7XG52YXIgY29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLmFsZXJ0XG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbEluc3RhbmNlJyxcbiAgJ2RhdGEnLFxuICBjb250cm9sbGVycy5jb25maXJtXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ1Byb21wdEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJG1vZGFsSW5zdGFuY2UnLFxuICAnZGF0YScsXG4gIGNvbnRyb2xsZXJzLnByb21wdFxuXSk7XG5cbm1vZC5zZXJ2aWNlKCdEaWFsb2dTZXJ2aWNlJywgW1xuICAnJG1vZGFsJyxcbiAgcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKVxuXSk7XG5cbm1vZHVsZS5leHBvcnRzID0gbW9kO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZGlhbG9nJywgW1xuICAndWkuYm9vdHN0cmFwJ1xuXSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gIHZhciBzZXJ2aWNlID0ge307XG5cbiAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL2FsZXJ0Lmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIGRhdGE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGRhdGEubWVzc2FnZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLmNvbmZpcm0gPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2RpYWxvZy92aWV3cy9jb25maXJtLmh0bWwnLFxuICAgICAgY29udHJvbGxlcjogJ0NvbmZpcm1DdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgb2tCdXR0b25UZXh0OiBkYXRhLm9rQnV0dG9uVGV4dCxcbiAgICAgICAgICAgIGNhbmNlbEJ1dHRvblRleHQ6IGRhdGEuY2FuY2VsQnV0dG9uVGV4dFxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KS5yZXN1bHQ7XG5cbiAgfTtcblxuICBzZXJ2aWNlLnByb21wdCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICB0ZW1wbGF0ZVVybDogJy9jbGllbnQvZGlhbG9nL3ZpZXdzL3Byb21wdC5odG1sJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdQcm9tcHRDdHJsJyxcbiAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgZGVmYXVsdFZhbHVlOiBkYXRhLmRlZmF1bHRWYWx1ZSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLnJlc3VsdDtcblxuICB9O1xuXG4gIHJldHVybiBzZXJ2aWNlO1xuXG59O1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9maWxlLXN5c3RlbS1vYmplY3QnKTtcbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1jb21wb25lbnQnKTtcblxuLypcbiAqIEZpbGVTeXN0ZW1XYXRjaGVyIGNvbnN0cnVjdG9yXG4gKi9cbmZ1bmN0aW9uIEZpbGVTeXN0ZW1XYXRjaGVyKCkge1xuXG4gIHRoaXMuX3dhdGNoZWQgPSB7fTtcblxuICB0aGlzLl9saXN0ID0gbnVsbDtcbiAgdGhpcy5fdHJlZSA9IG51bGw7XG5cbiAgdmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mc3dhdGNoJyk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuXG4gICAgT2JqZWN0LmtleXMoZGF0YSkubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5fd2F0Y2hlZFtrZXldID0gbmV3IEZpbGVTeXN0ZW1PYmplY3Qoa2V5LCBkYXRhW2tleV0uaXNEaXJlY3RvcnkpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy91dGlscy5leHRlbmQodGhpcy5fd2F0Y2hlZCwgZGF0YSk7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjb25uZWN0aW9uJyk7XG5cbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCB0aGlzLl93YXRjaGVkKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGQnLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgZmFsc2UpO1xuXG4gICAgdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdID0gZnNvO1xuXG4gICAgY29uc29sZS5sb2coJ1dhdGNoZXIgYWRkJywgZnNvKTtcblxuICAgIHRoaXMuZW1pdCgnYWRkJywgZnNvKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdhZGREaXInLCBmdW5jdGlvbihyZXMpIHtcblxuICAgIHZhciBkYXRhID0gcmVzLmRhdGE7XG4gICAgdmFyIGZzbyA9IG5ldyBGaWxlU3lzdGVtT2JqZWN0KGRhdGEucGF0aCwgdHJ1ZSk7XG5cbiAgICB0aGlzLl93YXRjaGVkW2Zzby5wYXRoXSA9IGZzbztcblxuICAgIGNvbnNvbGUubG9nKCdXYXRjaGVyIGFkZERpcicsIGZzbyk7XG5cbiAgICB0aGlzLmVtaXQoJ2FkZERpcicsIGZzbyk7XG4gICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY2hhbmdlJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICB2YXIgZGF0YSA9IHJlcy5kYXRhO1xuICAgIHZhciBmc28gPSB0aGlzLl93YXRjaGVkW2RhdGEucGF0aF07XG5cbiAgICAvLyBjaGVjayB3ZSBnb3Qgc29tZXRoaW5nXG4gICAgaWYgKGZzbykge1xuXG4gICAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBjaGFuZ2UnLCBmc28pO1xuXG4gICAgICB0aGlzLmVtaXQoJ21vZGlmaWVkJywgZnNvKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGluaycsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmsnLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3VubGlua0RpcicsIGZ1bmN0aW9uKHJlcykge1xuXG4gICAgdmFyIGRhdGEgPSByZXMuZGF0YTtcbiAgICB2YXIgZnNvID0gdGhpcy5fd2F0Y2hlZFtkYXRhLnBhdGhdO1xuXG4gICAgaWYgKGZzbykge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhdGNoZWRbZGF0YS5wYXRoXTtcblxuICAgICAgY29uc29sZS5sb2coJ1dhdGNoZXIgdW5saW5rRGlyJywgZnNvKTtcblxuICAgICAgdGhpcy5lbWl0KCd1bmxpbmtEaXInLCBmc28pO1xuICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnKTtcbiAgICB9XG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ2Vycm9yJywgZnVuY3Rpb24ocmVzKSB7XG5cbiAgICBjb25zb2xlLmxvZygnV2F0Y2hlciBlcnJvcicsIHJlcy5lcnIpO1xuXG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIHJlcy5lcnIpO1xuXG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG4gIHRoaXMub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2xpc3QgPSBudWxsO1xuICAgIHRoaXMuX3RyZWUgPSBudWxsO1xuICB9KTtcblxufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoRmlsZVN5c3RlbVdhdGNoZXIucHJvdG90eXBlLCB7XG4gIG1hcDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd2F0Y2hlZDtcbiAgICB9XG4gIH0sXG4gIGxpc3Q6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9saXN0KSB7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBbXTtcbiAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl93YXRjaGVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5fbGlzdC5wdXNoKHRoaXMuX3dhdGNoZWRba2V5c1tpXV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdDtcbiAgICB9XG4gIH0sXG4gIHRyZWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuXG4gICAgICBmdW5jdGlvbiB0cmVlaWZ5KGxpc3QsIGlkQXR0ciwgcGFyZW50QXR0ciwgY2hpbGRyZW5BdHRyKSB7XG5cbiAgICAgICAgdmFyIHRyZWVMaXN0ID0gW107XG4gICAgICAgIHZhciBsb29rdXAgPSB7fTtcbiAgICAgICAgdmFyIHBhdGgsIG9iajtcblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuXG4gICAgICAgICAgb2JqID0gbGlzdFtwYXRoXTtcbiAgICAgICAgICBvYmoubGFiZWwgPSBvYmoubmFtZTtcbiAgICAgICAgICBsb29rdXBbb2JqW2lkQXR0cl1dID0gb2JqO1xuICAgICAgICAgIG9ialtjaGlsZHJlbkF0dHJdID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHBhdGggaW4gbGlzdCkge1xuICAgICAgICAgIG9iaiA9IGxpc3RbcGF0aF07XG4gICAgICAgICAgdmFyIHBhcmVudCA9IGxvb2t1cFtvYmpbcGFyZW50QXR0cl1dO1xuICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgIG9iai5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICBsb29rdXBbb2JqW3BhcmVudEF0dHJdXVtjaGlsZHJlbkF0dHJdLnB1c2gob2JqKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHJlZUxpc3QucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cmVlTGlzdDtcblxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuX3RyZWUpIHtcbiAgICAgICAgdGhpcy5fdHJlZSA9IHRyZWVpZnkodGhpcy5fd2F0Y2hlZCwgJ3BhdGgnLCAnZGlyJywgJ2NoaWxkcmVuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLl90cmVlO1xuICAgIH1cbiAgfVxufSk7XG5lbWl0dGVyKEZpbGVTeXN0ZW1XYXRjaGVyLnByb3RvdHlwZSk7XG5cbnZhciBGaWxlU3lzdGVtV2F0Y2hlciA9IG5ldyBGaWxlU3lzdGVtV2F0Y2hlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1XYXRjaGVyO1xuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItY29tcG9uZW50Jyk7O1xuXG4vKlxuICogRmlsZVN5c3RlbSBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBGaWxlU3lzdGVtKHNvY2tldCkge1xuXG4gIHNvY2tldC5vbignbWtkaXInLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtkaXInLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdta2ZpbGUnLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgIHRoaXMuZW1pdCgnbWtmaWxlJywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbignY29weScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdjb3B5JywgcmVzcG9uc2UpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHNvY2tldC5vbigncmVuYW1lJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ3JlbmFtZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3JlbW92ZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZW1vdmUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdyZWFkZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCdyZWFkZmlsZScsIHJlc3BvbnNlKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBzb2NrZXQub24oJ3dyaXRlZmlsZScsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5lbWl0KCd3cml0ZWZpbGUnLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgc29ja2V0Lm9uKCdjb25uZWN0aW9uJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3Rpb24nLCByZXNwb25zZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5fc29ja2V0ID0gc29ja2V0O1xuXG59XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2RpciA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdta2RpcicsIHBhdGgsIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5ta2ZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnbWtmaWxlJywgcGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbihzb3VyY2UsIGRlc3RpbmF0aW9uLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgnY29weScsIHNvdXJjZSwgZGVzdGluYXRpb24sIGNhbGxiYWNrKTtcbn07XG5GaWxlU3lzdGVtLnByb3RvdHlwZS5yZW5hbWUgPSBmdW5jdGlvbihvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVuYW1lJywgb2xkUGF0aCwgbmV3UGF0aCwgY2FsbGJhY2spO1xufTtcbkZpbGVTeXN0ZW0ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHBhdGgsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCdyZW1vdmUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoLCBjYWxsYmFjaykge1xuICB0aGlzLl9zb2NrZXQuZW1pdCgncmVhZGZpbGUnLCBwYXRoLCBjYWxsYmFjayk7XG59O1xuRmlsZVN5c3RlbS5wcm90b3R5cGUud3JpdGVGaWxlID0gZnVuY3Rpb24ocGF0aCwgY29udGVudHMsIGNhbGxiYWNrKSB7XG4gIHRoaXMuX3NvY2tldC5lbWl0KCd3cml0ZWZpbGUnLCBwYXRoLCBjb250ZW50cywgY2FsbGJhY2spO1xufTtcblxuZW1pdHRlcihGaWxlU3lzdGVtLnByb3RvdHlwZSk7XG5cblxudmFyIHNvY2tldCA9IGlvLmNvbm5lY3QodXRpbHMudXJsUm9vdCgpICsgJy9mcycpO1xuXG52YXIgZmlsZVN5c3RlbSA9IG5ldyBGaWxlU3lzdGVtKHNvY2tldCk7XG5cbmZpbGVTeXN0ZW0ub24oJ2Nvbm5lY3Rpb24nLCBmdW5jdGlvbihkYXRhKSB7XG4gIGNvbnNvbGUubG9nKCdmcyBjb25uZWN0ZWQnLCBkYXRhKTtcbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmlsZVN5c3RlbTtcbiIsInZhciBmaWxlc3lzdGVtID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0nKTtcbnZhciB3YXRjaGVyID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vLi4vLi4vc2hhcmVkL3V0aWxzJyk7XG52YXIgRWRpdFNlc3Npb24gPSBhY2UucmVxdWlyZSgnYWNlL2VkaXRfc2Vzc2lvbicpLkVkaXRTZXNzaW9uO1xudmFyIFVuZG9NYW5hZ2VyID0gYWNlLnJlcXVpcmUoJ2FjZS91bmRvbWFuYWdlcicpLlVuZG9NYW5hZ2VyO1xuXG52YXIgbW9kZXMgPSB7XG4gIFwiLmpzXCI6IFwiYWNlL21vZGUvamF2YXNjcmlwdFwiLFxuICBcIi5jc3NcIjogXCJhY2UvbW9kZS9jc3NcIixcbiAgXCIuc2Nzc1wiOiBcImFjZS9tb2RlL3Njc3NcIixcbiAgXCIubGVzc1wiOiBcImFjZS9tb2RlL2xlc3NcIixcbiAgXCIuaHRtbFwiOiBcImFjZS9tb2RlL2h0bWxcIixcbiAgXCIuaHRtXCI6IFwiYWNlL21vZGUvaHRtbFwiLFxuICBcIi5lanNcIjogXCJhY2UvbW9kZS9odG1sXCIsXG4gIFwiLmpzb25cIjogXCJhY2UvbW9kZS9qc29uXCIsXG4gIFwiLm1kXCI6IFwiYWNlL21vZGUvbWFya2Rvd25cIixcbiAgXCIuY29mZmVlXCI6IFwiYWNlL21vZGUvY29mZmVlXCIsXG4gIFwiLmphZGVcIjogXCJhY2UvbW9kZS9qYWRlXCIsXG4gIFwiLnBocFwiOiBcImFjZS9tb2RlL3BocFwiLFxuICBcIi5weVwiOiBcImFjZS9tb2RlL3B5dGhvblwiLFxuICBcIi5zY3NzXCI6IFwiYWNlL21vZGUvc2Fzc1wiLFxuICBcIi50eHRcIjogXCJhY2UvbW9kZS90ZXh0XCIsXG4gIFwiLnR5cGVzY3JpcHRcIjogXCJhY2UvbW9kZS90eXBlc2NyaXB0XCIsXG4gIFwiLnhtbFwiOiBcImFjZS9tb2RlL3htbFwiXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcblxuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnYXBwLmZzJywge1xuICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICAvL3VybDogJ2ZzJyxcbiAgICAgIC8vIGNvbnRyb2xsZXI6ICdGc0N0cmwnLFxuICAgICAgLy90ZW1wbGF0ZVVybDogJy9jbGllbnQvZnMvdmlld3MvaW5kZXguaHRtbCcsXG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXInLCB7XG4gICAgICB1cmw6ICcvZmluZGVyJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRmluZGVyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2ZpbmRlci5odG1sJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICAuc3RhdGUoJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgIHVybDogJy9maWxlLzpwYXRoJyxcbiAgICAgIGNvbnRyb2xsZXI6ICdGc0ZpbGVDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9maWxlLmh0bWwnLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBzZXNzaW9uOiBbJyRxJywgJyRzdGF0ZVBhcmFtcycsICdGaWxlU2VydmljZScsICdTZXNzaW9uU2VydmljZScsXG4gICAgICAgICAgZnVuY3Rpb24oJHEsICRzdGF0ZVBhcmFtcywgZmlsZVNlcnZpY2UsIHNlc3Npb25TZXJ2aWNlKSB7XG4gICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUmVxdWVzdGVkIGZpbGUgJyArIHBhdGgpO1xuXG4gICAgICAgICAgICB2YXIgc2Vzc2lvbiA9IHNlc3Npb25TZXJ2aWNlLmZpbmRTZXNzaW9uKHBhdGgpO1xuXG4gICAgICAgICAgICBpZiAoc2Vzc2lvbikge1xuXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdVc2luZyBmb3VuZCBzZXNzaW9uLicpO1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNlc3Npb24pO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdSZWFkaW5nIGZpbGUgZm9yIG5ldyBzZXNzaW9uLicpO1xuICAgICAgICAgICAgICBmaWxlU2VydmljZS5yZWFkRmlsZShwYXRoKS50aGVuKGZ1bmN0aW9uKGZpbGUpIHtcblxuICAgICAgICAgICAgICAgIHZhciBpc1V0ZjggPSAhKGZpbGUuY29udGVudHMgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcik7XG5cbiAgICAgICAgICAgICAgICB2YXIgc2Vzc2lvbkRhdGE7XG4gICAgICAgICAgICAgICAgaWYgKGlzVXRmOCkge1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEgPSBuZXcgRWRpdFNlc3Npb24oZmlsZS5jb250ZW50cywgbW9kZXNbZmlsZS5leHRdKTtcbiAgICAgICAgICAgICAgICAgIHNlc3Npb25EYXRhLnNldFVuZG9NYW5hZ2VyKG5ldyBVbmRvTWFuYWdlcigpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgc2Vzc2lvbkRhdGEgPSBmaWxlLmNvbnRlbnRzO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlc3Npb24gPSBzZXNzaW9uU2VydmljZS5hZGRTZXNzaW9uKHBhdGgsIHNlc3Npb25EYXRhLCBpc1V0ZjgpO1xuXG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzZXNzaW9uKTtcblxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdhcHAuZnMuc2VhcmNoJywge1xuICAgICAgdXJsOiAnL3NlYXJjaD9xJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAYXBwJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdhcHAnLFxuICAgICAgICAgIGNvbnRyb2xsZXI6ICdGc1NlYXJjaEN0cmwnLFxuICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2NsaWVudC9mcy92aWV3cy9zZWFyY2guaHRtbCcsXG4gICAgICAgICAgLy8gcmVzb2x2ZToge1xuICAgICAgICAgIC8vICAgZGlyOiBbJyRzdGF0ZVBhcmFtcycsXG4gICAgICAgICAgLy8gICAgIGZ1bmN0aW9uKCRzdGF0ZVBhcmFtcykge1xuICAgICAgICAgIC8vICAgICAgIHZhciBwYXRoID0gdXRpbHMuZGVjb2RlU3RyaW5nKCRzdGF0ZVBhcmFtcy5wYXRoKTtcbiAgICAgICAgICAvLyAgICAgICByZXR1cm4gd2F0Y2hlci5tYXBbcGF0aF07XG4gICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAvLyAgIF1cbiAgICAgICAgICAvLyB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnYXBwLmZzLmRpcicsIHtcbiAgICAgIHVybDogJy9kaXIvOnBhdGgnLFxuICAgICAgdmlld3M6IHtcbiAgICAgICAgJ0BhcHAnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2FwcCcsXG4gICAgICAgICAgY29udHJvbGxlcjogJ0ZzRGlyQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvY2xpZW50L2ZzL3ZpZXdzL2Rpci5odG1sJyxcbiAgICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgICBkaXI6IFsnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgICAgZnVuY3Rpb24oJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB1dGlscy5kZWNvZGVTdHJpbmcoJHN0YXRlUGFyYW1zLnBhdGgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3YXRjaGVyLm1hcFtwYXRoXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsIGRpciwgZmlsZVNlcnZpY2UpIHtcbiAgJHNjb3BlLmRpciA9IGRpcjtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCBzZXNzaW9uLCBmaWxlU2VydmljZSkge1xuICB2YXIgaXNVdGY4ID0gc2Vzc2lvbi5pc1V0Zjg7XG5cbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaWxlID0gbW9kZWwubWFwW3Nlc3Npb24ucGF0aF07XG5cbiAgLy8gZW5zdXJlIHRoZSBmaW5kZXIgaXMgc2V0IHRoZSB0aGUgcmlnaHQgZnNvXG4gICRzY29wZS5maW5kZXIuYWN0aXZlID0gZmlsZTtcblxuICAvLyBIYW5kbGUgdGhlIGNhc2Ugb2YgdGhlIGZpbGUgYmVpbmcgcmVtb3ZlZCBmcm9tIHJlY2VudEZpbGVzLlxuICAkc2NvcGUuJG9uKCdyZWNlbnQtcmVtb3ZlZCcsIGZ1bmN0aW9uKGUsIGRhdGEpIHtcbiAgICBpZiAoZGF0YS5wYXRoID09PSBmaWxlLnBhdGgpIHsgLy8gdGhpcyBzaG91bGQgYWx3YXlzIGJlIHRoZSBjYXNlXG4gICAgICBpZiAobW9kZWwucmVjZW50RmlsZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBtb3N0UmVjZW50RW50cnkgPSBtb2RlbC5yZWNlbnRGaWxlc1swXTtcbiAgICAgICAgdmFyIG1vc3RSZWNlbnRGaWxlID0gbW9kZWwubWFwW21vc3RSZWNlbnRFbnRyeS5wYXRoXTtcbiAgICAgICAgJHNjb3BlLmdvdG9GaWxlKG1vc3RSZWNlbnRGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRzY29wZS4kcGFyZW50LnNob3dFZGl0b3IgPSBmYWxzZTtcbiAgICAgICAgJHNjb3BlLmZpbmRlci5hY3RpdmUgPSBtb2RlbC5tYXBbZmlsZS5kaXJdO1xuICAgICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXInKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIG1vZGVsLmFkZFJlY2VudEZpbGUoZmlsZSk7XG5cbiAgZnVuY3Rpb24gaW1nQmxvYlVybCgpIHtcbiAgICAvLyBPYnRhaW4gYSBibG9iOiBVUkwgZm9yIHRoZSBpbWFnZSBkYXRhLlxuICAgIHZhciBhcnJheUJ1ZmZlclZpZXcgPSBuZXcgVWludDhBcnJheShzZXNzaW9uLmRhdGEpO1xuICAgIHZhciBibG9iID0gbmV3IEJsb2IoW2FycmF5QnVmZmVyVmlld10sIHtcbiAgICAgIHR5cGU6ICdpbWFnZS8nICsgZmlsZS5leHQuc3Vic3RyKDEpXG4gICAgfSk7XG4gICAgdmFyIHVybENyZWF0b3IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgdmFyIHVybCA9IHVybENyZWF0b3IuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICBpZiAoaXNVdGY4KSB7XG5cbiAgICAkc2NvcGUudmlld2VyID0gJ2FjZSc7XG4gICAgJHNjb3BlLiRwYXJlbnQuc2hvd0VkaXRvciA9IHRydWU7XG4gICAgJHNjb3BlLiRwYXJlbnQuZWRpdG9yU2Vzc2lvbiA9IHNlc3Npb24uZGF0YTtcblxuICAgIC8vIGlmIHRoZSBlZGl0b3IgZXhpc3RzLCBsb2FkIHRoZSBlZGl0U2Vzc2lvbiB3ZSBqdXN0IGFzc2lnbmVkXG4gICAgaWYgKCRzY29wZS4kcGFyZW50LmVkaXRvcikge1xuICAgICAgJHNjb3BlLiRwYXJlbnQubG9hZFNlc3Npb24oKTtcbiAgICB9XG5cbiAgfSBlbHNlIHtcblxuICAgICRzY29wZS52aWV3ZXIgPSAnJztcbiAgICAkc2NvcGUuJHBhcmVudC5zaG93RWRpdG9yID0gZmFsc2U7XG5cbiAgICBzd2l0Y2ggKGZpbGUuZXh0KSB7XG4gICAgICBjYXNlICcucG5nJzpcbiAgICAgIGNhc2UgJy5qcGcnOlxuICAgICAgY2FzZSAnLmpwZWcnOlxuICAgICAgY2FzZSAnLmdpZic6XG4gICAgICBjYXNlICcuaWNvJzpcbiAgICAgICAgJHNjb3BlLnZpZXdlciA9ICdpbWcnO1xuICAgICAgICAkc2NvcGUuaW1nVXJsID0gaW1nQmxvYlVybCgpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuXG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBGaW5kZXJNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9maW5kZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZSwgJGxvZywgZGlhbG9nLCBmaWxlU2VydmljZSwgcmVzcG9uc2VIYW5kbGVyKSB7XG5cbiAgdmFyIGV4cGFuZGVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuICAkc2NvcGUuc2hvd0VkaXRvciA9IGZhbHNlO1xuXG4gICRzY29wZS5hY2VMb2FkZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcblxuICAgICRzY29wZS5lZGl0b3IgPSBlZGl0b3I7XG5cbiAgICAvLyBsb2FkIHRoZSBlZGl0b3JTZXNzaW9uIGlmIG9uZSBoYXMgYWxyZWFkeSBiZWVuIGRlZmluZWQgKGxpa2UgaW4gY2hpbGQgY29udHJvbGxlciBGaWxlQ3RybClcbiAgICBpZiAoJHNjb3BlLmVkaXRvclNlc3Npb24pIHtcbiAgICAgICRzY29wZS5sb2FkU2Vzc2lvbigpO1xuICAgIH1cblxuICB9O1xuXG4gICRzY29wZS5sb2FkU2Vzc2lvbiA9IGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5lZGl0b3Iuc2V0U2Vzc2lvbigkc2NvcGUuZWRpdG9yU2Vzc2lvbik7XG4gIH07XG5cbiAgJHNjb3BlLmFjZUNoYW5nZWQgPSBmdW5jdGlvbihlZGl0b3IpIHtcbiAgICAvLyBEb24ndCByZW1vdmUgdGhpcy4gU2ltcGx5IGhhbmRsaW5nIHRoaXMgY2F1c2VzIHRoZSAkZGlnZXN0IHdlIHdhbnQgdG8gdXBkYXRlIHRoZSBVSVxuICAgIGNvbnNvbGUubG9nKCdGaW5kZXIgZWRpdG9yIGNoYW5nZWQnKTtcbiAgfTtcblxuICB2YXIgcGF0aCA9ICRzdGF0ZS5wYXJhbXMucGF0aCA/IHV0aWxzLmRlY29kZVN0cmluZygkc3RhdGUucGFyYW1zLnBhdGgpIDogbnVsbDtcbiAgdmFyIG1vZGVsID0gJHNjb3BlLm1vZGVsO1xuXG4gIHZhciBmaW5kZXIgPSBuZXcgRmluZGVyTW9kZWwocGF0aCA/IG1vZGVsLmxpc3QuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0ucGF0aCA9PT0gcGF0aDtcbiAgfSkgOiBtb2RlbC50cmVlKTtcblxuICAkc2NvcGUuZmluZGVyID0gZmluZGVyO1xuXG4gIGZ1bmN0aW9uIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLmNsaWNrTm9kZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZmluZGVyLmFjdGl2ZSA9IGZzbztcblxuICAgIGlmICghZnNvLmlzRGlyZWN0b3J5KSB7XG4gICAgICAkc3RhdGUuZ28oJ2FwcC5mcy5maW5kZXIuZmlsZScsIHtcbiAgICAgICAgcGF0aDogdXRpbHMuZW5jb2RlU3RyaW5nKGZzby5wYXRoKVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gICRzY29wZS5kZWxldGUgPSBmdW5jdGlvbihmc28pIHtcblxuICAgIGRpYWxvZy5jb25maXJtKHtcbiAgICAgIHRpdGxlOiAnRGVsZXRlICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ0RlbGV0ZSBbJyArIGZzby5uYW1lICsgJ10uIEFyZSB5b3Ugc3VyZT8nXG4gICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVtb3ZlKGZzby5wYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnRGVsZXRlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnJlbmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ1JlbmFtZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgYSBuZXcgbmFtZScsXG4gICAgICBkZWZhdWx0VmFsdWU6IGZzby5uYW1lLFxuICAgICAgcGxhY2Vob2xkZXI6IGZzby5pc0RpcmVjdG9yeSA/ICdGb2xkZXIgbmFtZScgOiAnRmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBvbGRQYXRoID0gZnNvLnBhdGg7XG4gICAgICB2YXIgbmV3UGF0aCA9IHAucmVzb2x2ZShmc28uZGlyLCB2YWx1ZSk7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShvbGRQYXRoLCBuZXdQYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGZzbykge1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBmaWxlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZGlyID0gZnVuY3Rpb24oZnNvKSB7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmb2xkZXInLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGb2xkZXIgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZm9sZGVyIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2RpcihwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZGlyZWN0b3J5IG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnBhc3RlID0gZnVuY3Rpb24oZnNvKSB7XG5cbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIgJiYgYWN0aXZlLmlzRGlyZWN0b3J5KSB7XG4gICAgICBpZiAoIXBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlLnBhdGgudG9Mb3dlckNhc2UoKS5pbmRleE9mKHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCkpICE9PSAwKSB7IC8vIGRpc2FsbG93IHBhc3RpbmcgaW50byBzZWxmIG9yIGEgZGVjZW5kZW50XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZnNvLCBvcCkge1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigkc2NvcGUpIHtcblxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUpIHtcbiAgJHNjb3BlLm1vZGVsLnEgPSAkc3RhdGUucGFyYW1zLnE7XG59O1xuIiwidmFyIHAgPSByZXF1aXJlKCdwYXRoJyk7XG52YXIgZmlsZXN5c3RlbSA9IHJlcXVpcmUoJy4uLy4uL2ZpbGUtc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWwsICRsb2csIGRpYWxvZywgcmVzcG9uc2VIYW5kbGVyKSB7XG5cbiAgdmFyIGV4cGFuZGVkID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICAkc2NvcGUudHJlZURhdGEgPSB7XG4gICAgc2hvd01lbnU6IGZhbHNlXG4gIH07XG4gICRzY29wZS5hY3RpdmUgPSBudWxsO1xuICAkc2NvcGUucGFzdGVCdWZmZXIgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIGdlbmVyaWNGaWxlU3lzdGVtQ2FsbGJhY2socmVzcG9uc2UpIHtcbiAgICAvLyBub3RpZnkgb2YgYW55IGVycm9ycywgb3RoZXJ3aXNlIHNpbGVudC5cbiAgICAvLyBUaGUgRmlsZSBTeXN0ZW0gV2F0Y2hlciB3aWxsIGhhbmRsZSB0aGUgc3RhdGUgY2hhbmdlcyBpbiB0aGUgZmlsZSBzeXN0ZW1cbiAgICBpZiAocmVzcG9uc2UuZXJyKSB7XG4gICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICB0aXRsZTogJ0ZpbGUgU3lzdGVtIEVycm9yJyxcbiAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UuZXJyKVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgJHNjb3BlLmdldENsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICAgIHZhciBjbGFzc2VzID0gWydmc28nXTtcbiAgICBjbGFzc2VzLnB1c2goZnNvLmlzRGlyZWN0b3J5ID8gJ2RpcicgOiAnZmlsZScpO1xuXG4gICAgaWYgKGZzbyA9PT0gJHNjb3BlLmFjdGl2ZSkge1xuICAgICAgY2xhc3Nlcy5wdXNoKCdhY3RpdmUnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gIH07XG5cbiAgJHNjb3BlLmdldEljb25DbGFzc05hbWUgPSBmdW5jdGlvbihmc28pIHtcbiAgICB2YXIgY2xhc3NlcyA9IFsnZmEnXTtcblxuICAgIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAgIGNsYXNzZXMucHVzaCgkc2NvcGUuaXNFeHBhbmRlZChmc28pID8gJ2ZhLWZvbGRlci1vcGVuJyA6ICdmYS1mb2xkZXInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2xhc3Nlcy5wdXNoKCdmYS1maWxlLW8nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3Nlcy5qb2luKCcgJyk7XG4gIH07XG5cbiAgJHNjb3BlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihmc28pIHtcbiAgICByZXR1cm4gISFleHBhbmRlZFtmc28ucGF0aF07XG4gIH07XG5cbiAgJHNjb3BlLnJpZ2h0Q2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgY29uc29sZS5sb2coJ1JDbGlja2VkICcgKyBmc28ubmFtZSk7XG4gICAgJHNjb3BlLm1lbnVYID0gZS5wYWdlWDtcbiAgICAkc2NvcGUubWVudVkgPSBlLnBhZ2VZO1xuICAgICRzY29wZS5hY3RpdmUgPSBmc287XG4gICAgJHNjb3BlLnRyZWVEYXRhLnNob3dNZW51ID0gdHJ1ZTtcbiAgfTtcblxuICAkc2NvcGUuY2xpY2tOb2RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAkc2NvcGUuYWN0aXZlID0gZnNvO1xuXG4gICAgaWYgKGZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgdmFyIGlzRXhwYW5kZWQgPSAkc2NvcGUuaXNFeHBhbmRlZChmc28pO1xuICAgICAgaWYgKGlzRXhwYW5kZWQpIHtcbiAgICAgICAgZGVsZXRlIGV4cGFuZGVkW2Zzby5wYXRoXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4cGFuZGVkW2Zzby5wYXRoXSA9IHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICRzY29wZS5vcGVuKGZzbyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9O1xuXG4gICRzY29wZS5kZWxldGUgPSBmdW5jdGlvbihlLCBmc28pIHtcblxuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIGRpYWxvZy5jb25maXJtKHtcbiAgICAgIHRpdGxlOiAnRGVsZXRlICcgKyAoZnNvLmlzRGlyZWN0b3J5ID8gJ2ZvbGRlcicgOiAnZmlsZScpLFxuICAgICAgbWVzc2FnZTogJ0RlbGV0ZSBbJyArIGZzby5uYW1lICsgJ10uIEFyZSB5b3Ugc3VyZT8nXG4gICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVtb3ZlKGZzby5wYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnRGVsZXRlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnJlbmFtZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ1JlbmFtZSAnICsgKGZzby5pc0RpcmVjdG9yeSA/ICdmb2xkZXInIDogJ2ZpbGUnKSxcbiAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgZW50ZXIgYSBuZXcgbmFtZScsXG4gICAgICBkZWZhdWx0VmFsdWU6IGZzby5uYW1lLFxuICAgICAgcGxhY2Vob2xkZXI6IGZzby5pc0RpcmVjdG9yeSA/ICdGb2xkZXIgbmFtZScgOiAnRmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHZhciBvbGRQYXRoID0gZnNvLnBhdGg7XG4gICAgICB2YXIgbmV3UGF0aCA9IHAucmVzb2x2ZShmc28uZGlyLCB2YWx1ZSk7XG4gICAgICBmaWxlc3lzdGVtLnJlbmFtZShvbGRQYXRoLCBuZXdQYXRoLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnUmVuYW1lIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZmlsZSA9IGZ1bmN0aW9uKGUsIGZzbykge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZGlhbG9nLnByb21wdCh7XG4gICAgICB0aXRsZTogJ0FkZCBuZXcgZmlsZScsXG4gICAgICBwbGFjZWhvbGRlcjogJ0ZpbGUgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZmlsZSBuYW1lJ1xuICAgIH0pLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGZpbGVzeXN0ZW0ubWtmaWxlKHAucmVzb2x2ZShmc28ucGF0aCwgdmFsdWUpLCBnZW5lcmljRmlsZVN5c3RlbUNhbGxiYWNrKTtcbiAgICB9LCBmdW5jdGlvbigpIHtcbiAgICAgICRsb2cuaW5mbygnTWFrZSBmaWxlIG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLm1rZGlyID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBkaWFsb2cucHJvbXB0KHtcbiAgICAgIHRpdGxlOiAnQWRkIG5ldyBmb2xkZXInLFxuICAgICAgcGxhY2Vob2xkZXI6ICdGb2xkZXIgbmFtZScsXG4gICAgICBtZXNzYWdlOiAnUGxlYXNlIGVudGVyIHRoZSBuZXcgZm9sZGVyIG5hbWUnXG4gICAgfSkudGhlbihmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgZmlsZXN5c3RlbS5ta2RpcihwLnJlc29sdmUoZnNvLnBhdGgsIHZhbHVlKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAkbG9nLmluZm8oJ01ha2UgZGlyZWN0b3J5IG1vZGFsIGRpc21pc3NlZCcpO1xuICAgIH0pO1xuXG4gIH07XG5cbiAgJHNjb3BlLnBhc3RlID0gZnVuY3Rpb24oZSwgZnNvKSB7XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIub3AgPT09ICdjb3B5Jykge1xuICAgICAgZmlsZXN5c3RlbS5jb3B5KHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChwYXN0ZUJ1ZmZlci5vcCA9PT0gJ2N1dCcpIHtcbiAgICAgIGZpbGVzeXN0ZW0ucmVuYW1lKHBhc3RlQnVmZmVyLmZzby5wYXRoLCBwLnJlc29sdmUoZnNvLnBhdGgsIHBhc3RlQnVmZmVyLmZzby5uYW1lKSwgZ2VuZXJpY0ZpbGVTeXN0ZW1DYWxsYmFjayk7XG4gICAgfVxuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0gbnVsbDtcblxuICB9O1xuXG4gICRzY29wZS5zaG93UGFzdGUgPSBmdW5jdGlvbihlLCBhY3RpdmUpIHtcbiAgICB2YXIgcGFzdGVCdWZmZXIgPSAkc2NvcGUucGFzdGVCdWZmZXI7XG5cbiAgICBpZiAocGFzdGVCdWZmZXIgJiYgYWN0aXZlLmlzRGlyZWN0b3J5KSB7XG4gICAgICBpZiAoIXBhc3RlQnVmZmVyLmZzby5pc0RpcmVjdG9yeSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSBpZiAoYWN0aXZlLnBhdGgudG9Mb3dlckNhc2UoKS5pbmRleE9mKHBhc3RlQnVmZmVyLmZzby5wYXRoLnRvTG93ZXJDYXNlKCkpICE9PSAwKSB7IC8vIGRpc2FsbG93IHBhc3RpbmcgaW50byBzZWxmIG9yIGEgZGVjZW5kZW50XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG5cbiAgJHNjb3BlLnNldFBhc3RlQnVmZmVyID0gZnVuY3Rpb24oZSwgZnNvLCBvcCkge1xuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgJHNjb3BlLnBhc3RlQnVmZmVyID0ge1xuICAgICAgZnNvOiBmc28sXG4gICAgICBvcDogb3BcbiAgICB9O1xuXG4gIH07XG5cbn07XG4iLCJ2YXIgbW9kID0gcmVxdWlyZSgnLi9tb2R1bGUnKTtcblxubW9kLmNvbmZpZyhbXG4gICckc3RhdGVQcm92aWRlcicsXG4gIHJlcXVpcmUoJy4vY29uZmlnJylcbl0pO1xuXG5tb2Quc2VydmljZSgnU2Vzc2lvblNlcnZpY2UnLCBbXG4gIHJlcXVpcmUoJy4vc2VydmljZXMvc2Vzc2lvbicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzQ3RybCcsIFtcbiAgJyRzY29wZScsXG4gIHJlcXVpcmUoJy4vY29udHJvbGxlcnMnKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0ZpbmRlckN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJyRsb2cnLFxuICAnRGlhbG9nU2VydmljZScsXG4gICdGaWxlU2VydmljZScsXG4gICdSZXNwb25zZUhhbmRsZXInLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2ZpbmRlcicpXG5dKTtcblxubW9kLmNvbnRyb2xsZXIoJ0ZzRmlsZUN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgJ3Nlc3Npb24nLFxuICAnRmlsZVNlcnZpY2UnLFxuICByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2ZpbGUnKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc1NlYXJjaEN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnJHN0YXRlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9zZWFyY2gnKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc0RpckN0cmwnLCBbXG4gICckc2NvcGUnLFxuICAnZGlyJyxcbiAgJ0ZpbGVTZXJ2aWNlJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy9kaXInKVxuXSk7XG5cbm1vZC5jb250cm9sbGVyKCdGc1RyZWVDdHJsJywgW1xuICAnJHNjb3BlJyxcbiAgJyRtb2RhbCcsXG4gICckbG9nJyxcbiAgJ0RpYWxvZ1NlcnZpY2UnLFxuICAnUmVzcG9uc2VIYW5kbGVyJyxcbiAgcmVxdWlyZSgnLi9jb250cm9sbGVycy90cmVlJylcbl0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1vZDtcbiIsImZ1bmN0aW9uIEZpbmRlck1vZGVsKGFjdGl2ZSkge1xuICAvLyB0aGlzLnRyZWUgPSB0cmVlO1xuICB0aGlzLmFjdGl2ZSA9IGFjdGl2ZTtcbn1cbkZpbmRlck1vZGVsLnByb3RvdHlwZS5fcmVhZENvbHMgPSBmdW5jdGlvbih0cmVlKSB7XG5cbiAgLy92YXIgdHJlZSA9IHRoaXMuX3RyZWU7XG4gIHZhciBhY3RpdmUgPSB0aGlzLl9hY3RpdmU7XG4gIC8vdmFyIGFjdGl2ZUlzRGlyID0gYWN0aXZlLmlzRGlyZWN0b3J5O1xuXG4gIHZhciBjb2xzID0gW107XG5cbiAgaWYgKGFjdGl2ZSkge1xuXG4gICAgdmFyIGN1cnIgPSBhY3RpdmUuaXNEaXJlY3RvcnkgPyBhY3RpdmUgOiBhY3RpdmUucGFyZW50O1xuICAgIGRvIHtcbiAgICAgIGNvbHMudW5zaGlmdChjdXJyLmNoaWxkcmVuKTtcbiAgICAgIGN1cnIgPSBjdXJyLnBhcmVudDtcbiAgICB9IHdoaWxlIChjdXJyKTtcblxuICAgIGNvbHMuc2hpZnQoKTtcblxuICB9IGVsc2Uge1xuICAgIGNvbHMucHVzaCh0cmVlLmNoaWxkcmVuKTtcbiAgfVxuXG4gIHJldHVybiBjb2xzO1xuXG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmdldENsYXNzTmFtZSA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgY2xhc3NlcyA9IFsnZnNvJ107XG4gIGNsYXNzZXMucHVzaChmc28uaXNEaXJlY3RvcnkgPyAnZGlyJyA6ICdmaWxlJyk7XG5cbiAgaWYgKGZzbyA9PT0gdGhpcy5hY3RpdmUpIHtcbiAgICBjbGFzc2VzLnB1c2goJ2FjdGl2ZScpO1xuICB9XG5cbiAgcmV0dXJuIGNsYXNzZXMuam9pbignICcpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5nZXRJY29uQ2xhc3NOYW1lID0gZnVuY3Rpb24oZnNvKSB7XG4gIHZhciBjbGFzc2VzID0gWydmYSddO1xuXG4gIGlmIChmc28uaXNEaXJlY3RvcnkpIHtcbiAgICBjbGFzc2VzLnB1c2godGhpcy5pc0V4cGFuZGVkKGZzbykgPyAnZmEtZm9sZGVyLW9wZW4tbycgOiAnZmEtZm9sZGVyLW8nKTtcbiAgfSBlbHNlIHtcbiAgICBjbGFzc2VzLnB1c2goJ2ZhLWZpbGUnKTtcbiAgfVxuXG4gIHJldHVybiBjbGFzc2VzLmpvaW4oJyAnKTtcbn07XG5GaW5kZXJNb2RlbC5wcm90b3R5cGUuaXNIaWdobGlnaHRlZCA9IGZ1bmN0aW9uKGZzbykge1xuICB2YXIgYWN0aXZlID0gdGhpcy5fYWN0aXZlO1xuICB2YXIgaXNIaWdobGlnaHRlZCA9IGZhbHNlO1xuXG4gIGlmIChmc28gPT09IGFjdGl2ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGFjdGl2ZSAmJiBmc28uaXNEaXJlY3RvcnkpIHtcbiAgICAvLyBjaGVjayBpZiBpdCBpcyBhbiBhbmNlc3RvclxuICAgIHZhciByID0gYWN0aXZlO1xuICAgIHdoaWxlIChyLnBhcmVudCkge1xuICAgICAgaWYgKHIgPT09IGZzbykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHIgPSByLnBhcmVudDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuRmluZGVyTW9kZWwucHJvdG90eXBlLmlzRXhwYW5kZWQgPSBmdW5jdGlvbihkaXIpIHtcbiAgcmV0dXJuIHRoaXMuaXNIaWdobGlnaHRlZChkaXIpO1xufTtcbkZpbmRlck1vZGVsLnByb3RvdHlwZS5jb2xzID0gZnVuY3Rpb24odHJlZSkge1xuICByZXR1cm4gdGhpcy5fcmVhZENvbHModHJlZSk7XG59O1xuXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEZpbmRlck1vZGVsLnByb3RvdHlwZSwge1xuICBhY3RpdmU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHRoaXMuX2FjdGl2ZSA9IHZhbHVlO1xuICAgICAgaWYgKHRoaXMuX2FjdGl2ZS5pc0ZpbGUpIHtcbiAgICAgICAgdGhpcy5fYWN0aXZlRmlsZSA9IHRoaXMuX2FjdGl2ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGFjdGl2ZUZpbGU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2FjdGl2ZUZpbGU7XG4gICAgfVxuICB9XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEZpbmRlck1vZGVsO1xuIiwiZnVuY3Rpb24gU2Vzc2lvbihkYXRhKSB7XG4gIGRhdGEgPSBkYXRhIHx8IHt9O1xuICB0aGlzLnBhdGggPSBkYXRhLnBhdGg7XG4gIHRoaXMudGltZSA9IGRhdGEudGltZTtcbiAgdGhpcy5kYXRhID0gZGF0YS5kYXRhIHx8IHt9O1xuICB0aGlzLmlzVXRmOCA9IGRhdGEuaXNVdGY4O1xufVxuU2Vzc2lvbi5wcm90b3R5cGUubWFya0NsZWFuID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIpIHtcbiAgICB0aGlzLmRhdGEuZ2V0VW5kb01hbmFnZXIoKS5tYXJrQ2xlYW4oKTtcbiAgfVxufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNlc3Npb24ucHJvdG90eXBlLCB7XG4gIGlzRGlydHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZGF0YS5nZXRVbmRvTWFuYWdlcikge1xuICAgICAgICByZXR1cm4gIXRoaXMuZGF0YS5nZXRVbmRvTWFuYWdlcigpLmlzQ2xlYW4oKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xubW9kdWxlLmV4cG9ydHMgPSBTZXNzaW9uO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhbmd1bGFyLm1vZHVsZSgnZnMnLCBbXSk7XG4iLCJ2YXIgU2Vzc2lvbiA9IHJlcXVpcmUoJy4uL21vZGVscy9zZXNzaW9uJyk7XG52YXIgZnN3ID0gcmVxdWlyZSgnLi4vLi4vZmlsZS1zeXN0ZW0td2F0Y2hlcicpO1xuXG52YXIgU2Vzc2lvbnMgPSBmdW5jdGlvbihtYXApIHtcbiAgdGhpcy5fc2Vzc2lvbnMgPSBbXTtcbiAgdGhpcy5fbWFwID0gbWFwO1xufTtcblNlc3Npb25zLnByb3RvdHlwZS5maW5kU2Vzc2lvbiA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHNlc3Npb25zID0gdGhpcy5fc2Vzc2lvbnM7XG5cbiAgcmV0dXJuIHNlc3Npb25zLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLnBhdGggPT09IHBhdGg7XG4gIH0pO1xuXG59O1xuU2Vzc2lvbnMucHJvdG90eXBlLmFkZFNlc3Npb24gPSBmdW5jdGlvbihwYXRoLCBkYXRhLCBpc1V0ZjgpIHtcblxuICBpZiAodGhpcy5maW5kU2Vzc2lvbihwYXRoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignU2Vzc2lvbiBmb3IgcGF0aCBleGlzdHMgYWxyZWFkeS4nKTtcbiAgfVxuXG4gIHZhciBzZXNzaW9ucyA9IHRoaXMuX3Nlc3Npb25zO1xuICB2YXIgc2Vzc2lvbiA9IG5ldyBTZXNzaW9uKHtcbiAgICBwYXRoOiBwYXRoLFxuICAgIHRpbWU6IERhdGUubm93KCksXG4gICAgZGF0YTogZGF0YSxcbiAgICBpc1V0Zjg6IGlzVXRmOFxuICB9KTtcbiAgc2Vzc2lvbnMudW5zaGlmdChzZXNzaW9uKTtcblxuICByZXR1cm4gc2Vzc2lvbjtcbn07XG5TZXNzaW9ucy5wcm90b3R5cGUucmVtb3ZlU2Vzc2lvbiA9IGZ1bmN0aW9uKHNlc3Npb24pIHtcblxuICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcblxuICB2YXIgaWR4ID0gc2Vzc2lvbnMuaW5kZXhPZihzZXNzaW9uKTtcbiAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICBzZXNzaW9ucy5zcGxpY2UoaWR4LCAxKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNlc3Npb25zLnByb3RvdHlwZSwge1xuICBzZXNzaW9uczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcbiAgICAgIHJldHVybiBzZXNzaW9ucztcbiAgICAgIC8vIHZhciBtYXAgPSB0aGlzLl9tYXA7XG4gICAgICAvL1xuICAgICAgLy8gLy8gY2xlYW4gYW55IGZpbGVzIHRoYXQgbWF5IG5vIGxvbmdlciBleGlzdFxuICAgICAgLy8gLy8gdmFyIGkgPSBzZXNzaW9ucy5sZW5ndGg7XG4gICAgICAvLyAvLyB3aGlsZSAoaS0tKSB7XG4gICAgICAvLyAvLyAgIGlmICghbWFwW3Nlc3Npb25zW2ldLnBhdGhdKSB7XG4gICAgICAvLyAvLyAgICAgc2Vzc2lvbnMuc3BsaWNlKGksIDEpO1xuICAgICAgLy8gLy8gICB9XG4gICAgICAvLyAvLyB9XG4gICAgICAvL1xuICAgICAgLy8gcmV0dXJuIHNlc3Npb25zLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAvLyAgIHJldHVybiBtYXBbaXRlbS5wYXRoXTtcbiAgICAgIC8vIH0sIHRoaXMpO1xuXG4gICAgfVxuICB9LFxuICBkaXJ0eToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2Vzc2lvbnMgPSB0aGlzLl9zZXNzaW9ucztcbiAgICAgIHJldHVybiB0aGlzLnNlc3Npb25zLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLmlzRGlydHk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuXG5cbi8qXG4gKiBtb2R1bGUgZXhwb3J0c1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBzZXNzaW9ucyA9IG5ldyBTZXNzaW9ucyhmc3cubWFwKTtcbiAgcmV0dXJuIHNlc3Npb25zO1xuXG59O1xuIiwiXG5cbndpbmRvdy5hcHAgPSByZXF1aXJlKCcuL2FwcCcpO1xuXG5cbi8vd2luZG93LmZzID0gcmVxdWlyZSgnLi9mcycpO1xuXG4vLyAvLyAqKioqKioqKioqLy8qXG4vLyAvLyBTaGltc1xuLy8gLy8gKioqKioqKioqKipcbnJlcXVpcmUoJy4vYXJyYXknKTtcbi8vXG4vLyAvLyAqKioqKioqKioqKlxuLy8gLy8gRGlyZWN0aXZlc1xuLy8gLy8gKioqKioqKioqKipcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvbmVnYXRlJyk7XG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL2ZvY3VzJyk7XG4vLyByZXF1aXJlKCcuL2FwcC9kaXJlY3RpdmVzL2RiLWRpYWdyYW0nKTtcbi8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvcmlnaHQtY2xpY2snKTtcbi8vIC8vIHJlcXVpcmUoJy4vYXBwL2RpcmVjdGl2ZXMvYmVoYXZlJyk7XG4vL1xuLy9cbi8vIC8vICoqKioqKioqKioqXG4vLyAvLyBDb250cm9sbGVyc1xuLy8gLy8gKioqKioqKioqKipcbi8vXG4vLyAvLyBkaWFsb2cgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvY29uZmlybScpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9hbGVydCcpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9wcm9tcHQnKTtcbi8vXG4vLyAvLyBob21lIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvaG9tZScpO1xuLy8gcmVxdWlyZSgnLi9ob21lL2NvbnRyb2xsZXJzL3RyZWUnKTtcbi8vIHJlcXVpcmUoJy4vaG9tZS9jb250cm9sbGVycy9maWxlJyk7XG4vLyByZXF1aXJlKCcuL2hvbWUvY29udHJvbGxlcnMvZmluZGVyJyk7XG4vL1xuLy8gLy8gZGIgbW9kZWwgY29udHJvbGxlcnNcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMva2V5Jyk7XG4vLyByZXF1aXJlKCcuL2NvbnRyb2xsZXJzL2FycmF5LWRlZicpO1xuLy8gcmVxdWlyZSgnLi9jb250cm9sbGVycy9zY2hlbWEnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvbW9kZWwnKTtcbi8vIHJlcXVpcmUoJy4vY29udHJvbGxlcnMvZGInKTtcbi8vXG4vL1xuLy8gLy8gYXBpIG1vZGVsIGNvbnRyb2xsZXJzXG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9hcGknKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXInKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2hhbmRsZXInKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL3JvdXRlJyk7XG4vLyByZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9hY3Rpb24nKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2RpYWdyYW0nKTtcbi8vIHJlcXVpcmUoJy4vYXBpL2NvbnRyb2xsZXJzL2FkZC1yZXNvdXJjZScpO1xuLy9cbi8vXG4vLyAvLyBtYWluIGFwcCBjb250cm9sbGVyXG4vLyByZXF1aXJlKCcuL2FwcC9jb250cm9sbGVycy9hcHAnKTtcbi8vXG4vL1xuLy8gLy8gKioqKioqKioqKipcbi8vIC8vIFNlcnZpY2VzXG4vLyAvLyAqKioqKioqKioqKlxuLy8gcmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKTtcbiIsInZhciBwID0gcmVxdWlyZSgncGF0aCcpO1xuXG52YXIgRmlsZVN5c3RlbU9iamVjdCA9IGZ1bmN0aW9uKHBhdGgsIHN0YXQpIHtcbiAgdGhpcy5uYW1lID0gcC5iYXNlbmFtZShwYXRoKSB8fCBwYXRoO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLmRpciA9IHAuZGlybmFtZShwYXRoKTtcbiAgdGhpcy5pc0RpcmVjdG9yeSA9IHR5cGVvZiBzdGF0ID09PSAnYm9vbGVhbicgPyBzdGF0IDogc3RhdC5pc0RpcmVjdG9yeSgpO1xuICB0aGlzLmV4dCA9IHAuZXh0bmFtZShwYXRoKTtcbiAgdGhpcy5zdGF0ID0gc3RhdDtcbn07XG5GaWxlU3lzdGVtT2JqZWN0LnByb3RvdHlwZSA9IHtcbiAgZ2V0IGlzRmlsZSgpIHtcbiAgICByZXR1cm4gIXRoaXMuaXNEaXJlY3Rvcnk7XG4gIH1cbn07XG5tb2R1bGUuZXhwb3J0cyA9IEZpbGVTeXN0ZW1PYmplY3Q7XG4iLCIvKiBnbG9iYWwgZGlhbG9nICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBybmRzdHI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbiAgfSxcbiAgZ2V0dWlkOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoTWF0aC5yYW5kb20oKSAqIDFlNykpLnRvU3RyaW5nKCk7XG4gIH0sXG4gIGdldHVpZHN0cjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xuICB9LFxuICB1cmxSb290OiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XG4gICAgcmV0dXJuIGxvY2F0aW9uLnByb3RvY29sICsgJy8vJyArIGxvY2F0aW9uLmhvc3Q7XG4gIH0sXG4gIGVuY29kZVN0cmluZzogZnVuY3Rpb24oc3RyKSB7XG4gICAgcmV0dXJuIGJ0b2EoZW5jb2RlVVJJQ29tcG9uZW50KHN0cikpO1xuICB9LFxuICBkZWNvZGVTdHJpbmc6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoYXRvYihzdHIpKTtcbiAgfSxcbiAgZXh0ZW5kOiBmdW5jdGlvbiBleHRlbmQob3JpZ2luLCBhZGQpIHtcbiAgICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gICAgaWYgKCFhZGQgfHwgdHlwZW9mIGFkZCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBvcmlnaW47XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICAgIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ2luO1xuICB9LFxuICB1aToge1xuICAgIHJlc3BvbnNlSGFuZGxlcjogZnVuY3Rpb24oZm4pIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbihyc3AsIHNob3dFcnJvcikge1xuICAgICAgICBzaG93RXJyb3IgPSBzaG93RXJyb3IgfHwgdHJ1ZTtcbiAgICAgICAgaWYgKHJzcC5lcnIpIHtcbiAgICAgICAgICBpZiAoc2hvd0Vycm9yKSB7XG4gICAgICAgICAgICBkaWFsb2cuYWxlcnQoe1xuICAgICAgICAgICAgICB0aXRsZTogJ0Vycm9yJyxcbiAgICAgICAgICAgICAgbWVzc2FnZTogSlNPTi5zdHJpbmdpZnkocnNwLmVycilcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmbihyc3AuZGF0YSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICB9XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInErNjRmd1wiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
