var utils = require('../../../../shared/utils');
var verbs = require('../../../../shared/api/verbs');

/*
 * Action Constructor Function
 */
function Action(data) {
  this.route = data.route;
  this.id = data.id || utils.getuid();
  this.verb = data.verb || 'GET';
  this.handlers = data.handlers || [];
}
Action.prototype.verbs = verbs;
Action.prototype.moveNext = function() {
  var actions = this.route.actions;
  var index = actions.indexOf(this);
  return actions.move(index, ++index);
};
Action.prototype.movePrev = function() {
  var actions = this.route.actions;
  var index = actions.indexOf(this);
  return actions.move(index, --index);
};
Action.prototype.addHandler = function(handler) {
  this.handlers.push(handler);
  return handler;
};
Object.defineProperties(Action.prototype, {
  hasHandlers: {
    get: function() {
      return !!this.handlers.length;
    }
  },
  url: {
    get: function() {
      return this.verb.toUpperCase() + ' ' + this.route.url;
    }
  }
});

module.exports = Action;
