module.exports = function($parse) {
  return function($scope, $element, attrs) {
    var fn = $parse(attrs.ngScrolledLeft);
    var el = $element[0];

    $scope.$watch(function() {
      el.scrollLeft = el.scrollWidth;
    });

  };
};
