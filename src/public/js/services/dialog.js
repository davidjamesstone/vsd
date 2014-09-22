app.service('dialog', ['$modal',
  function($modal) {

    var service = {};

    service.alert = function(data) {

      return $modal.open({
        templateUrl: '/html/alert.html',
        controller: 'AlertCtrl',
        resolve: {
          data: function() {
            return {
              title: data.title,
              message: data.message
            };
          }
        }
      }).result;

    };

    service.confirm = function(data) {

      return $modal.open({
        templateUrl: '/html/confirm.html',
        controller: 'ConfirmCtrl',
        resolve: {
          data: function() {
            return {
              title: data.title,
              message: data.message
            };
          }
        }
      }).result;

    };

    service.prompt = function(data) {

      return $modal.open({
        templateUrl: '/html/prompt.html',
        controller: 'PromptCtrl',
        resolve: {
          data: function() {
            return {
              title: data.title,
              message: data.message,
              defaultValue: data.defaultValue,
              placeholder: data.placeholder
            };
          }
        }
      }).result;

    };

    return service;

  }
]);
