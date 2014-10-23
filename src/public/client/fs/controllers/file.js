module.exports = function($scope, file, fileService) {
  var isUtf8 = !(file.contents instanceof ArrayBuffer);

  $scope.file = file;

  var model = $scope.model;

  var fso = model.map[file.path];

  // ensure the finder is set the the right fso
  $scope.finder.active = fso;

  model.addRecentFile(fso);

  var viewer;

  $scope.viewer = 'ace';

  $scope.aceOptions = function() {
    var mode;

    var modes = {
      ".js": "ace/mode/javascript",
      ".css": "ace/mode/css",
      ".html": "ace/mode/html",
      ".htm": "ace/mode/html",
      ".ejs": "ace/mode/html",
      ".json": "ace/mode/json",
      ".md": "ace/mode/markdown",
      ".coffee": "ace/mode/coffee",
      ".jade": "ace/mode/jade",
      ".php": "ace/mode/php",
      ".py": "ace/mode/python",
      ".scss": "ace/mode/sass",
      ".txt": "ace/mode/text",
      ".typescript": "ace/mode/typescript",
      ".xml": "ace/mode/xml"
    };

    mode = modes[file.ext];

    if (mode) {
      mode = mode.substr(9);
    }

    return {
      mode: mode
    };
  };


  function imgUrl() {
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array( file.contents );
    var blob = new Blob( [ arrayBufferView ], { type: "image/" + file.ext.substr(1) } );
    var urlCreator = window.URL || window.webkitURL;
    var url = urlCreator.createObjectURL( blob );
    return url;
  }

  if (!isUtf8) {

    $scope.viewer = '';

    switch (file.ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.ico':
      $scope.viewer = 'img';
      $scope.imgUrl = imgUrl();
      break;
    default:

    }

  }


};
