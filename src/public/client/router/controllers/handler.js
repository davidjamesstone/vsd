module.exports = function($scope, $state, $stateParams) {

  var handler = $scope.router.findHandler($stateParams.handlerId);

  $scope.handler = handler;

  // $scope.addController = function() {
  //   var newController = controller.addController();
  //
  //   $state.go('router.controller', {
  //     controllerId: newController.id
  //   });
  // };

  // $scope.addRoute = function() {
  //   var newRoute = controller.addRoute();
  //
  //   $state.go('router.controller.route', {
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

};