var Controller = require('./controller');
var Route = require('./route');

/*
 * Api Constructor Function
 */
function Api(name, root, controllers) {
  this.name = name;

  this.root = root || new Route({
    path: '/'
  });

  this.controllers = controllers || [];
}
Api.prototype.findRoute = function(id) {
  return this.routes.find(function(item) {
    return item.id === id;
  });
};
Api.prototype.findAction = function(id) {
  return this.actions.find(function(item) {
    return item.id === id;
  });
};
Api.prototype.findController = function(id) {
  return this.controllers.find(function(item) {
    return item.id === id;
  });
};
Api.prototype.findHandler = function(id) {
  return this.handlers.find(function(item) {
    return item.id === id;
  });
};
Api.prototype.addController = function(data) {
  var controller = new Controller(data || {});
  this.controllers.push(controller);
  return controller;
};
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      return [this.root].concat(this.root.descendants);
    }
  },
  actions: {
    get: function() {

      var rootActions = this.root.actions;
      var descendantActions = this.root.descendants.map(function(item) {
        return item.actions;
      });

      return Array.prototype.concat.apply(rootActions, descendantActions);
    }
  },
  handlers: {
    get: function() {

      var controllerHandlers = this.controllers.map(function(item) {
        return item.handlers;
      });

      return Array.prototype.concat.apply([], controllerHandlers);
    }
  }
});

module.exports = Api;
