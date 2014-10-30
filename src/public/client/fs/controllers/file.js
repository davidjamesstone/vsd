module.exports = function($scope, session, fileService) {
  var isUtf8 = session.isUtf8;


  var model = $scope.model;

  var file = model.map[session.path];

  $scope.file = file;

  // ensure the finder is set the the right fso
  $scope.finder.active = file;

  model.addRecentFile(file);

  function imgUrl() {
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array(session.data);
    var blob = new Blob([arrayBufferView], {
      type: 'image/' + file.ext.substr(1)
    });
    var urlCreator = window.URL || window.webkitURL;
    var url = urlCreator.createObjectURL(blob);
    return url;
  }

  if (isUtf8) {

    $scope.viewer = 'ace';
    $scope.$parent.showEditor = true;

    if ($scope.editor) {
      $scope.editor.setSession(session.data);
      var doc = session.data.getDocument();
    $scope.editor.setOption("maxLines", 600 /*doc.getLength()*/);
    }

  } else {

    $scope.viewer = '';
    $scope.$parent.showEditor = false;

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
