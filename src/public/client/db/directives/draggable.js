module.exports = function($document, $parse) {
  return function(scope, element, attrs) {
    var dragHandler = $parse(attrs.draggableDrag);
    var dropHandler = $parse(attrs.draggableDrop);
    var startX, startY, initialMouseX, initialMouseY;

    element.on('mousedown', function(e) {

      startX = element.prop('offsetLeft');
      startY = element.prop('offsetTop');
      initialMouseX = e.clientX;
      initialMouseY = e.clientY;
      $document.on('mousemove', mousemove);
      $document.on('mouseup', mouseup);

      e.drag = element;
      scope.$apply(function () {
        dragHandler(scope, { $event: e });
      });

      return false;
    });

    function mousemove(e) {
      var dx = e.clientX - initialMouseX;
      var dy = e.clientY - initialMouseY;
      element.css({
        top:  startY + dy + 'px',
        left: startX + dx + 'px'
      });
      return false;
    }

    function mouseup(e) {

      $document.off('mousemove', mousemove);
      $document.off('mouseup', mouseup);

      e.drag = element;
      scope.$apply(function () {
        dropHandler(scope, { $event: e });
      });
    }
  };
};
