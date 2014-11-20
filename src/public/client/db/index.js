// Load Module Dependencies
require('../dialog');

var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.controller('DbCtrl', [
  '$scope',
  '$http',
  '$state',
  '$modal',
  'DialogService',
  '$timeout',
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

mod.directive('dbDiagram', [
  '$timeout',
  require('./directives/db-diagram')
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

module.exports = mod;
