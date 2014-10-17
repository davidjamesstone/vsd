app.controller('ApiControllerCtrl', ['$scope', '$state', '$stateParams',
  function($scope, $state, $stateParams) {

    var controller = $scope.api.findController($stateParams.controllerId);

    $scope.controller = controller;

    $scope.addHandler = function() {
      var newHandler = controller.addHandler({
        name: '',
        code: 'function(req, res) {\n}'
      });

      $state.go('api.controller.item.handler', {
        handlerId: newHandler.id
      });
    };

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
