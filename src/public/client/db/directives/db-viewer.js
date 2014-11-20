var cookie = require('cookie');
var dagre = require('dagre');
var Graph = dagre.graphlib.Graph;

module.exports = function($timeout) {
  return {
    templateUrl: '/client/db/directives/db-viewer.html',
    link: function($scope, $element) {

      var model = $scope.model;
      // var state = cookie.parse(document.cookie)[model.id];
      // var uiState = angular.fromJson(state) || {};
      //
      // $scope.onDrop = function($event) {
      //   var $el = $event.drag;
      //   var schema = $el.scope().schema;
      //   var schemaId = schema.id;
      //
      //   uiState[schemaId] = {
      //     x: $el.css('left'),
      //     y: $el.css('top')
      //   };
      //
      //   var cookieExpires = new Date();
      //   cookieExpires.setFullYear(cookieExpires.getFullYear() + 1);
      //   document.cookie = cookie.serialize(model.id, angular.toJson(uiState), {
      //     expires: cookieExpires
      //   });
      // };
      //
      // $scope.getPos = function(schemaId) {
      //   return uiState[schemaId];
      // };

      $scope.getRefs = function(schema) {
        if (schema.isSchemaReferenced()) {
          return schema.schemaReferences().map(function(item) {
            return item.id;
          });
        }
      };

      function positionGraph() {

        // Create a new directed graph
        var g = new Graph();

        // Set an object for the graph label
        g.setGraph({});

        // Default to assigning a new object as a label for each new edge.
        g.setDefaultEdgeLabel(function() {
          return {};
        });

        // Automatically label each of the nodes
        model.schemas.forEach(function(schema) {

          var el = document.getElementById(schema.id);
          var style = window.getComputedStyle(el);

          var width = parseInt(style.width, 10);
          var height = parseInt(style.height, 10);

          g.setNode(schema.id, {
            label: schema.name,
            width: width,
            height: height
          });

        });

        model.schemaReferences().forEach(function(key) {
          g.setEdge(key.keys.schema.id, key.ref());
        });

        var grp = dagre.layout(g, {
          rankdir: 'LR',
        });

        g.nodes().forEach(function(v) {
          console.log("Node " + v + ": " + JSON.stringify(g.node(v)));

          var el = document.getElementById(v);
          var node = g.node(v);

          var top = node.y - (node.height / 2);
          var left = node.x - (node.width / 2);

          el.style.top = top + 50 + 'px';
          el.style.left = left + 50 + 'px';

        });

      }

      $timeout(positionGraph, 350);

      // // draggable config
      // var draggable = {
      //   handle: '.panel-heading',
      //   //containment:'parent',
      //   stop: function(e) {
      //
      //     var schemaId = e.el.id;
      //
      //     uiState[schemaId] = {
      //       x: e.pos[0] + 'px',
      //       y: e.pos[1] + 'px'
      //     };
      //
      //     var cookieExpires = new Date();
      //     cookieExpires.setFullYear(cookieExpires.getFullYear() + 1);
      //     document.cookie = cookie.serialize(model.id, angular.toJson(uiState), {
      //       expires: cookieExpires
      //     });
      //
      //   }
      // };

      var plumb = jsPlumb.getInstance({});

      plumb.bind('ready', function() {
        //plumb.Defaults.Container = document.body;//$element[0];//

        function render() {
          //makeDraggable();
          renderConnections();
        }

        // function makeDraggable() {
        //   plumb.draggable(document.querySelectorAll('.panel.schema'), draggable);
        // }

        function renderConnections() {
          console.log('renderConnections');

          var connections = angular.element(document.querySelectorAll('[connect]:not([connect=""])'));
          console.log(connections.length);

          for (var i = 0; i < connections.length; i++) {
            var connection = connections[i];
            var $connection = angular.element(connections[i]);
            var source = $connection[0];
            var ends = angular.fromJson($connection.attr('connect'));

            console.log(ends.length);


            for (var j = 0; j < ends.length; j++) {
              var target = document.getElementById(ends[j]);

              plumb.connect({
                source: source,
                target: target,
                anchors: [
                  [
                    'Top', 'Bottom'
                  ],
                  [
                    'Left', 'Right'
                  ]
                ],
                endpoint: 'Blank',
                paintStyle: {
                  strokeStyle: '#3c8dbc',
                  lineWidth: 3
                },
                overlays: [
                  ['PlainArrow', {
                    location: 1,
                    width: 15,
                    length: 12,
                    direction: 1
                  }]
                ]
              });

            }
          }

        }



        $timeout(render, 1250);



      });

      $scope.$on('$destroy', function() {
        plumb.detachEveryConnection();
      });
    }
  };
};
