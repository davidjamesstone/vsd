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
