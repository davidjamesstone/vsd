var utils = require('../utils');

function Route(controller, id, verb, url, routePipeline) {
  this.controller = controller;
  this.id = id;
  this.url = url;
  this.verb = verb;
  this.routePipeline = routePipeline;
}
Route.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Object.defineProperties(Route.prototype, {
  handlers: {
    get: function() {
      return this.routePipeline.handlerArgs.map(function(handler) {
        return handler.toString();
      });
    }
  }
});

function RoutePipeline(handlers) {
  // ensure 'Action' type handler is last and only present once if at all present
  this.handlers = handlers;
}
Object.defineProperties(RoutePipeline.prototype, {
  handlerArgs: {
    get: function() {
      var args = [];
      this.handlers.forEach(function(handler) {
        args.push(handler instanceof Handler ? handler.handler : handler);
      });
      return args;
    }
  }
});

function Handler(name, handler) {
  this.name = name;
  this.handler = handler;
}

function Middleware(name, handler) {
  Handler.call(this, name, handler);
}
Middleware.prototype = Object.create(Handler.prototype, {
  constructor: {
    value: Middleware,
    writable: true,
    enumerable: false,
    configurable: true
  }
});

function Action(name, handler) {
  Handler.call(this, name, handler);
}
Action.prototype = Object.create(Handler.prototype, {
  constructor: {
    value: Action,
    writable: true,
    enumerable: false,
    configurable: true
  }
});

function Controller(name, baseUrl, code) {
  this.name = name;
  this.baseUrl = baseUrl;
  this.code = code;
  this._routes = [];
  this._middleware = [];
  this._actions = [];
}
Controller.prototype = {
  addRoute: function(verb, url) {
    var handlers = Array.prototype.slice.call(arguments).splice(2);
    var routePipeline = new RoutePipeline(handlers);
    var route = new Route(this, utils.getuid(), verb, url, routePipeline);
    this._routes.push(route);
    return route;
  },
  findRoute: function(verb, url) {
    return this._routes.find(function(item) {
      return item.verb === name && item.url == url;
    });
  },
  addAction: function(name, handler) {
    var action = new Action(name, handler);
    this._actions.push(action);
    return action;
  },
  findAction: function(name) {
    return this._actions.find(function(item) {
      return item.name === name;
    });
  },
  addMiddleware: function(name, handler) {
    var middleware = new Middleware(name, handler);
    this._middleware.push(middleware);
    return middleware;
  },
  findMiddleware: function(name) {
    return this._middleware.find(function(item) {
      return item.name === name;
    });
  }
};


function Api(baseUrl) {
  this._baseUrl = baseUrl;
  this._middleware = [];
  this._useMiddleware = [];
  this._controllers = [];
}
Api.prototype.useMiddleware = function(name, handler, index) {
  this._useMiddleware.push(new Middleware(name, handler));
};
Api.prototype.addMiddleware = function(name, handler) {
  this._middleware.push(new Middleware(name, handler));
};
Api.prototype.addController = function(name, baseUrl, code) {

  if (!name || this.findController(name)) {
    throw new Error('Invalid Controller Name');
  }

  var controller = new Controller(name, baseUrl, code ? code.toString() : '');
  this._controllers.push(controller);
  return controller;
};
Api.prototype.findController = function(name) {
  return this._controllers.forEach(function(item) {
    return item.name === name;
  });
};
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      var routes = [];
      this._controllers.forEach(function(controller) {
        Array.prototype.push.apply(routes, controller._routes);
      });
      return routes;
    }
  }
});



// ---------------------
// expressjs example....
// ---------------------
var api = new Api('/api');

api.useMiddleware('cookie-parser', function(res, req, next) {
  // Do something useful.
  // Maybe mutate req or res state.
  // Then call next().
  next();
});

api.useMiddleware('body-parser', function(res, req, next) {
  // Do something useful.
  // Maybe mutate req or res state.
  // Then call next().
  next();
});

var authMiddleware = api.addMiddleware('auth', function(req, res, next) {
  if (!req.query.authme) {
    res.setStatus(403);
    next(new Error('Unauthorized'));
  } else {
    next();
  }
});

var indexController = api.addController('index', '/', function(req, res) {

  var util = require('util');
  //...
  //...
  //...

});

indexController.addRoute('GET', '/ping', function(req, res) {
  res.send('pong');
});

var userController = api.addController('user', '/user', function(req, res) {

  var util = require('util');
  //...
  //...
  //...

});


var loadUserMiddleware = userController.addMiddleware('load-user', function(req, res, next) {
  req.user = {
    id: 1,
    name: 'bob'
  };
  next();
});
var getUserAction = userController.addAction('getUser', function(req, res) {
  console.log(req.user);
  res.send(req.user);
});

userController.addRoute('ALL', '/user/*', loadUserMiddleware);
userController.addRoute('GET', '/user/:id', getUserAction);

module.exports = api;
