app.directive('negate', [

  function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attribute, ngModelController) {
        ngModelController.$isEmpty = function(value) {
          return !!value;
        };

        ngModelController.$formatters.unshift(function(value) {
          return !value;
        });

        ngModelController.$parsers.unshift(function(value) {
          return !value;
        });
      }
    };
  }
]);