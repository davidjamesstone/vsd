var utils = require('../../../../shared/utils');
var Handler = require('./handler');

/*
 * Controller Constructor Function
 */
function Controller(data) {
  this.id = data.id || utils.getuid();
  this.name = data.name;
  this.code = data.code || '/*\n * require modules\n */\n';
  this.handlers = [];
}
Controller.prototype.addHandler = function(data) {
  data.controller = this;
  var handler = new Handler(data);
  this.handlers.push(handler);
  return handler;
};
Object.defineProperties(Controller.prototype, {
  hasHandlers: {
    get: function() {
      return !!this.handlers.length;
    }
  }
});

module.exports = Controller;
