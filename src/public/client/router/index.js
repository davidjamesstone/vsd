var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.controller('RouterCtrl', [
  '$scope',
  '$state',
  'DialogService',
  '$modal',
  require('./controllers')
]);

mod.controller('RouterActionCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  '$timeout',
  'DialogService',
  require('./controllers/action')
]);

mod.controller('RouterAddResourceCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  require('./controllers/add-resource')
]);

mod.controller('RouterDiagramCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  require('./controllers/diagram')
]);

mod.controller('RouterHandlerCtrl', [
  '$scope', 
  '$state', 
  '$stateParams',
  require('./controllers/handler')
]);

mod.controller('RouterRouteCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  '$modal',
  'DialogService',
  require('./controllers/route')
]);

mod.controller('RouterCodeGenCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  require('./controllers/code-gen')
]);


module.exports = mod;
