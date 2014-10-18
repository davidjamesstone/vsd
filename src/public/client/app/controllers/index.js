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
