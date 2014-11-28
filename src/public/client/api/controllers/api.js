var Api = require('../models/api');


module.exports = function($scope, $state, $dialog, apiPromise) {

  /*
   * Create mock Api
   */
  var api = new Api('demo');
  var homeCtrl = api.addController({
    name: 'Home',
    code: '// require modules \n var path = require(\'path\')'
  });
  var requiresAuthenticationHandler = homeCtrl.addHandler({
    name: 'requiresAuthentication',
    code: "function(req, res, next) { next(req.query.authme ? null : new Error('Unauthorized')); }"
  });
  var loggerHandler = homeCtrl.addHandler({
    name: 'logger',
    code: "function(req, res, next) { console.log(req);\n\tnext(); }"
  });
  var getHomePageHandler = homeCtrl.addHandler({
    name: 'getHomePage',
    code: "function(req, res) { res.send('home'); }"
  });

  var userCtrl = api.addController({
    name: 'User',
    code: ''
  });
  var saveUserHandler = userCtrl.addHandler({
    name: 'saveUser',
    code: 'function(req, res) { req.send("saveUser"); }'
  });

  var root = api.root;
  root.addAction('GET', [getHomePageHandler]);
  root.addAction('ALL', [loggerHandler]);

  var contactUs = root.addChild('/contact-us');
  contactUs.addAction('GET');
  contactUs.addAction('POST');

  var user = root.addChild('/user');
  user.addAction('GET');
  user.addAction('POST');

  var userItem = user.addChild('/:id');
  userItem.addAction('GET');
  userItem.addAction('PUT');


  $scope.api = api;

  $scope.addController = function() {
    var newController = api.addController();

    $state.go('api.controller.item', {
      controllerId: newController.id
    });

  };

  $scope.deleteController = function(controller) {

    $dialog.confirm({
      title: 'Delete Controller',
      message: 'Are you sure you want to delete controller [' + controller.name + ']?'
    }).then(function() {
      var parent = controller.controller;
      parent.removeController(controller);
      // go to parent controller
      $state.go('api.controller', {
        controllerId: parent.id
      });
    });
  };

  $scope.routes = [api.root];
  $scope.controllers = api.controllers;

};