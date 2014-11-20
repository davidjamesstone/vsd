module.exports = function($scope, dialog) {

  var dbFinder = $scope.dbFinder;
  var key = dbFinder.key;

  $scope.key = key;

  $scope.keyData = {
    type: key ? key.type : ''
  };

  $scope.$watch('dbFinder.key', function(newValue, oldValue) {
    if (newValue === oldValue) {
      return;
    }

    key = newValue;
    $scope.key = key;
    $scope.keyData = {
      type: key ? key.type : ''
    };

  });

  $scope.$watch('keyData.type', function(newValue, oldValue) {
    if (newValue === oldValue || newValue === key.type) {
      return;
    }

    dialog.confirm({
      title: 'Modify key type',
      message: 'Are you sure you want to modify key [' + key.name + ']?'
    }).then(function() {

      // redefine key type
      var type = newValue;
      var newDef = type === 'Array' ? {
        type: type,
        def: {
          oftype: 'String',
          def: {}
        }
      } : {
        type: type,
        def: {}
      };

      // redefine key def
      key.type = type;
      key.define(newDef);

    }, function() {
      // cancel clicked
      $scope.keyData.type = oldValue;
    });

  });

};
