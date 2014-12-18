module.exports = function($stateProvider) {

    $stateProvider
      .state('app.fs.finder.file.router', {
        abstract: true,
        views: {
          '@app.fs.finder.file': { // Target the ui-view='' in parent state 'app',
            templateUrl: '/client/router/views/router.html',
            controller: 'RouterCtrl'
          }
        }
      })
      .state('app.fs.finder.file.router.home', {
        templateUrl: '/client/router/views/router-home.html'
      })
      .state('app.fs.finder.file.router.home.diagram', {
        views: {
          '@app.fs.finder.file.router': { // Target the ui-view='' in parent state 'router',
            controller: 'RouterDiagramCtrl',
            templateUrl: '/client/router/views/diagram.html'
          }
        }
      })
      .state('app.fs.finder.file.router.home.controller.item', {
        params: { 'controllerId': {}, 'path': {}}, // Must supply the parent param 'path'
        views: {
          '@app.fs.finder.file.router': { // Target the ui-view='' in parent state 'router',
            controller: 'RouterControllerCtrl',
            templateUrl: '/client/router/views/controller.html'
          }
        }
      })
      .state('app.fs.finder.file.router.home.route', {
        abstract: true,
      })
      .state('app.fs.finder.file.router.home.route.item', {
        params: { 'routeId': {}, 'path': {}}, // Must supply the parent param 'path'
        views: {
          '@app.fs.finder.file.router': { // Target the ui-view='' in parent state 'router',
            controller: 'RouterRouteCtrl',
            templateUrl: '/client/router/views/route.html'
          }
        }
      })
      .state('app.fs.finder.file.router.home.route.item.action', {
        //url: '/:actionId',
        params: { 'routeId': {}, 'path': {}, 'actionId': {}}, // Must supply the parent param 'path'
        views: {
          '@app.fs.finder.file.router.home.route.item': { // Target the ui-view='' in parent state 'router',
            controller: 'RouterActionCtrl',
            templateUrl: '/client/router/views/action.html'
          }
        }
      });
};
