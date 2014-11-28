module.exports = function($scope, $state, $stateParams, $modal, $dialog) {

  var route = $scope.api.findRoute($stateParams.routeId);

  $scope.route = route;

  $scope.addAction = function() {
    // hint at next action that could be used
    var used = route.actions.map(function(item) {
      return item.verb;
    });
    var verb = route.verbs.filter(function(item) {
      return item !== 'ALL' && used.indexOf(item) === -1;
    })[0];

    var newAction = route.addAction(verb);

    // navigate to new action
    $state.go('api.route.item.action', {
      actionId: newAction.id
    });
  };

  $scope.addChild = function() {

    var newChild = route.addChild();

    // navigate to new route
    $state.go('api.route.item', {
      routeId: newChild.id
    });
  };

  $scope.addChildResource = function() {

    var resourcePromise = $modal.open({
      templateUrl: '/client/api/views/add-resource.html',
      controller: 'ApiAddResourceCtrl',
      resolve: {
        data: function() {
          return {
            route: route
          };
        }
      }
    }).result;

    resourcePromise.then(function(model) {
      var api = $scope.api;

      // Add the controller to the model
      var controller = api.addController({
        name: model.controller.name
      });

      model.controller.handlers.forEach(function(item) {
        controller.addHandler({
          name: item.name
        });
      });

      // Add the Route as a child to the current route
      function addRoute(parent, child) {
        var childRoute = parent.addChild(child.path);

        function findHandler(name) {
          return controller.handlers.find(function(item) {
            return (item.name === name);
          });
        }

        for (var i = 0; i < child.actions.length; i++) {
          var action = child.actions[i];
          var handler = findHandler(action.handlers[0].name);
          childRoute.addAction(action.verb, [handler]);
        }

        for (i = 0; i < child.children.length; i++) {
          addRoute(childRoute, child.children[i]);
        }
      }
      addRoute(route, model.route);

      // go to new resource
      // $state.go('api.route', {
      //   routeId: route.id
      // });
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
      $state.go('api.route', {
        routeId: parent.id
      });
    });
  };

};
