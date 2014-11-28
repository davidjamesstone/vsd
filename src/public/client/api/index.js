var mod = require('./module');

mod.config([
  '$stateProvider',
  require('./config')
]);

mod.controller('ApiActionCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  'DialogService',
  require('./controllers/action')
]);

mod.controller('ApiAddResourceCtrl', [
  '$scope',
  '$modalInstance',
  'data',
  require('./controllers/add-resource')
]);
  
mod.controller('ApiCtrl', [
  '$scope',
  '$state',
  'DialogService',
  'apiPromise',
  require('./controllers/api')
]);

mod.controller('ApiControllerCtrl', [
  '$scope', 
  '$state', 
  '$stateParams',
  require('./controllers/controller')
]);

mod.controller('ApiDiagramCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  require('./controllers/diagram')
]);

mod.controller('ApiHandlerCtrl', [
  '$scope', 
  '$state', 
  '$stateParams',
  require('./controllers/handler')
]);

mod.controller('ApiRouteCtrl', [
  '$scope',
  '$state',
  '$stateParams',
  '$modal',
  'DialogService',
  require('./controllers/route')
]);

module.exports = mod;
