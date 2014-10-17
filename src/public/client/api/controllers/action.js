app.controller('ApiActionCtrl', ['$scope', '$state', '$stateParams', 'dialog',
  function($scope, $state, $stateParams, $dialog) {

    var action = $scope.api.findAction($stateParams.actionId);

    $scope.action = action;

    $scope.showAction = function(action) {
      $scope.currentAction = action;
    };

    $scope.deleteAction = function(route) {

      $dialog.confirm({
        title: 'Delete Route',
        message: 'Are you sure you want to delete action [' + action.url + ']?'
      }).then(function() {
        var route = action.route;
        //parent.removeChild(route);
        // go to parent
        $state.go('api.route', {
          routeId: route.id
        });
      });

    };

  }
]);
