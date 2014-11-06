var p = require('path');
var filesystem = require('../../file-system');
var utils = require('../../../../shared/utils');
var FinderModel = require('../models/finder');

var beautifyConfig = require('../../config').beautify;
var beautify_js = require('js-beautify');
var beautify_css = require('js-beautify').css;
var beautify_html = require('js-beautify').html;

module.exports = function($scope, $state, $log, $q, dialog, fileService, responseHandler) {

  $scope.pasteBuffer = null;
  $scope.showEditor = false;

  $scope.aceLoaded = function(editor) {

    $scope.editor = editor;

    editor.commands.addCommands([{
      name: 'save',
      bindKey: {
        win: 'Ctrl-S',
        mac: 'Command-S'
      },
      exec: function(editor) {
        var editorSession = editor.getSession();
        var session = model.sessions.dirty.find(function(item) {
          return item.data === editorSession;
        });
        if (session) {
          $scope.saveSession(session);
        }
      },
      readOnly: false // this command should not apply in readOnly mode
    }, {
      name: 'saveall',
      bindKey: {
        win: 'Ctrl-Shift-S',
        mac: 'Command-Option-S'
      },
      exec: $scope.saveAllSessions,
      readOnly: false // this command should not apply in readOnly mode
    }, {
      name: 'help',
      bindKey: {
        win: 'Ctrl-H',
        mac: 'Command-H'
      },
      //exec: this._onHelp.bind(this),
      readOnly: true // this command should apply in readOnly mode
    }]);

    editor.commands.addCommands([{
      name: 'beautify',
      bindKey: {
        win: 'Ctrl-B',
        mac: 'Command-B'
      },
      exec: function(editor, line) {
        var cfg, fn;
        var fso = finder.active;

        switch (fso.ext) {
          case '.css':
          case '.less':
          case '.sass':
          case '.scss':
            {
              fn = beautify_css;
              cfg = beautifyConfig ? beautifyConfig.css : null;
            }
            break;
          case '.html':
            {
              fn = beautify_html;
              cfg = beautifyConfig ? beautifyConfig.html : null;
            }
            break;
          case '.js':
          case '.json':
            {
              fn = beautify_js;
              cfg = beautifyConfig ? beautifyConfig.js : null;
            }
            break;
        }

        if (fn) {
          editor.setValue(fn(editor.getValue(), cfg));
        }
      },
      readOnly: false // this command should not apply in readOnly mode
    }]);

    // load the editorSession if one has already been defined (like in child controller FileCtrl)
    if ($scope.editorSession) {
      $scope.loadSession();
    }

  };

  $scope.loadSession = function() {
    $scope.editor.setSession($scope.editorSession);
  };

  $scope.aceChanged = function(editor) {
    // Don't remove this. Simply handling this causes the $digest we want to update the UI
    console.log('Finder editor changed');
  };

  var path = $state.params.path ? utils.decodeString($state.params.path) : null;
  var model = $scope.model;

  var finder = new FinderModel(path ? model.list.find(function(item) {
    return item.path === path;
  }) : model.tree);

  $scope.finder = finder;

  function fileSystemCallback(response) {
    // notify of any errors, otherwise silent.
    // The File System Watcher will handle the state changes in the file system
    if (response.err) {
      dialog.alert({
        title: 'File System Error',
        message: JSON.stringify(response.err)
      });
    }
  }

  $scope.clickNode = function(fso) {

    finder.active = fso;

    if (fso.isFile) {
      $state.go('app.fs.finder.file', {
        path: utils.encodeString(fso.path)
      });
    }

  };

  $scope.delete = function(fso) {

    dialog.confirm({
      title: 'Delete ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Delete [' + fso.name + ']. Are you sure?'
    }).then(function() {
      filesystem.remove(fso.path, fileSystemCallback);
    }, function() {
      $log.info('Delete modal dismissed');
    });

  };

  $scope.rename = function(fso) {

    dialog.prompt({
      title: 'Rename ' + (fso.isDirectory ? 'folder' : 'file'),
      message: 'Please enter a new name',
      defaultValue: fso.name,
      placeholder: fso.isDirectory ? 'Folder name' : 'File name'
    }).then(function(value) {
      var oldPath = fso.path;
      var newPath = p.resolve(fso.dir, value);
      filesystem.rename(oldPath, newPath, fileSystemCallback);
    }, function() {
      $log.info('Rename modal dismissed');
    });

  };

  $scope.mkfile = function(fso) {

    dialog.prompt({
      title: 'Add new file',
      placeholder: 'File name',
      message: 'Please enter the new file name'
    }).then(function(value) {
      filesystem.mkfile(p.resolve(fso.path, value), fileSystemCallback);
    }, function() {
      $log.info('Make file modal dismissed');
    });

  };

  $scope.mkdir = function(fso) {

    dialog.prompt({
      title: 'Add new folder',
      placeholder: 'Folder name',
      message: 'Please enter the new folder name'
    }).then(function(value) {
      filesystem.mkdir(p.resolve(fso.path, value), fileSystemCallback);
    }, function() {
      $log.info('Make directory modal dismissed');
    });

  };

  $scope.paste = function(fso) {

    var pasteBuffer = $scope.pasteBuffer;
    var pastePath = fso.isDirectory ? fso.path : fso.dir;

    if (pasteBuffer.op === 'copy') {
      filesystem.copy(pasteBuffer.fso.path, p.resolve(pastePath, pasteBuffer.fso.name), fileSystemCallback);
    } else if (pasteBuffer.op === 'cut') {
      filesystem.rename(pasteBuffer.fso.path, p.resolve(pastePath, pasteBuffer.fso.name), fileSystemCallback);
    }

    $scope.pasteBuffer = null;

  };

  $scope.showPaste = function(active) {
    var pasteBuffer = $scope.pasteBuffer;
    
    if (pasteBuffer) {
      var sourcePath = pasteBuffer.fso.path.toLowerCase();
      var sourceDir = pasteBuffer.fso.dir.toLowerCase();
      var destinationDir = (active.isDirectory ? active.path : active.dir).toLowerCase();
      var isDirectory = pasteBuffer.fso.isDirectory;
      
      if (!isDirectory) {
        // Always allow pasteing of a file unless it's a move operation (cut) and the destination dir is the same
        return pasteBuffer.op !== 'cut' || destinationDir !== sourceDir;
      } else {
        // Allow pasteing directories if not into self a decendent
        if (destinationDir.indexOf(sourcePath) !== 0) {
          // and  or if the operation is move (cut) the parent dir too
          return pasteBuffer.op !== 'cut' || destinationDir !== sourceDir;
        }
      }
    }
    return false;
  };

  $scope.setPasteBuffer = function(fso, op) {

    $scope.pasteBuffer = {
      fso: fso,
      op: op
    };

  };
};