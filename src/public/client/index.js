/**
 * Shims
 */
require('./array'); // custom array prototype move method
require('array.prototype.find');
require('array.prototype.findindex');
require('string.prototype.endswith');


// load client app
window.app = require('./app');