module.exports = function () {
  return function($scope, $element, attrs) {
    $scope.$watch(attrs.ngScrolledIntoView, function(value) {
      if (value) {
        var el = $element[0];
        el.scrollIntoView(false);
      }
    });
  };
};
