app.controller('SchemaCtrl', ['$scope', '$stateParams',
  function($scope, $stateParams) {
    $scope.schema = $scope.model.getSchemaById($stateParams.schemaId);
  }
]);
