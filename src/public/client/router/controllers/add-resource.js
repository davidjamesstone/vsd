var Route = require('vsd-router-model').Route;
var AddResource = require('../models/add-resource');

module.exports = function($scope, $modalInstance, data) {

  var route = data.route;
  var model = new AddResource('', route);

  $scope.model = model;

  $scope.ok = function() {
    $modalInstance.close(model);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};