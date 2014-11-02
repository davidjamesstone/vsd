module.exports = function($parse) {
  return function($scope, $element, attrs) {
    var fn = $parse(attrs.ngScrolled);
    var el = $element[0];

    $scope.$watch(function() {
      el.scrollLeft = el.scrollWidth;
    });

  };
};
