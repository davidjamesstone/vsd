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

    // var initTop = element.css('top');
    // var initLeft = element.css('left');
    
    // var startX = 0,
    //   startY = 0,
    //   x = initLeft ? element.css('left') : 0,
    //   y = initTop ? element.css('top') : 0;

    // element.on('mousedown', function(e) {
    //   // Prevent default dragging of selected content
    //   e.preventDefault();
    //   startX = e.screenX - x;
    //   startY = e.screenY - y;
      
    //   console.log(startY);
    //   console.log(startX);
    //   console.log(y);
    //   console.log(x);
      
    //   $document.on('mousemove', mousemove);
    //   $document.on('mouseup', mouseup);
      
    //   e.drag = element;
      
    //   scope.$apply(function () {
    //     dragHandler(scope, { $event: e });
    //   });
      
    // });

    // function mousemove(e) {
    //   y = e.screenY - startY;
    //   x = e.screenX - startX;
      
    //   console.log(y);
    //   console.log(x);
      
    //   element.css({
    //     top: y + 'px',
    //     left: x + 'px'
    //   });
    // }

    // function mouseup(e) {
    //   $document.off('mousemove', mousemove);
    //   $document.off('mouseup', mouseup);
      
    //   e.drag = element;
      
    //   scope.$apply(function () {
    //     dropHandler(scope, { $event: e });
    //   });
    // }
  };
};