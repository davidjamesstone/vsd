var app = angular.module('app', ['ngRoute', 'ui.router', 'ui.bootstrap', 'ui.ace']);

app.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

  //$locationProvider.html5Mode(true);

  // For any unmatched url, redirect to /db
  $urlRouterProvider.otherwise("/db");

  // Now set up the states
  $stateProvider
    .state('db', {
      url: '/db',
      controller: 'DbCtrl',
      templateUrl: '/html/db.html'
    })
    .state('db.model', {
      abstract: true,
      url: '/:modelName',
      controller: 'ModelCtrl',
      templateUrl: '/html/model.html',
      resolve: {
        modelPromise: ['$http', '$stateParams',
          function($http, $stateParams) {
            return $http.get('/' + $stateParams.modelName + '.json');
          }
        ]
      }
    })
    .state('db.model.edit', {
      url: '', // Default. Will be used in place of abstract parent in the case of hitting the index (db.model/)
      templateUrl: '/html/model-editor.html'
    })
    .state('db.model.schema', {
      url: '/:schemaId',
      views: {
        '@db.model': { // Target the ui-view='' in parent state 'db.model'
          controller: 'SchemaCtrl',
          templateUrl: '/html/schema.html'
        }
      }
    })
    .state('db.model.schema.key', {
      url: '/:keyId',
      views: {
        '@db.model': { // Target the ui-view='' in parent state 'db.model'
          controller: 'KeyCtrl',
          templateUrl: '/html/key.html',
        }
      }
    })
    .state('db.model.diagram', {
      url: '#diagram',
      views: {
        '@db.model': { // Target the ui-view='' in parent state 'db.model'
          //controller: 'DiagramCtrl',
          templateUrl: '/html/db-diagram.html'
        }
      }
    });

  function registerApiStates($stateProvider) {

    $stateProvider
      .state('api', {
        url: '/api/:apiName',
        controller: 'ApiCtrl',
        templateUrl: '/html/api/api.html',
        resolve: {
          apiPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return window._api; //$http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('api.diagram', {
        url: '/diagram',
        controller: 'ApiDiagramCtrl',
        templateUrl: '/html/api/diagram.html'
      })
      .state('api.route', {
        url: '/:routeId',
        controller: 'ApiRouteCtrl',
        templateUrl: '/html/api/route.html'
      })
      .state('api.controller.route', {
        url: '/:routeId',
        views: {
          'secondary@api': { // Target the ui-view='secondary' in root state 'api'
            controller: 'ApiRouteCtrl',
            templateUrl: '/html/api/route.html'
          }
        }
      });
  }



  registerApiStates($stateProvider);

});

module.exports = app;
