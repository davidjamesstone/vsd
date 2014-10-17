app.controller('PromptCtrl', ['$scope', '$modalInstance', 'data',
  function($scope, $modalInstance, data) {

    $scope.title = data.title;
    $scope.message = data.message;
    $scope.placeholder = data.placeholder;
    $scope.input = {
      value: data.defaultValue
    };

    $scope.ok = function() {
      $modalInstance.close($scope.input.value);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  }
]);
