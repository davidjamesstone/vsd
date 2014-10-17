var AppModel = require('../models/app');
var FileSystemObject = require('../../../../shared/file-system-object');

module.exports = function($scope, $state, fs, watcher, FileService, dialog) {

  watcher.on('change', function() {
    $scope.$apply();
  });

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

};
