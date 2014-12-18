var Router = require('vsd-router-model').Router;
var path = require('path');

module.exports = function($scope, $state, $dialog) {

  // Router uses the 'ace' session for now as a way
  // to back data and fit in with the way the app runs.
  var modelJson = $scope.session.data.getValue();

  var router;

  if (modelJson) {
    modelJson = angular.fromJson(modelJson);
    router = new Router(modelJson);
  } else {
    router = new Router();
  }

  $scope.router = router;

  $scope.routes = [router.root];

  $scope.$watch('router', function(oldValue, newValue) {
    if (newValue === oldValue) return;

    var value = angular.toJson(router, 2);

    $scope.session.data.doc.setValue(value);

    console.log('set router model changed');

  }, true);



  $scope.checkHandlerFile = function(handler) {

    if (!handler || !handler.location) return;

    var routerDir = $scope.finder.activeFile.dir;
    var handlerPath = path.resolve(routerDir, handler.location) + '.js';
    var handlerFile = $scope.model.map[handlerPath];

    return !!handlerFile;

  };

  $scope.getHandlerFileParams = function(handler) {
    //ui-sref="app.fs.finder.file(fileParams(model.map[item.path]))"

    if (!handler || !handler.location) return;

    var routerDir = $scope.finder.activeFile.dir;
    var handlerPath = path.resolve(routerDir, handler.location) + '.js';
    var handlerFile = $scope.model.map[handlerPath];

    if (!handlerFile) return;

    return $scope.fileParams(handlerFile);
  }
};
