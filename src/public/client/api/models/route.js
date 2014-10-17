var utils = require('../../../../shared/utils');
var verbs = require('../../../../shared/api/verbs');
var Action = require('./action');

/*
 * Route Constructor Function
 */
function Route(data) {
  this.id = data.id || utils.getuid();
  this.parent = data.parent;
  this.path = data.path;
  this.description = data.description;
  this.actions = [];
  this.routes = [];
}
Route.prototype.verbs = verbs;
Route.prototype.addChild = function(path) {
  var route = new Route({
    parent: this,
    path: path
  });
  this.routes.push(route);
  return route;
};
Route.prototype.addAction = function(verb, handlers) {
  var action = new Action({
    route: this,
    verb: verb,
    handlers: handlers
  });
  this.actions.push(action);
  return action;
};
Route.prototype.removeChild = function(child) {
  var index = this.routes.indexOf(child);
  if (index !== -1) {
    this.routes.splice(index, 1);
  }
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

module.exports = Route;
