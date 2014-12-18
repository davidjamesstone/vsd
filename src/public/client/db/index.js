// Load Module Dependencies
require('../dialog');

var mod = require('./module');

// mod.config([
//   '$stateProvider',
//   require('./config')
// ]);

mod.controller('DbCtrl', [
  '$scope',
  '$http',
  '$state',
  '$modal',
  'DialogService',
  '$interval',
  require('./controllers')
]);

mod.controller('DbModelCtrl', [
  require('./controllers/model')
]);

mod.controller('DbKeyCtrl', [
  '$scope',
  'DialogService',
  require('./controllers/key')
]);

mod.controller('DbSchemaCtrl', [
  '$scope',
  require('./controllers/schema')
]);


mod.controller('DbArrayDefCtrl', [
  '$scope',
  'DialogService',
  require('./controllers/array-def')
]);

mod.directive('draggable', [
  '$document',
  '$parse',
  require('./directives/draggable')
]);

mod.directive('dbViewer', [
  '$timeout',
  require('./directives/db-viewer')
]);

mod.directive('dbGraph', [
  '$timeout',
  require('./directives/db-graph')
]);

module.exports = mod;
