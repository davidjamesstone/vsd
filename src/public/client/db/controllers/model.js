module.exports = function() {
};

// var utils = require('../../../../shared/utils');
// var db = require('../models/db');
// var dagre = require('dagre');

// module.exports = function($scope, $http, $state, $modal, $dialog, $timeout, modelPromise) {

//   var model = Object.create(db);

//   model.initialize(modelPromise.data);

//   $scope.model = model;

//   // scope data
//   $scope.data = {
//     isCollapsed: false
//   };


//   //$timeout(autoLayout);

//   $scope.$watch('model.name', function(oldValue, newValue) {
//     console.log('rename db model file');
//   });

//   $scope.modelAsJson = function() {
//     // strip out $$hashKey etc.
//     return angular.toJson(JSON.parse(model.toJson()), true);
//   };

//   $scope.showModelJson = function() {
//     $modal.open({
//       templateUrl: '/html/db-json.html',
//       scope: $scope
//     });
//   };

//   $scope.showModelDiagram = function() {
//     $modal.open({
//       templateUrl: '/html/db-diagram.html',
//       scope: $scope
//     });
//   };

//   $scope.gotoPath = function(obj) {

//     var isModel = obj.schemas;
//     var isSchema = !isModel && !obj.type;

//     if (isModel) {

//       $state.go('db.model.edit', {
//         modelName: obj.name
//       });

//     } else if (isSchema) {

//       $state.go('db.model.schema', {
//         schemaId: obj.id
//       });

//     } else {

//       $state.go('db.model.schema.key', {
//         schemaId: obj.keys.schema.id,
//         keyId: obj.id
//       });

//     }


//   };

//   var idempotentialize = function(f) {
//     var previous;
//     var f_idempotent = function() {
//       var ret = f();
//       ret = previous;
//       if (angular.equals(ret, previous)) {}
//       previous = ret;
//       return ret;
//     };
//     return f_idempotent;
//   };

//   $scope.errors = idempotentialize(function() {
//     return model.errors();
//   });

//   $scope.addSchema = function() {

//     var schema = model.createSchema();
//     schema.initialize({
//       id: utils.getuid(),
//       name: 'NewSchemaName',
//       installed: true,
//       keys: {
//         items: [{
//           'name': 'FirstKeyName',
//           'type': 'String',
//           'def': {
//             'required': true
//           }
//         }]
//       }
//     });

//     model.insertSchema(schema);

//     $scope.gotoPath(schema);
//   };

//   $scope.deleteSchema = function(schema) {

//     $dialog.confirm({
//       title: 'Delete schema',
//       message: 'Are you sure you want to delete schema [' + schema.dotPath() + ']?'
//     }).then(function() {
//       schema.db.removeSchema(schema);
//       // go to model root
//       $scope.gotoPath(schema.db);
//     });
//   };

//   $scope.addKey = function(keys, sibling, insertAbove) {

//     // add a new Key, optionally passing a relative sibling to insert next to either above or below

//     var data = {
//       id: utils.getuid(),
//       name: 'NewKeyName',
//       type: 'String',
//       def: {}
//     };

//     var key;
//     if (sibling) {
//       var siblingIndex = sibling.keys.items.indexOf(sibling);
//       var index = insertAbove ? siblingIndex : ++siblingIndex;
//       key = keys.insertKey(data, index);
//     } else {
//       key = keys.addKey(data);
//     }

//     $scope.gotoPath(key);
//   };

//   $scope.deleteKey = function(key) {
//     $dialog.confirm({
//       title: 'Delete key',
//       message: 'Are you sure you want to delete key [' + key.dotPath() + ']?'
//     }).then(function() {
//       key.keys.deleteKey(key);
//       $scope.gotoPath(key.keys.schema);
//     });
//   };

//   $scope.moveKeyUp = function(key) {
//     var items = key.keys.items;
//     var index = items.indexOf(key);
//     items.move(index, --index);
//   };

//   $scope.moveKeyDown = function(key) {
//     var items = key.keys.items;
//     var index = items.indexOf(key);
//     items.move(index, ++index);
//   };

//   function autoLayout() {
//     var g = new dagre.Digraph();
//     var edges = [];
//     var el;
//     // $('.schema').each(function() {
//     //     var $this = $(this);
//     //     var id = $(this).attr('id');
//     //     g.addNode(id, {
//     //         label: id,
//     //         width: $this.width(),
//     //         height: $this.height()
//     //     });
//     //     $this.find('.key-header[data-ref]').each(function() {
//     //         edges.push([$(this).data('ref'), id]);
//     //     });
//     // });

//     for (var i = 0; i < model.schemas.length; i++) {
//       var schema = model.schemas[i];
//       var id = schema.id;
//       // el = document.getElementById(id);
//       // el.style.position = 'absolute';
//       // var style = window.getComputedStyle(el, null);

//       g.addNode(id, {
//         label: id,
//         // width: parseFloat(style.width),
//         // height: parseFloat(style.height)
//       });

//       var schemaReferences = schema.schemaReferences();
//       for (var j = 0; j < schemaReferences.length; j++) {
//         edges.push([schemaReferences[j].keys.schema.id, id]);
//       }

//     }


//     for (var k = 0; k < edges.length; k++) {
//       g.addEdge(null, edges[k][0], edges[k][1]);
//     }

//     var layout = dagre.layout().nodeSep(20).edgeSep(5).rankSep(20).run(g);
//     // var layout = dagre.layout().run(g);
//     layout.eachNode(function(u, value) {

//       // el = document.getElementById(u);
//       // el.style.top = value.y + 'px';
//       // el.style.left = value.x + 'px';
//       // el.style.width = '200px';
//       // el.style.height = '300px';
//       // el.style.overflow = 'hidden';

//     });
//   }

// };
