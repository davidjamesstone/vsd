module.exports = function($scope, $modalInstance, data) {
  $scope.title = data.title;
  $scope.message = data.message;
  $scope.okButtonText = data.okButtonText || 'OK';
  $scope.cancelButtonText = data.cancelButtonText || 'Cancel';

  $scope.ok = function() {
    $modalInstance.close();
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};
