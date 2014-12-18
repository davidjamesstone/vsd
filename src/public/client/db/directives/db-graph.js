var cookie = require('cookie');
var dagre = require('dagre');
var Graph = dagre.graphlib.Graph;

module.exports = function($timeout) {
  return {
    templateUrl: '/client/db/directives/db-graph.html',
    link: function($scope, $element) {

      var model = $scope.model;

      // Create a graph from the JSON
      var g = new dagreD3.graphlib.Graph({
        directed: true,
        multigraph: true,
        compound: false
      }).setGraph({});

      model.schemas.forEach(function(schema) {
        
        g.setNode(schema.id, {
          label: schema.name,
          style: schema.installed ? 'fill: #d9edf7' : 'fill: #f5f5f5'
        });

        schema.schemaReferences().forEach(function(key) {
          var keyName = key.name;
          g.setEdge(schema.id, key.keys.schema.id, {
            label: key.isArray() ? '[' + keyName + ']' : keyName
          }, key.name);
        });
      });

      // Set some general styles
      g.nodes().forEach(function(v) {
        var node = g.node(v);
        node.rx = node.ry = 5;
      });

      var svgEl = $element.find('svg')[0];
      var svg = d3.select(svgEl);
      var inner = svg.select('g');

      // Set up zoom support
      var zoom = d3.behavior.zoom().on('zoom', function() {
        inner.attr('transform', 'translate(' + d3.event.translate + ')' +
          'scale(' + d3.event.scale + ')');
      });
      svg.call(zoom);

      // Create the renderer
      var render = new dagreD3.render();

      // Run the renderer. This is what draws the final graph.
      render(inner, g);

      // Center the graph
      var initialScale = 1;
      var svgWidth = svgEl.getBoundingClientRect().width; //svg.attr('width')
      zoom
        .translate([(svgWidth - g.graph().width * initialScale) / 2, 20])
        .scale(initialScale)
        .event(svg);

      //svg.attr('height', g.graph().height * initialScale + 40);

    }
  };
};