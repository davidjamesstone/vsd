module.exports = function($scope, $state, $stateParams, $modal, $dialog) {

  var route = $scope.router.findRoute($stateParams.routeId);

  $scope.route = route;

  $scope.addAction = function() {
    // hint at next action that could be used
    var used = route.actions.map(function(item) {
      return item.verb;
    });
    var verb = route.verbs.filter(function(item) {
      return item !== 'ALL' && used.indexOf(item) === -1;
    })[0];

    var newAction = route.addAction(verb, [{ location: 'loc', name: 'fn'}]);

    // // navigate to new action
    // $state.go('app.fs.finder.file.router.home.route.item.action', {
    //   actionId: newAction.id
    // });
  };

  $scope.addChild = function() {

    var newChild = route.addChild();

    // navigate to new route
    $state.go('app.fs.finder.file.router.home.route.item', {
      routeId: newChild.id
    });
  };

  $scope.addChildResource = function() {

    var resourcePromise = $modal.open({
      templateUrl: '/client/router/views/add-resource.html',
      controller: 'RouterAddResourceCtrl',
      resolve: {
        data: function() {
          return {
            route: route
          };
        }
      }
    }).result;

    resourcePromise.then(function(model) {
      var router = $scope.router;

      // Add the Route as a child to the current route
      function addRoute(parent, child) {
        
        var childRoute = parent.addChild(child.path);

        for (var i = 0; i < child.actions.length; i++) {
          var action = child.actions[i];
          childRoute.addAction(action.verb, action.handlers);
        }

        for (i = 0; i < child.children.length; i++) {
          addRoute(childRoute, child.children[i]);
        }
        
        return childRoute;
      }
      
      var resourceRoot = addRoute(route, model.route);

      // go to new resource
      $state.go('app.fs.finder.file.router.home.route.item', {
        routeId: resourceRoot.id
      });
    });

  };

  $scope.deleteRoute = function(route) {

    $dialog.confirm({
      title: 'Delete Route',
      message: 'Are you sure you want to delete route [' + route.url + ']?'
    }).then(function() {
      var parent = route.parent;
      parent.removeChild(route);
      // go to parent
      $state.go('app.fs.finder.file.router.home.route.item', {
        routeId: parent.id
      });
    });
  };

};
