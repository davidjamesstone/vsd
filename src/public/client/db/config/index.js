module.exports = function($stateProvider) {

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
          templateUrl: '/html/key.html'
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

};