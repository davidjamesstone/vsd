app.directive('dbDiagram', ['$timeout', function($timeout) {
  return {
    templateUrl: '/html/directives/db-diagram.html',
    link: function(scope, element) {

      var model = scope.model;

      $timeout(function() {


        var states = model.schemas.map(function(item) {
          return {
            id: item.id,
            value: {
              label: item.name
            }
          };
        });

        var edges = model.schemaReferences().map(function(item) {
          return {
            u: item.keys.schema.id,
            v: item.ref(),
            value: {
              label: item.name
            }
          };
        });


        // Create a graph from the JSON
        var g = dagreD3.json.decode(states, edges);

        // Create the renderer
        var renderer = new dagreD3.Renderer();

        // Set up an SVG group so that we can translate the final graph.
        var svgEl = element.find('svg')[0];
        var svg = d3.select(svgEl);
        //var svg = d3.select(document.createElementNS(d3.ns.prefix.svg, 'svg'));
        //svg.selectAll('*').remove();
        var svgGroup = svg.append('g');

        var style = window.getComputedStyle(svgEl);

        console.log("width", svgEl.width);
        console.log("height", svgEl.height);

        //svg.attr("width", style.width).attr("height", element.height);
  //element.append(svg[0][0]);
        // Set initial zoom to 75%
        var initialScale = 0.75;
        var oldZoom = renderer.zoom();
        renderer.zoom(function(graph, svg) {
          var zoom = oldZoom(graph, svg);

          // We must set the zoom and then trigger the zoom event to synchronize
          // D3 and the DOM.
          zoom.scale(initialScale).event(svg);
          return zoom;
        });

        // Run the renderer. This is what draws the final graph.
        var layout = renderer.run(g, svgGroup);

        // Center the graph
        var xCenterOffset = (svg.attr('width') - layout.graph().width * initialScale) / 2;
        svgGroup.attr('transform', 'translate(' + xCenterOffset + ', 20)');
        //svg.attr('height', layout.graph().height * initialScale + 40);

      }, 500);




    }
  };
}]);
