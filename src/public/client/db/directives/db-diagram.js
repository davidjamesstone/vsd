var dagre = require('dagre');
var Graph = dagre.graphlib.Graph;

module.exports = function($timeout) {
  return {
    templateUrl: '/client/db/directives/db-diagram.html',
    link: function($scope, element) {

      var model = $scope.model;

      function getNodeGraph() {

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

          g.setNode(schema.id, {
            label: schema.name,
            width: 100,
            height: 100
          });

        });

        model.schemaReferences().forEach(function(key) {
          g.setEdge(key.keys.schema.id, key.ref());
        });

        dagre.layout(g, {
          rankdir: 'LR'
        });

        return g;
      }

      $timeout(function() {

        var graph = getNodeGraph();

        var nodes = graph.nodes().map(function(v) {
          console.log("Node " + v + ": " + JSON.stringify(graph.node(v)));

          var node = graph.node(v);

          var top = node.y - (node.height / 2);
          var left = node.x - (node.width / 2);

          return {
            x: left,
            y: top,
            width: node.width,
            height: node.height,
            label: node.label
          };
        });

        $scope.nodes = nodes;


      });

    }
  };
};
