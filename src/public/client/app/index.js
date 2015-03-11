// Load Module Dependencies
require('../dialog');
require('../fs');

var mod = require('./module');

mod.service('FileService', [
  '$q',
  require('./services/file')
]);

mod.service('ResponseHandler', [
  'DialogService',
  require('./services/response-handler')
]);

mod.service('ColorService', [
  require('./services/color')
]);

mod.controller('AppCtrl', [
  '$scope',
  '$state',
  'fsPromise',
  'fsWatcherPromise',
  'FileService',
  'DialogService',
  'ColorService',
  'SessionService',
  require('./controllers')
]);

// ACE Global Defaults
var aceConfig = require('../config.json').editor;

mod.run(['uiAceConfig',
  function(uiAceConfig) {
    uiAceConfig.ace = {};
    angular.extend(uiAceConfig.ace, {
      fontSize: aceConfig.fontSize,
      useSoftTabs: aceConfig.useSoftTabs,
      tabSize: aceConfig.tabSize,
      useWrapMode: aceConfig.useWrapMode,
      showPrintMargin: aceConfig.showPrintMargin,
      showGutter: aceConfig.showGutter,
      mode: 'javascript',
      require: ['ace/ext/language_tools'],
      advanced: {
        enableSnippets: true,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true
      }
    });
  }
]);

mod.config([
  '$stateProvider',
  '$locationProvider',
  '$urlRouterProvider',
  require('./config')
]);

mod.config( ['$compileProvider', function($compileProvider){
  $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob):|data:image\/)/);
}]);

mod.directive('ngScrolled', [
  '$parse',
  require('./directives/scrolled')
]);

mod.directive('ngScrolledIntoView', [
  '$timeout',
  require('./directives/scrolled-into-view')
]);

mod.directive('negate', [
  require('./directives/negate')
]);

mod.directive('focus', [
  '$timeout',
  require('./directives/focus')
]);

module.exports = mod;
