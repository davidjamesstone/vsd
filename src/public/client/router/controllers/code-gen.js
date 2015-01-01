var Route = require('vsd-router-model').Route;

module.exports = function($scope, $modalInstance, data) {

  var router = data.route;

  var locations = {};
  for (var i = 0; i < router.actions.length; i++) {

    var action = router.actions[i];
    for (var j = 0; j < action.handlers.length; j++) {
      var handler = action.handlers[j];

      if (handler.location && handler.name) {
        if (!locations[handler.location]) {
          locations[handler.location] = [];
        }
        locations[handler.location].push({
          name: handler.name,
          isMiddleware: action.handlers.length > 1 && (action.handlers[action.handlers.length - 1] !== handler)
        });

      }
    }
  }
  
  var keys = Object.keys(locations);
  $scope.location = keys.length && locations[keys[0]];
  $scope.locations = locations;

  $scope.code = function(handlers) {
    
    if (handlers) {
      
      var s = '';
      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var argstr = handler.isMiddleware ? 'req, res, next' : 'req, res';
        s += 'exports.' + handler.name + ' = function(' + argstr + ') {\n};\n\n';
      }  
    }
    
    return s;  
  };
  
  $scope.ok = function() {
    $modalInstance.close(model);
  };

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };
};