app.controller('ApiHandlerCtrl', ['$scope', '$state', '$stateParams',
  function($scope, $state, $stateParams) {

    var handler = $scope.api.findHandler($stateParams.handlerId);

    $scope.handler = handler;

    // $scope.addController = function() {
    //   var newController = controller.addController();
    //
    //   $state.go('api.controller', {
    //     controllerId: newController.id
    //   });
    // };

    // $scope.addRoute = function() {
    //   var newRoute = controller.addRoute();
    //
    //   $state.go('api.controller.route', {
    //     routeId: newRoute.id
    //   });
    // };

    // $scope.tabs = [{
    //   active: $scope.controllerTabIndex === 0
    // }, {
    //   active: $scope.controllerTabIndex === 1
    // }, {
    //   active: $scope.controllerTabIndex === 2
    // }, {
    //   active: $scope.controllerTabIndex === 3
    // }];
    //
    // $scope.selectTab = function(index) {
    //   $scope.$parent.controllerTabIndex = index;
    // };

  }
]);
