var utils = require('../../../../shared/utils');

/*
 * Handler Constructor Function
 */
function Handler(data) {
  this.id = data.id || utils.getuid();
  this.controller = data.controller;
  this.name = data.name;
  this.code = data.code;
}

module.exports = Handler;
