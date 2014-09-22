var utils = require('../../../../shared/utils');
var path = require('path');

app.controller('ApiCtrl', ['$scope', '$state', 'dialog', 'apiPromise',
  function($scope, $state, $dialog, apiPromise) {

    $scope.api = api; //Promise;

    $scope.controllerTabIndex = 0;

    $scope.deleteController = function(controller) {

      $dialog.confirm({
        title: 'Delete Controller',
        message: 'Are you sure you want to delete controller [' + controller.name + ']?'
      }).then(function() {
        var parent = controller.controller;
        parent.removeController(controller);
        // go to parent controller
        $state.go('api.controller', {
          controllerId: parent.id
        });
      });
    };

    $scope.deleteRoute = function(route) {

      $dialog.confirm({
        title: 'Delete Route',
        message: 'Are you sure you want to delete route [' + route.description + ']?'
      }).then(function() {
        route.controller.removeRoute(route);
        // go to parent controller
        $state.go('api.controller', {
          controllerId: route.controller.id
        });
      });
    };

    $state.go('api.controller', {
      controllerId: api.controller.id
    });

  }
]);

function Route(controller, id, verb, url, description) {
  this.controller = controller;
  this.id = id;
  this.verb = verb;
  this.url = url;
  this.description = description;
}
Route.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Object.defineProperties(Route.prototype, {
  description: {
    get: function() {
      return this.verb.toUpperCase() + ' ' + this.url;
    }
  }
});

function Controller(controller, id, name, baseUrl, code) {
  this.controller = controller;
  this.id = id;
  this.name = name;
  this.baseUrl = baseUrl;
  this.code = code;
  this.routes = [];
  this.controllers = [];
  this.middleware = [];
}
Controller.prototype.addRoute = function(verb, url) {
  // var handlers = Array.prototype.slice.call(arguments).splice(2);
  // var routePipeline = new RoutePipeline(handlers);
  var route = new Route(this, utils.getuid(), verb || 'GET', url || this.basePath);
  this.routes.push(route);
  return route;
};
Controller.prototype.removeRoute = function(route) {
  var index = this.routes.indexOf(route);
  if (index !== -1) {
    this.routes.splice(index, 1);
  }
};
Controller.prototype.addController = function(name, baseUrl, code) {
  var controller = new Controller(this, utils.getuid(), name, baseUrl, code);
  this.controllers.push(controller);
  return controller;
};
Controller.prototype.removeController = function(controller) {
  var index = this.controllers.indexOf(controller);
  if (index !== -1) {
    this.controllers.splice(index, 1);
  }
};
Controller.prototype.addMiddleware = function(id, name, baseUrl, code) {
  // var middleware = new Middleware(name, handler);
  // this._middleware.push(middleware);
  // return middleware;
};
Object.defineProperties(Controller.prototype, {
  allControllers: {
    get: function() {
      var controllers = [].concat(this);
      this.controllers.forEach(function(controller) {
        Array.prototype.push.apply(controllers, controller.allControllers);
      });
      return controllers;
    }
  },
  ascendents: {
    get: function() {
      var ascendents = [], c = this;

      while (c.controller) {
        ascendents.unshift(c.controller);
        c = c.controller;
      }

      return ascendents;
    }
  },
  basePath: {
    get: function() {
      var paths = [];

      function check(c) {
        if (c) {
          paths.push(c.baseUrl || '');
          check(c.controller);
        }
        return c ? c.baseUrl : null;
      }
      check(this);

      paths.reverse();

      return path.join.apply(path, paths);
    }
  }
});
Object.defineProperties(Controller.prototype, {
  allRoutes: {
    get: function() {
      var routes = [].concat(this.routes);
      this.controllers.forEach(function(controller) {
        Array.prototype.push.apply(routes, controller.allRoutes);
      });
      return routes;
    }
  }
});

function Api(id, name, controller) {
  this.id = id;
  this.name = name;
  this.controller = controller;
  this.middleware = [];
}
Api.prototype.findController = function(id) {
  return this.controllers.find(function(controller) {
    return controller.id === id;
  });
};
Api.prototype.findRoute = function(id) {
  return this.routes.find(function(route) {
    return route.id === id;
  });
};
Object.defineProperties(Api.prototype, {
  controllers: {
    get: function() {
      return this.controller.allControllers;
    }
  }
});
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      return this.controller.allRoutes;
    }
  }
});

var homeCtrl = new Controller(null, utils.getuid(), 'Home');
var api = new Api(utils.getuid(), 'test', homeCtrl);

homeCtrl.addRoute('GET', '/');
homeCtrl.addRoute('GET', '/about-us');
homeCtrl.addRoute('GET', '/contact-us');
homeCtrl.addRoute('POST', '/contact-us');

var userController = homeCtrl.addController('User', '/user', " \
var express = require('express');\n \
var http = require('http');\n \
var path = require('path');\n \
var favicon = require('static-favicon');\n \
var httpLogger = require('morgan');\n \
\n \
function hello() {}");

userController.addRoute('GET', '/user/:id');
userController.addRoute('ALL', '/user/:id/*');
userController.addRoute('POST', '/user');
userController.addRoute('PUT', '/user/:id');


var userPhotosCtrl = userController.addController('User Photos', '/:id/photos');
userPhotosCtrl.addRoute('GET', '/user/:id/photos');
userPhotosCtrl.addRoute('POST', '/user/:id/photos');
userPhotosCtrl.addRoute('PUT', '/user/:id/photos/:id');


var orderController = homeCtrl.addController('Order', '/order');
orderController.addRoute('GET', '/order/:id');
orderController.addRoute('ALL', '/order/:id/*');
orderController.addRoute('POST', '/order');
orderController.addRoute('PUT', '/order/:id');

window.api = api;
