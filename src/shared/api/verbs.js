var methods = require('methods');

var verbs = methods.map(function(method) {
  return method.toUpperCase();
});
verbs.unshift('ALL');

module.exports = verbs;
