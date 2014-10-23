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
