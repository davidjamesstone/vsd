module.exports = function ($timeout) {
  return function($scope, $element, attrs) {
    $scope.$watch(attrs.ngScrolledIntoView, function(value) {
      if (value) {
        var el = $element[0];
        //el.scrollIntoView(false);
        $timeout(function() {
          var active  = el.querySelector('.active');
          el.scrollLeft = active.offsetLeft + active.offsetWidth;
        }, 100);
        //el.scrollTop = scrollTo.offset().top - container.offset().top + container.scrollTop()
      }
    });
  };
};
