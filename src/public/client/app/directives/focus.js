module.exports = function($timeout) {

  return {
    scope: {
      trigger: '@focus'
    },

    link: function(scope, element) {
      scope.$watch(function(value) {
        if (value === 'true') {
          $timeout(function() {
            element[0].focus();
          });
        }
      });
    }
  };
};