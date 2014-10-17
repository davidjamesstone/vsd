var Controller = require('../models/controller');
var Route = require('../models/route');
var AddResource = require('../models/add-resource');

app.controller('ApiAddResourceCtrl', ['$scope', '$modalInstance', 'data',
  function($scope, $modalInstance, data) {

    var route = data.route;
    var model = new AddResource('', route);

    $scope.model = model;

    $scope.ok = function() {
      $modalInstance.close(model);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  }
]);
