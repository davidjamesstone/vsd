module.exports = function($scope, $state, $stateParams, $timeout, dialog) {

  // var action = $scope.router.findAction($stateParams.actionId);

  // $scope.action = action;

  // $scope.showAction = function(action) {
  //   $scope.currentAction = action;
  // };

  var action = $scope.action;
    
  $scope.deleteAction = function() {

    dialog.confirm({
      title: 'Delete Action',
      message: 'Are you sure you want to delete action [' + action.url + ']?'
    }).then(function() {
      var route = action.route;
      route.removeAction(action);
      // go to route
      $state.go('app.fs.finder.file.router.home.route.item', {
        routeId: route.id
      });
    });

  };


  var timeoutPromise;
  $scope.focusHandler = function(handler) {
    console.log('focus');
    $scope.$parent.$parent.activeAction = action;
    if (handler) {
      if (timeoutPromise) {
        $timeout.cancel(timeoutPromise);
      }
      
      $scope.activeHandler = handler;
    } else {
      $scope.activeHandler = null;
    }
  };

  $scope.blurHandler = function() {
    console.log('blur');
    timeoutPromise = $timeout(function() {
      $scope.activeHandler = null;
    }, 250);
  };
};