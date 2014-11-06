module.exports = function ($timeout) {
  return function($scope, $element, attrs) {
    $scope.$watch(attrs.ngScrolledIntoView, function(value) {
      if (value) {
        var el = $element[0];
        
        $timeout(function() {
          var active  = el.querySelector('.active');
          var centerOfActiveEl = active.offsetLeft + (active.offsetWidth / 2);
          var leftBoundary = el.scrollLeft;
          var rightBoundary = leftBoundary + el.offsetWidth;

          if (centerOfActiveEl < leftBoundary || centerOfActiveEl > rightBoundary) {
            el.scrollLeft = active.offsetLeft - (el.offsetWidth / 2) + (active.offsetWidth / 2);
          }
          
        }, 100);
        
      }
    });
  };
};
