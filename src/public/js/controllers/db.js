app.controller('DbCtrl', ['$scope', '$state',
  function($scope, $state) {



    $scope.gotoModel = function() {
      $state.go('db.model', {
        //path: obj.path ? obj.path().map(function(p) { return p.name; }).join('/') : ''
        modelName: 'demo'
      });
    };


  }
]);
