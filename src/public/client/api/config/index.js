module.exports = function($stateProvider) {

    $stateProvider
      .state('api', {
        abstract: true,
        url: '/api/:apiName',
        controller: 'ApiCtrl',
        templateUrl: '/client/api/views/api.html',
        resolve: {
          apiPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return window._api; //$http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('api.home', {
        url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (api/)
        templateUrl: '/client/api/views/api-home.html'
      })
      .state('api.diagram', {
        url: '/diagram',
        controller: 'ApiDiagramCtrl',
        templateUrl: '/client/api/views/diagram.html'
      })
      .state('api.controller', {
        abstract: true,
        url: '/controller'
      })
      .state('api.controller.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/client/api/views/controller-home.html'
          }
        }
      })
      .state('api.controller.item', {
        url: '/:controllerId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiControllerCtrl',
            templateUrl: '/client/api/views/controller.html'
          }
        }
      })
      .state('api.controller.item.handler', {
        url: '/:handlerId',
        views: {
          'x@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/client/api/views/handler.html'
          },
          'handler@api.controller.item': { // Target the ui-view='handler' in parent state 'api.controller.item',
            controller: 'ApiHandlerCtrl',
            templateUrl: '/client/api/views/handler.html'
          }
        }
      })
      .state('api.route', {
        abstract: true,
        url: '/route'
      })
      .state('api.route.home', {
        url: '',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            templateUrl: '/client/api/views/route-home.html'
          }
        }
      })
      .state('api.route.item', {
        url: '/:routeId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiRouteCtrl',
            templateUrl: '/client/api/views/route.html'
          }
        }
      })
      .state('api.route.item.action', {
        url: '/:actionId',
        views: {
          '@api': { // Target the ui-view='' in parent state 'api',
            controller: 'ApiActionCtrl',
            templateUrl: '/client/api/views/action.html'
          }
        }
      });


};
