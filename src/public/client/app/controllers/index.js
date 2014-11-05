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