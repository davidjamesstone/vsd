/* global d3 */
var dagreD3 = require('dagre-d3')

module.exports = function (el, model) {
  // Create a graph from the JSON
  var g = new dagreD3.graphlib.Graph({
    directed: true,
    multigraph: true,
    compound: false
  }).setGraph({})

  model.schemas.forEach(function (schema) {
    g.setNode(schema.id, {
      label: schema.name,
      style: !schema.isVirtual ? 'fill: #d9edf7' : 'fill: #f5f5f5'
    })
  })

  model.schemas.forEach(function (schema) {
    schema.getChildKeys().forEach(function (key) {
      var ref = key.ref()
      if (ref) {
        var keyName = key.name
        var label = key.isArray ? '[' + keyName + ']' : keyName
        var existing = g.edge(schema.id, ref)
        if (existing) {
          existing.label += ', ' + label
        } else {
          g.setEdge(schema.id, ref, {
            label: label
          })
        }
      }
    })
  })

  // Set some general styles
  g.nodes().forEach(function (v) {
    var node = g.node(v)
    node.rx = node.ry = 5
  })

  var svgEl = el
  var svg = d3.select(svgEl)
  var inner = svg.select('g')

  // Set up zoom support
  var zoom = d3.behavior.zoom().on('zoom', function () {
    inner.attr('transform', 'translate(' + d3.event.translate + ')' +
      'scale(' + d3.event.scale + ')')
  })
  svg.call(zoom)

  // Create the renderer
  // eslint-disable-next-line new-cap
  var render = new dagreD3.render()

  // Run the renderer. This is what draws the final graph.
  render(inner, g)

  // Center the graph
  var initialScale = 1
  var svgWidth = svgEl.getBoundingClientRect().width // svg.attr('width')
  zoom
    .translate([(svgWidth - g.graph().width * initialScale) / 2, 20])
    .scale(initialScale)
    .event(svg)
}
