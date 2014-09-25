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

    $state.go('api.route', {
      routeId: api.root.id
    });

    $scope.routes = [api.root];
  }
]);


/*
 * Route Constructor Function
 */
function Route(data) {
  this.id = data.id || utils.getuid();
  this.parent = data.parent;
  this.path = data.path;
  this.actions = data.actions instanceof Action ? [data.actions] : (data.actions || []);
  this.routes = data.routes || [];
  this.handlers = data.handlers || [];
}
Route.prototype.addChild = function(path, actions) {
  var route = new Route({
    id: utils.getuid(),
    parent: this,
    path: path,
    actions: actions
  });
  this.routes.push(route);
  return route;
};
Route.prototype.addAction = function(verb, handlers) {
  var action = new Action({
    id: utils.getuid(),
    route: this,
    verb: 'GET',
    handlers: handlers
  });
  this.actions.push(action);
  return action;
};
Object.defineProperties(Route.prototype, {
  ancestors: {
    get: function() {
      var ancestors = [],
        r = this;

      while (r.parent) {
        ancestors.push(r.parent);
        r = r.parent;
      }

      return ancestors;
    }
  },
  descendants: {
    get: function() {
      var descendants = [].concat(this.children);

      for (var i = 0; i < this.children.length; i++) {
        Array.prototype.push.apply(descendants, this.children[i].descendants);
      }

      return descendants;
    }
  },
  isRoot: {
    get: function() {
      return !this.hasAncestors;
    }
  },
  hasAncestors: {
    get: function() {
      return !!this.ancestors.length;
    }
  },
  hasDecendents: {
    get: function() {
      return !!this.descendants.length;
    }
  },
  children: {
    get: function() {
      return this.routes;
    }
  },
  hasChildren: {
    get: function() {
      return !!this.children.length;
    }
  },
  hasActions: {
    get: function() {
      return !!this.actions.length;
    }
  },
  url: {
    get: function() {
      var parts = [this.path];

      for (var i = 0; i < this.ancestors.length; i++) {
        parts.unshift(this.ancestors[i].path);
      }

      if (parts.length > 1 && parts[0] === '/') {
        parts.splice(0, 1);
      }

      return parts.join('');
    }
  }
});

/*
 * Action Constructor Function
 */
function Action(data) {
  this.route = data.route;
  this.id = data.id || utils.getuid();
  this.verb = data.verb;
  this.handlers = data.handlers instanceof Handler ? [data.handlers] : (data.handlers || []);;
}
Action.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Action.prototype.addHandler = function(data) {
  var handler = new Handler(data);
  this.handlers.push(handler);
  return handler;
};
Object.defineProperties(Action.prototype, {
  hasHandlers: {
    get: function() {
      return !!this.handlers.length;
    }
  }
});

/*
 * Handler Constructor Function
 */
function Handler(data) {
  this.id = data.id || utils.getuid();
  this.name = data.name;
  this.code = data.code;
}


/*
 * Handler Constructor Function
 */
function Api(name, route) {
  this.name = name;
  this.root = route;
}
Api.prototype.findRoute = function(id) {
  return this.routes.find(function(item) {
    return item.id === id;
  });
};
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      return [this.root].concat(this.root.descendants);
    }
  }
});


var requiresAuthentication = new Handler({
  name: 'requiresAuthentication',
  code: "function(req, res, next) { next(req.query.authme ? null : new Error('Unauthorized')); }"
});

var homeRoute = new Route({
  path: '/',
  actions: new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getHomePage',
      code: 'function(req, res) { req.send("getHomePage"); }'
    })
  })
});

homeRoute.addChild('/ping', new Action({
  verb: 'GET',
  handlers: new Handler({
    name: 'getPingPage',
    code: 'function(req, res) { req.send("pong"); }'
  })
}));

var user = homeRoute.addChild('/user', [new Action({
    verb: 'ALL',
    handlers: requiresAuthentication
  }),
  new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getUserPage',
      code: 'function(req, res) { req.send("getUserPage"); }'
    })
  })
]);

var authUsers = new Action({
  verb: 'ALL',
  handlers: requiresAuthentication
});

var loadUser = new Action({
  verb: 'ALL',
  handlers: new Handler({
    name: 'loadUser',
    code: 'function(req, res, next) { req.user = { name: "fred" }; next(); }'
  })
});

var putUser = new Action({
  verb: 'PUT',
  handlers: [new Handler({
    name: 'saveUser',
    code: 'function(req, res) { req.send("saveUser"); }'
  })]
});

var deleteUser = new Action({
  verb: 'DELETE',
  handlers: new Handler({
    name: 'deleteUser',
    code: 'function(req, res) { req.send("deleteUser"); }'
  })
});


var authenticateUsers = user.addChild('/*', [authUsers]);

var userid = user.addChild('/:id', [loadUser, putUser, deleteUser]);

userid.addChild('/videos');


var contactus = homeRoute.addChild('/contact-us', [new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getContactUsPage',
      code: 'function(req, res) { req.send("getContactUsPage"); }'
    })
  }),
  new Action({
    verb: 'POST',
    handlers: new Handler({
      name: 'postContactUsPage',
      code: 'function(req, res) { req.send("postContactUsPage"); }'
    })
  })
]);

var api = new Api('demo', homeRoute);


window.api = api;
