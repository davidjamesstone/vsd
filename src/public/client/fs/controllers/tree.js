module.exports = function($scope, $modal, $log, dialog, responseHandler) {

  var expanded = Object.create(null);

  $scope.getClassName = function(fso) {
    var classes = ['fso'];
    classes.push(fso.isDirectory ? 'dir' : 'file');

    if (fso === $scope.active) {
      classes.push('active');
    }

    return classes.join(' ');
  };

  $scope.getIconClassName = function(fso) {
    var classes = ['fa'];

    if (fso.isDirectory) {
      classes.push($scope.isExpanded(fso) ? 'fa-folder-open-o' : 'fa-folder-o');
    } else {
      classes.push('fa-file');
    }

    return classes.join(' ');
  };

  $scope.isExpanded = function(fso) {
    return !!expanded[fso.path];
  };

  $scope.clickNode = function(fso) {

    $scope.active = fso;

    var isExpanded = $scope.isExpanded(fso);
    if (isExpanded) {
      delete expanded[fso.path];
    } else {
      expanded[fso.path] = true;
    }

    return false;
  };

};
