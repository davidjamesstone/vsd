var Behave = require('../vendor/behave');

// // Autosize behave textarea
// BehaveHooks.add(['keydown'], function(data) {
//   var numLines = data.lines.total,
//     fontSize = parseInt(getComputedStyle(data.editor.element)['font-size']),
//     padding = parseInt(getComputedStyle(data.editor.element)['padding']);
//   data.editor.element.style.height = (((numLines * fontSize) + padding)) + 'px';
// });


app.directive('behave', function() {
  return {
    link: function(scope, element) {
      var editor = new Behave({
        textarea: element[0],
        replaceTab: true,
        softTabs: true,
        tabSize: 2,
        autoOpen: true,
        overwrite: true,
        autoStrip: true,
        autoIndent: true,
        fence: false
      });

      scope.$on('$destroy', function() {
        console.log("destroy");
        editor.destroy();
      });
    }
  };
});
