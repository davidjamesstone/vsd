app.controller('ApiRouteCtrl', ['$scope', '$stateParams',
  function($scope, $stateParams) {

    $scope.route = $scope.api.findRoute($stateParams.routeId);

  }
]);
