var Route = require('vsd-router-model').Route;
var AddResource = require('../models/add-resource');

module.exports = function($scope, $modalInstance, data) {

  var route = data.route;
  var model = new AddResource('', route);

  $scope.model = model;

  $scope.$watch('model.location', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }
    
    for (var i = 0; i < model.actions.length; i++) {
      var action = model.actions[i];
      var currentLocation = action.handlers[0].location;
      if (!currentLocation || currentLocation === oldValue) {
        action.handlers[0].location = newValue;
      }
    }
    
  });

  $scope.ok = function() {
    $modalInstance.close(model);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};