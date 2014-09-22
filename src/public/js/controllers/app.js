app.controller('AppCtrl', ['$scope',
  function($scope) {
    $scope.navbarCollapsed = false;
  }
]);

app.controller('ArrayDefCtrl', ['$scope', 'dialog',
  function($scope, $dialog) {

    var def = $scope.def;

    $scope.defData = {
      oftype: def.oftype
    };

    $scope.$watch('defData.oftype', function(newValue, oldValue) {
      if (newValue === oldValue || newValue === def.oftype) {
        return;
      }

      $dialog.confirm({
        title: 'Modify key type',
        message: 'Are you sure you want change the type of Array key [' + def.key.name + ']?'
      }).then(function() {

        // redefine def oftype
        var type = newValue;

        def.define({
          oftype: type,
          def: {}
        }, def.key);

      }, function() {
        $scope.defData.oftype = oldValue;
      });

    });


  }
]);
