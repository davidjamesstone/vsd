app.controller('KeyCtrl', ['$scope', '$stateParams', 'dialog',
  function($scope, $stateParams, $dialog) {
    var key = $scope.model.getKeyById($stateParams.keyId);

    $scope.key = key;

    $scope.keyData = {
      type: key ? key.type : ''
    };

    $scope.$watch('keyData.type', function(newValue, oldValue) {
      if (newValue === oldValue || newValue === key.type) {
        return;
      }

      $dialog.confirm({
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
        $scope.keyData.type = oldValue;
      });

    });

  }
]);
