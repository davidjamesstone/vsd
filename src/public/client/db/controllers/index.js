var utils = require('../../../../shared/utils');
var db = require('../models/db');
var DbFinder = require('../models/db-finder');
var dagre = require('dagre');

module.exports = function($scope, $http, $state, $modal, dialog, $interval) {

  var dbData = JSON.parse($scope.$parent.editorSession.getValue());

  var model = Object.create(db);

  model.initialize(dbData);

  $scope.model = model;

  function checkModelStateUpdateSession() {
    var oldValue = $scope.session.data.doc.getValue();
    var newValue = angular.toJson(JSON.parse(model.toJson()), true);
    if (newValue !== oldValue) {

      console.log('set dbmodel schemas changed');
      $scope.session.data.doc.setValue(newValue);
    }
  }

  var stopWatch = $interval(checkModelStateUpdateSession, 2000, 0, false); // false so we don't invokeApply

  var dbFinder = new DbFinder(model);

  $scope.dbFinder = dbFinder;

  $scope.$on('$destroy', function() {
    $interval.cancel(stopWatch);
  });

  $scope.modelAsJson = function() {
    // strip out $$hashKey etc.
    return angular.toJson(JSON.parse(model.toJson()), true);
  };

  $scope.showModelJson = function() {
    $modal.open({
      templateUrl: '/client/db/views/db-json.html',
      scope: $scope,
      size: 'lg'
    });
  };

  $scope.showModelDiagram = function() {
    $modal.open({
      templateUrl: '/client/db/views/db-diagram.html',
      scope: $scope,
      size: 'lg'
    });
  };

  $scope.gotoPath = function(obj) {

      dbFinder.active = obj;
      return;


    var isModel = obj.schemas;
    var isSchema = !isModel && !obj.type;

    if (isModel) {

      // $state.go('db.model.edit', {
      //   modelName: obj.name
      // });

    } else if (isSchema) {

      // $state.go('db.model.schema', {
      //   schemaId: obj.id
      // });

    } else {

      // $state.go('db.model.schema.key', {
      //   schemaId: obj.keys.schema.id,
      //   keyId: obj.id
      // });

    }


  };

  var idempotentialize = function(f){
      var previous;
      var f_idempotent = function(){
         var ret = f();
         if (angular.equals(ret, previous)) {
            ret = previous;
         }
         previous = ret;
         return ret;
      };
      return f_idempotent;
  };

  $scope.errors = idempotentialize(function() {
    return model.errors();
  });

  $scope.availableDocumentRefs = idempotentialize(function() {
    return model.availableDocumentRefs();
  });

  $scope.availableChildDocumentRefs = idempotentialize(function() {
    return model.availableChildDocumentRefs();
  });

  $scope.addSchema = function() {

    var schema = model.createSchema();
    schema.initialize({
      id: utils.getuid(),
      name: 'NewSchemaName',
      installed: true,
      keys: {
        items: [{
          'name': 'FirstKeyName',
          'type': 'String',
          'def': {
            'required': true
          }
        }]
      }
    });

    model.insertSchema(schema);

    $scope.gotoPath(schema);
  };

  $scope.deleteSchema = function(schema) {

    dialog.confirm({
      title: 'Delete schema',
      message: 'Are you sure you want to delete schema [' + schema.dotPath() + ']?'
    }).then(function() {
      schema.db.removeSchema(schema);
      // go to model root
      $scope.gotoPath(schema.db);
    });
  };

  $scope.addKey = function(keys, sibling, insertAbove) {

    // add a new Key, optionally passing a relative sibling to insert next to, either above or below

    var data = {
      id: utils.getuid(),
      name: 'NewKeyName',
      type: 'String',
      def: {
        required: true,
        trim: true
      }
    };

    var key;
    if (sibling) {
      var siblingIndex = sibling.keys.items.indexOf(sibling);
      var index = insertAbove ? siblingIndex : ++siblingIndex;
      key = keys.insertKey(data, index);
    } else {
      key = keys.addKey(data);
    }

    $scope.gotoPath(key);
  };

  $scope.deleteKey = function(key) {
    dialog.confirm({
      title: 'Delete key',
      message: 'Are you sure you want to delete key [' + key.dotPath() + ']?'
    }).then(function() {
      key.keys.deleteKey(key);
      $scope.gotoPath(key.keys.schema);
    });
  };

  $scope.moveKeyUp = function(key) {
    var items = key.keys.items;
    var index = items.indexOf(key);
    items.move(index, --index);
  };

  $scope.moveKeyDown = function(key) {
    var items = key.keys.items;
    var index = items.indexOf(key);
    items.move(index, ++index);
  };

};
