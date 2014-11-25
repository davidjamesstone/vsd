module.exports = function($scope, $state, session, fileService) {
  var isUtf8 = session.isUtf8;

  var model = $scope.model;

  var file = model.map[session.path];

  // ensure the finder is set the the right fso
  $scope.session = session;
  $scope.finder.active = file;

  model.addRecentFile(file);

  function imgBlobUrl() {
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

    if (file.dir.endsWith('.db')) {
      $scope.viewer = 'db';
      $scope.$parent.showEditor = false;
      $scope.$parent.editorSession = session.data;

      // if the editor exists, load the editSession we just assigned
      if ($scope.$parent.editor) {
        $scope.$parent.loadSession();
      }

    } else {
      $scope.viewer = 'ace';
      $scope.$parent.showEditor = true;
      $scope.$parent.editorSession = session.data;

      // if the editor exists, load the editSession we just assigned
      if ($scope.$parent.editor) {
        $scope.$parent.loadSession();
      }
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
        $scope.imgUrl = imgBlobUrl();
        break;
    }
  }

  // Handle the case of the current file being removed from recentFiles.
  $scope.$on('recent-removed', function(e, data) {
    if (data.path === file.path) { // this should always be the case
      if (model.recentFiles.length) {
        var mostRecentEntry = model.recentFiles[0];
        var mostRecentFile = model.map[mostRecentEntry.path];
        $scope.gotoFile(mostRecentFile);
      } else {
        $scope.$parent.showEditor = false;
        $scope.finder.active = model.map[file.dir];
        $state.go('app.fs.finder');
      }
    }
  });


};
