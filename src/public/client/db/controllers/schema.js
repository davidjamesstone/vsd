module.exports = function($scope) {

  $scope.schema = $scope.dbFinder.schema;

  $scope.$watch('dbFinder.schema', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }

    $scope.schema = $scope.dbFinder.schema;

  });
  
};