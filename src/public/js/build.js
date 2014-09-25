(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
Copyright (c) 2012-2013 Chris Pettitt

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
exports.Digraph = require("graphlib").Digraph;
exports.Graph = require("graphlib").Graph;
exports.layout = require("./lib/layout");
exports.version = require("./lib/version");
exports.debug = require("./lib/debug");

},{"./lib/debug":2,"./lib/layout":3,"./lib/version":18,"graphlib":24}],2:[function(require,module,exports){
'use strict';

var util = require('./util');

/**
 * Renders a graph in a stringified DOT format that indicates the ordering of
 * nodes by layer. Circles represent normal nodes. Diamons represent dummy
 * nodes. While we try to put nodes in clusters, it appears that graphviz
 * does not respect this because we're later using subgraphs for ordering nodes
 * in each layer.
 */
exports.dotOrdering = function(g) {
  var ordering = util.ordering(g.filterNodes(util.filterNonSubgraphs(g)));
  var result = 'digraph {';

  function dfs(u) {
    var children = g.children(u);
    if (children.length) {
      result += 'subgraph cluster_' + u + ' {';
      result += 'label="' + u + '";';
      children.forEach(function(v) {
        dfs(v);
      });
      result += '}';
    } else {
      result += u;
      if (g.node(u).dummy) {
        result += ' [shape=diamond]';
      }
      result += ';';
    }
  }

  g.children(null).forEach(dfs);

  ordering.forEach(function(layer) {
    result += 'subgraph { rank=same; edge [style="invis"];';
    result += layer.join('->');
    result += '}';
  });

  g.eachEdge(function(e, u, v) {
    result += u + '->' + v + ';';
  });

  result += '}';

  return result;
};

},{"./util":17}],3:[function(require,module,exports){
'use strict';

var util = require('./util'),
    rank = require('./rank'),
    order = require('./order'),
    CGraph = require('graphlib').CGraph,
    CDigraph = require('graphlib').CDigraph;

module.exports = function() {
  // External configuration
  var config = {
    // How much debug information to include?
    debugLevel: 0,
    // Max number of sweeps to perform in order phase
    orderMaxSweeps: order.DEFAULT_MAX_SWEEPS,
    // Use network simplex algorithm in ranking
    rankSimplex: false,
    // Rank direction. Valid values are (TB, LR)
    rankDir: 'TB'
  };

  // Phase functions
  var position = require('./position')();

  // This layout object
  var self = {};

  self.orderIters = util.propertyAccessor(self, config, 'orderMaxSweeps');

  self.rankSimplex = util.propertyAccessor(self, config, 'rankSimplex');

  self.nodeSep = delegateProperty(position.nodeSep);
  self.edgeSep = delegateProperty(position.edgeSep);
  self.universalSep = delegateProperty(position.universalSep);
  self.rankSep = delegateProperty(position.rankSep);
  self.rankDir = util.propertyAccessor(self, config, 'rankDir');
  self.debugAlignment = delegateProperty(position.debugAlignment);

  self.debugLevel = util.propertyAccessor(self, config, 'debugLevel', function(x) {
    util.log.level = x;
    position.debugLevel(x);
  });

  self.run = util.time('Total layout', run);

  self._normalize = normalize;

  return self;

  /*
   * Constructs an adjacency graph using the nodes and edges specified through
   * config. For each node and edge we add a property `dagre` that contains an
   * object that will hold intermediate and final layout information. Some of
   * the contents include:
   *
   *  1) A generated ID that uniquely identifies the object.
   *  2) Dimension information for nodes (copied from the source node).
   *  3) Optional dimension information for edges.
   *
   * After the adjacency graph is constructed the code no longer needs to use
   * the original nodes and edges passed in via config.
   */
  function initLayoutGraph(inputGraph) {
    var g = new CDigraph();

    inputGraph.eachNode(function(u, value) {
      if (value === undefined) value = {};
      g.addNode(u, {
        width: value.width,
        height: value.height
      });
      if (value.hasOwnProperty('rank')) {
        g.node(u).prefRank = value.rank;
      }
    });

    // Set up subgraphs
    if (inputGraph.parent) {
      inputGraph.nodes().forEach(function(u) {
        g.parent(u, inputGraph.parent(u));
      });
    }

    inputGraph.eachEdge(function(e, u, v, value) {
      if (value === undefined) value = {};
      var newValue = {
        e: e,
        minLen: value.minLen || 1,
        width: value.width || 0,
        height: value.height || 0,
        points: []
      };

      g.addEdge(null, u, v, newValue);
    });

    // Initial graph attributes
    var graphValue = inputGraph.graph() || {};
    g.graph({
      rankDir: graphValue.rankDir || config.rankDir,
      orderRestarts: graphValue.orderRestarts
    });

    return g;
  }

  function run(inputGraph) {
    var rankSep = self.rankSep();
    var g;
    try {
      // Build internal graph
      g = util.time('initLayoutGraph', initLayoutGraph)(inputGraph);

      if (g.order() === 0) {
        return g;
      }

      // Make space for edge labels
      g.eachEdge(function(e, s, t, a) {
        a.minLen *= 2;
      });
      self.rankSep(rankSep / 2);

      // Determine the rank for each node. Nodes with a lower rank will appear
      // above nodes of higher rank.
      util.time('rank.run', rank.run)(g, config.rankSimplex);

      // Normalize the graph by ensuring that every edge is proper (each edge has
      // a length of 1). We achieve this by adding dummy nodes to long edges,
      // thus shortening them.
      util.time('normalize', normalize)(g);

      // Order the nodes so that edge crossings are minimized.
      util.time('order', order)(g, config.orderMaxSweeps);

      // Find the x and y coordinates for every node in the graph.
      util.time('position', position.run)(g);

      // De-normalize the graph by removing dummy nodes and augmenting the
      // original long edges with coordinate information.
      util.time('undoNormalize', undoNormalize)(g);

      // Reverses points for edges that are in a reversed state.
      util.time('fixupEdgePoints', fixupEdgePoints)(g);

      // Restore delete edges and reverse edges that were reversed in the rank
      // phase.
      util.time('rank.restoreEdges', rank.restoreEdges)(g);

      // Construct final result graph and return it
      return util.time('createFinalGraph', createFinalGraph)(g, inputGraph.isDirected());
    } finally {
      self.rankSep(rankSep);
    }
  }

  /*
   * This function is responsible for 'normalizing' the graph. The process of
   * normalization ensures that no edge in the graph has spans more than one
   * rank. To do this it inserts dummy nodes as needed and links them by adding
   * dummy edges. This function keeps enough information in the dummy nodes and
   * edges to ensure that the original graph can be reconstructed later.
   *
   * This method assumes that the input graph is cycle free.
   */
  function normalize(g) {
    var dummyCount = 0;
    g.eachEdge(function(e, s, t, a) {
      var sourceRank = g.node(s).rank;
      var targetRank = g.node(t).rank;
      if (sourceRank + 1 < targetRank) {
        for (var u = s, rank = sourceRank + 1, i = 0; rank < targetRank; ++rank, ++i) {
          var v = '_D' + (++dummyCount);
          var node = {
            width: a.width,
            height: a.height,
            edge: { id: e, source: s, target: t, attrs: a },
            rank: rank,
            dummy: true
          };

          // If this node represents a bend then we will use it as a control
          // point. For edges with 2 segments this will be the center dummy
          // node. For edges with more than two segments, this will be the
          // first and last dummy node.
          if (i === 0) node.index = 0;
          else if (rank + 1 === targetRank) node.index = 1;

          g.addNode(v, node);
          g.addEdge(null, u, v, {});
          u = v;
        }
        g.addEdge(null, u, t, {});
        g.delEdge(e);
      }
    });
  }

  /*
   * Reconstructs the graph as it was before normalization. The positions of
   * dummy nodes are used to build an array of points for the original 'long'
   * edge. Dummy nodes and edges are removed.
   */
  function undoNormalize(g) {
    g.eachNode(function(u, a) {
      if (a.dummy) {
        if ('index' in a) {
          var edge = a.edge;
          if (!g.hasEdge(edge.id)) {
            g.addEdge(edge.id, edge.source, edge.target, edge.attrs);
          }
          var points = g.edge(edge.id).points;
          points[a.index] = { x: a.x, y: a.y, ul: a.ul, ur: a.ur, dl: a.dl, dr: a.dr };
        }
        g.delNode(u);
      }
    });
  }

  /*
   * For each edge that was reversed during the `acyclic` step, reverse its
   * array of points.
   */
  function fixupEdgePoints(g) {
    g.eachEdge(function(e, s, t, a) { if (a.reversed) a.points.reverse(); });
  }

  function createFinalGraph(g, isDirected) {
    var out = isDirected ? new CDigraph() : new CGraph();
    out.graph(g.graph());
    g.eachNode(function(u, value) { out.addNode(u, value); });
    g.eachNode(function(u) { out.parent(u, g.parent(u)); });
    g.eachEdge(function(e, u, v, value) {
      out.addEdge(value.e, u, v, value);
    });

    // Attach bounding box information
    var maxX = 0, maxY = 0;
    g.eachNode(function(u, value) {
      if (!g.children(u).length) {
        maxX = Math.max(maxX, value.x + value.width / 2);
        maxY = Math.max(maxY, value.y + value.height / 2);
      }
    });
    g.eachEdge(function(e, u, v, value) {
      var maxXPoints = Math.max.apply(Math, value.points.map(function(p) { return p.x; }));
      var maxYPoints = Math.max.apply(Math, value.points.map(function(p) { return p.y; }));
      maxX = Math.max(maxX, maxXPoints + value.width / 2);
      maxY = Math.max(maxY, maxYPoints + value.height / 2);
    });
    out.graph().width = maxX;
    out.graph().height = maxY;

    return out;
  }

  /*
   * Given a function, a new function is returned that invokes the given
   * function. The return value from the function is always the `self` object.
   */
  function delegateProperty(f) {
    return function() {
      if (!arguments.length) return f();
      f.apply(null, arguments);
      return self;
    };
  }
};


},{"./order":4,"./position":9,"./rank":10,"./util":17,"graphlib":24}],4:[function(require,module,exports){
'use strict';

var util = require('./util'),
    crossCount = require('./order/crossCount'),
    initLayerGraphs = require('./order/initLayerGraphs'),
    initOrder = require('./order/initOrder'),
    sortLayer = require('./order/sortLayer');

module.exports = order;

// The maximum number of sweeps to perform before finishing the order phase.
var DEFAULT_MAX_SWEEPS = 24;
order.DEFAULT_MAX_SWEEPS = DEFAULT_MAX_SWEEPS;

/*
 * Runs the order phase with the specified `graph, `maxSweeps`, and
 * `debugLevel`. If `maxSweeps` is not specified we use `DEFAULT_MAX_SWEEPS`.
 * If `debugLevel` is not set we assume 0.
 */
function order(g, maxSweeps) {
  if (arguments.length < 2) {
    maxSweeps = DEFAULT_MAX_SWEEPS;
  }

  var restarts = g.graph().orderRestarts || 0;

  var layerGraphs = initLayerGraphs(g);
  // TODO: remove this when we add back support for ordering clusters
  layerGraphs.forEach(function(lg) {
    lg = lg.filterNodes(function(u) { return !g.children(u).length; });
  });

  var iters = 0,
      currentBestCC,
      allTimeBestCC = Number.MAX_VALUE,
      allTimeBest = {};

  function saveAllTimeBest() {
    g.eachNode(function(u, value) { allTimeBest[u] = value.order; });
  }

  for (var j = 0; j < Number(restarts) + 1 && allTimeBestCC !== 0; ++j) {
    currentBestCC = Number.MAX_VALUE;
    initOrder(g, restarts > 0);

    util.log(2, 'Order phase start cross count: ' + g.graph().orderInitCC);

    var i, lastBest, cc;
    for (i = 0, lastBest = 0; lastBest < 4 && i < maxSweeps && currentBestCC > 0; ++i, ++lastBest, ++iters) {
      sweep(g, layerGraphs, i);
      cc = crossCount(g);
      if (cc < currentBestCC) {
        lastBest = 0;
        currentBestCC = cc;
        if (cc < allTimeBestCC) {
          saveAllTimeBest();
          allTimeBestCC = cc;
        }
      }
      util.log(3, 'Order phase start ' + j + ' iter ' + i + ' cross count: ' + cc);
    }
  }

  Object.keys(allTimeBest).forEach(function(u) {
    if (!g.children || !g.children(u).length) {
      g.node(u).order = allTimeBest[u];
    }
  });
  g.graph().orderCC = allTimeBestCC;

  util.log(2, 'Order iterations: ' + iters);
  util.log(2, 'Order phase best cross count: ' + g.graph().orderCC);
}

function predecessorWeights(g, nodes) {
  var weights = {};
  nodes.forEach(function(u) {
    weights[u] = g.inEdges(u).map(function(e) {
      return g.node(g.source(e)).order;
    });
  });
  return weights;
}

function successorWeights(g, nodes) {
  var weights = {};
  nodes.forEach(function(u) {
    weights[u] = g.outEdges(u).map(function(e) {
      return g.node(g.target(e)).order;
    });
  });
  return weights;
}

function sweep(g, layerGraphs, iter) {
  if (iter % 2 === 0) {
    sweepDown(g, layerGraphs, iter);
  } else {
    sweepUp(g, layerGraphs, iter);
  }
}

function sweepDown(g, layerGraphs) {
  var cg;
  for (var i = 1; i < layerGraphs.length; ++i) {
    cg = sortLayer(layerGraphs[i], cg, predecessorWeights(g, layerGraphs[i].nodes()));
  }
}

function sweepUp(g, layerGraphs) {
  var cg;
  for (var i = layerGraphs.length - 2; i >= 0; --i) {
    sortLayer(layerGraphs[i], cg, successorWeights(g, layerGraphs[i].nodes()));
  }
}

},{"./order/crossCount":5,"./order/initLayerGraphs":6,"./order/initOrder":7,"./order/sortLayer":8,"./util":17}],5:[function(require,module,exports){
'use strict';

var util = require('../util');

module.exports = crossCount;

/*
 * Returns the cross count for the given graph.
 */
function crossCount(g) {
  var cc = 0;
  var ordering = util.ordering(g);
  for (var i = 1; i < ordering.length; ++i) {
    cc += twoLayerCrossCount(g, ordering[i-1], ordering[i]);
  }
  return cc;
}

/*
 * This function searches through a ranked and ordered graph and counts the
 * number of edges that cross. This algorithm is derived from:
 *
 *    W. Barth et al., Bilayer Cross Counting, JGAA, 8(2) 179–194 (2004)
 */
function twoLayerCrossCount(g, layer1, layer2) {
  var indices = [];
  layer1.forEach(function(u) {
    var nodeIndices = [];
    g.outEdges(u).forEach(function(e) { nodeIndices.push(g.node(g.target(e)).order); });
    nodeIndices.sort(function(x, y) { return x - y; });
    indices = indices.concat(nodeIndices);
  });

  var firstIndex = 1;
  while (firstIndex < layer2.length) firstIndex <<= 1;

  var treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;

  var tree = [];
  for (var i = 0; i < treeSize; ++i) { tree[i] = 0; }

  var cc = 0;
  indices.forEach(function(i) {
    var treeIndex = i + firstIndex;
    ++tree[treeIndex];
    while (treeIndex > 0) {
      if (treeIndex % 2) {
        cc += tree[treeIndex + 1];
      }
      treeIndex = (treeIndex - 1) >> 1;
      ++tree[treeIndex];
    }
  });

  return cc;
}

},{"../util":17}],6:[function(require,module,exports){
'use strict';

var nodesFromList = require('graphlib').filter.nodesFromList,
    /* jshint -W079 */
    Set = require('cp-data').Set;

module.exports = initLayerGraphs;

/*
 * This function takes a compound layered graph, g, and produces an array of
 * layer graphs. Each entry in the array represents a subgraph of nodes
 * relevant for performing crossing reduction on that layer.
 */
function initLayerGraphs(g) {
  var ranks = [];

  function dfs(u) {
    if (u === null) {
      g.children(u).forEach(function(v) { dfs(v); });
      return;
    }

    var value = g.node(u);
    value.minRank = ('rank' in value) ? value.rank : Number.MAX_VALUE;
    value.maxRank = ('rank' in value) ? value.rank : Number.MIN_VALUE;
    var uRanks = new Set();
    g.children(u).forEach(function(v) {
      var rs = dfs(v);
      uRanks = Set.union([uRanks, rs]);
      value.minRank = Math.min(value.minRank, g.node(v).minRank);
      value.maxRank = Math.max(value.maxRank, g.node(v).maxRank);
    });

    if ('rank' in value) uRanks.add(value.rank);

    uRanks.keys().forEach(function(r) {
      if (!(r in ranks)) ranks[r] = [];
      ranks[r].push(u);
    });

    return uRanks;
  }
  dfs(null);

  var layerGraphs = [];
  ranks.forEach(function(us, rank) {
    layerGraphs[rank] = g.filterNodes(nodesFromList(us));
  });

  return layerGraphs;
}

},{"cp-data":19,"graphlib":24}],7:[function(require,module,exports){
'use strict';

var crossCount = require('./crossCount'),
    util = require('../util');

module.exports = initOrder;

/*
 * Given a graph with a set of layered nodes (i.e. nodes that have a `rank`
 * attribute) this function attaches an `order` attribute that uniquely
 * arranges each node of each rank. If no constraint graph is provided the
 * order of the nodes in each rank is entirely arbitrary.
 */
function initOrder(g, random) {
  var layers = [];

  g.eachNode(function(u, value) {
    var layer = layers[value.rank];
    if (g.children && g.children(u).length > 0) return;
    if (!layer) {
      layer = layers[value.rank] = [];
    }
    layer.push(u);
  });

  layers.forEach(function(layer) {
    if (random) {
      util.shuffle(layer);
    }
    layer.forEach(function(u, i) {
      g.node(u).order = i;
    });
  });

  var cc = crossCount(g);
  g.graph().orderInitCC = cc;
  g.graph().orderCC = Number.MAX_VALUE;
}

},{"../util":17,"./crossCount":5}],8:[function(require,module,exports){
'use strict';

var util = require('../util'),
    Digraph = require('graphlib').Digraph,
    topsort = require('graphlib').alg.topsort,
    nodesFromList = require('graphlib').filter.nodesFromList;

module.exports = sortLayer;

function sortLayer(g, cg, weights) {
  weights = adjustWeights(g, weights);
  var result = sortLayerSubgraph(g, null, cg, weights);

  result.list.forEach(function(u, i) {
    g.node(u).order = i;
  });
  return result.constraintGraph;
}

function sortLayerSubgraph(g, sg, cg, weights) {
  cg = cg ? cg.filterNodes(nodesFromList(g.children(sg))) : new Digraph();

  var nodeData = {};
  g.children(sg).forEach(function(u) {
    if (g.children(u).length) {
      nodeData[u] = sortLayerSubgraph(g, u, cg, weights);
      nodeData[u].firstSG = u;
      nodeData[u].lastSG = u;
    } else {
      var ws = weights[u];
      nodeData[u] = {
        degree: ws.length,
        barycenter: util.sum(ws) / ws.length,
        order: g.node(u).order,
        orderCount: 1,
        list: [u]
      };
    }
  });

  resolveViolatedConstraints(g, cg, nodeData);

  var keys = Object.keys(nodeData);
  keys.sort(function(x, y) {
    return nodeData[x].barycenter - nodeData[y].barycenter ||
           nodeData[x].order - nodeData[y].order;
  });

  var result =  keys.map(function(u) { return nodeData[u]; })
                    .reduce(function(lhs, rhs) { return mergeNodeData(g, lhs, rhs); });
  return result;
}

function mergeNodeData(g, lhs, rhs) {
  var cg = mergeDigraphs(lhs.constraintGraph, rhs.constraintGraph);

  if (lhs.lastSG !== undefined && rhs.firstSG !== undefined) {
    if (cg === undefined) {
      cg = new Digraph();
    }
    if (!cg.hasNode(lhs.lastSG)) { cg.addNode(lhs.lastSG); }
    cg.addNode(rhs.firstSG);
    cg.addEdge(null, lhs.lastSG, rhs.firstSG);
  }

  return {
    degree: lhs.degree + rhs.degree,
    barycenter: (lhs.barycenter * lhs.degree + rhs.barycenter * rhs.degree) /
                (lhs.degree + rhs.degree),
    order: (lhs.order * lhs.orderCount + rhs.order * rhs.orderCount) /
           (lhs.orderCount + rhs.orderCount),
    orderCount: lhs.orderCount + rhs.orderCount,
    list: lhs.list.concat(rhs.list),
    firstSG: lhs.firstSG !== undefined ? lhs.firstSG : rhs.firstSG,
    lastSG: rhs.lastSG !== undefined ? rhs.lastSG : lhs.lastSG,
    constraintGraph: cg
  };
}

function mergeDigraphs(lhs, rhs) {
  if (lhs === undefined) return rhs;
  if (rhs === undefined) return lhs;

  lhs = lhs.copy();
  rhs.nodes().forEach(function(u) { lhs.addNode(u); });
  rhs.edges().forEach(function(e, u, v) { lhs.addEdge(null, u, v); });
  return lhs;
}

function resolveViolatedConstraints(g, cg, nodeData) {
  // Removes nodes `u` and `v` from `cg` and makes any edges incident on them
  // incident on `w` instead.
  function collapseNodes(u, v, w) {
    // TODO original paper removes self loops, but it is not obvious when this would happen
    cg.inEdges(u).forEach(function(e) {
      cg.delEdge(e);
      cg.addEdge(null, cg.source(e), w);
    });

    cg.outEdges(v).forEach(function(e) {
      cg.delEdge(e);
      cg.addEdge(null, w, cg.target(e));
    });

    cg.delNode(u);
    cg.delNode(v);
  }

  var violated;
  while ((violated = findViolatedConstraint(cg, nodeData)) !== undefined) {
    var source = cg.source(violated),
        target = cg.target(violated);

    var v;
    while ((v = cg.addNode(null)) && g.hasNode(v)) {
      cg.delNode(v);
    }

    // Collapse barycenter and list
    nodeData[v] = mergeNodeData(g, nodeData[source], nodeData[target]);
    delete nodeData[source];
    delete nodeData[target];

    collapseNodes(source, target, v);
    if (cg.incidentEdges(v).length === 0) { cg.delNode(v); }
  }
}

function findViolatedConstraint(cg, nodeData) {
  var us = topsort(cg);
  for (var i = 0; i < us.length; ++i) {
    var u = us[i];
    var inEdges = cg.inEdges(u);
    for (var j = 0; j < inEdges.length; ++j) {
      var e = inEdges[j];
      if (nodeData[cg.source(e)].barycenter >= nodeData[u].barycenter) {
        return e;
      }
    }
  }
}

// Adjust weights so that they fall in the range of 0..|N|-1. If a node has no
// weight assigned then set its adjusted weight to its current position. This
// allows us to better retain the origiinal position of nodes without neighbors.
function adjustWeights(g, weights) {
  var minW = Number.MAX_VALUE,
      maxW = 0,
      adjusted = {};
  g.eachNode(function(u) {
    if (g.children(u).length) return;

    var ws = weights[u];
    if (ws.length) {
      minW = Math.min(minW, util.min(ws));
      maxW = Math.max(maxW, util.max(ws));
    }
  });

  var rangeW = (maxW - minW);
  g.eachNode(function(u) {
    if (g.children(u).length) return;

    var ws = weights[u];
    if (!ws.length) {
      adjusted[u] = [g.node(u).order];
    } else {
      adjusted[u] = ws.map(function(w) {
        if (rangeW) {
          return (w - minW) * (g.order() - 1) / rangeW;
        } else {
          return g.order() - 1 / 2;
        }
      });
    }
  });

  return adjusted;
}

},{"../util":17,"graphlib":24}],9:[function(require,module,exports){
'use strict';

var util = require('./util');

/*
 * The algorithms here are based on Brandes and Köpf, "Fast and Simple
 * Horizontal Coordinate Assignment".
 */
module.exports = function() {
  // External configuration
  var config = {
    nodeSep: 50,
    edgeSep: 10,
    universalSep: null,
    rankSep: 30
  };

  var self = {};

  self.nodeSep = util.propertyAccessor(self, config, 'nodeSep');
  self.edgeSep = util.propertyAccessor(self, config, 'edgeSep');
  // If not null this separation value is used for all nodes and edges
  // regardless of their widths. `nodeSep` and `edgeSep` are ignored with this
  // option.
  self.universalSep = util.propertyAccessor(self, config, 'universalSep');
  self.rankSep = util.propertyAccessor(self, config, 'rankSep');
  self.debugLevel = util.propertyAccessor(self, config, 'debugLevel');

  self.run = run;

  return self;

  function run(g) {
    g = g.filterNodes(util.filterNonSubgraphs(g));

    var layering = util.ordering(g);

    var conflicts = findConflicts(g, layering);

    var xss = {};
    ['u', 'd'].forEach(function(vertDir) {
      if (vertDir === 'd') layering.reverse();

      ['l', 'r'].forEach(function(horizDir) {
        if (horizDir === 'r') reverseInnerOrder(layering);

        var dir = vertDir + horizDir;
        var align = verticalAlignment(g, layering, conflicts, vertDir === 'u' ? 'predecessors' : 'successors');
        xss[dir]= horizontalCompaction(g, layering, align.pos, align.root, align.align);

        if (config.debugLevel >= 3)
          debugPositioning(vertDir + horizDir, g, layering, xss[dir]);

        if (horizDir === 'r') flipHorizontally(xss[dir]);

        if (horizDir === 'r') reverseInnerOrder(layering);
      });

      if (vertDir === 'd') layering.reverse();
    });

    balance(g, layering, xss);

    g.eachNode(function(v) {
      var xs = [];
      for (var alignment in xss) {
        var alignmentX = xss[alignment][v];
        posXDebug(alignment, g, v, alignmentX);
        xs.push(alignmentX);
      }
      xs.sort(function(x, y) { return x - y; });
      posX(g, v, (xs[1] + xs[2]) / 2);
    });

    // Align y coordinates with ranks
    var y = 0, reverseY = g.graph().rankDir === 'BT' || g.graph().rankDir === 'RL';
    layering.forEach(function(layer) {
      var maxHeight = util.max(layer.map(function(u) { return height(g, u); }));
      y += maxHeight / 2;
      layer.forEach(function(u) {
        posY(g, u, reverseY ? -y : y);
      });
      y += maxHeight / 2 + config.rankSep;
    });

    // Translate layout so that top left corner of bounding rectangle has
    // coordinate (0, 0).
    var minX = util.min(g.nodes().map(function(u) { return posX(g, u) - width(g, u) / 2; }));
    var minY = util.min(g.nodes().map(function(u) { return posY(g, u) - height(g, u) / 2; }));
    g.eachNode(function(u) {
      posX(g, u, posX(g, u) - minX);
      posY(g, u, posY(g, u) - minY);
    });
  }

  /*
   * Generate an ID that can be used to represent any undirected edge that is
   * incident on `u` and `v`.
   */
  function undirEdgeId(u, v) {
    return u < v
      ? u.toString().length + ':' + u + '-' + v
      : v.toString().length + ':' + v + '-' + u;
  }

  function findConflicts(g, layering) {
    var conflicts = {}, // Set of conflicting edge ids
        pos = {},       // Position of node in its layer
        prevLayer,
        currLayer,
        k0,     // Position of the last inner segment in the previous layer
        l,      // Current position in the current layer (for iteration up to `l1`)
        k1;     // Position of the next inner segment in the previous layer or
                // the position of the last element in the previous layer

    if (layering.length <= 2) return conflicts;

    function updateConflicts(v) {
      var k = pos[v];
      if (k < k0 || k > k1) {
        conflicts[undirEdgeId(currLayer[l], v)] = true;
      }
    }

    layering[1].forEach(function(u, i) { pos[u] = i; });
    for (var i = 1; i < layering.length - 1; ++i) {
      prevLayer = layering[i];
      currLayer = layering[i+1];
      k0 = 0;
      l = 0;

      // Scan current layer for next node that is incident to an inner segement
      // between layering[i+1] and layering[i].
      for (var l1 = 0; l1 < currLayer.length; ++l1) {
        var u = currLayer[l1]; // Next inner segment in the current layer or
                               // last node in the current layer
        pos[u] = l1;
        k1 = undefined;

        if (g.node(u).dummy) {
          var uPred = g.predecessors(u)[0];
          // Note: In the case of self loops and sideways edges it is possible
          // for a dummy not to have a predecessor.
          if (uPred !== undefined && g.node(uPred).dummy)
            k1 = pos[uPred];
        }
        if (k1 === undefined && l1 === currLayer.length - 1)
          k1 = prevLayer.length - 1;

        if (k1 !== undefined) {
          for (; l <= l1; ++l) {
            g.predecessors(currLayer[l]).forEach(updateConflicts);
          }
          k0 = k1;
        }
      }
    }

    return conflicts;
  }

  function verticalAlignment(g, layering, conflicts, relationship) {
    var pos = {},   // Position for a node in its layer
        root = {},  // Root of the block that the node participates in
        align = {}; // Points to the next node in the block or, if the last
                    // element in the block, points to the first block's root

    layering.forEach(function(layer) {
      layer.forEach(function(u, i) {
        root[u] = u;
        align[u] = u;
        pos[u] = i;
      });
    });

    layering.forEach(function(layer) {
      var prevIdx = -1;
      layer.forEach(function(v) {
        var related = g[relationship](v), // Adjacent nodes from the previous layer
            mid;                          // The mid point in the related array

        if (related.length > 0) {
          related.sort(function(x, y) { return pos[x] - pos[y]; });
          mid = (related.length - 1) / 2;
          related.slice(Math.floor(mid), Math.ceil(mid) + 1).forEach(function(u) {
            if (align[v] === v) {
              if (!conflicts[undirEdgeId(u, v)] && prevIdx < pos[u]) {
                align[u] = v;
                align[v] = root[v] = root[u];
                prevIdx = pos[u];
              }
            }
          });
        }
      });
    });

    return { pos: pos, root: root, align: align };
  }

  // This function deviates from the standard BK algorithm in two ways. First
  // it takes into account the size of the nodes. Second it includes a fix to
  // the original algorithm that is described in Carstens, "Node and Label
  // Placement in a Layered Layout Algorithm".
  function horizontalCompaction(g, layering, pos, root, align) {
    var sink = {},       // Mapping of node id -> sink node id for class
        maybeShift = {}, // Mapping of sink node id -> { class node id, min shift }
        shift = {},      // Mapping of sink node id -> shift
        pred = {},       // Mapping of node id -> predecessor node (or null)
        xs = {};         // Calculated X positions

    layering.forEach(function(layer) {
      layer.forEach(function(u, i) {
        sink[u] = u;
        maybeShift[u] = {};
        if (i > 0)
          pred[u] = layer[i - 1];
      });
    });

    function updateShift(toShift, neighbor, delta) {
      if (!(neighbor in maybeShift[toShift])) {
        maybeShift[toShift][neighbor] = delta;
      } else {
        maybeShift[toShift][neighbor] = Math.min(maybeShift[toShift][neighbor], delta);
      }
    }

    function placeBlock(v) {
      if (!(v in xs)) {
        xs[v] = 0;
        var w = v;
        do {
          if (pos[w] > 0) {
            var u = root[pred[w]];
            placeBlock(u);
            if (sink[v] === v) {
              sink[v] = sink[u];
            }
            var delta = sep(g, pred[w]) + sep(g, w);
            if (sink[v] !== sink[u]) {
              updateShift(sink[u], sink[v], xs[v] - xs[u] - delta);
            } else {
              xs[v] = Math.max(xs[v], xs[u] + delta);
            }
          }
          w = align[w];
        } while (w !== v);
      }
    }

    // Root coordinates relative to sink
    util.values(root).forEach(function(v) {
      placeBlock(v);
    });

    // Absolute coordinates
    // There is an assumption here that we've resolved shifts for any classes
    // that begin at an earlier layer. We guarantee this by visiting layers in
    // order.
    layering.forEach(function(layer) {
      layer.forEach(function(v) {
        xs[v] = xs[root[v]];
        if (v === root[v] && v === sink[v]) {
          var minShift = 0;
          if (v in maybeShift && Object.keys(maybeShift[v]).length > 0) {
            minShift = util.min(Object.keys(maybeShift[v])
                                 .map(function(u) {
                                      return maybeShift[v][u] + (u in shift ? shift[u] : 0);
                                      }
                                 ));
          }
          shift[v] = minShift;
        }
      });
    });

    layering.forEach(function(layer) {
      layer.forEach(function(v) {
        xs[v] += shift[sink[root[v]]] || 0;
      });
    });

    return xs;
  }

  function findMinCoord(g, layering, xs) {
    return util.min(layering.map(function(layer) {
      var u = layer[0];
      return xs[u];
    }));
  }

  function findMaxCoord(g, layering, xs) {
    return util.max(layering.map(function(layer) {
      var u = layer[layer.length - 1];
      return xs[u];
    }));
  }

  function balance(g, layering, xss) {
    var min = {},                            // Min coordinate for the alignment
        max = {},                            // Max coordinate for the alginment
        smallestAlignment,
        shift = {};                          // Amount to shift a given alignment

    function updateAlignment(v) {
      xss[alignment][v] += shift[alignment];
    }

    var smallest = Number.POSITIVE_INFINITY;
    for (var alignment in xss) {
      var xs = xss[alignment];
      min[alignment] = findMinCoord(g, layering, xs);
      max[alignment] = findMaxCoord(g, layering, xs);
      var w = max[alignment] - min[alignment];
      if (w < smallest) {
        smallest = w;
        smallestAlignment = alignment;
      }
    }

    // Determine how much to adjust positioning for each alignment
    ['u', 'd'].forEach(function(vertDir) {
      ['l', 'r'].forEach(function(horizDir) {
        var alignment = vertDir + horizDir;
        shift[alignment] = horizDir === 'l'
            ? min[smallestAlignment] - min[alignment]
            : max[smallestAlignment] - max[alignment];
      });
    });

    // Find average of medians for xss array
    for (alignment in xss) {
      g.eachNode(updateAlignment);
    }
  }

  function flipHorizontally(xs) {
    for (var u in xs) {
      xs[u] = -xs[u];
    }
  }

  function reverseInnerOrder(layering) {
    layering.forEach(function(layer) {
      layer.reverse();
    });
  }

  function width(g, u) {
    switch (g.graph().rankDir) {
      case 'LR': return g.node(u).height;
      case 'RL': return g.node(u).height;
      default:   return g.node(u).width;
    }
  }

  function height(g, u) {
    switch(g.graph().rankDir) {
      case 'LR': return g.node(u).width;
      case 'RL': return g.node(u).width;
      default:   return g.node(u).height;
    }
  }

  function sep(g, u) {
    if (config.universalSep !== null) {
      return config.universalSep;
    }
    var w = width(g, u);
    var s = g.node(u).dummy ? config.edgeSep : config.nodeSep;
    return (w + s) / 2;
  }

  function posX(g, u, x) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u).y;
      } else {
        g.node(u).y = x;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u).x;
      } else {
        g.node(u).x = x;
      }
    }
  }

  function posXDebug(name, g, u, x) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u)[name];
      } else {
        g.node(u)[name] = x;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u)[name];
      } else {
        g.node(u)[name] = x;
      }
    }
  }

  function posY(g, u, y) {
    if (g.graph().rankDir === 'LR' || g.graph().rankDir === 'RL') {
      if (arguments.length < 3) {
        return g.node(u).x;
      } else {
        g.node(u).x = y;
      }
    } else {
      if (arguments.length < 3) {
        return g.node(u).y;
      } else {
        g.node(u).y = y;
      }
    }
  }

  function debugPositioning(align, g, layering, xs) {
    layering.forEach(function(l, li) {
      var u, xU;
      l.forEach(function(v) {
        var xV = xs[v];
        if (u) {
          var s = sep(g, u) + sep(g, v);
          if (xV - xU < s)
            console.log('Position phase: sep violation. Align: ' + align + '. Layer: ' + li + '. ' +
              'U: ' + u + ' V: ' + v + '. Actual sep: ' + (xV - xU) + ' Expected sep: ' + s);
        }
        u = v;
        xU = xV;
      });
    });
  }
};

},{"./util":17}],10:[function(require,module,exports){
'use strict';

var util = require('./util'),
    acyclic = require('./rank/acyclic'),
    initRank = require('./rank/initRank'),
    feasibleTree = require('./rank/feasibleTree'),
    constraints = require('./rank/constraints'),
    simplex = require('./rank/simplex'),
    components = require('graphlib').alg.components,
    filter = require('graphlib').filter;

exports.run = run;
exports.restoreEdges = restoreEdges;

/*
 * Heuristic function that assigns a rank to each node of the input graph with
 * the intent of minimizing edge lengths, while respecting the `minLen`
 * attribute of incident edges.
 *
 * Prerequisites:
 *
 *  * Each edge in the input graph must have an assigned 'minLen' attribute
 */
function run(g, useSimplex) {
  expandSelfLoops(g);

  // If there are rank constraints on nodes, then build a new graph that
  // encodes the constraints.
  util.time('constraints.apply', constraints.apply)(g);

  expandSidewaysEdges(g);

  // Reverse edges to get an acyclic graph, we keep the graph in an acyclic
  // state until the very end.
  util.time('acyclic', acyclic)(g);

  // Convert the graph into a flat graph for ranking
  var flatGraph = g.filterNodes(util.filterNonSubgraphs(g));

  // Assign an initial ranking using DFS.
  initRank(flatGraph);

  // For each component improve the assigned ranks.
  components(flatGraph).forEach(function(cmpt) {
    var subgraph = flatGraph.filterNodes(filter.nodesFromList(cmpt));
    rankComponent(subgraph, useSimplex);
  });

  // Relax original constraints
  util.time('constraints.relax', constraints.relax(g));

  // When handling nodes with constrained ranks it is possible to end up with
  // edges that point to previous ranks. Most of the subsequent algorithms assume
  // that edges are pointing to successive ranks only. Here we reverse any "back
  // edges" and mark them as such. The acyclic algorithm will reverse them as a
  // post processing step.
  util.time('reorientEdges', reorientEdges)(g);
}

function restoreEdges(g) {
  acyclic.undo(g);
}

/*
 * Expand self loops into three dummy nodes. One will sit above the incident
 * node, one will be at the same level, and one below. The result looks like:
 *
 *         /--<--x--->--\
 *     node              y
 *         \--<--z--->--/
 *
 * Dummy nodes x, y, z give us the shape of a loop and node y is where we place
 * the label.
 *
 * TODO: consolidate knowledge of dummy node construction.
 * TODO: support minLen = 2
 */
function expandSelfLoops(g) {
  g.eachEdge(function(e, u, v, a) {
    if (u === v) {
      var x = addDummyNode(g, e, u, v, a, 0, false),
          y = addDummyNode(g, e, u, v, a, 1, true),
          z = addDummyNode(g, e, u, v, a, 2, false);
      g.addEdge(null, x, u, {minLen: 1, selfLoop: true});
      g.addEdge(null, x, y, {minLen: 1, selfLoop: true});
      g.addEdge(null, u, z, {minLen: 1, selfLoop: true});
      g.addEdge(null, y, z, {minLen: 1, selfLoop: true});
      g.delEdge(e);
    }
  });
}

function expandSidewaysEdges(g) {
  g.eachEdge(function(e, u, v, a) {
    if (u === v) {
      var origEdge = a.originalEdge,
          dummy = addDummyNode(g, origEdge.e, origEdge.u, origEdge.v, origEdge.value, 0, true);
      g.addEdge(null, u, dummy, {minLen: 1});
      g.addEdge(null, dummy, v, {minLen: 1});
      g.delEdge(e);
    }
  });
}

function addDummyNode(g, e, u, v, a, index, isLabel) {
  return g.addNode(null, {
    width: isLabel ? a.width : 0,
    height: isLabel ? a.height : 0,
    edge: { id: e, source: u, target: v, attrs: a },
    dummy: true,
    index: index
  });
}

function reorientEdges(g) {
  g.eachEdge(function(e, u, v, value) {
    if (g.node(u).rank > g.node(v).rank) {
      g.delEdge(e);
      value.reversed = true;
      g.addEdge(e, v, u, value);
    }
  });
}

function rankComponent(subgraph, useSimplex) {
  var spanningTree = feasibleTree(subgraph);

  if (useSimplex) {
    util.log(1, 'Using network simplex for ranking');
    simplex(subgraph, spanningTree);
  }
  normalize(subgraph);
}

function normalize(g) {
  var m = util.min(g.nodes().map(function(u) { return g.node(u).rank; }));
  g.eachNode(function(u, node) { node.rank -= m; });
}

},{"./rank/acyclic":11,"./rank/constraints":12,"./rank/feasibleTree":13,"./rank/initRank":14,"./rank/simplex":16,"./util":17,"graphlib":24}],11:[function(require,module,exports){
'use strict';

var util = require('../util');

module.exports = acyclic;
module.exports.undo = undo;

/*
 * This function takes a directed graph that may have cycles and reverses edges
 * as appropriate to break these cycles. Each reversed edge is assigned a
 * `reversed` attribute with the value `true`.
 *
 * There should be no self loops in the graph.
 */
function acyclic(g) {
  var onStack = {},
      visited = {},
      reverseCount = 0;
  
  function dfs(u) {
    if (u in visited) return;
    visited[u] = onStack[u] = true;
    g.outEdges(u).forEach(function(e) {
      var t = g.target(e),
          value;

      if (u === t) {
        console.error('Warning: found self loop "' + e + '" for node "' + u + '"');
      } else if (t in onStack) {
        value = g.edge(e);
        g.delEdge(e);
        value.reversed = true;
        ++reverseCount;
        g.addEdge(e, t, u, value);
      } else {
        dfs(t);
      }
    });

    delete onStack[u];
  }

  g.eachNode(function(u) { dfs(u); });

  util.log(2, 'Acyclic Phase: reversed ' + reverseCount + ' edge(s)');

  return reverseCount;
}

/*
 * Given a graph that has had the acyclic operation applied, this function
 * undoes that operation. More specifically, any edge with the `reversed`
 * attribute is again reversed to restore the original direction of the edge.
 */
function undo(g) {
  g.eachEdge(function(e, s, t, a) {
    if (a.reversed) {
      delete a.reversed;
      g.delEdge(e);
      g.addEdge(e, t, s, a);
    }
  });
}

},{"../util":17}],12:[function(require,module,exports){
'use strict';

exports.apply = function(g) {
  function dfs(sg) {
    var rankSets = {};
    g.children(sg).forEach(function(u) {
      if (g.children(u).length) {
        dfs(u);
        return;
      }

      var value = g.node(u),
          prefRank = value.prefRank;
      if (prefRank !== undefined) {
        if (!checkSupportedPrefRank(prefRank)) { return; }

        if (!(prefRank in rankSets)) {
          rankSets.prefRank = [u];
        } else {
          rankSets.prefRank.push(u);
        }

        var newU = rankSets[prefRank];
        if (newU === undefined) {
          newU = rankSets[prefRank] = g.addNode(null, { originalNodes: [] });
          g.parent(newU, sg);
        }

        redirectInEdges(g, u, newU, prefRank === 'min');
        redirectOutEdges(g, u, newU, prefRank === 'max');

        // Save original node and remove it from reduced graph
        g.node(newU).originalNodes.push({ u: u, value: value, parent: sg });
        g.delNode(u);
      }
    });

    addLightEdgesFromMinNode(g, sg, rankSets.min);
    addLightEdgesToMaxNode(g, sg, rankSets.max);
  }

  dfs(null);
};

function checkSupportedPrefRank(prefRank) {
  if (prefRank !== 'min' && prefRank !== 'max' && prefRank.indexOf('same_') !== 0) {
    console.error('Unsupported rank type: ' + prefRank);
    return false;
  }
  return true;
}

function redirectInEdges(g, u, newU, reverse) {
  g.inEdges(u).forEach(function(e) {
    var origValue = g.edge(e),
        value;
    if (origValue.originalEdge) {
      value = origValue;
    } else {
      value =  {
        originalEdge: { e: e, u: g.source(e), v: g.target(e), value: origValue },
        minLen: g.edge(e).minLen
      };
    }

    // Do not reverse edges for self-loops.
    if (origValue.selfLoop) {
      reverse = false;
    }

    if (reverse) {
      // Ensure that all edges to min are reversed
      g.addEdge(null, newU, g.source(e), value);
      value.reversed = true;
    } else {
      g.addEdge(null, g.source(e), newU, value);
    }
  });
}

function redirectOutEdges(g, u, newU, reverse) {
  g.outEdges(u).forEach(function(e) {
    var origValue = g.edge(e),
        value;
    if (origValue.originalEdge) {
      value = origValue;
    } else {
      value =  {
        originalEdge: { e: e, u: g.source(e), v: g.target(e), value: origValue },
        minLen: g.edge(e).minLen
      };
    }

    // Do not reverse edges for self-loops.
    if (origValue.selfLoop) {
      reverse = false;
    }

    if (reverse) {
      // Ensure that all edges from max are reversed
      g.addEdge(null, g.target(e), newU, value);
      value.reversed = true;
    } else {
      g.addEdge(null, newU, g.target(e), value);
    }
  });
}

function addLightEdgesFromMinNode(g, sg, minNode) {
  if (minNode !== undefined) {
    g.children(sg).forEach(function(u) {
      // The dummy check ensures we don't add an edge if the node is involved
      // in a self loop or sideways edge.
      if (u !== minNode && !g.outEdges(minNode, u).length && !g.node(u).dummy) {
        g.addEdge(null, minNode, u, { minLen: 0 });
      }
    });
  }
}

function addLightEdgesToMaxNode(g, sg, maxNode) {
  if (maxNode !== undefined) {
    g.children(sg).forEach(function(u) {
      // The dummy check ensures we don't add an edge if the node is involved
      // in a self loop or sideways edge.
      if (u !== maxNode && !g.outEdges(u, maxNode).length && !g.node(u).dummy) {
        g.addEdge(null, u, maxNode, { minLen: 0 });
      }
    });
  }
}

/*
 * This function "relaxes" the constraints applied previously by the "apply"
 * function. It expands any nodes that were collapsed and assigns the rank of
 * the collapsed node to each of the expanded nodes. It also restores the
 * original edges and removes any dummy edges pointing at the collapsed nodes.
 *
 * Note that the process of removing collapsed nodes also removes dummy edges
 * automatically.
 */
exports.relax = function(g) {
  // Save original edges
  var originalEdges = [];
  g.eachEdge(function(e, u, v, value) {
    var originalEdge = value.originalEdge;
    if (originalEdge) {
      originalEdges.push(originalEdge);
    }
  });

  // Expand collapsed nodes
  g.eachNode(function(u, value) {
    var originalNodes = value.originalNodes;
    if (originalNodes) {
      originalNodes.forEach(function(originalNode) {
        originalNode.value.rank = value.rank;
        g.addNode(originalNode.u, originalNode.value);
        g.parent(originalNode.u, originalNode.parent);
      });
      g.delNode(u);
    }
  });

  // Restore original edges
  originalEdges.forEach(function(edge) {
    g.addEdge(edge.e, edge.u, edge.v, edge.value);
  });
};

},{}],13:[function(require,module,exports){
'use strict';

/* jshint -W079 */
var Set = require('cp-data').Set,
/* jshint +W079 */
    Digraph = require('graphlib').Digraph,
    util = require('../util');

module.exports = feasibleTree;

/*
 * Given an acyclic graph with each node assigned a `rank` attribute, this
 * function constructs and returns a spanning tree. This function may reduce
 * the length of some edges from the initial rank assignment while maintaining
 * the `minLen` specified by each edge.
 *
 * Prerequisites:
 *
 * * The input graph is acyclic
 * * Each node in the input graph has an assigned `rank` attribute
 * * Each edge in the input graph has an assigned `minLen` attribute
 *
 * Outputs:
 *
 * A feasible spanning tree for the input graph (i.e. a spanning tree that
 * respects each graph edge's `minLen` attribute) represented as a Digraph with
 * a `root` attribute on graph.
 *
 * Nodes have the same id and value as that in the input graph.
 *
 * Edges in the tree have arbitrarily assigned ids. The attributes for edges
 * include `reversed`. `reversed` indicates that the edge is a
 * back edge in the input graph.
 */
function feasibleTree(g) {
  var remaining = new Set(g.nodes()),
      tree = new Digraph();

  if (remaining.size() === 1) {
    var root = g.nodes()[0];
    tree.addNode(root, {});
    tree.graph({ root: root });
    return tree;
  }

  function addTightEdges(v) {
    var continueToScan = true;
    g.predecessors(v).forEach(function(u) {
      if (remaining.has(u) && !slack(g, u, v)) {
        if (remaining.has(v)) {
          tree.addNode(v, {});
          remaining.remove(v);
          tree.graph({ root: v });
        }

        tree.addNode(u, {});
        tree.addEdge(null, u, v, { reversed: true });
        remaining.remove(u);
        addTightEdges(u);
        continueToScan = false;
      }
    });

    g.successors(v).forEach(function(w)  {
      if (remaining.has(w) && !slack(g, v, w)) {
        if (remaining.has(v)) {
          tree.addNode(v, {});
          remaining.remove(v);
          tree.graph({ root: v });
        }

        tree.addNode(w, {});
        tree.addEdge(null, v, w, {});
        remaining.remove(w);
        addTightEdges(w);
        continueToScan = false;
      }
    });
    return continueToScan;
  }

  function createTightEdge() {
    var minSlack = Number.MAX_VALUE;
    remaining.keys().forEach(function(v) {
      g.predecessors(v).forEach(function(u) {
        if (!remaining.has(u)) {
          var edgeSlack = slack(g, u, v);
          if (Math.abs(edgeSlack) < Math.abs(minSlack)) {
            minSlack = -edgeSlack;
          }
        }
      });

      g.successors(v).forEach(function(w) {
        if (!remaining.has(w)) {
          var edgeSlack = slack(g, v, w);
          if (Math.abs(edgeSlack) < Math.abs(minSlack)) {
            minSlack = edgeSlack;
          }
        }
      });
    });

    tree.eachNode(function(u) { g.node(u).rank -= minSlack; });
  }

  while (remaining.size()) {
    var nodesToSearch = !tree.order() ? remaining.keys() : tree.nodes();
    for (var i = 0, il = nodesToSearch.length;
         i < il && addTightEdges(nodesToSearch[i]);
         ++i);
    if (remaining.size()) {
      createTightEdge();
    }
  }

  return tree;
}

function slack(g, u, v) {
  var rankDiff = g.node(v).rank - g.node(u).rank;
  var maxMinLen = util.max(g.outEdges(u, v)
                            .map(function(e) { return g.edge(e).minLen; }));
  return rankDiff - maxMinLen;
}

},{"../util":17,"cp-data":19,"graphlib":24}],14:[function(require,module,exports){
'use strict';

var util = require('../util'),
    topsort = require('graphlib').alg.topsort;

module.exports = initRank;

/*
 * Assigns a `rank` attribute to each node in the input graph and ensures that
 * this rank respects the `minLen` attribute of incident edges.
 *
 * Prerequisites:
 *
 *  * The input graph must be acyclic
 *  * Each edge in the input graph must have an assigned 'minLen' attribute
 */
function initRank(g) {
  var sorted = topsort(g);

  sorted.forEach(function(u) {
    var inEdges = g.inEdges(u);
    if (inEdges.length === 0) {
      g.node(u).rank = 0;
      return;
    }

    var minLens = inEdges.map(function(e) {
      return g.node(g.source(e)).rank + g.edge(e).minLen;
    });
    g.node(u).rank = util.max(minLens);
  });
}

},{"../util":17,"graphlib":24}],15:[function(require,module,exports){
'use strict';

module.exports = {
  slack: slack
};

/*
 * A helper to calculate the slack between two nodes (`u` and `v`) given a
 * `minLen` constraint. The slack represents how much the distance between `u`
 * and `v` could shrink while maintaining the `minLen` constraint. If the value
 * is negative then the constraint is currently violated.
 *
  This function requires that `u` and `v` are in `graph` and they both have a
  `rank` attribute.
 */
function slack(graph, u, v, minLen) {
  return Math.abs(graph.node(u).rank - graph.node(v).rank) - minLen;
}

},{}],16:[function(require,module,exports){
'use strict';

var util = require('../util'),
    rankUtil = require('./rankUtil');

module.exports = simplex;

function simplex(graph, spanningTree) {
  // The network simplex algorithm repeatedly replaces edges of
  // the spanning tree with negative cut values until no such
  // edge exists.
  initCutValues(graph, spanningTree);
  while (true) {
    var e = leaveEdge(spanningTree);
    if (e === null) break;
    var f = enterEdge(graph, spanningTree, e);
    exchange(graph, spanningTree, e, f);
  }
}

/*
 * Set the cut values of edges in the spanning tree by a depth-first
 * postorder traversal.  The cut value corresponds to the cost, in
 * terms of a ranking's edge length sum, of lengthening an edge.
 * Negative cut values typically indicate edges that would yield a
 * smaller edge length sum if they were lengthened.
 */
function initCutValues(graph, spanningTree) {
  computeLowLim(spanningTree);

  spanningTree.eachEdge(function(id, u, v, treeValue) {
    treeValue.cutValue = 0;
  });

  // Propagate cut values up the tree.
  function dfs(n) {
    var children = spanningTree.successors(n);
    for (var c in children) {
      var child = children[c];
      dfs(child);
    }
    if (n !== spanningTree.graph().root) {
      setCutValue(graph, spanningTree, n);
    }
  }
  dfs(spanningTree.graph().root);
}

/*
 * Perform a DFS postorder traversal, labeling each node v with
 * its traversal order 'lim(v)' and the minimum traversal number
 * of any of its descendants 'low(v)'.  This provides an efficient
 * way to test whether u is an ancestor of v since
 * low(u) <= lim(v) <= lim(u) if and only if u is an ancestor.
 */
function computeLowLim(tree) {
  var postOrderNum = 0;
  
  function dfs(n) {
    var children = tree.successors(n);
    var low = postOrderNum;
    for (var c in children) {
      var child = children[c];
      dfs(child);
      low = Math.min(low, tree.node(child).low);
    }
    tree.node(n).low = low;
    tree.node(n).lim = postOrderNum++;
  }

  dfs(tree.graph().root);
}

/*
 * To compute the cut value of the edge parent -> child, we consider
 * it and any other graph edges to or from the child.
 *          parent
 *             |
 *           child
 *          /      \
 *         u        v
 */
function setCutValue(graph, tree, child) {
  var parentEdge = tree.inEdges(child)[0];

  // List of child's children in the spanning tree.
  var grandchildren = [];
  var grandchildEdges = tree.outEdges(child);
  for (var gce in grandchildEdges) {
    grandchildren.push(tree.target(grandchildEdges[gce]));
  }

  var cutValue = 0;

  // TODO: Replace unit increment/decrement with edge weights.
  var E = 0;    // Edges from child to grandchild's subtree.
  var F = 0;    // Edges to child from grandchild's subtree.
  var G = 0;    // Edges from child to nodes outside of child's subtree.
  var H = 0;    // Edges from nodes outside of child's subtree to child.

  // Consider all graph edges from child.
  var outEdges = graph.outEdges(child);
  var gc;
  for (var oe in outEdges) {
    var succ = graph.target(outEdges[oe]);
    for (gc in grandchildren) {
      if (inSubtree(tree, succ, grandchildren[gc])) {
        E++;
      }
    }
    if (!inSubtree(tree, succ, child)) {
      G++;
    }
  }

  // Consider all graph edges to child.
  var inEdges = graph.inEdges(child);
  for (var ie in inEdges) {
    var pred = graph.source(inEdges[ie]);
    for (gc in grandchildren) {
      if (inSubtree(tree, pred, grandchildren[gc])) {
        F++;
      }
    }
    if (!inSubtree(tree, pred, child)) {
      H++;
    }
  }

  // Contributions depend on the alignment of the parent -> child edge
  // and the child -> u or v edges.
  var grandchildCutSum = 0;
  for (gc in grandchildren) {
    var cv = tree.edge(grandchildEdges[gc]).cutValue;
    if (!tree.edge(grandchildEdges[gc]).reversed) {
      grandchildCutSum += cv;
    } else {
      grandchildCutSum -= cv;
    }
  }

  if (!tree.edge(parentEdge).reversed) {
    cutValue += grandchildCutSum - E + F - G + H;
  } else {
    cutValue -= grandchildCutSum - E + F - G + H;
  }

  tree.edge(parentEdge).cutValue = cutValue;
}

/*
 * Return whether n is a node in the subtree with the given
 * root.
 */
function inSubtree(tree, n, root) {
  return (tree.node(root).low <= tree.node(n).lim &&
          tree.node(n).lim <= tree.node(root).lim);
}

/*
 * Return an edge from the tree with a negative cut value, or null if there
 * is none.
 */
function leaveEdge(tree) {
  var edges = tree.edges();
  for (var n in edges) {
    var e = edges[n];
    var treeValue = tree.edge(e);
    if (treeValue.cutValue < 0) {
      return e;
    }
  }
  return null;
}

/*
 * The edge e should be an edge in the tree, with an underlying edge
 * in the graph, with a negative cut value.  Of the two nodes incident
 * on the edge, take the lower one.  enterEdge returns an edge with
 * minimum slack going from outside of that node's subtree to inside
 * of that node's subtree.
 */
function enterEdge(graph, tree, e) {
  var source = tree.source(e);
  var target = tree.target(e);
  var lower = tree.node(target).lim < tree.node(source).lim ? target : source;

  // Is the tree edge aligned with the graph edge?
  var aligned = !tree.edge(e).reversed;

  var minSlack = Number.POSITIVE_INFINITY;
  var minSlackEdge;
  if (aligned) {
    graph.eachEdge(function(id, u, v, value) {
      if (id !== e && inSubtree(tree, u, lower) && !inSubtree(tree, v, lower)) {
        var slack = rankUtil.slack(graph, u, v, value.minLen);
        if (slack < minSlack) {
          minSlack = slack;
          minSlackEdge = id;
        }
      }
    });
  } else {
    graph.eachEdge(function(id, u, v, value) {
      if (id !== e && !inSubtree(tree, u, lower) && inSubtree(tree, v, lower)) {
        var slack = rankUtil.slack(graph, u, v, value.minLen);
        if (slack < minSlack) {
          minSlack = slack;
          minSlackEdge = id;
        }
      }
    });
  }

  if (minSlackEdge === undefined) {
    var outside = [];
    var inside = [];
    graph.eachNode(function(id) {
      if (!inSubtree(tree, id, lower)) {
        outside.push(id);
      } else {
        inside.push(id);
      }
    });
    throw new Error('No edge found from outside of tree to inside');
  }

  return minSlackEdge;
}

/*
 * Replace edge e with edge f in the tree, recalculating the tree root,
 * the nodes' low and lim properties and the edges' cut values.
 */
function exchange(graph, tree, e, f) {
  tree.delEdge(e);
  var source = graph.source(f);
  var target = graph.target(f);

  // Redirect edges so that target is the root of its subtree.
  function redirect(v) {
    var edges = tree.inEdges(v);
    for (var i in edges) {
      var e = edges[i];
      var u = tree.source(e);
      var value = tree.edge(e);
      redirect(u);
      tree.delEdge(e);
      value.reversed = !value.reversed;
      tree.addEdge(e, v, u, value);
    }
  }

  redirect(target);

  var root = source;
  var edges = tree.inEdges(root);
  while (edges.length > 0) {
    root = tree.source(edges[0]);
    edges = tree.inEdges(root);
  }

  tree.graph().root = root;

  tree.addEdge(null, source, target, {cutValue: 0});

  initCutValues(graph, tree);

  adjustRanks(graph, tree);
}

/*
 * Reset the ranks of all nodes based on the current spanning tree.
 * The rank of the tree's root remains unchanged, while all other
 * nodes are set to the sum of minimum length constraints along
 * the path from the root.
 */
function adjustRanks(graph, tree) {
  function dfs(p) {
    var children = tree.successors(p);
    children.forEach(function(c) {
      var minLen = minimumLength(graph, p, c);
      graph.node(c).rank = graph.node(p).rank + minLen;
      dfs(c);
    });
  }

  dfs(tree.graph().root);
}

/*
 * If u and v are connected by some edges in the graph, return the
 * minimum length of those edges, as a positive number if v succeeds
 * u and as a negative number if v precedes u.
 */
function minimumLength(graph, u, v) {
  var outEdges = graph.outEdges(u, v);
  if (outEdges.length > 0) {
    return util.max(outEdges.map(function(e) {
      return graph.edge(e).minLen;
    }));
  }

  var inEdges = graph.inEdges(u, v);
  if (inEdges.length > 0) {
    return -util.max(inEdges.map(function(e) {
      return graph.edge(e).minLen;
    }));
  }
}

},{"../util":17,"./rankUtil":15}],17:[function(require,module,exports){
'use strict';

/*
 * Returns the smallest value in the array.
 */
exports.min = function(values) {
  return Math.min.apply(Math, values);
};

/*
 * Returns the largest value in the array.
 */
exports.max = function(values) {
  return Math.max.apply(Math, values);
};

/*
 * Returns `true` only if `f(x)` is `true` for all `x` in `xs`. Otherwise
 * returns `false`. This function will return immediately if it finds a
 * case where `f(x)` does not hold.
 */
exports.all = function(xs, f) {
  for (var i = 0; i < xs.length; ++i) {
    if (!f(xs[i])) {
      return false;
    }
  }
  return true;
};

/*
 * Accumulates the sum of elements in the given array using the `+` operator.
 */
exports.sum = function(values) {
  return values.reduce(function(acc, x) { return acc + x; }, 0);
};

/*
 * Returns an array of all values in the given object.
 */
exports.values = function(obj) {
  return Object.keys(obj).map(function(k) { return obj[k]; });
};

exports.shuffle = function(array) {
  for (var i = array.length - 1; i > 0; --i) {
    var j = Math.floor(Math.random() * (i + 1));
    var aj = array[j];
    array[j] = array[i];
    array[i] = aj;
  }
};

exports.propertyAccessor = function(self, config, field, setHook) {
  return function(x) {
    if (!arguments.length) return config[field];
    config[field] = x;
    if (setHook) setHook(x);
    return self;
  };
};

/*
 * Given a layered, directed graph with `rank` and `order` node attributes,
 * this function returns an array of ordered ranks. Each rank contains an array
 * of the ids of the nodes in that rank in the order specified by the `order`
 * attribute.
 */
exports.ordering = function(g) {
  var ordering = [];
  g.eachNode(function(u, value) {
    var rank = ordering[value.rank] || (ordering[value.rank] = []);
    rank[value.order] = u;
  });
  return ordering;
};

/*
 * A filter that can be used with `filterNodes` to get a graph that only
 * includes nodes that do not contain others nodes.
 */
exports.filterNonSubgraphs = function(g) {
  return function(u) {
    return g.children(u).length === 0;
  };
};

/*
 * Returns a new function that wraps `func` with a timer. The wrapper logs the
 * time it takes to execute the function.
 *
 * The timer will be enabled provided `log.level >= 1`.
 */
function time(name, func) {
  return function() {
    var start = new Date().getTime();
    try {
      return func.apply(null, arguments);
    } finally {
      log(1, name + ' time: ' + (new Date().getTime() - start) + 'ms');
    }
  };
}
time.enabled = false;

exports.time = time;

/*
 * A global logger with the specification `log(level, message, ...)` that
 * will log a message to the console if `log.level >= level`.
 */
function log(level) {
  if (log.level >= level) {
    console.log.apply(console, Array.prototype.slice.call(arguments, 1));
  }
}
log.level = 0;

exports.log = log;

},{}],18:[function(require,module,exports){
module.exports = '0.4.6';

},{}],19:[function(require,module,exports){
exports.Set = require('./lib/Set');
exports.PriorityQueue = require('./lib/PriorityQueue');
exports.version = require('./lib/version');

},{"./lib/PriorityQueue":20,"./lib/Set":21,"./lib/version":23}],20:[function(require,module,exports){
module.exports = PriorityQueue;

/**
 * A min-priority queue data structure. This algorithm is derived from Cormen,
 * et al., "Introduction to Algorithms". The basic idea of a min-priority
 * queue is that you can efficiently (in O(1) time) get the smallest key in
 * the queue. Adding and removing elements takes O(log n) time. A key can
 * have its priority decreased in O(log n) time.
 */
function PriorityQueue() {
  this._arr = [];
  this._keyIndices = {};
}

/**
 * Returns the number of elements in the queue. Takes `O(1)` time.
 */
PriorityQueue.prototype.size = function() {
  return this._arr.length;
};

/**
 * Returns the keys that are in the queue. Takes `O(n)` time.
 */
PriorityQueue.prototype.keys = function() {
  return this._arr.map(function(x) { return x.key; });
};

/**
 * Returns `true` if **key** is in the queue and `false` if not.
 */
PriorityQueue.prototype.has = function(key) {
  return key in this._keyIndices;
};

/**
 * Returns the priority for **key**. If **key** is not present in the queue
 * then this function returns `undefined`. Takes `O(1)` time.
 *
 * @param {Object} key
 */
PriorityQueue.prototype.priority = function(key) {
  var index = this._keyIndices[key];
  if (index !== undefined) {
    return this._arr[index].priority;
  }
};

/**
 * Returns the key for the minimum element in this queue. If the queue is
 * empty this function throws an Error. Takes `O(1)` time.
 */
PriorityQueue.prototype.min = function() {
  if (this.size() === 0) {
    throw new Error("Queue underflow");
  }
  return this._arr[0].key;
};

/**
 * Inserts a new key into the priority queue. If the key already exists in
 * the queue this function returns `false`; otherwise it will return `true`.
 * Takes `O(n)` time.
 *
 * @param {Object} key the key to add
 * @param {Number} priority the initial priority for the key
 */
PriorityQueue.prototype.add = function(key, priority) {
  var keyIndices = this._keyIndices;
  if (!(key in keyIndices)) {
    var arr = this._arr;
    var index = arr.length;
    keyIndices[key] = index;
    arr.push({key: key, priority: priority});
    this._decrease(index);
    return true;
  }
  return false;
};

/**
 * Removes and returns the smallest key in the queue. Takes `O(log n)` time.
 */
PriorityQueue.prototype.removeMin = function() {
  this._swap(0, this._arr.length - 1);
  var min = this._arr.pop();
  delete this._keyIndices[min.key];
  this._heapify(0);
  return min.key;
};

/**
 * Decreases the priority for **key** to **priority**. If the new priority is
 * greater than the previous priority, this function will throw an Error.
 *
 * @param {Object} key the key for which to raise priority
 * @param {Number} priority the new priority for the key
 */
PriorityQueue.prototype.decrease = function(key, priority) {
  var index = this._keyIndices[key];
  if (priority > this._arr[index].priority) {
    throw new Error("New priority is greater than current priority. " +
        "Key: " + key + " Old: " + this._arr[index].priority + " New: " + priority);
  }
  this._arr[index].priority = priority;
  this._decrease(index);
};

PriorityQueue.prototype._heapify = function(i) {
  var arr = this._arr;
  var l = 2 * i,
      r = l + 1,
      largest = i;
  if (l < arr.length) {
    largest = arr[l].priority < arr[largest].priority ? l : largest;
    if (r < arr.length) {
      largest = arr[r].priority < arr[largest].priority ? r : largest;
    }
    if (largest !== i) {
      this._swap(i, largest);
      this._heapify(largest);
    }
  }
};

PriorityQueue.prototype._decrease = function(index) {
  var arr = this._arr;
  var priority = arr[index].priority;
  var parent;
  while (index !== 0) {
    parent = index >> 1;
    if (arr[parent].priority < priority) {
      break;
    }
    this._swap(index, parent);
    index = parent;
  }
};

PriorityQueue.prototype._swap = function(i, j) {
  var arr = this._arr;
  var keyIndices = this._keyIndices;
  var origArrI = arr[i];
  var origArrJ = arr[j];
  arr[i] = origArrJ;
  arr[j] = origArrI;
  keyIndices[origArrJ.key] = i;
  keyIndices[origArrI.key] = j;
};

},{}],21:[function(require,module,exports){
var util = require('./util');

module.exports = Set;

/**
 * Constructs a new Set with an optional set of `initialKeys`.
 *
 * It is important to note that keys are coerced to String for most purposes
 * with this object, similar to the behavior of JavaScript's Object. For
 * example, the following will add only one key:
 *
 *     var s = new Set();
 *     s.add(1);
 *     s.add("1");
 *
 * However, the type of the key is preserved internally so that `keys` returns
 * the original key set uncoerced. For the above example, `keys` would return
 * `[1]`.
 */
function Set(initialKeys) {
  this._size = 0;
  this._keys = {};

  if (initialKeys) {
    for (var i = 0, il = initialKeys.length; i < il; ++i) {
      this.add(initialKeys[i]);
    }
  }
}

/**
 * Returns a new Set that represents the set intersection of the array of given
 * sets.
 */
Set.intersect = function(sets) {
  if (sets.length === 0) {
    return new Set();
  }

  var result = new Set(!util.isArray(sets[0]) ? sets[0].keys() : sets[0]);
  for (var i = 1, il = sets.length; i < il; ++i) {
    var resultKeys = result.keys(),
        other = !util.isArray(sets[i]) ? sets[i] : new Set(sets[i]);
    for (var j = 0, jl = resultKeys.length; j < jl; ++j) {
      var key = resultKeys[j];
      if (!other.has(key)) {
        result.remove(key);
      }
    }
  }

  return result;
};

/**
 * Returns a new Set that represents the set union of the array of given sets.
 */
Set.union = function(sets) {
  var totalElems = util.reduce(sets, function(lhs, rhs) {
    return lhs + (rhs.size ? rhs.size() : rhs.length);
  }, 0);
  var arr = new Array(totalElems);

  var k = 0;
  for (var i = 0, il = sets.length; i < il; ++i) {
    var cur = sets[i],
        keys = !util.isArray(cur) ? cur.keys() : cur;
    for (var j = 0, jl = keys.length; j < jl; ++j) {
      arr[k++] = keys[j];
    }
  }

  return new Set(arr);
};

/**
 * Returns the size of this set in `O(1)` time.
 */
Set.prototype.size = function() {
  return this._size;
};

/**
 * Returns the keys in this set. Takes `O(n)` time.
 */
Set.prototype.keys = function() {
  return values(this._keys);
};

/**
 * Tests if a key is present in this Set. Returns `true` if it is and `false`
 * if not. Takes `O(1)` time.
 */
Set.prototype.has = function(key) {
  return key in this._keys;
};

/**
 * Adds a new key to this Set if it is not already present. Returns `true` if
 * the key was added and `false` if it was already present. Takes `O(1)` time.
 */
Set.prototype.add = function(key) {
  if (!(key in this._keys)) {
    this._keys[key] = key;
    ++this._size;
    return true;
  }
  return false;
};

/**
 * Removes a key from this Set. If the key was removed this function returns
 * `true`. If not, it returns `false`. Takes `O(1)` time.
 */
Set.prototype.remove = function(key) {
  if (key in this._keys) {
    delete this._keys[key];
    --this._size;
    return true;
  }
  return false;
};

/*
 * Returns an array of all values for properties of **o**.
 */
function values(o) {
  var ks = Object.keys(o),
      len = ks.length,
      result = new Array(len),
      i;
  for (i = 0; i < len; ++i) {
    result[i] = o[ks[i]];
  }
  return result;
}

},{"./util":22}],22:[function(require,module,exports){
/*
 * This polyfill comes from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
 */
if(!Array.isArray) {
  exports.isArray = function (vArg) {
    return Object.prototype.toString.call(vArg) === '[object Array]';
  };
} else {
  exports.isArray = Array.isArray;
}

/*
 * Slightly adapted polyfill from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce
 */
if ('function' !== typeof Array.prototype.reduce) {
  exports.reduce = function(array, callback, opt_initialValue) {
    'use strict';
    if (null === array || 'undefined' === typeof array) {
      // At the moment all modern browsers, that support strict mode, have
      // native implementation of Array.prototype.reduce. For instance, IE8
      // does not support strict mode, so this check is actually useless.
      throw new TypeError(
          'Array.prototype.reduce called on null or undefined');
    }
    if ('function' !== typeof callback) {
      throw new TypeError(callback + ' is not a function');
    }
    var index, value,
        length = array.length >>> 0,
        isValueSet = false;
    if (1 < arguments.length) {
      value = opt_initialValue;
      isValueSet = true;
    }
    for (index = 0; length > index; ++index) {
      if (array.hasOwnProperty(index)) {
        if (isValueSet) {
          value = callback(value, array[index], index, array);
        }
        else {
          value = array[index];
          isValueSet = true;
        }
      }
    }
    if (!isValueSet) {
      throw new TypeError('Reduce of empty array with no initial value');
    }
    return value;
  };
} else {
  exports.reduce = function(array, callback, opt_initialValue) {
    return array.reduce(callback, opt_initialValue);
  };
}

},{}],23:[function(require,module,exports){
module.exports = '1.1.3';

},{}],24:[function(require,module,exports){
exports.Graph = require("./lib/Graph");
exports.Digraph = require("./lib/Digraph");
exports.CGraph = require("./lib/CGraph");
exports.CDigraph = require("./lib/CDigraph");
require("./lib/graph-converters");

exports.alg = {
  isAcyclic: require("./lib/alg/isAcyclic"),
  components: require("./lib/alg/components"),
  dijkstra: require("./lib/alg/dijkstra"),
  dijkstraAll: require("./lib/alg/dijkstraAll"),
  findCycles: require("./lib/alg/findCycles"),
  floydWarshall: require("./lib/alg/floydWarshall"),
  postorder: require("./lib/alg/postorder"),
  preorder: require("./lib/alg/preorder"),
  prim: require("./lib/alg/prim"),
  tarjan: require("./lib/alg/tarjan"),
  topsort: require("./lib/alg/topsort")
};

exports.converter = {
  json: require("./lib/converter/json.js")
};

var filter = require("./lib/filter");
exports.filter = {
  all: filter.all,
  nodesFromList: filter.nodesFromList
};

exports.version = require("./lib/version");

},{"./lib/CDigraph":26,"./lib/CGraph":27,"./lib/Digraph":28,"./lib/Graph":29,"./lib/alg/components":30,"./lib/alg/dijkstra":31,"./lib/alg/dijkstraAll":32,"./lib/alg/findCycles":33,"./lib/alg/floydWarshall":34,"./lib/alg/isAcyclic":35,"./lib/alg/postorder":36,"./lib/alg/preorder":37,"./lib/alg/prim":38,"./lib/alg/tarjan":39,"./lib/alg/topsort":40,"./lib/converter/json.js":42,"./lib/filter":43,"./lib/graph-converters":44,"./lib/version":46}],25:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = BaseGraph;

function BaseGraph() {
  // The value assigned to the graph itself.
  this._value = undefined;

  // Map of node id -> { id, value }
  this._nodes = {};

  // Map of edge id -> { id, u, v, value }
  this._edges = {};

  // Used to generate a unique id in the graph
  this._nextId = 0;
}

// Number of nodes
BaseGraph.prototype.order = function() {
  return Object.keys(this._nodes).length;
};

// Number of edges
BaseGraph.prototype.size = function() {
  return Object.keys(this._edges).length;
};

// Accessor for graph level value
BaseGraph.prototype.graph = function(value) {
  if (arguments.length === 0) {
    return this._value;
  }
  this._value = value;
};

BaseGraph.prototype.hasNode = function(u) {
  return u in this._nodes;
};

BaseGraph.prototype.node = function(u, value) {
  var node = this._strictGetNode(u);
  if (arguments.length === 1) {
    return node.value;
  }
  node.value = value;
};

BaseGraph.prototype.nodes = function() {
  var nodes = [];
  this.eachNode(function(id) { nodes.push(id); });
  return nodes;
};

BaseGraph.prototype.eachNode = function(func) {
  for (var k in this._nodes) {
    var node = this._nodes[k];
    func(node.id, node.value);
  }
};

BaseGraph.prototype.hasEdge = function(e) {
  return e in this._edges;
};

BaseGraph.prototype.edge = function(e, value) {
  var edge = this._strictGetEdge(e);
  if (arguments.length === 1) {
    return edge.value;
  }
  edge.value = value;
};

BaseGraph.prototype.edges = function() {
  var es = [];
  this.eachEdge(function(id) { es.push(id); });
  return es;
};

BaseGraph.prototype.eachEdge = function(func) {
  for (var k in this._edges) {
    var edge = this._edges[k];
    func(edge.id, edge.u, edge.v, edge.value);
  }
};

BaseGraph.prototype.incidentNodes = function(e) {
  var edge = this._strictGetEdge(e);
  return [edge.u, edge.v];
};

BaseGraph.prototype.addNode = function(u, value) {
  if (u === undefined || u === null) {
    do {
      u = "_" + (++this._nextId);
    } while (this.hasNode(u));
  } else if (this.hasNode(u)) {
    throw new Error("Graph already has node '" + u + "'");
  }
  this._nodes[u] = { id: u, value: value };
  return u;
};

BaseGraph.prototype.delNode = function(u) {
  this._strictGetNode(u);
  this.incidentEdges(u).forEach(function(e) { this.delEdge(e); }, this);
  delete this._nodes[u];
};

// inMap and outMap are opposite sides of an incidence map. For example, for
// Graph these would both come from the _incidentEdges map, while for Digraph
// they would come from _inEdges and _outEdges.
BaseGraph.prototype._addEdge = function(e, u, v, value, inMap, outMap) {
  this._strictGetNode(u);
  this._strictGetNode(v);

  if (e === undefined || e === null) {
    do {
      e = "_" + (++this._nextId);
    } while (this.hasEdge(e));
  }
  else if (this.hasEdge(e)) {
    throw new Error("Graph already has edge '" + e + "'");
  }

  this._edges[e] = { id: e, u: u, v: v, value: value };
  addEdgeToMap(inMap[v], u, e);
  addEdgeToMap(outMap[u], v, e);

  return e;
};

// See note for _addEdge regarding inMap and outMap.
BaseGraph.prototype._delEdge = function(e, inMap, outMap) {
  var edge = this._strictGetEdge(e);
  delEdgeFromMap(inMap[edge.v], edge.u, e);
  delEdgeFromMap(outMap[edge.u], edge.v, e);
  delete this._edges[e];
};

BaseGraph.prototype.copy = function() {
  var copy = new this.constructor();
  copy.graph(this.graph());
  this.eachNode(function(u, value) { copy.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) { copy.addEdge(e, u, v, value); });
  copy._nextId = this._nextId;
  return copy;
};

BaseGraph.prototype.filterNodes = function(filter) {
  var copy = new this.constructor();
  copy.graph(this.graph());
  this.eachNode(function(u, value) {
    if (filter(u)) {
      copy.addNode(u, value);
    }
  });
  this.eachEdge(function(e, u, v, value) {
    if (copy.hasNode(u) && copy.hasNode(v)) {
      copy.addEdge(e, u, v, value);
    }
  });
  return copy;
};

BaseGraph.prototype._strictGetNode = function(u) {
  var node = this._nodes[u];
  if (node === undefined) {
    throw new Error("Node '" + u + "' is not in graph");
  }
  return node;
};

BaseGraph.prototype._strictGetEdge = function(e) {
  var edge = this._edges[e];
  if (edge === undefined) {
    throw new Error("Edge '" + e + "' is not in graph");
  }
  return edge;
};

function addEdgeToMap(map, v, e) {
  (map[v] || (map[v] = new Set())).add(e);
}

function delEdgeFromMap(map, v, e) {
  var vEntry = map[v];
  vEntry.remove(e);
  if (vEntry.size() === 0) {
    delete map[v];
  }
}


},{"cp-data":19}],26:[function(require,module,exports){
var Digraph = require("./Digraph"),
    compoundify = require("./compoundify");

var CDigraph = compoundify(Digraph);

module.exports = CDigraph;

CDigraph.fromDigraph = function(src) {
  var g = new CDigraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

CDigraph.prototype.toString = function() {
  return "CDigraph " + JSON.stringify(this, null, 2);
};

},{"./Digraph":28,"./compoundify":41}],27:[function(require,module,exports){
var Graph = require("./Graph"),
    compoundify = require("./compoundify");

var CGraph = compoundify(Graph);

module.exports = CGraph;

CGraph.fromGraph = function(src) {
  var g = new CGraph(),
      graphValue = src.graph();

  if (graphValue !== undefined) {
    g.graph(graphValue);
  }

  src.eachNode(function(u, value) {
    if (value === undefined) {
      g.addNode(u);
    } else {
      g.addNode(u, value);
    }
  });
  src.eachEdge(function(e, u, v, value) {
    if (value === undefined) {
      g.addEdge(null, u, v);
    } else {
      g.addEdge(null, u, v, value);
    }
  });
  return g;
};

CGraph.prototype.toString = function() {
  return "CGraph " + JSON.stringify(this, null, 2);
};

},{"./Graph":29,"./compoundify":41}],28:[function(require,module,exports){
/*
 * This file is organized with in the following order:
 *
 * Exports
 * Graph constructors
 * Graph queries (e.g. nodes(), edges()
 * Graph mutators
 * Helper functions
 */

var util = require("./util"),
    BaseGraph = require("./BaseGraph"),
/* jshint -W079 */
    Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = Digraph;

/*
 * Constructor to create a new directed multi-graph.
 */
function Digraph() {
  BaseGraph.call(this);

  /*! Map of sourceId -> {targetId -> Set of edge ids} */
  this._inEdges = {};

  /*! Map of targetId -> {sourceId -> Set of edge ids} */
  this._outEdges = {};
}

Digraph.prototype = new BaseGraph();
Digraph.prototype.constructor = Digraph;

/*
 * Always returns `true`.
 */
Digraph.prototype.isDirected = function() {
  return true;
};

/*
 * Returns all successors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their source are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.successors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._outEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all predecessors of the node with the id `u`. That is, all nodes
 * that have the node `u` as their target are returned.
 * 
 * If no node `u` exists in the graph this function throws an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.predecessors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._inEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns all nodes that are adjacent to the node with the id `u`. In other
 * words, this function returns the set of all successors and predecessors of
 * node `u`.
 *
 * @param {String} u a node id
 */
Digraph.prototype.neighbors = function(u) {
  return Set.union([this.successors(u), this.predecessors(u)]).keys();
};

/*
 * Returns all nodes in the graph that have no in-edges.
 */
Digraph.prototype.sources = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we had an inDegree function.
    return self.inEdges(u).length === 0;
  });
};

/*
 * Returns all nodes in the graph that have no out-edges.
 */
Digraph.prototype.sinks = function() {
  var self = this;
  return this._filterNodes(function(u) {
    // This could have better space characteristics if we have an outDegree function.
    return self.outEdges(u).length === 0;
  });
};

/*
 * Returns the source node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.source = function(e) {
  return this._strictGetEdge(e).u;
};

/*
 * Returns the target node incident on the edge identified by the id `e`. If no
 * such edge exists in the graph this function throws an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.target = function(e) {
  return this._strictGetEdge(e).v;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `target` as their target. If the node `target` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `source` node can also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `source` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} target the target node id
 * @param {String} [source] an optional source node id
 */
Digraph.prototype.inEdges = function(target, source) {
  this._strictGetNode(target);
  var results = Set.union(util.values(this._inEdges[target])).keys();
  if (arguments.length > 1) {
    this._strictGetNode(source);
    results = results.filter(function(e) { return this.source(e) === source; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the node
 * `source` as their source. If the node `source` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `target` node may also be specified. This causes the results
 * to be filtered such that only edges from `source` to `target` are included.
 * If the node `target` is specified but is not in the graph then this function
 * raises an Error.
 *
 * @param {String} source the source node id
 * @param {String} [target] an optional target node id
 */
Digraph.prototype.outEdges = function(source, target) {
  this._strictGetNode(source);
  var results = Set.union(util.values(this._outEdges[source])).keys();
  if (arguments.length > 1) {
    this._strictGetNode(target);
    results = results.filter(function(e) { return this.target(e) === target; }, this);
  }
  return results;
};

/*
 * Returns an array of ids for all edges in the graph that have the `u` as
 * their source or their target. If the node `u` is not in the graph this
 * function raises an Error.
 *
 * Optionally a `v` node may also be specified. This causes the results to be
 * filtered such that only edges between `u` and `v` - in either direction -
 * are included. IF the node `v` is specified but not in the graph then this
 * function raises an Error.
 *
 * @param {String} u the node for which to find incident edges
 * @param {String} [v] option node that must be adjacent to `u`
 */
Digraph.prototype.incidentEdges = function(u, v) {
  if (arguments.length > 1) {
    return Set.union([this.outEdges(u, v), this.outEdges(v, u)]).keys();
  } else {
    return Set.union([this.inEdges(u), this.outEdges(u)]).keys();
  }
};

/*
 * Returns a string representation of this graph.
 */
Digraph.prototype.toString = function() {
  return "Digraph " + JSON.stringify(this, null, 2);
};

/*
 * Adds a new node with the id `u` to the graph and assigns it the value
 * `value`. If a node with the id is already a part of the graph this function
 * throws an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] an optional value to attach to the node
 */
Digraph.prototype.addNode = function(u, value) {
  u = BaseGraph.prototype.addNode.call(this, u, value);
  this._inEdges[u] = {};
  this._outEdges[u] = {};
  return u;
};

/*
 * Removes a node from the graph that has the id `u`. Any edges incident on the
 * node are also removed. If the graph does not contain a node with the id this
 * function will throw an Error.
 *
 * @param {String} u a node id
 */
Digraph.prototype.delNode = function(u) {
  BaseGraph.prototype.delNode.call(this, u);
  delete this._inEdges[u];
  delete this._outEdges[u];
};

/*
 * Adds a new edge to the graph with the id `e` from a node with the id `source`
 * to a node with an id `target` and assigns it the value `value`. This graph
 * allows more than one edge from `source` to `target` as long as the id `e`
 * is unique in the set of edges. If `e` is `null` the graph will assign a
 * unique identifier to the edge.
 *
 * If `source` or `target` are not present in the graph this function will
 * throw an Error.
 *
 * @param {String} [e] an edge id
 * @param {String} source the source node id
 * @param {String} target the target node id
 * @param {Object} [value] an optional value to attach to the edge
 */
Digraph.prototype.addEdge = function(e, source, target, value) {
  return BaseGraph.prototype._addEdge.call(this, e, source, target, value,
                                           this._inEdges, this._outEdges);
};

/*
 * Removes an edge in the graph with the id `e`. If no edge in the graph has
 * the id `e` this function will throw an Error.
 *
 * @param {String} e an edge id
 */
Digraph.prototype.delEdge = function(e) {
  BaseGraph.prototype._delEdge.call(this, e, this._inEdges, this._outEdges);
};

// Unlike BaseGraph.filterNodes, this helper just returns nodes that
// satisfy a predicate.
Digraph.prototype._filterNodes = function(pred) {
  var filtered = [];
  this.eachNode(function(u) {
    if (pred(u)) {
      filtered.push(u);
    }
  });
  return filtered;
};


},{"./BaseGraph":25,"./util":45,"cp-data":19}],29:[function(require,module,exports){
/*
 * This file is organized with in the following order:
 *
 * Exports
 * Graph constructors
 * Graph queries (e.g. nodes(), edges()
 * Graph mutators
 * Helper functions
 */

var util = require("./util"),
    BaseGraph = require("./BaseGraph"),
/* jshint -W079 */
    Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = Graph;

/*
 * Constructor to create a new undirected multi-graph.
 */
function Graph() {
  BaseGraph.call(this);

  /*! Map of nodeId -> { otherNodeId -> Set of edge ids } */
  this._incidentEdges = {};
}

Graph.prototype = new BaseGraph();
Graph.prototype.constructor = Graph;

/*
 * Always returns `false`.
 */
Graph.prototype.isDirected = function() {
  return false;
};

/*
 * Returns all nodes that are adjacent to the node with the id `u`.
 *
 * @param {String} u a node id
 */
Graph.prototype.neighbors = function(u) {
  this._strictGetNode(u);
  return Object.keys(this._incidentEdges[u])
               .map(function(v) { return this._nodes[v].id; }, this);
};

/*
 * Returns an array of ids for all edges in the graph that are incident on `u`.
 * If the node `u` is not in the graph this function raises an Error.
 *
 * Optionally a `v` node may also be specified. This causes the results to be
 * filtered such that only edges between `u` and `v` are included. If the node
 * `v` is specified but not in the graph then this function raises an Error.
 *
 * @param {String} u the node for which to find incident edges
 * @param {String} [v] option node that must be adjacent to `u`
 */
Graph.prototype.incidentEdges = function(u, v) {
  this._strictGetNode(u);
  if (arguments.length > 1) {
    this._strictGetNode(v);
    return v in this._incidentEdges[u] ? this._incidentEdges[u][v].keys() : [];
  } else {
    return Set.union(util.values(this._incidentEdges[u])).keys();
  }
};

/*
 * Returns a string representation of this graph.
 */
Graph.prototype.toString = function() {
  return "Graph " + JSON.stringify(this, null, 2);
};

/*
 * Adds a new node with the id `u` to the graph and assigns it the value
 * `value`. If a node with the id is already a part of the graph this function
 * throws an Error.
 *
 * @param {String} u a node id
 * @param {Object} [value] an optional value to attach to the node
 */
Graph.prototype.addNode = function(u, value) {
  u = BaseGraph.prototype.addNode.call(this, u, value);
  this._incidentEdges[u] = {};
  return u;
};

/*
 * Removes a node from the graph that has the id `u`. Any edges incident on the
 * node are also removed. If the graph does not contain a node with the id this
 * function will throw an Error.
 *
 * @param {String} u a node id
 */
Graph.prototype.delNode = function(u) {
  BaseGraph.prototype.delNode.call(this, u);
  delete this._incidentEdges[u];
};

/*
 * Adds a new edge to the graph with the id `e` between a node with the id `u`
 * and a node with an id `v` and assigns it the value `value`. This graph
 * allows more than one edge between `u` and `v` as long as the id `e`
 * is unique in the set of edges. If `e` is `null` the graph will assign a
 * unique identifier to the edge.
 *
 * If `u` or `v` are not present in the graph this function will throw an
 * Error.
 *
 * @param {String} [e] an edge id
 * @param {String} u the node id of one of the adjacent nodes
 * @param {String} v the node id of the other adjacent node
 * @param {Object} [value] an optional value to attach to the edge
 */
Graph.prototype.addEdge = function(e, u, v, value) {
  return BaseGraph.prototype._addEdge.call(this, e, u, v, value,
                                           this._incidentEdges, this._incidentEdges);
};

/*
 * Removes an edge in the graph with the id `e`. If no edge in the graph has
 * the id `e` this function will throw an Error.
 *
 * @param {String} e an edge id
 */
Graph.prototype.delEdge = function(e) {
  BaseGraph.prototype._delEdge.call(this, e, this._incidentEdges, this._incidentEdges);
};


},{"./BaseGraph":25,"./util":45,"cp-data":19}],30:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = components;

/**
 * Finds all [connected components][] in a graph and returns an array of these
 * components. Each component is itself an array that contains the ids of nodes
 * in the component.
 *
 * This function only works with undirected Graphs.
 *
 * [connected components]: http://en.wikipedia.org/wiki/Connected_component_(graph_theory)
 *
 * @param {Graph} g the graph to search for components
 */
function components(g) {
  var results = [];
  var visited = new Set();

  function dfs(v, component) {
    if (!visited.has(v)) {
      visited.add(v);
      component.push(v);
      g.neighbors(v).forEach(function(w) {
        dfs(w, component);
      });
    }
  }

  g.nodes().forEach(function(v) {
    var component = [];
    dfs(v, component);
    if (component.length > 0) {
      results.push(component);
    }
  });

  return results;
}

},{"cp-data":19}],31:[function(require,module,exports){
var PriorityQueue = require("cp-data").PriorityQueue;

module.exports = dijkstra;

/**
 * This function is an implementation of [Dijkstra's algorithm][] which finds
 * the shortest path from **source** to all other nodes in **g**. This
 * function returns a map of `u -> { distance, predecessor }`. The distance
 * property holds the sum of the weights from **source** to `u` along the
 * shortest path or `Number.POSITIVE_INFINITY` if there is no path from
 * **source**. The predecessor property can be used to walk the individual
 * elements of the path from **source** to **u** in reverse order.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1. This function throws an Error if any of
 * the traversed edges have a negative edge weight.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `g.outEdges` for Digraphs and
 * `g.incidentEdges` for Graphs.
 *
 * This function takes `O((|E| + |V|) * log |V|)` time.
 *
 * [Dijkstra's algorithm]: http://en.wikipedia.org/wiki/Dijkstra%27s_algorithm
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Object} source the source from which to start the search
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function dijkstra(g, source, weightFunc, incidentFunc) {
  var results = {},
      pq = new PriorityQueue();

  function updateNeighbors(e) {
    var incidentNodes = g.incidentNodes(e),
        v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
        vEntry = results[v],
        weight = weightFunc(e),
        distance = uEntry.distance + weight;

    if (weight < 0) {
      throw new Error("dijkstra does not allow negative edge weights. Bad edge: " + e + " Weight: " + weight);
    }

    if (distance < vEntry.distance) {
      vEntry.distance = distance;
      vEntry.predecessor = u;
      pq.decrease(v, distance);
    }
  }

  weightFunc = weightFunc || function() { return 1; };
  incidentFunc = incidentFunc || (g.isDirected()
      ? function(u) { return g.outEdges(u); }
      : function(u) { return g.incidentEdges(u); });

  g.eachNode(function(u) {
    var distance = u === source ? 0 : Number.POSITIVE_INFINITY;
    results[u] = { distance: distance };
    pq.add(u, distance);
  });

  var u, uEntry;
  while (pq.size() > 0) {
    u = pq.removeMin();
    uEntry = results[u];
    if (uEntry.distance === Number.POSITIVE_INFINITY) {
      break;
    }

    incidentFunc(u).forEach(updateNeighbors);
  }

  return results;
}

},{"cp-data":19}],32:[function(require,module,exports){
var dijkstra = require("./dijkstra");

module.exports = dijkstraAll;

/**
 * This function finds the shortest path from each node to every other
 * reachable node in the graph. It is similar to [alg.dijkstra][], but
 * instead of returning a single-source array, it returns a mapping of
 * of `source -> alg.dijksta(g, source, weightFunc, incidentFunc)`.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1. This function throws an Error if any of
 * the traversed edges have a negative edge weight.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `outEdges` function on the
 * supplied graph.
 *
 * This function takes `O(|V| * (|E| + |V|) * log |V|)` time.
 *
 * [alg.dijkstra]: dijkstra.js.html#dijkstra
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function dijkstraAll(g, weightFunc, incidentFunc) {
  var results = {};
  g.eachNode(function(u) {
    results[u] = dijkstra(g, u, weightFunc, incidentFunc);
  });
  return results;
}

},{"./dijkstra":31}],33:[function(require,module,exports){
var tarjan = require("./tarjan");

module.exports = findCycles;

/*
 * Given a Digraph **g** this function returns all nodes that are part of a
 * cycle. Since there may be more than one cycle in a graph this function
 * returns an array of these cycles, where each cycle is itself represented
 * by an array of ids for each node involved in that cycle.
 *
 * [alg.isAcyclic][] is more efficient if you only need to determine whether
 * a graph has a cycle or not.
 *
 * [alg.isAcyclic]: isAcyclic.js.html#isAcyclic
 *
 * @param {Digraph} g the graph to search for cycles.
 */
function findCycles(g) {
  return tarjan(g).filter(function(cmpt) { return cmpt.length > 1; });
}

},{"./tarjan":39}],34:[function(require,module,exports){
module.exports = floydWarshall;

/**
 * This function is an implementation of the [Floyd-Warshall algorithm][],
 * which finds the shortest path from each node to every other reachable node
 * in the graph. It is similar to [alg.dijkstraAll][], but it handles negative
 * edge weights and is more efficient for some types of graphs. This function
 * returns a map of `source -> { target -> { distance, predecessor }`. The
 * distance property holds the sum of the weights from `source` to `target`
 * along the shortest path of `Number.POSITIVE_INFINITY` if there is no path
 * from `source`. The predecessor property can be used to walk the individual
 * elements of the path from `source` to `target` in reverse order.
 *
 * This function takes an optional `weightFunc(e)` which returns the
 * weight of the edge `e`. If no weightFunc is supplied then each edge is
 * assumed to have a weight of 1.
 *
 * This function takes an optional `incidentFunc(u)` which returns the ids of
 * all edges incident to the node `u` for the purposes of shortest path
 * traversal. By default this function uses the `outEdges` function on the
 * supplied graph.
 *
 * This algorithm takes O(|V|^3) time.
 *
 * [Floyd-Warshall algorithm]: https://en.wikipedia.org/wiki/Floyd-Warshall_algorithm
 * [alg.dijkstraAll]: dijkstraAll.js.html#dijkstraAll
 *
 * @param {Graph} g the graph to search for shortest paths from **source**
 * @param {Function} [weightFunc] optional weight function
 * @param {Function} [incidentFunc] optional incident function
 */
function floydWarshall(g, weightFunc, incidentFunc) {
  var results = {},
      nodes = g.nodes();

  weightFunc = weightFunc || function() { return 1; };
  incidentFunc = incidentFunc || (g.isDirected()
      ? function(u) { return g.outEdges(u); }
      : function(u) { return g.incidentEdges(u); });

  nodes.forEach(function(u) {
    results[u] = {};
    results[u][u] = { distance: 0 };
    nodes.forEach(function(v) {
      if (u !== v) {
        results[u][v] = { distance: Number.POSITIVE_INFINITY };
      }
    });
    incidentFunc(u).forEach(function(e) {
      var incidentNodes = g.incidentNodes(e),
          v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
          d = weightFunc(e);
      if (d < results[u][v].distance) {
        results[u][v] = { distance: d, predecessor: u };
      }
    });
  });

  nodes.forEach(function(k) {
    var rowK = results[k];
    nodes.forEach(function(i) {
      var rowI = results[i];
      nodes.forEach(function(j) {
        var ik = rowI[k];
        var kj = rowK[j];
        var ij = rowI[j];
        var altDistance = ik.distance + kj.distance;
        if (altDistance < ij.distance) {
          ij.distance = altDistance;
          ij.predecessor = kj.predecessor;
        }
      });
    });
  });

  return results;
}

},{}],35:[function(require,module,exports){
var topsort = require("./topsort");

module.exports = isAcyclic;

/*
 * Given a Digraph **g** this function returns `true` if the graph has no
 * cycles and returns `false` if it does. This algorithm returns as soon as it
 * detects the first cycle.
 *
 * Use [alg.findCycles][] if you need the actual list of cycles in a graph.
 *
 * [alg.findCycles]: findCycles.js.html#findCycles
 *
 * @param {Digraph} g the graph to test for cycles
 */
function isAcyclic(g) {
  try {
    topsort(g);
  } catch (e) {
    if (e instanceof topsort.CycleException) return false;
    throw e;
  }
  return true;
}

},{"./topsort":40}],36:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = postorder;

// Postorder traversal of g, calling f for each visited node. Assumes the graph
// is a tree.
function postorder(g, root, f) {
  var visited = new Set();
  if (g.isDirected()) {
    throw new Error("This function only works for undirected graphs");
  }
  function dfs(u, prev) {
    if (visited.has(u)) {
      throw new Error("The input graph is not a tree: " + g);
    }
    visited.add(u);
    g.neighbors(u).forEach(function(v) {
      if (v !== prev) dfs(v, u);
    });
    f(u);
  }
  dfs(root);
}

},{"cp-data":19}],37:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = preorder;

// Preorder traversal of g, calling f for each visited node. Assumes the graph
// is a tree.
function preorder(g, root, f) {
  var visited = new Set();
  if (g.isDirected()) {
    throw new Error("This function only works for undirected graphs");
  }
  function dfs(u, prev) {
    if (visited.has(u)) {
      throw new Error("The input graph is not a tree: " + g);
    }
    visited.add(u);
    f(u);
    g.neighbors(u).forEach(function(v) {
      if (v !== prev) dfs(v, u);
    });
  }
  dfs(root);
}

},{"cp-data":19}],38:[function(require,module,exports){
var Graph = require("../Graph"),
    PriorityQueue = require("cp-data").PriorityQueue;

module.exports = prim;

/**
 * [Prim's algorithm][] takes a connected undirected graph and generates a
 * [minimum spanning tree][]. This function returns the minimum spanning
 * tree as an undirected graph. This algorithm is derived from the description
 * in "Introduction to Algorithms", Third Edition, Cormen, et al., Pg 634.
 *
 * This function takes a `weightFunc(e)` which returns the weight of the edge
 * `e`. It throws an Error if the graph is not connected.
 *
 * This function takes `O(|E| log |V|)` time.
 *
 * [Prim's algorithm]: https://en.wikipedia.org/wiki/Prim's_algorithm
 * [minimum spanning tree]: https://en.wikipedia.org/wiki/Minimum_spanning_tree
 *
 * @param {Graph} g the graph used to generate the minimum spanning tree
 * @param {Function} weightFunc the weight function to use
 */
function prim(g, weightFunc) {
  var result = new Graph(),
      parents = {},
      pq = new PriorityQueue(),
      u;

  function updateNeighbors(e) {
    var incidentNodes = g.incidentNodes(e),
        v = incidentNodes[0] !== u ? incidentNodes[0] : incidentNodes[1],
        pri = pq.priority(v);
    if (pri !== undefined) {
      var edgeWeight = weightFunc(e);
      if (edgeWeight < pri) {
        parents[v] = u;
        pq.decrease(v, edgeWeight);
      }
    }
  }

  if (g.order() === 0) {
    return result;
  }

  g.eachNode(function(u) {
    pq.add(u, Number.POSITIVE_INFINITY);
    result.addNode(u);
  });

  // Start from an arbitrary node
  pq.decrease(g.nodes()[0], 0);

  var init = false;
  while (pq.size() > 0) {
    u = pq.removeMin();
    if (u in parents) {
      result.addEdge(null, u, parents[u]);
    } else if (init) {
      throw new Error("Input graph is not connected: " + g);
    } else {
      init = true;
    }

    g.incidentEdges(u).forEach(updateNeighbors);
  }

  return result;
}

},{"../Graph":29,"cp-data":19}],39:[function(require,module,exports){
module.exports = tarjan;

/**
 * This function is an implementation of [Tarjan's algorithm][] which finds
 * all [strongly connected components][] in the directed graph **g**. Each
 * strongly connected component is composed of nodes that can reach all other
 * nodes in the component via directed edges. A strongly connected component
 * can consist of a single node if that node cannot both reach and be reached
 * by any other specific node in the graph. Components of more than one node
 * are guaranteed to have at least one cycle.
 *
 * This function returns an array of components. Each component is itself an
 * array that contains the ids of all nodes in the component.
 *
 * [Tarjan's algorithm]: http://en.wikipedia.org/wiki/Tarjan's_strongly_connected_components_algorithm
 * [strongly connected components]: http://en.wikipedia.org/wiki/Strongly_connected_component
 *
 * @param {Digraph} g the graph to search for strongly connected components
 */
function tarjan(g) {
  if (!g.isDirected()) {
    throw new Error("tarjan can only be applied to a directed graph. Bad input: " + g);
  }

  var index = 0,
      stack = [],
      visited = {}, // node id -> { onStack, lowlink, index }
      results = [];

  function dfs(u) {
    var entry = visited[u] = {
      onStack: true,
      lowlink: index,
      index: index++
    };
    stack.push(u);

    g.successors(u).forEach(function(v) {
      if (!(v in visited)) {
        dfs(v);
        entry.lowlink = Math.min(entry.lowlink, visited[v].lowlink);
      } else if (visited[v].onStack) {
        entry.lowlink = Math.min(entry.lowlink, visited[v].index);
      }
    });

    if (entry.lowlink === entry.index) {
      var cmpt = [],
          v;
      do {
        v = stack.pop();
        visited[v].onStack = false;
        cmpt.push(v);
      } while (u !== v);
      results.push(cmpt);
    }
  }

  g.nodes().forEach(function(u) {
    if (!(u in visited)) {
      dfs(u);
    }
  });

  return results;
}

},{}],40:[function(require,module,exports){
module.exports = topsort;
topsort.CycleException = CycleException;

/*
 * Given a graph **g**, this function returns an ordered list of nodes such
 * that for each edge `u -> v`, `u` appears before `v` in the list. If the
 * graph has a cycle it is impossible to generate such a list and
 * **CycleException** is thrown.
 *
 * See [topological sorting](https://en.wikipedia.org/wiki/Topological_sorting)
 * for more details about how this algorithm works.
 *
 * @param {Digraph} g the graph to sort
 */
function topsort(g) {
  if (!g.isDirected()) {
    throw new Error("topsort can only be applied to a directed graph. Bad input: " + g);
  }

  var visited = {};
  var stack = {};
  var results = [];

  function visit(node) {
    if (node in stack) {
      throw new CycleException();
    }

    if (!(node in visited)) {
      stack[node] = true;
      visited[node] = true;
      g.predecessors(node).forEach(function(pred) {
        visit(pred);
      });
      delete stack[node];
      results.push(node);
    }
  }

  var sinks = g.sinks();
  if (g.order() !== 0 && sinks.length === 0) {
    throw new CycleException();
  }

  g.sinks().forEach(function(sink) {
    visit(sink);
  });

  return results;
}

function CycleException() {}

CycleException.prototype.toString = function() {
  return "Graph has at least one cycle";
};

},{}],41:[function(require,module,exports){
// This file provides a helper function that mixes-in Dot behavior to an
// existing graph prototype.

/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

module.exports = compoundify;

// Extends the given SuperConstructor with the ability for nodes to contain
// other nodes. A special node id `null` is used to indicate the root graph.
function compoundify(SuperConstructor) {
  function Constructor() {
    SuperConstructor.call(this);

    // Map of object id -> parent id (or null for root graph)
    this._parents = {};

    // Map of id (or null) -> children set
    this._children = {};
    this._children[null] = new Set();
  }

  Constructor.prototype = new SuperConstructor();
  Constructor.prototype.constructor = Constructor;

  Constructor.prototype.parent = function(u, parent) {
    this._strictGetNode(u);

    if (arguments.length < 2) {
      return this._parents[u];
    }

    if (u === parent) {
      throw new Error("Cannot make " + u + " a parent of itself");
    }
    if (parent !== null) {
      this._strictGetNode(parent);
    }

    this._children[this._parents[u]].remove(u);
    this._parents[u] = parent;
    this._children[parent].add(u);
  };

  Constructor.prototype.children = function(u) {
    if (u !== null) {
      this._strictGetNode(u);
    }
    return this._children[u].keys();
  };

  Constructor.prototype.addNode = function(u, value) {
    u = SuperConstructor.prototype.addNode.call(this, u, value);
    this._parents[u] = null;
    this._children[u] = new Set();
    this._children[null].add(u);
    return u;
  };

  Constructor.prototype.delNode = function(u) {
    // Promote all children to the parent of the subgraph
    var parent = this.parent(u);
    this._children[u].keys().forEach(function(child) {
      this.parent(child, parent);
    }, this);

    this._children[parent].remove(u);
    delete this._parents[u];
    delete this._children[u];

    return SuperConstructor.prototype.delNode.call(this, u);
  };

  Constructor.prototype.copy = function() {
    var copy = SuperConstructor.prototype.copy.call(this);
    this.nodes().forEach(function(u) {
      copy.parent(u, this.parent(u));
    }, this);
    return copy;
  };

  Constructor.prototype.filterNodes = function(filter) {
    var self = this,
        copy = SuperConstructor.prototype.filterNodes.call(this, filter);

    var parents = {};
    function findParent(u) {
      var parent = self.parent(u);
      if (parent === null || copy.hasNode(parent)) {
        parents[u] = parent;
        return parent;
      } else if (parent in parents) {
        return parents[parent];
      } else {
        return findParent(parent);
      }
    }

    copy.eachNode(function(u) { copy.parent(u, findParent(u)); });

    return copy;
  };

  return Constructor;
}

},{"cp-data":19}],42:[function(require,module,exports){
var Graph = require("../Graph"),
    Digraph = require("../Digraph"),
    CGraph = require("../CGraph"),
    CDigraph = require("../CDigraph");

exports.decode = function(nodes, edges, Ctor) {
  Ctor = Ctor || Digraph;

  if (typeOf(nodes) !== "Array") {
    throw new Error("nodes is not an Array");
  }

  if (typeOf(edges) !== "Array") {
    throw new Error("edges is not an Array");
  }

  if (typeof Ctor === "string") {
    switch(Ctor) {
      case "graph": Ctor = Graph; break;
      case "digraph": Ctor = Digraph; break;
      case "cgraph": Ctor = CGraph; break;
      case "cdigraph": Ctor = CDigraph; break;
      default: throw new Error("Unrecognized graph type: " + Ctor);
    }
  }

  var graph = new Ctor();

  nodes.forEach(function(u) {
    graph.addNode(u.id, u.value);
  });

  // If the graph is compound, set up children...
  if (graph.parent) {
    nodes.forEach(function(u) {
      if (u.children) {
        u.children.forEach(function(v) {
          graph.parent(v, u.id);
        });
      }
    });
  }

  edges.forEach(function(e) {
    graph.addEdge(e.id, e.u, e.v, e.value);
  });

  return graph;
};

exports.encode = function(graph) {
  var nodes = [];
  var edges = [];

  graph.eachNode(function(u, value) {
    var node = {id: u, value: value};
    if (graph.children) {
      var children = graph.children(u);
      if (children.length) {
        node.children = children;
      }
    }
    nodes.push(node);
  });

  graph.eachEdge(function(e, u, v, value) {
    edges.push({id: e, u: u, v: v, value: value});
  });

  var type;
  if (graph instanceof CDigraph) {
    type = "cdigraph";
  } else if (graph instanceof CGraph) {
    type = "cgraph";
  } else if (graph instanceof Digraph) {
    type = "digraph";
  } else if (graph instanceof Graph) {
    type = "graph";
  } else {
    throw new Error("Couldn't determine type of graph: " + graph);
  }

  return { nodes: nodes, edges: edges, type: type };
};

function typeOf(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
}

},{"../CDigraph":26,"../CGraph":27,"../Digraph":28,"../Graph":29}],43:[function(require,module,exports){
/* jshint -W079 */
var Set = require("cp-data").Set;
/* jshint +W079 */

exports.all = function() {
  return function() { return true; };
};

exports.nodesFromList = function(nodes) {
  var set = new Set(nodes);
  return function(u) {
    return set.has(u);
  };
};

},{"cp-data":19}],44:[function(require,module,exports){
var Graph = require("./Graph"),
    Digraph = require("./Digraph");

// Side-effect based changes are lousy, but node doesn't seem to resolve the
// requires cycle.

/**
 * Returns a new directed graph using the nodes and edges from this graph. The
 * new graph will have the same nodes, but will have twice the number of edges:
 * each edge is split into two edges with opposite directions. Edge ids,
 * consequently, are not preserved by this transformation.
 */
Graph.prototype.toDigraph =
Graph.prototype.asDirected = function() {
  var g = new Digraph();
  this.eachNode(function(u, value) { g.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) {
    g.addEdge(null, u, v, value);
    g.addEdge(null, v, u, value);
  });
  return g;
};

/**
 * Returns a new undirected graph using the nodes and edges from this graph.
 * The new graph will have the same nodes, but the edges will be made
 * undirected. Edge ids are preserved in this transformation.
 */
Digraph.prototype.toGraph =
Digraph.prototype.asUndirected = function() {
  var g = new Graph();
  this.eachNode(function(u, value) { g.addNode(u, value); });
  this.eachEdge(function(e, u, v, value) {
    g.addEdge(e, u, v, value);
  });
  return g;
};

},{"./Digraph":28,"./Graph":29}],45:[function(require,module,exports){
// Returns an array of all values for properties of **o**.
exports.values = function(o) {
  var ks = Object.keys(o),
      len = ks.length,
      result = new Array(len),
      i;
  for (i = 0; i < len; ++i) {
    result[i] = o[ks[i]];
  }
  return result;
};

},{}],46:[function(require,module,exports){
module.exports = '0.7.4';

},{}],47:[function(require,module,exports){
var utils = require('../../../../shared/utils');
var path = require('path');

app.controller('ApiCtrl', ['$scope', '$state', 'dialog', 'apiPromise',
  function($scope, $state, $dialog, apiPromise) {

    $scope.api = api; //Promise;

    $scope.controllerTabIndex = 0;

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

    $scope.deleteRoute = function(route) {

      $dialog.confirm({
        title: 'Delete Route',
        message: 'Are you sure you want to delete route [' + route.description + ']?'
      }).then(function() {
        route.controller.removeRoute(route);
        // go to parent controller
        $state.go('api.controller', {
          controllerId: route.controller.id
        });
      });
    };

    $state.go('api.route', {
      routeId: api.root.id
    });

    $scope.routes = [api.root];
  }
]);


/*
 * Route Constructor Function
 */
function Route(data) {
  this.id = data.id || utils.getuid();
  this.parent = data.parent;
  this.path = data.path;
  this.actions = data.actions instanceof Action ? [data.actions] : (data.actions || []);
  this.routes = data.routes || [];
  this.handlers = data.handlers || [];
}
Route.prototype.addChild = function(path, actions) {
  var route = new Route({
    id: utils.getuid(),
    parent: this,
    path: path,
    actions: actions
  });
  this.routes.push(route);
  return route;
};
Route.prototype.addAction = function(verb, handlers) {
  var action = new Action({
    id: utils.getuid(),
    route: this,
    verb: 'GET',
    handlers: handlers
  });
  this.actions.push(action);
  return action;
};
Object.defineProperties(Route.prototype, {
  ancestors: {
    get: function() {
      var ancestors = [],
        r = this;

      while (r.parent) {
        ancestors.push(r.parent);
        r = r.parent;
      }

      return ancestors;
    }
  },
  descendants: {
    get: function() {
      var descendants = [].concat(this.children);

      for (var i = 0; i < this.children.length; i++) {
        Array.prototype.push.apply(descendants, this.children[i].descendants);
      }

      return descendants;
    }
  },
  isRoot: {
    get: function() {
      return !this.hasAncestors;
    }
  },
  hasAncestors: {
    get: function() {
      return !!this.ancestors.length;
    }
  },
  hasDecendents: {
    get: function() {
      return !!this.descendants.length;
    }
  },
  children: {
    get: function() {
      return this.routes;
    }
  },
  hasChildren: {
    get: function() {
      return !!this.children.length;
    }
  },
  hasActions: {
    get: function() {
      return !!this.actions.length;
    }
  },
  url: {
    get: function() {
      var parts = [this.path];

      for (var i = 0; i < this.ancestors.length; i++) {
        parts.unshift(this.ancestors[i].path);
      }

      if (parts.length > 1 && parts[0] === '/') {
        parts.splice(0, 1);
      }

      return parts.join('');
    }
  }
});

/*
 * Action Constructor Function
 */
function Action(data) {
  this.route = data.route;
  this.id = data.id || utils.getuid();
  this.verb = data.verb;
  this.handlers = data.handlers instanceof Handler ? [data.handlers] : (data.handlers || []);;
}
Action.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Action.prototype.addHandler = function(data) {
  var handler = new Handler(data);
  this.handlers.push(handler);
  return handler;
};
Object.defineProperties(Action.prototype, {
  hasHandlers: {
    get: function() {
      return !!this.handlers.length;
    }
  }
});

/*
 * Handler Constructor Function
 */
function Handler(data) {
  this.id = data.id || utils.getuid();
  this.name = data.name;
  this.code = data.code;
}


/*
 * Handler Constructor Function
 */
function Api(name, route) {
  this.name = name;
  this.root = route;
}
Api.prototype.findRoute = function(id) {
  return this.routes.find(function(item) {
    return item.id === id;
  });
};
Object.defineProperties(Api.prototype, {
  routes: {
    get: function(id) {
      return [this.root].concat(this.root.descendants);
    }
  }
});


var requiresAuthentication = new Handler({
  name: 'requiresAuthentication',
  code: "function(req, res, next) { next(req.query.authme ? null : new Error('Unauthorized')); }"
});

var homeRoute = new Route({
  path: '/',
  actions: new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getHomePage',
      code: 'function(req, res) { req.send("getHomePage"); }'
    })
  })
});

homeRoute.addChild('/ping', new Action({
  verb: 'GET',
  handlers: new Handler({
    name: 'getPingPage',
    code: 'function(req, res) { req.send("pong"); }'
  })
}));

var user = homeRoute.addChild('/user', [new Action({
    verb: 'ALL',
    handlers: requiresAuthentication
  }),
  new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getUserPage',
      code: 'function(req, res) { req.send("getUserPage"); }'
    })
  })
]);

var authUsers = new Action({
  verb: 'ALL',
  handlers: requiresAuthentication
});

var loadUser = new Action({
  verb: 'ALL',
  handlers: new Handler({
    name: 'loadUser',
    code: 'function(req, res, next) { req.user = { name: "fred" }; next(); }'
  })
});

var putUser = new Action({
  verb: 'PUT',
  handlers: [new Handler({
    name: 'saveUser',
    code: 'function(req, res) { req.send("saveUser"); }'
  })]
});

var deleteUser = new Action({
  verb: 'DELETE',
  handlers: new Handler({
    name: 'deleteUser',
    code: 'function(req, res) { req.send("deleteUser"); }'
  })
});


var authenticateUsers = user.addChild('/*', [authUsers]);

var userid = user.addChild('/:id', [loadUser, putUser, deleteUser]);

userid.addChild('/videos');


var contactus = homeRoute.addChild('/contact-us', [new Action({
    verb: 'GET',
    handlers: new Handler({
      name: 'getContactUsPage',
      code: 'function(req, res) { req.send("getContactUsPage"); }'
    })
  }),
  new Action({
    verb: 'POST',
    handlers: new Handler({
      name: 'postContactUsPage',
      code: 'function(req, res) { req.send("postContactUsPage"); }'
    })
  })
]);

var api = new Api('demo', homeRoute);


window.api = api;

},{"../../../../shared/utils":76,"path":78}],48:[function(require,module,exports){
app.controller('ApiControllerCtrl', ['$scope', '$state', '$stateParams',
  function($scope, $state, $stateParams) {

    var controller = $scope.api.findController($stateParams.controllerId);

    $scope.controller = controller;

    $scope.addController = function() {
      var newController = controller.addController();

      $state.go('api.controller', {
        controllerId: newController.id
      });
    };

    $scope.addRoute = function() {
      var newRoute = controller.addRoute();

      $state.go('api.controller.route', {
        routeId: newRoute.id
      });
    };

    $scope.tabs = [{
      active: $scope.controllerTabIndex === 0
    }, {
      active: $scope.controllerTabIndex === 1
    }, {
      active: $scope.controllerTabIndex === 2
    }, {
      active: $scope.controllerTabIndex === 3
    }];

    $scope.selectTab = function(index) {
      $scope.$parent.controllerTabIndex = index;
    };

  }
]);

},{}],49:[function(require,module,exports){
app.controller('ApiDiagramCtrl', ['$scope', '$state', '$stateParams',
  function($scope, $state, $stateParams) {

    var m = [20, 120, 20, 120],
      w = 1280 - m[1] - m[3],
      h = 800 - m[0] - m[2],
      i = 0,
      j = 0,
      root, json;

    var tree = d3.layout.tree()
      .size([h, w]);

    var diagonal = d3.svg.diagonal()
      .projection(function(d) {
        return [d.y, d.x];
      });

    var vis = d3.select("#api-diagram").append("svg:svg")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
      .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");


    function build(controller) {

      var o = {
        name: controller.name
      };

      if (controller.controllers.length) {
        o.children = [];
        for (j = 0; j < controller.controllers.length; j++) {
          o.children.push(build(controller.controllers[j]));
        }
      }

      if (controller.routes.length) {
        if (!o.children) {
          o.children = [];
        }
        for (j = 0; j < controller.routes.length; j++) {
          o.children.push({
            name: controller.routes[j].name
          });
        }
      }

      return o;

      //
      //
      // children.concat(controller.routes.map(function(item) {
      //   return { name: item.name };
      // }));
      //


    }
    //
    // json = {
    //   name: $scope.api.controller.name,
    //   children: [{
    //       "name": "analytics",
    //       "children": [{
    //         "name": "cluster",
    //         "children": [{
    //           "name": "AgglomerativeCluster",
    //           "size": 3938
    //         }, {
    //           "name": "CommunityStructure",
    //           "size": 3812
    //         }, {
    //           "name": "HierarchicalCluster",
    //           "size": 6714
    //         }, {
    //           "name": "MergeEdge",
    //           "size": 743
    //         }]
    //       }]
    //     }]
    //   };
    json = build($scope.api.controller);


    root = json;
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
      if (d.children) {
        d.children.forEach(toggleAll);
        toggle(d);
      }
    }

    // Initialize the display to show a few nodes.
    root.children.forEach(toggleAll);
    //toggle(root.children[1]);
    // toggle(root.children[1].children[2]);
    // toggle(root.children[9]);
    // toggle(root.children[9].children[0]);

    update(root);



    function update(source) {
      var duration = d3.event && d3.event.altKey ? 5000 : 500;

      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse();

      // Normalize for fixed-depth.
      nodes.forEach(function(d) {
        d.y = d.depth * 180;
      });

      // Update the nodes…
      var node = vis.selectAll("g.node")
        .data(nodes, function(d) {
          return d.id || (d.id = ++i);
        });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) {
          return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on("click", function(d) {
          toggle(d);
          update(d);
        });

      nodeEnter.append("svg:circle")
        .attr("r", 1e-6)
        .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
        });

      nodeEnter.append("svg:text")
        .attr("x", function(d) {
          return d.children || d._children ? -10 : 10;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) {
          return d.children || d._children ? "end" : "start";
        })
        .text(function(d) {
          return d.name;
        })
        .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
          return "translate(" + d.y + "," + d.x + ")";
        });

      nodeUpdate.select("circle")
        .attr("r", 4.5)
        .style("fill", function(d) {
          return d._children ? "lightsteelblue" : "#fff";
        });

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      // Update the links…
      var link = vis.selectAll("path.link")
        .data(tree.links(nodes), function(d) {
          return d.target.id;
        });

      // Enter any new links at the parent's previous position.
      link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {
            x: source.x0,
            y: source.y0
          };
          return diagonal({
            source: o,
            target: o
          });
        })
        .transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
          var o = {
            x: source.x,
            y: source.y
          };
          return diagonal({
            source: o,
            target: o
          });
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    // Toggle children.
    function toggle(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    }





  }
]);

},{}],50:[function(require,module,exports){
app.controller('ApiRouteCtrl', ['$scope', '$stateParams',
  function($scope, $stateParams) {

    $scope.route = $scope.api.findRoute($stateParams.routeId);

  }
]);

},{}],51:[function(require,module,exports){
app.controller('AlertCtrl', ['$scope', '$modalInstance', 'data',
  function($scope, $modalInstance, data) {

    $scope.title = data.title;
    $scope.message = data.message;

    $scope.ok = function() {
      $modalInstance.close();
    };
  }
]);

},{}],52:[function(require,module,exports){
app.controller('AppCtrl', ['$scope',
  function($scope) {
    $scope.navbarCollapsed = false;
  }
]);

app.controller('ArrayDefCtrl', ['$scope', 'dialog',
  function($scope, $dialog) {

    var def = $scope.def;

    $scope.defData = {
      oftype: def.oftype
    };

    $scope.$watch('defData.oftype', function(newValue, oldValue) {
      if (newValue === oldValue || newValue === def.oftype) {
        return;
      }

      $dialog.confirm({
        title: 'Modify key type',
        message: 'Are you sure you want change the type of Array key [' + def.key.name + ']?'
      }).then(function() {

        // redefine def oftype
        var type = newValue;

        def.define({
          oftype: type,
          def: {}
        }, def.key);

      }, function() {
        $scope.defData.oftype = oldValue;
      });

    });


  }
]);

},{}],53:[function(require,module,exports){
app.controller('ConfirmCtrl', ['$scope', '$modalInstance', 'data',
  function($scope, $modalInstance, data) {

    $scope.title = data.title;
    $scope.message = data.message;

    $scope.ok = function() {
      $modalInstance.close();
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  }
]);

},{}],54:[function(require,module,exports){
app.controller('DbCtrl', ['$scope', '$state',
  function($scope, $state) {



    $scope.gotoModel = function() {
      $state.go('db.model', {
        //path: obj.path ? obj.path().map(function(p) { return p.name; }).join('/') : ''
        modelName: 'demo'
      });
    };


  }
]);

},{}],55:[function(require,module,exports){
app.controller('KeyCtrl', ['$scope', '$stateParams', 'dialog',
  function($scope, $stateParams, $dialog) {
    var key = $scope.model.getKeyById($stateParams.keyId);

    $scope.key = key;

    $scope.keyData = {
      type: key ? key.type : ''
    };

    $scope.$watch('keyData.type', function(newValue, oldValue) {
      if (newValue === oldValue || newValue === key.type) {
        return;
      }

      $dialog.confirm({
        title: 'Modify key type',
        message: 'Are you sure you want to modify key [' + key.name + ']?'
      }).then(function() {

        // redefine key type
        var type = newValue;
        var newDef = type === 'Array' ? {
          type: type,
          def: {
            oftype: 'String',
            def: {}
          }
        } : {
          type: type,
          def: {}
        };

        // redefine key def
        key.type = type;
        key.define(newDef);

      }, function() {
        $scope.keyData.type = oldValue;
      });

    });

  }
]);

},{}],56:[function(require,module,exports){
var utils = require('../../../shared/utils');
var db = require('../models/db');
var dagre = require('dagre');

app.controller('ModelCtrl', ['$scope', '$http', '$state', '$modal', 'dialog', '$timeout', 'modelPromise',
  function($scope, $http, $state, $modal, $dialog, $timeout, modelPromise) {

    var model = Object.create(db);

    model.initialize(modelPromise.data);

    $scope.model = model;

    // scope data
    $scope.data = {
      isCollapsed: false
    };


    //$timeout(autoLayout);

    $scope.$watch('model.name', function(oldValue, newValue) {
      console.log('renmae file');
    });

    $scope.modelAsJson = function() {
      // strip out $$hashKey etc.
      return angular.toJson(JSON.parse(model.toJson()), true);
    };

    $scope.showModelJson = function() {
      $modal.open({
        templateUrl: '/html/db-json.html',
        scope: $scope
      });
    };

    $scope.showModelDiagram = function() {
      $modal.open({
        templateUrl: '/html/db-diagram.html',
        scope: $scope
      });
    };

    $scope.gotoPath = function(obj) {

      var isModel = obj.schemas;
      var isSchema = !isModel && !obj.type;

      if (isModel) {

        $state.go('db.model.edit', {
          modelName: obj.name
        });

      } else if (isSchema) {

        $state.go('db.model.schema', {
          schemaId: obj.id
        });

      } else {

        $state.go('db.model.schema.key', {
          schemaId: obj.keys.schema.id,
          keyId: obj.id
        });

      }


    };

    var idempotentialize = function(f) {
      var previous;
      var f_idempotent = function() {
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

      $dialog.confirm({
        title: 'Delete schema',
        message: 'Are you sure you want to delete schema [' + schema.dotPath() + ']?'
      }).then(function() {
        schema.db.removeSchema(schema);
        // go to model root
        $scope.gotoPath(schema.db);
      });
    };

    $scope.addKey = function(keys, sibling, insertAbove) {

      // add a new Key, optionally passing a relative sibling to insert next to either above or below

      var data = {
        id: utils.getuid(),
        name: 'NewKeyName',
        type: 'String',
        def: {}
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
      $dialog.confirm({
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

    function autoLayout() {
      var g = new dagre.Digraph();
      var edges = [];
      var el;
      // $('.schema').each(function() {
      //     var $this = $(this);
      //     var id = $(this).attr('id');
      //     g.addNode(id, {
      //         label: id,
      //         width: $this.width(),
      //         height: $this.height()
      //     });
      //     $this.find('.key-header[data-ref]').each(function() {
      //         edges.push([$(this).data('ref'), id]);
      //     });
      // });

      for (var i = 0; i < model.schemas.length; i++) {
        var schema = model.schemas[i];
        var id = schema.id;
        // el = document.getElementById(id);
        // el.style.position = 'absolute';
        // var style = window.getComputedStyle(el, null);

        g.addNode(id, {
          label: id,
          // width: parseFloat(style.width),
          // height: parseFloat(style.height)
        });

        var schemaReferences = schema.schemaReferences();
        for (var j = 0; j < schemaReferences.length; j++) {
          edges.push([schemaReferences[j].keys.schema.id, id]);
        }

      }


      for (var k = 0; k < edges.length; k++) {
        g.addEdge(null, edges[k][0], edges[k][1]);
      }

      var layout = dagre.layout().nodeSep(20).edgeSep(5).rankSep(20).run(g);
      // var layout = dagre.layout().run(g);
      layout.eachNode(function(u, value) {

        // el = document.getElementById(u);
        // el.style.top = value.y + 'px';
        // el.style.left = value.x + 'px';
        // el.style.width = '200px';
        // el.style.height = '300px';
        // el.style.overflow = 'hidden';

      });
    }

  }
]);

},{"../../../shared/utils":76,"../models/db":65,"dagre":1}],57:[function(require,module,exports){
app.controller('PromptCtrl', ['$scope', '$modalInstance', 'data',
  function($scope, $modalInstance, data) {

    $scope.title = data.title;
    $scope.message = data.message;
    $scope.placeholder = data.placeholder;
    $scope.input = {
      value: data.defaultValue
    };

    $scope.ok = function() {
      $modalInstance.close($scope.input.value);
    };

    $scope.cancel = function() {
      $modalInstance.dismiss('cancel');
    };
  }
]);

},{}],58:[function(require,module,exports){
app.controller('SchemaCtrl', ['$scope', '$stateParams',
  function($scope, $stateParams) {
    $scope.schema = $scope.model.getSchemaById($stateParams.schemaId);
  }
]);

},{}],59:[function(require,module,exports){
var Behave = require('../vendor/behave');

// // Autosize behave textarea
// BehaveHooks.add(['keydown'], function(data) {
//   var numLines = data.lines.total,
//     fontSize = parseInt(getComputedStyle(data.editor.element)['font-size']),
//     padding = parseInt(getComputedStyle(data.editor.element)['padding']);
//   data.editor.element.style.height = (((numLines * fontSize) + padding)) + 'px';
// });


app.directive('behave', function() {
  return {
    link: function(scope, element) {
      var editor = new Behave({
        textarea: element[0],
        replaceTab: true,
        softTabs: true,
        tabSize: 2,
        autoOpen: true,
        overwrite: true,
        autoStrip: true,
        autoIndent: true,
        fence: false
      });

      scope.$on('$destroy', function() {
        console.log("destroy");
        editor.destroy();
      });
    }
  };
});

},{"../vendor/behave":74}],60:[function(require,module,exports){
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

},{}],61:[function(require,module,exports){
app.directive('focus',

  function($timeout) {

    return {
      scope: {
        trigger: '@focus'
      },

      link: function(scope, element) {
        scope.$watch('trigger', function(value) {
          if (value === 'true') {
            $timeout(function() {
              element[0].focus();
            });
          }
        });
      }
    };
  }
  
);

},{}],62:[function(require,module,exports){
app.directive('negate', [

  function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attribute, ngModelController) {
        ngModelController.$isEmpty = function(value) {
          return !!value;
        };

        ngModelController.$formatters.unshift(function(value) {
          return !value;
        });

        ngModelController.$parsers.unshift(function(value) {
          return !value;
        });
      }
    };
  }
]);
},{}],63:[function(require,module,exports){
window.app = require('./modules/app');

// ***********
// Shims
// ***********
require('./shims/array');

window._api = require('../../shared/api/api');


// ***********
// Directives
// ***********
require('./directives/negate');
require('./directives/focus');
require('./directives/db-diagram');
require('./directives/behave');


// ***********
// Controllers
// ***********

// dialog controllers
require('./controllers/confirm');
require('./controllers/alert');
require('./controllers/prompt');

// db model controllers
require('./controllers/key');
require('./controllers/schema');
require('./controllers/model');
require('./controllers/db');


// api model controllers
require('./api/controllers/api');
require('./api/controllers/controller');
require('./api/controllers/route');
require('./api/controllers/diagram');



// ***********
// Services
// ***********
require('./services/dialog');



// Main App Ctrl
require('./controllers/app');

},{"../../shared/api/api":75,"./api/controllers/api":47,"./api/controllers/controller":48,"./api/controllers/diagram":49,"./api/controllers/route":50,"./controllers/alert":51,"./controllers/app":52,"./controllers/confirm":53,"./controllers/db":54,"./controllers/key":55,"./controllers/model":56,"./controllers/prompt":57,"./controllers/schema":58,"./directives/behave":59,"./directives/db-diagram":60,"./directives/focus":61,"./directives/negate":62,"./modules/app":71,"./services/dialog":72,"./shims/array":73}],64:[function(require,module,exports){
module.exports = {
  initialize: function() {},
  toJson: function() {
    return JSON.parse(angular.toJson(this));
  },
  nameRegexValidate: /^[a-zA-Z][a-zA-Z0-9_]{0,29}$/
};

//  var propertyDefinitions = {
//    numberProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          if (!isNaN(value)) {
//            propertyValue = Number(value);
//          }
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    },
//    booleanProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          var val = value && typeof value === 'string' ? value.toLowerCase() : value;
//          propertyValue = val ? Boolean(val === 'false' || val === 'off' ? undefined : val) : undefined;
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    },
//    dateProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          var val = value;
//          propertyValue = val ? new Date(val) : undefined;
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    }
//  };

},{}],65:[function(require,module,exports){
var base = require('./base');
var schema = require('./schema');
var Msg = require('./msg');

var staticTypes = 'String Boolean Number Date NestedDocument Array ForeignKey ObjectId Mixed Buffer'.split(' ');
var childDocumentType = ['ChildDocument'];

var db = _.extend({}, base, {
  id: null,
  name: null,
  description: null,
  schemas: [],
  initialize: function(data) {

    data = (data && Array.isArray(data.schemas)) ? data : {
      schemas: []
    };

    this.id = data.id;
    this.name = data.name;
    this.schemas = [];
    if (data.schemas) {
      for (var i = 0; i < data.schemas.length; i++) {
        this.addSchema(data.schemas[i]);
      }
    }
  },
  addSchema: function(data) {
    var s = this.createSchema();
    s.initialize(data);
    this.schemas.push(s);
    return s;
  },
  insertSchema: function(schema) {
    this.schemas.push(schema);
    return schema;
  },
  createSchema: function() {
    return Object.create(schema, {
      db: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
  },
  getSchemaById: function(id) {
    return _.findWhere(this.schemas, {
      id: id
    });
  },
  getSchemaByName: function(name) {
    return this.schemas.find(function(item) {
      return item.name === name;
    });
  },
  removeSchema: function(schema) {
    this.schemas.splice(this.schemas.indexOf(schema), 1);
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Model name is required'));
    }

    // get schema names
    var schemaNames = this.schemas.map(function(schema) {
      return schema.name;
    });

    // ensure unique schema names
    var dupes = schemaNames.sort().filter(function(item, index, arr) {
      return (index !== 0) && (item === arr[index - 1]);
    });

    if (dupes.length) {
      errors.push(new Msg('Duplicate schema names: ' + _.uniq(dupes).join(', ')));
    }

    // bubble any individual schema errors
    for (var i = 0; i < this.schemas.length; i++) {
      Array.prototype.push.apply(errors, this.schemas[i].errors());
    }

    return errors;
  },
  isValid: function() {
    return this.errors().length === 0;
  },
  validateSchemaName: function(name, ignoreSchema) {
    if (!name) return new Msg('Name cannot be blank. Please supply a name.');
    var dupes = _.find(this.schemas, function(s) {
      return s !== ignoreSchema && s.name.toLowerCase() === name.toLowerCase();
    });
    return dupes ? new Msg('Duplicate Schema name. Please supply a unique name.') : true;
  },
  schemaReferences: function(schema) {
    return this.childKeys().filter(function(key) {
      return schema ? key.ref() === schema.id : key.ref();
    });
  },
  isSchemaReferenced: function(schema) {
    return this.schemaReferences(schema).length > 0;
  },
  staticTypes: staticTypes,
  childDocumentType: childDocumentType,
  allTypes: [].concat(staticTypes, childDocumentType),
  notInstalledSchemas: function() {
    return _.filter(this.schemas, function(schema) {
      return !schema.installed;
    });
  },
  installedSchemas: function() {
    return _.filter(this.schemas, function(schema) {
      return schema.installed;
    });
  },
  availableDocumentRefs: function() {
    return _.map(this.installedSchemas(), function(schema) {
      return {
        id: schema.id,
        name: schema.name
      };
    });
  },
  availableChildDocumentRefs: function() {
    return _.map(this.notInstalledSchemas(), function(schema) {
      return {
        id: schema.id,
        name: schema.name
      };
    });
  },
  childKeys: function() {
    var keys = [];
    for (var i = 0; i < this.schemas.length; i++) {
      Array.prototype.push.apply(keys, this.schemas[i].keys.childKeys());
    }
    return keys;
  },
  findByPath: function(path) {
    var parts = path.split('/');

    if (parts.length === 2) {
      return this.getSchemaByName(parts[1]);
    } else {
      return this.childKeys().find(function(item) {
        return item.slashPath() === path;
      });
    }
  },
  getKeyById: function(id) {
    return this.childKeys().find(function(item) {
      return item.id === id;
    });
  },
  toJson: function() {
    return JSON.stringify(this, function(key, value) {
      if (this.propertyIsEnumerable(key) === false) {
        return;
      }
      return value;
    }, 2);
  }
});

module.exports = window.db = db;

},{"./base":64,"./msg":69,"./schema":70}],66:[function(require,module,exports){
var base = require('./base');
var Msg = require('./msg');

//
// todo - type getters/setters casting of properties for numbers, dates etc.
//

var StringDef = function(data) {
  this.required = data.required;
  this.defaultValue = data.defaultValue;
  this.enumeration = data.enumeration;
  this.uppercase = data.uppercase;
  this.lowercase = data.lowercase;
  this.match = data.match;
  this.trim = data.trim;
};

var BooleanDef = function(data) {
  this.required = data.required;
  this.defaultValue = data.defaultValue;
};

var NumberDef = function(data) {
  this.required = data.required;
  this.defaultValue = data.defaultValue;
  this.min = data.min;
  this.max = data.max;
  this.errors = function() {
    var errors = [];
    var min = this.min;
    var max = this.max;
    var dflt = this.defaultValue;

    if (dflt < min) {
      errors.push(new Msg('The Default value should be greater than Min'));
    }
    if (dflt > max) {
      errors.push(new Msg('The Default value should be less than Max'));
    }

    if (max <= min) {
      errors.push(new Msg('Max value should be greater than Min'));
    }

    return errors;
  };
};

var DateDef = function(data) {
  this.required = data.required;
  this.defaultValue = data.defaultValue;
};

var NestedDocumentDef = function(data, key) {
  this.required = data.required;
  this.keys = Object.create(require('./keys'), { // require('keys') is used lazily here since 'keys' is a circular dependency
    schema: {
      value: key.keys.schema,
      writable: false,
      enumerable: false
    },
    key: {
      value: key,
      writable: false,
      enumerable: false
    }
  });
  this.keys.initialize(data.keys ? data.keys.items : []);

  this.errors = function() {
    return this.keys.errors();
  };
};

var ArrayDef = function(data, key) {
  this.define(data, key);
  this.errors = function() {
    return this.def.errors ? this.def.errors() : [];
  };
};
ArrayDef.prototype.define = function(data, key) {
  this.oftype = data.oftype;
  this.def = Object.create(def, {
    key: {
      writable: false,
      enumerable: false,
      value: key
    }
  });
  this.def.initialize(data);
};

var ForeignKeyDef = function(data) {
  this.required = data.required;
  this.ref = data.ref;
};

var MixedDef = function(data) {
  this.required = data.required;
};

var ObjectIdDef = function(data) {
  this.required = data.required;
  this.auto = data.auto;
};

var BufferDef = function(data) {
  this.required = data.required;
  this.ref = data.ref;
};

var ChildDocumentDef = function(data) {
  this.ref = data.ref;
};

function factoryDef(data, key) {
  var type = (data.type || data.oftype).toLowerCase();
  var def = data.def;
  switch (type) {
    case 'string':
      return new StringDef(def);
    case 'boolean':
      return new BooleanDef(def);
    case 'number':
      return new NumberDef(def);
    case 'date':
      return new DateDef(def);
    case 'nesteddocument':
      return new NestedDocumentDef(def, key);
    case 'array':
      return new ArrayDef(def, key);
    case 'foreignkey':
      return new ForeignKeyDef(def);
    case 'objectid':
      return new ObjectIdDef(def);
    case 'mixed':
      return new MixedDef(def);
    case 'buffer':
      return new BufferDef(def);
    case 'childdocument':
      return new ChildDocumentDef(def);
    default:
      throw new Error('Type not supported');
  }
}

var def = _.extend({}, base, {
  key: null,
  initialize: function(data) {
    _.extend(this, factoryDef(data, this.key));
  }
});

module.exports = def;

},{"./base":64,"./keys":68,"./msg":69}],67:[function(require,module,exports){
var utils = require('../../../shared/utils');
var base = require('./base');
var def = require('./def');
var Msg = require('./msg');

var key = _.extend({}, base, {
  keys: null,
  initialize: function(data) {
    this.id = data.id || utils.getuid();
    this.name = data.name;
    this.description = data.description;
    this.define(data);
  },
  define: function(data) {
    this.type = data.type;
    this.def = Object.create(def, {
      key: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
    this.def.initialize(data);
  },
  typeAsString: function() {
    var names = _.object(_.map(this.keys.schema.db.schemas, function(schema) {
      return [schema.id, schema.name];
    }));

    var def = this.def;
    var t = this.type;
    if (t === 'Array') {
      var ofT = def.oftype;
      if (ofT === 'ForeignKey') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]';
      } else if (ofT === 'ChildDocument') {
        return '[' + ofT + '<' + names[def.def.ref] + '>]';
      } else {
        return '[' + ofT + ']';
      }
    } else if (t === 'ForeignKey') {
      return t + '<' + names[def.ref] + '>';
    } else {
      return t;
    }
  },
  ref: function() {
    if (this.type === 'ForeignKey') {
      return this.def.ref;
    } else if (this.type === 'Array' && this.def.oftype === 'ForeignKey') {
      return this.def.def.ref;
    } else if (this.type === 'Array' && this.def.oftype === 'ChildDocument') {
      return this.def.def.ref;
    } else {
      return;
    }
  },
  isNestedType: function() {
    return this.type == 'NestedDocument';
  },
  isNestedTypeArray: function() {
    return this.isArray() && this.def.oftype === 'NestedDocument';
  },
  isNested: function() {
    return this.isNestedType() || this.isNestedTypeArray();
  },
  isArray: function() {
    return this.type === 'Array';
  },
  path: function() {
    var path = [this];
    var args = [0, 0].concat(this.keys.path());
    Array.prototype.splice.apply(path, args);
    return path;
  },
  dotPath: function() {
    return this.path().map(function(p) { return p.name; }).join('.');
  },
  slashPath: function() {
    return this.path().map(function(p) { return p.name; }).join('/');
  },
  childKeys: function() {
    if (this.isNestedType()) {
      return this.def.keys.childKeys();
    } else if (this.isNestedTypeArray()) {
      return this.def.def.keys.childKeys();
    }
    return null;
  },
  siblings: function() {
    var self = this;
    return this.keys.items.filter(function(item) {
      return item !== self;
    });
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Name is required'));
    }

    var def = this.def;
    return def.errors ? errors.concat(def.errors()) : errors;
  }
});

module.exports = key;

},{"../../../shared/utils":76,"./base":64,"./def":66,"./msg":69}],68:[function(require,module,exports){
var base = require('./base');
var key = require('./key');
var Msg = require('./msg');

var keys = _.extend({}, base, {
  schema: null,
  key: null,
  initialize: function(data) {
    this.items = [];
    for (var i = 0; i < data.length; i++) {
      this.addKey(data[i]);
    }
  },
  createKey: function(data) {
    var o = Object.create(key, {
      keys: {
        writable: false,
        enumerable: false,
        value: this
      }
    });
    o.initialize(data);
    return o;
  },
  addKey: function(data) {
    var o = this.createKey(data);
    this.items.push(o);
    return o;
  },
  insertKey: function(data, index) {
    var o = this.createKey(data);
    this.items.splice(index, 0, o);
    return o;
  },
  deleteKey: function(key) {
    var index = this.items.indexOf(key);
    if (~index) {
      this.items.splice(index, 1);
    }
  },
  path: function() {
    return this.key ? this.key.path() : this.schema.path();
  },
  childKeys: function() {
    var keys = [];
    Array.prototype.push.apply(keys, this.items);
    for (var i = 0; i < this.items.length; i++) {
      Array.prototype.push.apply(keys, this.items[i].childKeys());
    }
    return keys;
  },
  errors: function() {
    var errors = [];
    var keyNames = [];

    // key errors
    for (var i = 0; i < this.items.length; i++) {
      keyNames.push(this.items[i].name);
      Array.prototype.push.apply(errors, this.items[i].errors());
    }

    // ensure unique names
    var dupes = keyNames.sort().filter(function(item, index, arr) {
      return (index !== 0) && (item === arr[index - 1]);
    });

    if (dupes.length) {
      errors.push(new Msg('Duplicate key names: ' + _.uniq(dupes).join(', ')));
    }

    return errors;
  }
});

module.exports = keys;

},{"./base":64,"./key":67,"./msg":69}],69:[function(require,module,exports){
module.exports = function Msg(message) {
  this.message = message;
};

},{}],70:[function(require,module,exports){
var base = require('./base');
var keys = require('./keys');
var Msg = require('./msg');

var schema = _.extend({}, base, {
  db: null,
  initialize: function(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.installed = data.installed || false;
    this.keys = Object.create(keys, {
      schema: {
        writable: false,
        enumerable: false,
        value: this
      }
    });

    this.keys.initialize((data.keys && data.keys.items) || {} );
  },
  path: function() {
    return [this.db, this];
  },
  dotPath: function() {
    return this.path().map(function(p) { return p.name; }).join('.');
  },
  slashPath: function() {
    return this.path().map(function(p) { return p.name; }).join('/');
  },
  errors: function() {
    var errors = [];

    if (!this.name) {
      errors.push(new Msg('Schema name is required'));
    }

    Array.prototype.push.apply(errors, this.keys.errors());

    return errors;
  },
  schemaReferences: function(schema) {
    return this.db.schemaReferences(this);
  },
  isSchemaReferenced: function(schema) {
    return this.db.isSchemaReferenced(this);
  },
  childKeys: function() {
    return this.keys.childKeys();
  },
  findKey: function(path) {
    return this.childKeys().filter(function() {
      return item.path() === path;
    });
  }
});

module.exports = schema;

},{"./base":64,"./keys":68,"./msg":69}],71:[function(require,module,exports){
var app = angular.module('app', ['ngRoute', 'ui.router', 'ui.bootstrap', 'ui.ace']);

app.config(function($stateProvider, $locationProvider, $urlRouterProvider) {

  //$locationProvider.html5Mode(true);

  // For any unmatched url, redirect to /db
  $urlRouterProvider.otherwise("/db");

  // Now set up the states
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
          templateUrl: '/html/key.html',
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

  function registerApiStates($stateProvider) {

    $stateProvider
      .state('api', {
        url: '/api/:apiName',
        controller: 'ApiCtrl',
        templateUrl: '/html/api/api.html',
        resolve: {
          apiPromise: ['$http', '$stateParams',
            function($http, $stateParams) {
              return window._api; //$http.get('/' + $stateParams.modelName + '.json');
            }
          ]
        }
      })
      .state('api.diagram', {
        url: '/diagram',
        controller: 'ApiDiagramCtrl',
        templateUrl: '/html/api/diagram.html'
      })
      .state('api.route', {
        url: '/:routeId',
        controller: 'ApiRouteCtrl',
        templateUrl: '/html/api/route.html'
      })
      .state('api.controller.route', {
        url: '/:routeId',
        views: {
          'secondary@api': { // Target the ui-view='secondary' in root state 'api'
            controller: 'ApiRouteCtrl',
            templateUrl: '/html/api/route.html'
          }
        }
      });
  }



  registerApiStates($stateProvider);

});

module.exports = app;

},{}],72:[function(require,module,exports){
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

},{}],73:[function(require,module,exports){
Array.prototype.move = function(oldIndex, newIndex) {

  if (isNaN(newIndex) || isNaN(oldIndex) || oldIndex < 0 || oldIndex >= this.length) {
    return;
  }

  if (newIndex < 0) {
    newIndex = this.length - 1;
  } else if (newIndex >= this.length) {
    newIndex = 0;
  }

  this.splice(newIndex, 0, this.splice(oldIndex, 1)[0]);

  return newIndex;
};

if (!Array.prototype.find) {
  Array.prototype.find = function(predicate) {
    if (this === null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    var thisArg = arguments[1];
    var value;

    for (var i = 0; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) {
        return value;
      }
    }
    return undefined;
  };
}

},{}],74:[function(require,module,exports){
/*
 * Behave.js
 *
 * Copyright 2013, Jacob Kelley - http://jakiestfu.com/
 * Released under the MIT Licence
 * http://opensource.org/licenses/MIT
 *
 * Github:  http://github.com/jakiestfu/Behave.js/
 * Version: 1.5
 */


(function(undefined){

    'use strict';

    var BehaveHooks = BehaveHooks || (function(){
		var hooks = {};

		return {
		    add: function(hookName, fn){
			    if(typeof hookName == "object"){
			    	var i;
			    	for(i=0; i<hookName.length; i++){
				    	var theHook = hookName[i];
				    	if(!hooks[theHook]){
					    	hooks[theHook] = [];
				    	}
				    	hooks[theHook].push(fn);
			    	}
			    } else {
				    if(!hooks[hookName]){
				    	hooks[hookName] = [];
			    	}
			    	hooks[hookName].push(fn);
			    }
		    },
		    get: function(hookName){
			    if(hooks[hookName]){
			    	return hooks[hookName];
		    	}
		    }
	    };

	})(),
	Behave = Behave || function (userOpts) {

        if (typeof String.prototype.repeat !== 'function') {
            String.prototype.repeat = function(times) {
                if(times < 1){
                    return '';
                }
                if(times % 2){
                    return this.repeat(times - 1) + this;
                }
                var half = this.repeat(times / 2);
                return half + half;
            };
        }

        if (typeof Array.prototype.filter !== 'function') {
            Array.prototype.filter = function(func /*, thisp */) {
                if (this === null) {
                    throw new TypeError();
                }

                var t = Object(this),
                    len = t.length >>> 0;
                if (typeof func != "function"){
                    throw new TypeError();
                }
                var res = [],
                    thisp = arguments[1];
                for (var i = 0; i < len; i++) {
                    if (i in t) {
                        var val = t[i];
                        if (func.call(thisp, val, i, t)) {
                            res.push(val);
                        }
                    }
                }
                return res;
            };
        }

        var defaults = {
            textarea: null,
            replaceTab: true,
            softTabs: true,
            tabSize: 4,
            autoOpen: true,
            overwrite: true,
            autoStrip: true,
            autoIndent: true,
            fence: false
        },
        tab,
        newLine,
        charSettings = {

            keyMap: [
                { open: "\"", close: "\"", canBreak: false },
                { open: "'", close: "'", canBreak: false },
                { open: "(", close: ")", canBreak: false },
                { open: "[", close: "]", canBreak: true },
                { open: "{", close: "}", canBreak: true }
            ]

        },
        utils = {

        	_callHook: function(hookName, passData){
    			var hooks = BehaveHooks.get(hookName);
	    		passData = typeof passData=="boolean" && passData === false ? false : true;

	    		if(hooks){
			    	if(passData){
				    	var theEditor = defaults.textarea,
				    		textVal = theEditor.value,
				    		caretPos = utils.cursor.get(),
				    		i;

				    	for(i=0; i<hooks.length; i++){
					    	hooks[i].call(undefined, {
					    		editor: {
						    		element: theEditor,
						    		text: textVal,
						    		levelsDeep: utils.levelsDeep()
					    		},
						    	caret: {
							    	pos: caretPos
						    	},
						    	lines: {
							    	current: utils.cursor.getLine(textVal, caretPos),
							    	total: utils.editor.getLines(textVal)
						    	}
					    	});
				    	}
			    	} else {
				    	for(i=0; i<hooks.length; i++){
				    		hooks[i].call(undefined);
				    	}
			    	}
		    	}
	    	},

            defineNewLine: function(){
                var ta = document.createElement('textarea');
                ta.value = "\n";

                if(ta.value.length==2){
                    newLine = "\r\n";
                } else {
                    newLine = "\n";
                }
            },
            defineTabSize: function(tabSize){
                if(typeof defaults.textarea.style.OTabSize != "undefined"){
                    defaults.textarea.style.OTabSize = tabSize; return;
                }
                if(typeof defaults.textarea.style.MozTabSize != "undefined"){
                    defaults.textarea.style.MozTabSize = tabSize; return;
                }
                if(typeof defaults.textarea.style.tabSize != "undefined"){
                    defaults.textarea.style.tabSize = tabSize; return;
                }
            },
            cursor: {
	            getLine: function(textVal, pos){
		        	return ((textVal.substring(0,pos)).split("\n")).length;
	        	},
	            get: function() {

                    if (typeof document.createElement('textarea').selectionStart==="number") {
                        return defaults.textarea.selectionStart;
                    } else if (document.selection) {
                        var caretPos = 0,
                            range = defaults.textarea.createTextRange(),
                            rangeDupe = document.selection.createRange().duplicate(),
                            rangeDupeBookmark = rangeDupe.getBookmark();
                        range.moveToBookmark(rangeDupeBookmark);

                        while (range.moveStart('character' , -1) !== 0) {
                            caretPos++;
                        }
                        return caretPos;
                    }
                },
                set: function (start, end) {
                    if(!end){
                        end = start;
                    }
                    if (defaults.textarea.setSelectionRange) {
                        defaults.textarea.focus();
                        defaults.textarea.setSelectionRange(start, end);
                    } else if (defaults.textarea.createTextRange) {
                        var range = defaults.textarea.createTextRange();
                        range.collapse(true);
                        range.moveEnd('character', end);
                        range.moveStart('character', start);
                        range.select();
                    }
                },
                selection: function(){
                    var textAreaElement = defaults.textarea,
                        start = 0,
                        end = 0,
                        normalizedValue,
                        range,
                        textInputRange,
                        len,
                        endRange;

                    if (typeof textAreaElement.selectionStart == "number" && typeof textAreaElement.selectionEnd == "number") {
                        start = textAreaElement.selectionStart;
                        end = textAreaElement.selectionEnd;
                    } else {
                        range = document.selection.createRange();

                        if (range && range.parentElement() == textAreaElement) {

                            normalizedValue = utils.editor.get();
                            len = normalizedValue.length;

                            textInputRange = textAreaElement.createTextRange();
                            textInputRange.moveToBookmark(range.getBookmark());

                            endRange = textAreaElement.createTextRange();
                            endRange.collapse(false);

                            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                                start = end = len;
                            } else {
                                start = -textInputRange.moveStart("character", -len);
                                start += normalizedValue.slice(0, start).split(newLine).length - 1;

                                if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                                    end = len;
                                } else {
                                    end = -textInputRange.moveEnd("character", -len);
                                    end += normalizedValue.slice(0, end).split(newLine).length - 1;
                                }
                            }
                        }
                    }

                    return start==end ? false : {
                        start: start,
                        end: end
                    };
                }
            },
            editor: {
                getLines: function(textVal){
		        	return (textVal).split("\n").length;
	        	},
	            get: function(){
                    return defaults.textarea.value.replace(/\r/g,'');
                },
                set: function(data){
                    defaults.textarea.value = data;
                }
            },
            fenceRange: function(){
                if(typeof defaults.fence == "string"){

                    var data = utils.editor.get(),
                        pos = utils.cursor.get(),
                        hacked = 0,
                        matchedFence = data.indexOf(defaults.fence),
                        matchCase = 0;

                    while(matchedFence>=0){
                        matchCase++;
                        if( pos < (matchedFence+hacked) ){
                            break;
                        }

                        hacked += matchedFence+defaults.fence.length;
                        data = data.substring(matchedFence+defaults.fence.length);
                        matchedFence = data.indexOf(defaults.fence);

                    }

                    if( (hacked) < pos && ( (matchedFence+hacked) > pos ) && matchCase%2===0){
                        return true;
                    }
                    return false;
                } else {
                    return true;
                }
            },
            isEven: function(_this,i){
                return i%2;
            },
            levelsDeep: function(){
                var pos = utils.cursor.get(),
                    val = utils.editor.get();

                var left = val.substring(0, pos),
                    levels = 0,
                    i, j;

                for(i=0; i<left.length; i++){
                    for (j=0; j<charSettings.keyMap.length; j++) {
                        if(charSettings.keyMap[j].canBreak){
                            if(charSettings.keyMap[j].open == left.charAt(i)){
                                levels++;
                            }

                            if(charSettings.keyMap[j].close == left.charAt(i)){
                                levels--;
                            }
                        }
                    }
                }

                var toDecrement = 0,
                    quoteMap = ["'", "\""];
                for(i=0; i<charSettings.keyMap.length; i++) {
                    if(charSettings.keyMap[i].canBreak){
                        for(j in quoteMap){
                            toDecrement += left.split(quoteMap[j]).filter(utils.isEven).join('').split(charSettings.keyMap[i].open).length - 1;
                        }
                    }
                }

                var finalLevels = levels - toDecrement;

                return finalLevels >=0 ? finalLevels : 0;
            },
            deepExtend: function(destination, source) {
                for (var property in source) {
                    if (source[property] && source[property].constructor &&
                        source[property].constructor === Object) {
                        destination[property] = destination[property] || {};
                        utils.deepExtend(destination[property], source[property]);
                    } else {
                        destination[property] = source[property];
                    }
                }
                return destination;
            },
            addEvent: function addEvent(element, eventName, func) {
                if (element.addEventListener){
                    element.addEventListener(eventName,func,false);
                } else if (element.attachEvent) {
                    element.attachEvent("on"+eventName, func);
                }
            },
            removeEvent: function addEvent(element, eventName, func){
	            if (element.addEventListener){
	                element.removeEventListener(eventName,func,false);
	            } else if (element.attachEvent) {
	                element.detachEvent("on"+eventName, func);
	            }
	        },

            preventDefaultEvent: function(e){
                if(e.preventDefault){
                    e.preventDefault();
                } else {
                    e.returnValue = false;
                }
            }
        },
        intercept = {
            tabKey: function (e) {

                if(!utils.fenceRange()){ return; }

                if (e.keyCode == 9) {
                    utils.preventDefaultEvent(e);

                    var toReturn = true;
                    utils._callHook('tab:before');

                    var selection = utils.cursor.selection(),
                        pos = utils.cursor.get(),
                        val = utils.editor.get();

                    if(selection){

                        var tempStart = selection.start;
                        while(tempStart--){
                            if(val.charAt(tempStart)=="\n"){
                                selection.start = tempStart + 1;
                                break;
                            }
                        }

                        var toIndent = val.substring(selection.start, selection.end),
                            lines = toIndent.split("\n"),
                            i;

                        if(e.shiftKey){
                            for(i = 0; i<lines.length; i++){
                                if(lines[i].substring(0,tab.length) == tab){
                                    lines[i] = lines[i].substring(tab.length);
                                }
                            }
                            toIndent = lines.join("\n");

                            utils.editor.set( val.substring(0,selection.start) + toIndent + val.substring(selection.end) );
                            utils.cursor.set(selection.start, selection.start+toIndent.length);

                        } else {
                            for(i in lines){
                                lines[i] = tab + lines[i];
                            }
                            toIndent = lines.join("\n");

                            utils.editor.set( val.substring(0,selection.start) + toIndent + val.substring(selection.end) );
                            utils.cursor.set(selection.start, selection.start+toIndent.length);
                        }
                    } else {
                        var left = val.substring(0, pos),
                            right = val.substring(pos),
                            edited = left + tab + right;

                        if(e.shiftKey){
                            if(val.substring(pos-tab.length, pos) == tab){
                                edited = val.substring(0, pos-tab.length) + right;
                                utils.editor.set(edited);
                                utils.cursor.set(pos-tab.length);
                            }
                        } else {
                            utils.editor.set(edited);
                            utils.cursor.set(pos + tab.length);
                            toReturn = false;
                        }
                    }
                    utils._callHook('tab:after');
                }
                return toReturn;
            },
            enterKey: function (e) {

                if(!utils.fenceRange()){ return; }

                if (e.keyCode == 13) {

                    utils.preventDefaultEvent(e);
                    utils._callHook('enter:before');

                    var pos = utils.cursor.get(),
                        val = utils.editor.get(),
                        left = val.substring(0, pos),
                        right = val.substring(pos),
                        leftChar = left.charAt(left.length - 1),
                        rightChar = right.charAt(0),
                        numTabs = utils.levelsDeep(),
                        ourIndent = "",
                        closingBreak = "",
                        finalCursorPos,
                        i;
                    if(!numTabs){
                        finalCursorPos = 1;
                    } else {
                        while(numTabs--){
                            ourIndent+=tab;
                        }
                        ourIndent = ourIndent;
                        finalCursorPos = ourIndent.length + 1;

                        for(i=0; i<charSettings.keyMap.length; i++) {
                            if (charSettings.keyMap[i].open == leftChar && charSettings.keyMap[i].close == rightChar){
                                closingBreak = newLine;
                            }
                        }

                    }

                    var edited = left + newLine + ourIndent + closingBreak + (ourIndent.substring(0, ourIndent.length-tab.length) ) + right;
                    utils.editor.set(edited);
                    utils.cursor.set(pos + finalCursorPos);
                    utils._callHook('enter:after');
                }
            },
            deleteKey: function (e) {

	            if(!utils.fenceRange()){ return; }

	            if(e.keyCode == 8){
	            	utils.preventDefaultEvent(e);

	            	utils._callHook('delete:before');

	            	var pos = utils.cursor.get(),
	                    val = utils.editor.get(),
	                    left = val.substring(0, pos),
	                    right = val.substring(pos),
	                    leftChar = left.charAt(left.length - 1),
	                    rightChar = right.charAt(0),
	                    i;

	                if( utils.cursor.selection() === false ){
	                    for(i=0; i<charSettings.keyMap.length; i++) {
	                        if (charSettings.keyMap[i].open == leftChar && charSettings.keyMap[i].close == rightChar) {
	                            var edited = val.substring(0,pos-1) + val.substring(pos+1);
	                            utils.editor.set(edited);
	                            utils.cursor.set(pos - 1);
	                            return;
	                        }
	                    }
	                    var edited = val.substring(0,pos-1) + val.substring(pos);
	                    utils.editor.set(edited);
	                    utils.cursor.set(pos - 1);
	                } else {
	                	var sel = utils.cursor.selection(),
	                		edited = val.substring(0,sel.start) + val.substring(sel.end);
	                    utils.editor.set(edited);
	                    utils.cursor.set(pos);
	                }

	                utils._callHook('delete:after');

	            }
	        }
        },
        charFuncs = {
            openedChar: function (_char, e) {
                utils.preventDefaultEvent(e);
                utils._callHook('openChar:before');
                var pos = utils.cursor.get(),
                    val = utils.editor.get(),
                    left = val.substring(0, pos),
                    right = val.substring(pos),
                    edited = left + _char.open + _char.close + right;

                defaults.textarea.value = edited;
                utils.cursor.set(pos + 1);
                utils._callHook('openChar:after');
            },
            closedChar: function (_char, e) {
                var pos = utils.cursor.get(),
                    val = utils.editor.get(),
                    toOverwrite = val.substring(pos, pos + 1);
                if (toOverwrite == _char.close) {
                    utils.preventDefaultEvent(e);
                    utils._callHook('closeChar:before');
                    utils.cursor.set(utils.cursor.get() + 1);
                    utils._callHook('closeChar:after');
                    return true;
                }
                return false;
            }
        },
        action = {
            filter: function (e) {

                if(!utils.fenceRange()){ return; }

                var theCode = e.which || e.keyCode;

                if(theCode == 39 || theCode == 40 && e.which===0){ return; }

                var _char = String.fromCharCode(theCode),
                    i;

                for(i=0; i<charSettings.keyMap.length; i++) {

                    if (charSettings.keyMap[i].close == _char) {
                        var didClose = defaults.overwrite && charFuncs.closedChar(charSettings.keyMap[i], e);

                        if (!didClose && charSettings.keyMap[i].open == _char && defaults.autoOpen) {
                            charFuncs.openedChar(charSettings.keyMap[i], e);
                        }
                    } else if (charSettings.keyMap[i].open == _char && defaults.autoOpen) {
                        charFuncs.openedChar(charSettings.keyMap[i], e);
                    }
                }
            },
            listen: function () {

                if(defaults.replaceTab){ utils.addEvent(defaults.textarea, 'keydown', intercept.tabKey); }
                if(defaults.autoIndent){ utils.addEvent(defaults.textarea, 'keydown', intercept.enterKey); }
                if(defaults.autoStrip){ utils.addEvent(defaults.textarea, 'keydown', intercept.deleteKey); }

                utils.addEvent(defaults.textarea, 'keypress', action.filter);

                utils.addEvent(defaults.textarea, 'keydown', function(){ utils._callHook('keydown'); });
                utils.addEvent(defaults.textarea, 'keyup', function(){ utils._callHook('keyup'); });
            }
        },
        init = function (opts) {

            if(opts.textarea){
            	utils._callHook('init:before', false);
                utils.deepExtend(defaults, opts);
                utils.defineNewLine();

                if (defaults.softTabs) {
                    tab = " ".repeat(defaults.tabSize);
                } else {
                    tab = "\t";

                    utils.defineTabSize(defaults.tabSize);
                }

                action.listen();
                utils._callHook('init:after', false);
            }

        };

        this.destroy = function(){
            utils.removeEvent(defaults.textarea, 'keydown', intercept.tabKey);
	        utils.removeEvent(defaults.textarea, 'keydown', intercept.enterKey);
	        utils.removeEvent(defaults.textarea, 'keydown', intercept.deleteKey);
	        utils.removeEvent(defaults.textarea, 'keypress', action.filter);
        };

        init(userOpts);

    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Behave;
    }

    if (typeof ender === 'undefined') {
        this.Behave = Behave;
        this.BehaveHooks = BehaveHooks;
    }

    if (typeof define === "function" && define.amd) {
        define("behave", [], function () {
            return Behave;
        });
    }

}).call(this);

},{}],75:[function(require,module,exports){
var utils = require('../utils');

function Route(controller, id, verb, url, routePipeline) {
  this.controller = controller;
  this.id = id;
  this.url = url;
  this.verb = verb;
  this.routePipeline = routePipeline;
}
Route.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Object.defineProperties(Route.prototype, {
  handlers: {
    get: function() {
      return this.routePipeline.handlerArgs.map(function(handler) {
        return handler.toString();
      });
    }
  }
});

function RoutePipeline(handlers) {
  // ensure 'Action' type handler is last and only present once if at all present
  this.handlers = handlers;
}
Object.defineProperties(RoutePipeline.prototype, {
  handlerArgs: {
    get: function() {
      var args = [];
      this.handlers.forEach(function(handler) {
        args.push(handler instanceof Handler ? handler.handler : handler);
      });
      return args;
    }
  }
});

function Handler(name, handler) {
  this.name = name;
  this.handler = handler;
}

function Middleware(name, handler) {
  Handler.call(this, name, handler);
}
Middleware.prototype = Object.create(Handler.prototype, {
  constructor: {
    value: Middleware,
    writable: true,
    enumerable: false,
    configurable: true
  }
});

function Action(name, handler) {
  Handler.call(this, name, handler);
}
Action.prototype = Object.create(Handler.prototype, {
  constructor: {
    value: Action,
    writable: true,
    enumerable: false,
    configurable: true
  }
});

function Controller(name, baseUrl, code) {
  this.name = name;
  this.baseUrl = baseUrl;
  this.code = code;
  this._routes = [];
  this._middleware = [];
  this._actions = [];
}
Controller.prototype = {
  addRoute: function(verb, url) {
    var handlers = Array.prototype.slice.call(arguments).splice(2);
    var routePipeline = new RoutePipeline(handlers);
    var route = new Route(this, utils.getuid(), verb, url, routePipeline);
    this._routes.push(route);
    return route;
  },
  findRoute: function(verb, url) {
    return this._routes.find(function(item) {
      return item.verb === name && item.url == url;
    });
  },
  addAction: function(name, handler) {
    var action = new Action(name, handler);
    this._actions.push(action);
    return action;
  },
  findAction: function(name) {
    return this._actions.find(function(item) {
      return item.name === name;
    });
  },
  addMiddleware: function(name, handler) {
    var middleware = new Middleware(name, handler);
    this._middleware.push(middleware);
    return middleware;
  },
  findMiddleware: function(name) {
    return this._middleware.find(function(item) {
      return item.name === name;
    });
  }
};


function Api(baseUrl) {
  this._baseUrl = baseUrl;
  this._middleware = [];
  this._useMiddleware = [];
  this._controllers = [];
}
Api.prototype.useMiddleware = function(name, handler, index) {
  this._useMiddleware.push(new Middleware(name, handler));
};
Api.prototype.addMiddleware = function(name, handler) {
  this._middleware.push(new Middleware(name, handler));
};
Api.prototype.addController = function(name, baseUrl, code) {

  if (!name || this.findController(name)) {
    throw new Error('Invalid Controller Name');
  }

  var controller = new Controller(name, baseUrl, code ? code.toString() : '');
  this._controllers.push(controller);
  return controller;
};
Api.prototype.findController = function(name) {
  return this._controllers.forEach(function(item) {
    return item.name === name;
  });
};
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      var routes = [];
      this._controllers.forEach(function(controller) {
        Array.prototype.push.apply(routes, controller._routes);
      });
      return routes;
    }
  }
});



// ---------------------
// expressjs example....
// ---------------------
var api = new Api('/api');

api.useMiddleware('cookie-parser', function(res, req, next) {
  // Do something useful.
  // Maybe mutate req or res state.
  // Then call next().
  next();
});

api.useMiddleware('body-parser', function(res, req, next) {
  // Do something useful.
  // Maybe mutate req or res state.
  // Then call next().
  next();
});

var authMiddleware = api.addMiddleware('auth', function(req, res, next) {
  if (!req.query.authme) {
    res.setStatus(403);
    next(new Error('Unauthorized'));
  } else {
    next();
  }
});

var indexController = api.addController('index', '/', function(req, res) {

  var util = require('util');
  //...
  //...
  //...

});

indexController.addRoute('GET', '/ping', function(req, res) {
  res.send('pong');
});

var userController = api.addController('user', '/user', function(req, res) {

  var util = require('util');
  //...
  //...
  //...

});


var loadUserMiddleware = userController.addMiddleware('load-user', function(req, res, next) {
  req.user = {
    id: 1,
    name: 'bob'
  };
  next();
});
var getUserAction = userController.addAction('getUser', function(req, res) {
  console.log(req.user);
  res.send(req.user);
});

userController.addRoute('ALL', '/user/*', loadUserMiddleware);
userController.addRoute('GET', '/user/:id', getUserAction);

module.exports = api;

},{"../utils":76,"util":81}],76:[function(require,module,exports){
exports.rndstr = function() {
  return (+new Date()).toString(36);
};

exports.getuid = function() {
  //return ('' + Math.random()).replace(/\D/g, '');
  return Math.round((Math.random() * 1e7)).toString();
};

},{}],77:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],78:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("q+64fw"))
},{"q+64fw":79}],79:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],80:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],81:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("q+64fw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":80,"inherits":77,"q+64fw":79}]},{},[63])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvZGVidWcuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9sYXlvdXQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL29yZGVyL2Nyb3NzQ291bnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9pbml0TGF5ZXJHcmFwaHMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9pbml0T3JkZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9zb3J0TGF5ZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9wb3NpdGlvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3JhbmsuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2FjeWNsaWMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2NvbnN0cmFpbnRzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9mZWFzaWJsZVRyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2luaXRSYW5rLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9yYW5rVXRpbC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3Jhbmsvc2ltcGxleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3V0aWwuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi92ZXJzaW9uLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2NwLWRhdGEvbGliL1ByaW9yaXR5UXVldWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9jcC1kYXRhL2xpYi9TZXQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9jcC1kYXRhL2xpYi91dGlsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9saWIvdmVyc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL0Jhc2VHcmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9DRGlncmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9DR3JhcGguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvRGlncmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9HcmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvY29tcG9uZW50cy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvZGlqa3N0cmEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL2RpamtzdHJhQWxsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9maW5kQ3ljbGVzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9mbG95ZFdhcnNoYWxsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9pc0FjeWNsaWMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3Bvc3RvcmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvcHJlb3JkZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3ByaW0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3Rhcmphbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvdG9wc29ydC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9jb21wb3VuZGlmeS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9jb252ZXJ0ZXIvanNvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvZ3JhcGgtY29udmVydGVycy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi91dGlsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL3ZlcnNpb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9hcGkvY29udHJvbGxlcnMvYXBpLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvYXBpL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2FwaS9jb250cm9sbGVycy9yb3V0ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2NvbnRyb2xsZXJzL2FsZXJ0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvYXBwLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvY29uZmlybS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2NvbnRyb2xsZXJzL2RiLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMva2V5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvbW9kZWwuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9jb250cm9sbGVycy9zY2hlbWEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9kaXJlY3RpdmVzL2JlaGF2ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2RpcmVjdGl2ZXMvZm9jdXMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9kaXJlY3RpdmVzL25lZ2F0ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL2Jhc2UuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2RlbHMvZGIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2RlbHMvZGVmLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL2tleS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL21vZGVscy9rZXlzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL21zZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL21vZGVscy9zY2hlbWEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2R1bGVzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL3NoaW1zL2FycmF5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvdmVuZG9yL2JlaGF2ZS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL2FwaS9hcGkuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypcbkNvcHlyaWdodCAoYykgMjAxMi0yMDEzIENocmlzIFBldHRpdHRcblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cbmV4cG9ydHMuRGlncmFwaCA9IHJlcXVpcmUoXCJncmFwaGxpYlwiKS5EaWdyYXBoO1xuZXhwb3J0cy5HcmFwaCA9IHJlcXVpcmUoXCJncmFwaGxpYlwiKS5HcmFwaDtcbmV4cG9ydHMubGF5b3V0ID0gcmVxdWlyZShcIi4vbGliL2xheW91dFwiKTtcbmV4cG9ydHMudmVyc2lvbiA9IHJlcXVpcmUoXCIuL2xpYi92ZXJzaW9uXCIpO1xuZXhwb3J0cy5kZWJ1ZyA9IHJlcXVpcmUoXCIuL2xpYi9kZWJ1Z1wiKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBSZW5kZXJzIGEgZ3JhcGggaW4gYSBzdHJpbmdpZmllZCBET1QgZm9ybWF0IHRoYXQgaW5kaWNhdGVzIHRoZSBvcmRlcmluZyBvZlxuICogbm9kZXMgYnkgbGF5ZXIuIENpcmNsZXMgcmVwcmVzZW50IG5vcm1hbCBub2Rlcy4gRGlhbW9ucyByZXByZXNlbnQgZHVtbXlcbiAqIG5vZGVzLiBXaGlsZSB3ZSB0cnkgdG8gcHV0IG5vZGVzIGluIGNsdXN0ZXJzLCBpdCBhcHBlYXJzIHRoYXQgZ3JhcGh2aXpcbiAqIGRvZXMgbm90IHJlc3BlY3QgdGhpcyBiZWNhdXNlIHdlJ3JlIGxhdGVyIHVzaW5nIHN1YmdyYXBocyBmb3Igb3JkZXJpbmcgbm9kZXNcbiAqIGluIGVhY2ggbGF5ZXIuXG4gKi9cbmV4cG9ydHMuZG90T3JkZXJpbmcgPSBmdW5jdGlvbihnKSB7XG4gIHZhciBvcmRlcmluZyA9IHV0aWwub3JkZXJpbmcoZy5maWx0ZXJOb2Rlcyh1dGlsLmZpbHRlck5vblN1YmdyYXBocyhnKSkpO1xuICB2YXIgcmVzdWx0ID0gJ2RpZ3JhcGggeyc7XG5cbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBnLmNoaWxkcmVuKHUpO1xuICAgIGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgIHJlc3VsdCArPSAnc3ViZ3JhcGggY2x1c3Rlcl8nICsgdSArICcgeyc7XG4gICAgICByZXN1bHQgKz0gJ2xhYmVsPVwiJyArIHUgKyAnXCI7JztcbiAgICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICBkZnModik7XG4gICAgICB9KTtcbiAgICAgIHJlc3VsdCArPSAnfSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSB1O1xuICAgICAgaWYgKGcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICByZXN1bHQgKz0gJyBbc2hhcGU9ZGlhbW9uZF0nO1xuICAgICAgfVxuICAgICAgcmVzdWx0ICs9ICc7JztcbiAgICB9XG4gIH1cblxuICBnLmNoaWxkcmVuKG51bGwpLmZvckVhY2goZGZzKTtcblxuICBvcmRlcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgcmVzdWx0ICs9ICdzdWJncmFwaCB7IHJhbms9c2FtZTsgZWRnZSBbc3R5bGU9XCJpbnZpc1wiXTsnO1xuICAgIHJlc3VsdCArPSBsYXllci5qb2luKCctPicpO1xuICAgIHJlc3VsdCArPSAnfSc7XG4gIH0pO1xuXG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdikge1xuICAgIHJlc3VsdCArPSB1ICsgJy0+JyArIHYgKyAnOyc7XG4gIH0pO1xuXG4gIHJlc3VsdCArPSAnfSc7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyksXG4gICAgcmFuayA9IHJlcXVpcmUoJy4vcmFuaycpLFxuICAgIG9yZGVyID0gcmVxdWlyZSgnLi9vcmRlcicpLFxuICAgIENHcmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuQ0dyYXBoLFxuICAgIENEaWdyYXBoID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5DRGlncmFwaDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gRXh0ZXJuYWwgY29uZmlndXJhdGlvblxuICB2YXIgY29uZmlnID0ge1xuICAgIC8vIEhvdyBtdWNoIGRlYnVnIGluZm9ybWF0aW9uIHRvIGluY2x1ZGU/XG4gICAgZGVidWdMZXZlbDogMCxcbiAgICAvLyBNYXggbnVtYmVyIG9mIHN3ZWVwcyB0byBwZXJmb3JtIGluIG9yZGVyIHBoYXNlXG4gICAgb3JkZXJNYXhTd2VlcHM6IG9yZGVyLkRFRkFVTFRfTUFYX1NXRUVQUyxcbiAgICAvLyBVc2UgbmV0d29yayBzaW1wbGV4IGFsZ29yaXRobSBpbiByYW5raW5nXG4gICAgcmFua1NpbXBsZXg6IGZhbHNlLFxuICAgIC8vIFJhbmsgZGlyZWN0aW9uLiBWYWxpZCB2YWx1ZXMgYXJlIChUQiwgTFIpXG4gICAgcmFua0RpcjogJ1RCJ1xuICB9O1xuXG4gIC8vIFBoYXNlIGZ1bmN0aW9uc1xuICB2YXIgcG9zaXRpb24gPSByZXF1aXJlKCcuL3Bvc2l0aW9uJykoKTtcblxuICAvLyBUaGlzIGxheW91dCBvYmplY3RcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLm9yZGVySXRlcnMgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnb3JkZXJNYXhTd2VlcHMnKTtcblxuICBzZWxmLnJhbmtTaW1wbGV4ID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ3JhbmtTaW1wbGV4Jyk7XG5cbiAgc2VsZi5ub2RlU2VwID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi5ub2RlU2VwKTtcbiAgc2VsZi5lZGdlU2VwID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi5lZGdlU2VwKTtcbiAgc2VsZi51bml2ZXJzYWxTZXAgPSBkZWxlZ2F0ZVByb3BlcnR5KHBvc2l0aW9uLnVuaXZlcnNhbFNlcCk7XG4gIHNlbGYucmFua1NlcCA9IGRlbGVnYXRlUHJvcGVydHkocG9zaXRpb24ucmFua1NlcCk7XG4gIHNlbGYucmFua0RpciA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICdyYW5rRGlyJyk7XG4gIHNlbGYuZGVidWdBbGlnbm1lbnQgPSBkZWxlZ2F0ZVByb3BlcnR5KHBvc2l0aW9uLmRlYnVnQWxpZ25tZW50KTtcblxuICBzZWxmLmRlYnVnTGV2ZWwgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnZGVidWdMZXZlbCcsIGZ1bmN0aW9uKHgpIHtcbiAgICB1dGlsLmxvZy5sZXZlbCA9IHg7XG4gICAgcG9zaXRpb24uZGVidWdMZXZlbCh4KTtcbiAgfSk7XG5cbiAgc2VsZi5ydW4gPSB1dGlsLnRpbWUoJ1RvdGFsIGxheW91dCcsIHJ1bik7XG5cbiAgc2VsZi5fbm9ybWFsaXplID0gbm9ybWFsaXplO1xuXG4gIHJldHVybiBzZWxmO1xuXG4gIC8qXG4gICAqIENvbnN0cnVjdHMgYW4gYWRqYWNlbmN5IGdyYXBoIHVzaW5nIHRoZSBub2RlcyBhbmQgZWRnZXMgc3BlY2lmaWVkIHRocm91Z2hcbiAgICogY29uZmlnLiBGb3IgZWFjaCBub2RlIGFuZCBlZGdlIHdlIGFkZCBhIHByb3BlcnR5IGBkYWdyZWAgdGhhdCBjb250YWlucyBhblxuICAgKiBvYmplY3QgdGhhdCB3aWxsIGhvbGQgaW50ZXJtZWRpYXRlIGFuZCBmaW5hbCBsYXlvdXQgaW5mb3JtYXRpb24uIFNvbWUgb2ZcbiAgICogdGhlIGNvbnRlbnRzIGluY2x1ZGU6XG4gICAqXG4gICAqICAxKSBBIGdlbmVyYXRlZCBJRCB0aGF0IHVuaXF1ZWx5IGlkZW50aWZpZXMgdGhlIG9iamVjdC5cbiAgICogIDIpIERpbWVuc2lvbiBpbmZvcm1hdGlvbiBmb3Igbm9kZXMgKGNvcGllZCBmcm9tIHRoZSBzb3VyY2Ugbm9kZSkuXG4gICAqICAzKSBPcHRpb25hbCBkaW1lbnNpb24gaW5mb3JtYXRpb24gZm9yIGVkZ2VzLlxuICAgKlxuICAgKiBBZnRlciB0aGUgYWRqYWNlbmN5IGdyYXBoIGlzIGNvbnN0cnVjdGVkIHRoZSBjb2RlIG5vIGxvbmdlciBuZWVkcyB0byB1c2VcbiAgICogdGhlIG9yaWdpbmFsIG5vZGVzIGFuZCBlZGdlcyBwYXNzZWQgaW4gdmlhIGNvbmZpZy5cbiAgICovXG4gIGZ1bmN0aW9uIGluaXRMYXlvdXRHcmFwaChpbnB1dEdyYXBoKSB7XG4gICAgdmFyIGcgPSBuZXcgQ0RpZ3JhcGgoKTtcblxuICAgIGlucHV0R3JhcGguZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB2YWx1ZSA9IHt9O1xuICAgICAgZy5hZGROb2RlKHUsIHtcbiAgICAgICAgd2lkdGg6IHZhbHVlLndpZHRoLFxuICAgICAgICBoZWlnaHQ6IHZhbHVlLmhlaWdodFxuICAgICAgfSk7XG4gICAgICBpZiAodmFsdWUuaGFzT3duUHJvcGVydHkoJ3JhbmsnKSkge1xuICAgICAgICBnLm5vZGUodSkucHJlZlJhbmsgPSB2YWx1ZS5yYW5rO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU2V0IHVwIHN1YmdyYXBoc1xuICAgIGlmIChpbnB1dEdyYXBoLnBhcmVudCkge1xuICAgICAgaW5wdXRHcmFwaC5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICBnLnBhcmVudCh1LCBpbnB1dEdyYXBoLnBhcmVudCh1KSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpbnB1dEdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSB7fTtcbiAgICAgIHZhciBuZXdWYWx1ZSA9IHtcbiAgICAgICAgZTogZSxcbiAgICAgICAgbWluTGVuOiB2YWx1ZS5taW5MZW4gfHwgMSxcbiAgICAgICAgd2lkdGg6IHZhbHVlLndpZHRoIHx8IDAsXG4gICAgICAgIGhlaWdodDogdmFsdWUuaGVpZ2h0IHx8IDAsXG4gICAgICAgIHBvaW50czogW11cbiAgICAgIH07XG5cbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCBuZXdWYWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBJbml0aWFsIGdyYXBoIGF0dHJpYnV0ZXNcbiAgICB2YXIgZ3JhcGhWYWx1ZSA9IGlucHV0R3JhcGguZ3JhcGgoKSB8fCB7fTtcbiAgICBnLmdyYXBoKHtcbiAgICAgIHJhbmtEaXI6IGdyYXBoVmFsdWUucmFua0RpciB8fCBjb25maWcucmFua0RpcixcbiAgICAgIG9yZGVyUmVzdGFydHM6IGdyYXBoVmFsdWUub3JkZXJSZXN0YXJ0c1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGc7XG4gIH1cblxuICBmdW5jdGlvbiBydW4oaW5wdXRHcmFwaCkge1xuICAgIHZhciByYW5rU2VwID0gc2VsZi5yYW5rU2VwKCk7XG4gICAgdmFyIGc7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEJ1aWxkIGludGVybmFsIGdyYXBoXG4gICAgICBnID0gdXRpbC50aW1lKCdpbml0TGF5b3V0R3JhcGgnLCBpbml0TGF5b3V0R3JhcGgpKGlucHV0R3JhcGgpO1xuXG4gICAgICBpZiAoZy5vcmRlcigpID09PSAwKSB7XG4gICAgICAgIHJldHVybiBnO1xuICAgICAgfVxuXG4gICAgICAvLyBNYWtlIHNwYWNlIGZvciBlZGdlIGxhYmVsc1xuICAgICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7XG4gICAgICAgIGEubWluTGVuICo9IDI7XG4gICAgICB9KTtcbiAgICAgIHNlbGYucmFua1NlcChyYW5rU2VwIC8gMik7XG5cbiAgICAgIC8vIERldGVybWluZSB0aGUgcmFuayBmb3IgZWFjaCBub2RlLiBOb2RlcyB3aXRoIGEgbG93ZXIgcmFuayB3aWxsIGFwcGVhclxuICAgICAgLy8gYWJvdmUgbm9kZXMgb2YgaGlnaGVyIHJhbmsuXG4gICAgICB1dGlsLnRpbWUoJ3JhbmsucnVuJywgcmFuay5ydW4pKGcsIGNvbmZpZy5yYW5rU2ltcGxleCk7XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSB0aGUgZ3JhcGggYnkgZW5zdXJpbmcgdGhhdCBldmVyeSBlZGdlIGlzIHByb3BlciAoZWFjaCBlZGdlIGhhc1xuICAgICAgLy8gYSBsZW5ndGggb2YgMSkuIFdlIGFjaGlldmUgdGhpcyBieSBhZGRpbmcgZHVtbXkgbm9kZXMgdG8gbG9uZyBlZGdlcyxcbiAgICAgIC8vIHRodXMgc2hvcnRlbmluZyB0aGVtLlxuICAgICAgdXRpbC50aW1lKCdub3JtYWxpemUnLCBub3JtYWxpemUpKGcpO1xuXG4gICAgICAvLyBPcmRlciB0aGUgbm9kZXMgc28gdGhhdCBlZGdlIGNyb3NzaW5ncyBhcmUgbWluaW1pemVkLlxuICAgICAgdXRpbC50aW1lKCdvcmRlcicsIG9yZGVyKShnLCBjb25maWcub3JkZXJNYXhTd2VlcHMpO1xuXG4gICAgICAvLyBGaW5kIHRoZSB4IGFuZCB5IGNvb3JkaW5hdGVzIGZvciBldmVyeSBub2RlIGluIHRoZSBncmFwaC5cbiAgICAgIHV0aWwudGltZSgncG9zaXRpb24nLCBwb3NpdGlvbi5ydW4pKGcpO1xuXG4gICAgICAvLyBEZS1ub3JtYWxpemUgdGhlIGdyYXBoIGJ5IHJlbW92aW5nIGR1bW15IG5vZGVzIGFuZCBhdWdtZW50aW5nIHRoZVxuICAgICAgLy8gb3JpZ2luYWwgbG9uZyBlZGdlcyB3aXRoIGNvb3JkaW5hdGUgaW5mb3JtYXRpb24uXG4gICAgICB1dGlsLnRpbWUoJ3VuZG9Ob3JtYWxpemUnLCB1bmRvTm9ybWFsaXplKShnKTtcblxuICAgICAgLy8gUmV2ZXJzZXMgcG9pbnRzIGZvciBlZGdlcyB0aGF0IGFyZSBpbiBhIHJldmVyc2VkIHN0YXRlLlxuICAgICAgdXRpbC50aW1lKCdmaXh1cEVkZ2VQb2ludHMnLCBmaXh1cEVkZ2VQb2ludHMpKGcpO1xuXG4gICAgICAvLyBSZXN0b3JlIGRlbGV0ZSBlZGdlcyBhbmQgcmV2ZXJzZSBlZGdlcyB0aGF0IHdlcmUgcmV2ZXJzZWQgaW4gdGhlIHJhbmtcbiAgICAgIC8vIHBoYXNlLlxuICAgICAgdXRpbC50aW1lKCdyYW5rLnJlc3RvcmVFZGdlcycsIHJhbmsucmVzdG9yZUVkZ2VzKShnKTtcblxuICAgICAgLy8gQ29uc3RydWN0IGZpbmFsIHJlc3VsdCBncmFwaCBhbmQgcmV0dXJuIGl0XG4gICAgICByZXR1cm4gdXRpbC50aW1lKCdjcmVhdGVGaW5hbEdyYXBoJywgY3JlYXRlRmluYWxHcmFwaCkoZywgaW5wdXRHcmFwaC5pc0RpcmVjdGVkKCkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBzZWxmLnJhbmtTZXAocmFua1NlcCk7XG4gICAgfVxuICB9XG5cbiAgLypcbiAgICogVGhpcyBmdW5jdGlvbiBpcyByZXNwb25zaWJsZSBmb3IgJ25vcm1hbGl6aW5nJyB0aGUgZ3JhcGguIFRoZSBwcm9jZXNzIG9mXG4gICAqIG5vcm1hbGl6YXRpb24gZW5zdXJlcyB0aGF0IG5vIGVkZ2UgaW4gdGhlIGdyYXBoIGhhcyBzcGFucyBtb3JlIHRoYW4gb25lXG4gICAqIHJhbmsuIFRvIGRvIHRoaXMgaXQgaW5zZXJ0cyBkdW1teSBub2RlcyBhcyBuZWVkZWQgYW5kIGxpbmtzIHRoZW0gYnkgYWRkaW5nXG4gICAqIGR1bW15IGVkZ2VzLiBUaGlzIGZ1bmN0aW9uIGtlZXBzIGVub3VnaCBpbmZvcm1hdGlvbiBpbiB0aGUgZHVtbXkgbm9kZXMgYW5kXG4gICAqIGVkZ2VzIHRvIGVuc3VyZSB0aGF0IHRoZSBvcmlnaW5hbCBncmFwaCBjYW4gYmUgcmVjb25zdHJ1Y3RlZCBsYXRlci5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYXNzdW1lcyB0aGF0IHRoZSBpbnB1dCBncmFwaCBpcyBjeWNsZSBmcmVlLlxuICAgKi9cbiAgZnVuY3Rpb24gbm9ybWFsaXplKGcpIHtcbiAgICB2YXIgZHVtbXlDb3VudCA9IDA7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7XG4gICAgICB2YXIgc291cmNlUmFuayA9IGcubm9kZShzKS5yYW5rO1xuICAgICAgdmFyIHRhcmdldFJhbmsgPSBnLm5vZGUodCkucmFuaztcbiAgICAgIGlmIChzb3VyY2VSYW5rICsgMSA8IHRhcmdldFJhbmspIHtcbiAgICAgICAgZm9yICh2YXIgdSA9IHMsIHJhbmsgPSBzb3VyY2VSYW5rICsgMSwgaSA9IDA7IHJhbmsgPCB0YXJnZXRSYW5rOyArK3JhbmssICsraSkge1xuICAgICAgICAgIHZhciB2ID0gJ19EJyArICgrK2R1bW15Q291bnQpO1xuICAgICAgICAgIHZhciBub2RlID0ge1xuICAgICAgICAgICAgd2lkdGg6IGEud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGEuaGVpZ2h0LFxuICAgICAgICAgICAgZWRnZTogeyBpZDogZSwgc291cmNlOiBzLCB0YXJnZXQ6IHQsIGF0dHJzOiBhIH0sXG4gICAgICAgICAgICByYW5rOiByYW5rLFxuICAgICAgICAgICAgZHVtbXk6IHRydWVcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gSWYgdGhpcyBub2RlIHJlcHJlc2VudHMgYSBiZW5kIHRoZW4gd2Ugd2lsbCB1c2UgaXQgYXMgYSBjb250cm9sXG4gICAgICAgICAgLy8gcG9pbnQuIEZvciBlZGdlcyB3aXRoIDIgc2VnbWVudHMgdGhpcyB3aWxsIGJlIHRoZSBjZW50ZXIgZHVtbXlcbiAgICAgICAgICAvLyBub2RlLiBGb3IgZWRnZXMgd2l0aCBtb3JlIHRoYW4gdHdvIHNlZ21lbnRzLCB0aGlzIHdpbGwgYmUgdGhlXG4gICAgICAgICAgLy8gZmlyc3QgYW5kIGxhc3QgZHVtbXkgbm9kZS5cbiAgICAgICAgICBpZiAoaSA9PT0gMCkgbm9kZS5pbmRleCA9IDA7XG4gICAgICAgICAgZWxzZSBpZiAocmFuayArIDEgPT09IHRhcmdldFJhbmspIG5vZGUuaW5kZXggPSAxO1xuXG4gICAgICAgICAgZy5hZGROb2RlKHYsIG5vZGUpO1xuICAgICAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCB7fSk7XG4gICAgICAgICAgdSA9IHY7XG4gICAgICAgIH1cbiAgICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHQsIHt9KTtcbiAgICAgICAgZy5kZWxFZGdlKGUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogUmVjb25zdHJ1Y3RzIHRoZSBncmFwaCBhcyBpdCB3YXMgYmVmb3JlIG5vcm1hbGl6YXRpb24uIFRoZSBwb3NpdGlvbnMgb2ZcbiAgICogZHVtbXkgbm9kZXMgYXJlIHVzZWQgdG8gYnVpbGQgYW4gYXJyYXkgb2YgcG9pbnRzIGZvciB0aGUgb3JpZ2luYWwgJ2xvbmcnXG4gICAqIGVkZ2UuIER1bW15IG5vZGVzIGFuZCBlZGdlcyBhcmUgcmVtb3ZlZC5cbiAgICovXG4gIGZ1bmN0aW9uIHVuZG9Ob3JtYWxpemUoZykge1xuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgYSkge1xuICAgICAgaWYgKGEuZHVtbXkpIHtcbiAgICAgICAgaWYgKCdpbmRleCcgaW4gYSkge1xuICAgICAgICAgIHZhciBlZGdlID0gYS5lZGdlO1xuICAgICAgICAgIGlmICghZy5oYXNFZGdlKGVkZ2UuaWQpKSB7XG4gICAgICAgICAgICBnLmFkZEVkZ2UoZWRnZS5pZCwgZWRnZS5zb3VyY2UsIGVkZ2UudGFyZ2V0LCBlZGdlLmF0dHJzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIHBvaW50cyA9IGcuZWRnZShlZGdlLmlkKS5wb2ludHM7XG4gICAgICAgICAgcG9pbnRzW2EuaW5kZXhdID0geyB4OiBhLngsIHk6IGEueSwgdWw6IGEudWwsIHVyOiBhLnVyLCBkbDogYS5kbCwgZHI6IGEuZHIgfTtcbiAgICAgICAgfVxuICAgICAgICBnLmRlbE5vZGUodSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBGb3IgZWFjaCBlZGdlIHRoYXQgd2FzIHJldmVyc2VkIGR1cmluZyB0aGUgYGFjeWNsaWNgIHN0ZXAsIHJldmVyc2UgaXRzXG4gICAqIGFycmF5IG9mIHBvaW50cy5cbiAgICovXG4gIGZ1bmN0aW9uIGZpeHVwRWRnZVBvaW50cyhnKSB7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCBzLCB0LCBhKSB7IGlmIChhLnJldmVyc2VkKSBhLnBvaW50cy5yZXZlcnNlKCk7IH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRmluYWxHcmFwaChnLCBpc0RpcmVjdGVkKSB7XG4gICAgdmFyIG91dCA9IGlzRGlyZWN0ZWQgPyBuZXcgQ0RpZ3JhcGgoKSA6IG5ldyBDR3JhcGgoKTtcbiAgICBvdXQuZ3JhcGgoZy5ncmFwaCgpKTtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IG91dC5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gICAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7IG91dC5wYXJlbnQodSwgZy5wYXJlbnQodSkpOyB9KTtcbiAgICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICBvdXQuYWRkRWRnZSh2YWx1ZS5lLCB1LCB2LCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBBdHRhY2ggYm91bmRpbmcgYm94IGluZm9ybWF0aW9uXG4gICAgdmFyIG1heFggPSAwLCBtYXhZID0gMDtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgICBpZiAoIWcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICAgIG1heFggPSBNYXRoLm1heChtYXhYLCB2YWx1ZS54ICsgdmFsdWUud2lkdGggLyAyKTtcbiAgICAgICAgbWF4WSA9IE1hdGgubWF4KG1heFksIHZhbHVlLnkgKyB2YWx1ZS5oZWlnaHQgLyAyKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgICB2YXIgbWF4WFBvaW50cyA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlLnBvaW50cy5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC54OyB9KSk7XG4gICAgICB2YXIgbWF4WVBvaW50cyA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIHZhbHVlLnBvaW50cy5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC55OyB9KSk7XG4gICAgICBtYXhYID0gTWF0aC5tYXgobWF4WCwgbWF4WFBvaW50cyArIHZhbHVlLndpZHRoIC8gMik7XG4gICAgICBtYXhZID0gTWF0aC5tYXgobWF4WSwgbWF4WVBvaW50cyArIHZhbHVlLmhlaWdodCAvIDIpO1xuICAgIH0pO1xuICAgIG91dC5ncmFwaCgpLndpZHRoID0gbWF4WDtcbiAgICBvdXQuZ3JhcGgoKS5oZWlnaHQgPSBtYXhZO1xuXG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIC8qXG4gICAqIEdpdmVuIGEgZnVuY3Rpb24sIGEgbmV3IGZ1bmN0aW9uIGlzIHJldHVybmVkIHRoYXQgaW52b2tlcyB0aGUgZ2l2ZW5cbiAgICogZnVuY3Rpb24uIFRoZSByZXR1cm4gdmFsdWUgZnJvbSB0aGUgZnVuY3Rpb24gaXMgYWx3YXlzIHRoZSBgc2VsZmAgb2JqZWN0LlxuICAgKi9cbiAgZnVuY3Rpb24gZGVsZWdhdGVQcm9wZXJ0eShmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZigpO1xuICAgICAgZi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfVxufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGNyb3NzQ291bnQgPSByZXF1aXJlKCcuL29yZGVyL2Nyb3NzQ291bnQnKSxcbiAgICBpbml0TGF5ZXJHcmFwaHMgPSByZXF1aXJlKCcuL29yZGVyL2luaXRMYXllckdyYXBocycpLFxuICAgIGluaXRPcmRlciA9IHJlcXVpcmUoJy4vb3JkZXIvaW5pdE9yZGVyJyksXG4gICAgc29ydExheWVyID0gcmVxdWlyZSgnLi9vcmRlci9zb3J0TGF5ZXInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBvcmRlcjtcblxuLy8gVGhlIG1heGltdW0gbnVtYmVyIG9mIHN3ZWVwcyB0byBwZXJmb3JtIGJlZm9yZSBmaW5pc2hpbmcgdGhlIG9yZGVyIHBoYXNlLlxudmFyIERFRkFVTFRfTUFYX1NXRUVQUyA9IDI0O1xub3JkZXIuREVGQVVMVF9NQVhfU1dFRVBTID0gREVGQVVMVF9NQVhfU1dFRVBTO1xuXG4vKlxuICogUnVucyB0aGUgb3JkZXIgcGhhc2Ugd2l0aCB0aGUgc3BlY2lmaWVkIGBncmFwaCwgYG1heFN3ZWVwc2AsIGFuZFxuICogYGRlYnVnTGV2ZWxgLiBJZiBgbWF4U3dlZXBzYCBpcyBub3Qgc3BlY2lmaWVkIHdlIHVzZSBgREVGQVVMVF9NQVhfU1dFRVBTYC5cbiAqIElmIGBkZWJ1Z0xldmVsYCBpcyBub3Qgc2V0IHdlIGFzc3VtZSAwLlxuICovXG5mdW5jdGlvbiBvcmRlcihnLCBtYXhTd2VlcHMpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgbWF4U3dlZXBzID0gREVGQVVMVF9NQVhfU1dFRVBTO1xuICB9XG5cbiAgdmFyIHJlc3RhcnRzID0gZy5ncmFwaCgpLm9yZGVyUmVzdGFydHMgfHwgMDtcblxuICB2YXIgbGF5ZXJHcmFwaHMgPSBpbml0TGF5ZXJHcmFwaHMoZyk7XG4gIC8vIFRPRE86IHJlbW92ZSB0aGlzIHdoZW4gd2UgYWRkIGJhY2sgc3VwcG9ydCBmb3Igb3JkZXJpbmcgY2x1c3RlcnNcbiAgbGF5ZXJHcmFwaHMuZm9yRWFjaChmdW5jdGlvbihsZykge1xuICAgIGxnID0gbGcuZmlsdGVyTm9kZXMoZnVuY3Rpb24odSkgeyByZXR1cm4gIWcuY2hpbGRyZW4odSkubGVuZ3RoOyB9KTtcbiAgfSk7XG5cbiAgdmFyIGl0ZXJzID0gMCxcbiAgICAgIGN1cnJlbnRCZXN0Q0MsXG4gICAgICBhbGxUaW1lQmVzdENDID0gTnVtYmVyLk1BWF9WQUxVRSxcbiAgICAgIGFsbFRpbWVCZXN0ID0ge307XG5cbiAgZnVuY3Rpb24gc2F2ZUFsbFRpbWVCZXN0KCkge1xuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgYWxsVGltZUJlc3RbdV0gPSB2YWx1ZS5vcmRlcjsgfSk7XG4gIH1cblxuICBmb3IgKHZhciBqID0gMDsgaiA8IE51bWJlcihyZXN0YXJ0cykgKyAxICYmIGFsbFRpbWVCZXN0Q0MgIT09IDA7ICsraikge1xuICAgIGN1cnJlbnRCZXN0Q0MgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIGluaXRPcmRlcihnLCByZXN0YXJ0cyA+IDApO1xuXG4gICAgdXRpbC5sb2coMiwgJ09yZGVyIHBoYXNlIHN0YXJ0IGNyb3NzIGNvdW50OiAnICsgZy5ncmFwaCgpLm9yZGVySW5pdENDKTtcblxuICAgIHZhciBpLCBsYXN0QmVzdCwgY2M7XG4gICAgZm9yIChpID0gMCwgbGFzdEJlc3QgPSAwOyBsYXN0QmVzdCA8IDQgJiYgaSA8IG1heFN3ZWVwcyAmJiBjdXJyZW50QmVzdENDID4gMDsgKytpLCArK2xhc3RCZXN0LCArK2l0ZXJzKSB7XG4gICAgICBzd2VlcChnLCBsYXllckdyYXBocywgaSk7XG4gICAgICBjYyA9IGNyb3NzQ291bnQoZyk7XG4gICAgICBpZiAoY2MgPCBjdXJyZW50QmVzdENDKSB7XG4gICAgICAgIGxhc3RCZXN0ID0gMDtcbiAgICAgICAgY3VycmVudEJlc3RDQyA9IGNjO1xuICAgICAgICBpZiAoY2MgPCBhbGxUaW1lQmVzdENDKSB7XG4gICAgICAgICAgc2F2ZUFsbFRpbWVCZXN0KCk7XG4gICAgICAgICAgYWxsVGltZUJlc3RDQyA9IGNjO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB1dGlsLmxvZygzLCAnT3JkZXIgcGhhc2Ugc3RhcnQgJyArIGogKyAnIGl0ZXIgJyArIGkgKyAnIGNyb3NzIGNvdW50OiAnICsgY2MpO1xuICAgIH1cbiAgfVxuXG4gIE9iamVjdC5rZXlzKGFsbFRpbWVCZXN0KS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAoIWcuY2hpbGRyZW4gfHwgIWcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICBnLm5vZGUodSkub3JkZXIgPSBhbGxUaW1lQmVzdFt1XTtcbiAgICB9XG4gIH0pO1xuICBnLmdyYXBoKCkub3JkZXJDQyA9IGFsbFRpbWVCZXN0Q0M7XG5cbiAgdXRpbC5sb2coMiwgJ09yZGVyIGl0ZXJhdGlvbnM6ICcgKyBpdGVycyk7XG4gIHV0aWwubG9nKDIsICdPcmRlciBwaGFzZSBiZXN0IGNyb3NzIGNvdW50OiAnICsgZy5ncmFwaCgpLm9yZGVyQ0MpO1xufVxuXG5mdW5jdGlvbiBwcmVkZWNlc3NvcldlaWdodHMoZywgbm9kZXMpIHtcbiAgdmFyIHdlaWdodHMgPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgd2VpZ2h0c1t1XSA9IGcuaW5FZGdlcyh1KS5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnNvdXJjZShlKSkub3JkZXI7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gd2VpZ2h0cztcbn1cblxuZnVuY3Rpb24gc3VjY2Vzc29yV2VpZ2h0cyhnLCBub2Rlcykge1xuICB2YXIgd2VpZ2h0cyA9IHt9O1xuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICB3ZWlnaHRzW3VdID0gZy5vdXRFZGdlcyh1KS5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnRhcmdldChlKSkub3JkZXI7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gd2VpZ2h0cztcbn1cblxuZnVuY3Rpb24gc3dlZXAoZywgbGF5ZXJHcmFwaHMsIGl0ZXIpIHtcbiAgaWYgKGl0ZXIgJSAyID09PSAwKSB7XG4gICAgc3dlZXBEb3duKGcsIGxheWVyR3JhcGhzLCBpdGVyKTtcbiAgfSBlbHNlIHtcbiAgICBzd2VlcFVwKGcsIGxheWVyR3JhcGhzLCBpdGVyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzd2VlcERvd24oZywgbGF5ZXJHcmFwaHMpIHtcbiAgdmFyIGNnO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGxheWVyR3JhcGhzLmxlbmd0aDsgKytpKSB7XG4gICAgY2cgPSBzb3J0TGF5ZXIobGF5ZXJHcmFwaHNbaV0sIGNnLCBwcmVkZWNlc3NvcldlaWdodHMoZywgbGF5ZXJHcmFwaHNbaV0ubm9kZXMoKSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN3ZWVwVXAoZywgbGF5ZXJHcmFwaHMpIHtcbiAgdmFyIGNnO1xuICBmb3IgKHZhciBpID0gbGF5ZXJHcmFwaHMubGVuZ3RoIC0gMjsgaSA+PSAwOyAtLWkpIHtcbiAgICBzb3J0TGF5ZXIobGF5ZXJHcmFwaHNbaV0sIGNnLCBzdWNjZXNzb3JXZWlnaHRzKGcsIGxheWVyR3JhcGhzW2ldLm5vZGVzKCkpKTtcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBjcm9zc0NvdW50O1xuXG4vKlxuICogUmV0dXJucyB0aGUgY3Jvc3MgY291bnQgZm9yIHRoZSBnaXZlbiBncmFwaC5cbiAqL1xuZnVuY3Rpb24gY3Jvc3NDb3VudChnKSB7XG4gIHZhciBjYyA9IDA7XG4gIHZhciBvcmRlcmluZyA9IHV0aWwub3JkZXJpbmcoZyk7XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgb3JkZXJpbmcubGVuZ3RoOyArK2kpIHtcbiAgICBjYyArPSB0d29MYXllckNyb3NzQ291bnQoZywgb3JkZXJpbmdbaS0xXSwgb3JkZXJpbmdbaV0pO1xuICB9XG4gIHJldHVybiBjYztcbn1cblxuLypcbiAqIFRoaXMgZnVuY3Rpb24gc2VhcmNoZXMgdGhyb3VnaCBhIHJhbmtlZCBhbmQgb3JkZXJlZCBncmFwaCBhbmQgY291bnRzIHRoZVxuICogbnVtYmVyIG9mIGVkZ2VzIHRoYXQgY3Jvc3MuIFRoaXMgYWxnb3JpdGhtIGlzIGRlcml2ZWQgZnJvbTpcbiAqXG4gKiAgICBXLiBCYXJ0aCBldCBhbC4sIEJpbGF5ZXIgQ3Jvc3MgQ291bnRpbmcsIEpHQUEsIDgoMikgMTc54oCTMTk0ICgyMDA0KVxuICovXG5mdW5jdGlvbiB0d29MYXllckNyb3NzQ291bnQoZywgbGF5ZXIxLCBsYXllcjIpIHtcbiAgdmFyIGluZGljZXMgPSBbXTtcbiAgbGF5ZXIxLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIHZhciBub2RlSW5kaWNlcyA9IFtdO1xuICAgIGcub3V0RWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7IG5vZGVJbmRpY2VzLnB1c2goZy5ub2RlKGcudGFyZ2V0KGUpKS5vcmRlcik7IH0pO1xuICAgIG5vZGVJbmRpY2VzLnNvcnQoZnVuY3Rpb24oeCwgeSkgeyByZXR1cm4geCAtIHk7IH0pO1xuICAgIGluZGljZXMgPSBpbmRpY2VzLmNvbmNhdChub2RlSW5kaWNlcyk7XG4gIH0pO1xuXG4gIHZhciBmaXJzdEluZGV4ID0gMTtcbiAgd2hpbGUgKGZpcnN0SW5kZXggPCBsYXllcjIubGVuZ3RoKSBmaXJzdEluZGV4IDw8PSAxO1xuXG4gIHZhciB0cmVlU2l6ZSA9IDIgKiBmaXJzdEluZGV4IC0gMTtcbiAgZmlyc3RJbmRleCAtPSAxO1xuXG4gIHZhciB0cmVlID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZVNpemU7ICsraSkgeyB0cmVlW2ldID0gMDsgfVxuXG4gIHZhciBjYyA9IDA7XG4gIGluZGljZXMuZm9yRWFjaChmdW5jdGlvbihpKSB7XG4gICAgdmFyIHRyZWVJbmRleCA9IGkgKyBmaXJzdEluZGV4O1xuICAgICsrdHJlZVt0cmVlSW5kZXhdO1xuICAgIHdoaWxlICh0cmVlSW5kZXggPiAwKSB7XG4gICAgICBpZiAodHJlZUluZGV4ICUgMikge1xuICAgICAgICBjYyArPSB0cmVlW3RyZWVJbmRleCArIDFdO1xuICAgICAgfVxuICAgICAgdHJlZUluZGV4ID0gKHRyZWVJbmRleCAtIDEpID4+IDE7XG4gICAgICArK3RyZWVbdHJlZUluZGV4XTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBjYztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIG5vZGVzRnJvbUxpc3QgPSByZXF1aXJlKCdncmFwaGxpYicpLmZpbHRlci5ub2Rlc0Zyb21MaXN0LFxuICAgIC8qIGpzaGludCAtVzA3OSAqL1xuICAgIFNldCA9IHJlcXVpcmUoJ2NwLWRhdGEnKS5TZXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5pdExheWVyR3JhcGhzO1xuXG4vKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGNvbXBvdW5kIGxheWVyZWQgZ3JhcGgsIGcsIGFuZCBwcm9kdWNlcyBhbiBhcnJheSBvZlxuICogbGF5ZXIgZ3JhcGhzLiBFYWNoIGVudHJ5IGluIHRoZSBhcnJheSByZXByZXNlbnRzIGEgc3ViZ3JhcGggb2Ygbm9kZXNcbiAqIHJlbGV2YW50IGZvciBwZXJmb3JtaW5nIGNyb3NzaW5nIHJlZHVjdGlvbiBvbiB0aGF0IGxheWVyLlxuICovXG5mdW5jdGlvbiBpbml0TGF5ZXJHcmFwaHMoZykge1xuICB2YXIgcmFua3MgPSBbXTtcblxuICBmdW5jdGlvbiBkZnModSkge1xuICAgIGlmICh1ID09PSBudWxsKSB7XG4gICAgICBnLmNoaWxkcmVuKHUpLmZvckVhY2goZnVuY3Rpb24odikgeyBkZnModik7IH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciB2YWx1ZSA9IGcubm9kZSh1KTtcbiAgICB2YWx1ZS5taW5SYW5rID0gKCdyYW5rJyBpbiB2YWx1ZSkgPyB2YWx1ZS5yYW5rIDogTnVtYmVyLk1BWF9WQUxVRTtcbiAgICB2YWx1ZS5tYXhSYW5rID0gKCdyYW5rJyBpbiB2YWx1ZSkgPyB2YWx1ZS5yYW5rIDogTnVtYmVyLk1JTl9WQUxVRTtcbiAgICB2YXIgdVJhbmtzID0gbmV3IFNldCgpO1xuICAgIGcuY2hpbGRyZW4odSkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICB2YXIgcnMgPSBkZnModik7XG4gICAgICB1UmFua3MgPSBTZXQudW5pb24oW3VSYW5rcywgcnNdKTtcbiAgICAgIHZhbHVlLm1pblJhbmsgPSBNYXRoLm1pbih2YWx1ZS5taW5SYW5rLCBnLm5vZGUodikubWluUmFuayk7XG4gICAgICB2YWx1ZS5tYXhSYW5rID0gTWF0aC5tYXgodmFsdWUubWF4UmFuaywgZy5ub2RlKHYpLm1heFJhbmspO1xuICAgIH0pO1xuXG4gICAgaWYgKCdyYW5rJyBpbiB2YWx1ZSkgdVJhbmtzLmFkZCh2YWx1ZS5yYW5rKTtcblxuICAgIHVSYW5rcy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbihyKSB7XG4gICAgICBpZiAoIShyIGluIHJhbmtzKSkgcmFua3Nbcl0gPSBbXTtcbiAgICAgIHJhbmtzW3JdLnB1c2godSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdVJhbmtzO1xuICB9XG4gIGRmcyhudWxsKTtcblxuICB2YXIgbGF5ZXJHcmFwaHMgPSBbXTtcbiAgcmFua3MuZm9yRWFjaChmdW5jdGlvbih1cywgcmFuaykge1xuICAgIGxheWVyR3JhcGhzW3JhbmtdID0gZy5maWx0ZXJOb2Rlcyhub2Rlc0Zyb21MaXN0KHVzKSk7XG4gIH0pO1xuXG4gIHJldHVybiBsYXllckdyYXBocztcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyb3NzQ291bnQgPSByZXF1aXJlKCcuL2Nyb3NzQ291bnQnKSxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXRPcmRlcjtcblxuLypcbiAqIEdpdmVuIGEgZ3JhcGggd2l0aCBhIHNldCBvZiBsYXllcmVkIG5vZGVzIChpLmUuIG5vZGVzIHRoYXQgaGF2ZSBhIGByYW5rYFxuICogYXR0cmlidXRlKSB0aGlzIGZ1bmN0aW9uIGF0dGFjaGVzIGFuIGBvcmRlcmAgYXR0cmlidXRlIHRoYXQgdW5pcXVlbHlcbiAqIGFycmFuZ2VzIGVhY2ggbm9kZSBvZiBlYWNoIHJhbmsuIElmIG5vIGNvbnN0cmFpbnQgZ3JhcGggaXMgcHJvdmlkZWQgdGhlXG4gKiBvcmRlciBvZiB0aGUgbm9kZXMgaW4gZWFjaCByYW5rIGlzIGVudGlyZWx5IGFyYml0cmFyeS5cbiAqL1xuZnVuY3Rpb24gaW5pdE9yZGVyKGcsIHJhbmRvbSkge1xuICB2YXIgbGF5ZXJzID0gW107XG5cbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciBsYXllciA9IGxheWVyc1t2YWx1ZS5yYW5rXTtcbiAgICBpZiAoZy5jaGlsZHJlbiAmJiBnLmNoaWxkcmVuKHUpLmxlbmd0aCA+IDApIHJldHVybjtcbiAgICBpZiAoIWxheWVyKSB7XG4gICAgICBsYXllciA9IGxheWVyc1t2YWx1ZS5yYW5rXSA9IFtdO1xuICAgIH1cbiAgICBsYXllci5wdXNoKHUpO1xuICB9KTtcblxuICBsYXllcnMuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIGlmIChyYW5kb20pIHtcbiAgICAgIHV0aWwuc2h1ZmZsZShsYXllcik7XG4gICAgfVxuICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odSwgaSkge1xuICAgICAgZy5ub2RlKHUpLm9yZGVyID0gaTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgdmFyIGNjID0gY3Jvc3NDb3VudChnKTtcbiAgZy5ncmFwaCgpLm9yZGVySW5pdENDID0gY2M7XG4gIGcuZ3JhcGgoKS5vcmRlckNDID0gTnVtYmVyLk1BWF9WQUxVRTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gICAgRGlncmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuRGlncmFwaCxcbiAgICB0b3Bzb3J0ID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5hbGcudG9wc29ydCxcbiAgICBub2Rlc0Zyb21MaXN0ID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5maWx0ZXIubm9kZXNGcm9tTGlzdDtcblxubW9kdWxlLmV4cG9ydHMgPSBzb3J0TGF5ZXI7XG5cbmZ1bmN0aW9uIHNvcnRMYXllcihnLCBjZywgd2VpZ2h0cykge1xuICB3ZWlnaHRzID0gYWRqdXN0V2VpZ2h0cyhnLCB3ZWlnaHRzKTtcbiAgdmFyIHJlc3VsdCA9IHNvcnRMYXllclN1YmdyYXBoKGcsIG51bGwsIGNnLCB3ZWlnaHRzKTtcblxuICByZXN1bHQubGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICBnLm5vZGUodSkub3JkZXIgPSBpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdC5jb25zdHJhaW50R3JhcGg7XG59XG5cbmZ1bmN0aW9uIHNvcnRMYXllclN1YmdyYXBoKGcsIHNnLCBjZywgd2VpZ2h0cykge1xuICBjZyA9IGNnID8gY2cuZmlsdGVyTm9kZXMobm9kZXNGcm9tTGlzdChnLmNoaWxkcmVuKHNnKSkpIDogbmV3IERpZ3JhcGgoKTtcblxuICB2YXIgbm9kZURhdGEgPSB7fTtcbiAgZy5jaGlsZHJlbihzZykuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgaWYgKGcuY2hpbGRyZW4odSkubGVuZ3RoKSB7XG4gICAgICBub2RlRGF0YVt1XSA9IHNvcnRMYXllclN1YmdyYXBoKGcsIHUsIGNnLCB3ZWlnaHRzKTtcbiAgICAgIG5vZGVEYXRhW3VdLmZpcnN0U0cgPSB1O1xuICAgICAgbm9kZURhdGFbdV0ubGFzdFNHID0gdTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICAgIG5vZGVEYXRhW3VdID0ge1xuICAgICAgICBkZWdyZWU6IHdzLmxlbmd0aCxcbiAgICAgICAgYmFyeWNlbnRlcjogdXRpbC5zdW0od3MpIC8gd3MubGVuZ3RoLFxuICAgICAgICBvcmRlcjogZy5ub2RlKHUpLm9yZGVyLFxuICAgICAgICBvcmRlckNvdW50OiAxLFxuICAgICAgICBsaXN0OiBbdV1cbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXNvbHZlVmlvbGF0ZWRDb25zdHJhaW50cyhnLCBjZywgbm9kZURhdGEpO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMobm9kZURhdGEpO1xuICBrZXlzLnNvcnQoZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiBub2RlRGF0YVt4XS5iYXJ5Y2VudGVyIC0gbm9kZURhdGFbeV0uYmFyeWNlbnRlciB8fFxuICAgICAgICAgICBub2RlRGF0YVt4XS5vcmRlciAtIG5vZGVEYXRhW3ldLm9yZGVyO1xuICB9KTtcblxuICB2YXIgcmVzdWx0ID0gIGtleXMubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIG5vZGVEYXRhW3VdOyB9KVxuICAgICAgICAgICAgICAgICAgICAucmVkdWNlKGZ1bmN0aW9uKGxocywgcmhzKSB7IHJldHVybiBtZXJnZU5vZGVEYXRhKGcsIGxocywgcmhzKTsgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1lcmdlTm9kZURhdGEoZywgbGhzLCByaHMpIHtcbiAgdmFyIGNnID0gbWVyZ2VEaWdyYXBocyhsaHMuY29uc3RyYWludEdyYXBoLCByaHMuY29uc3RyYWludEdyYXBoKTtcblxuICBpZiAobGhzLmxhc3RTRyAhPT0gdW5kZWZpbmVkICYmIHJocy5maXJzdFNHICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoY2cgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2cgPSBuZXcgRGlncmFwaCgpO1xuICAgIH1cbiAgICBpZiAoIWNnLmhhc05vZGUobGhzLmxhc3RTRykpIHsgY2cuYWRkTm9kZShsaHMubGFzdFNHKTsgfVxuICAgIGNnLmFkZE5vZGUocmhzLmZpcnN0U0cpO1xuICAgIGNnLmFkZEVkZ2UobnVsbCwgbGhzLmxhc3RTRywgcmhzLmZpcnN0U0cpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkZWdyZWU6IGxocy5kZWdyZWUgKyByaHMuZGVncmVlLFxuICAgIGJhcnljZW50ZXI6IChsaHMuYmFyeWNlbnRlciAqIGxocy5kZWdyZWUgKyByaHMuYmFyeWNlbnRlciAqIHJocy5kZWdyZWUpIC9cbiAgICAgICAgICAgICAgICAobGhzLmRlZ3JlZSArIHJocy5kZWdyZWUpLFxuICAgIG9yZGVyOiAobGhzLm9yZGVyICogbGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXIgKiByaHMub3JkZXJDb3VudCkgL1xuICAgICAgICAgICAobGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXJDb3VudCksXG4gICAgb3JkZXJDb3VudDogbGhzLm9yZGVyQ291bnQgKyByaHMub3JkZXJDb3VudCxcbiAgICBsaXN0OiBsaHMubGlzdC5jb25jYXQocmhzLmxpc3QpLFxuICAgIGZpcnN0U0c6IGxocy5maXJzdFNHICE9PSB1bmRlZmluZWQgPyBsaHMuZmlyc3RTRyA6IHJocy5maXJzdFNHLFxuICAgIGxhc3RTRzogcmhzLmxhc3RTRyAhPT0gdW5kZWZpbmVkID8gcmhzLmxhc3RTRyA6IGxocy5sYXN0U0csXG4gICAgY29uc3RyYWludEdyYXBoOiBjZ1xuICB9O1xufVxuXG5mdW5jdGlvbiBtZXJnZURpZ3JhcGhzKGxocywgcmhzKSB7XG4gIGlmIChsaHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHJocztcbiAgaWYgKHJocyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbGhzO1xuXG4gIGxocyA9IGxocy5jb3B5KCk7XG4gIHJocy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24odSkgeyBsaHMuYWRkTm9kZSh1KTsgfSk7XG4gIHJocy5lZGdlcygpLmZvckVhY2goZnVuY3Rpb24oZSwgdSwgdikgeyBsaHMuYWRkRWRnZShudWxsLCB1LCB2KTsgfSk7XG4gIHJldHVybiBsaHM7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVWaW9sYXRlZENvbnN0cmFpbnRzKGcsIGNnLCBub2RlRGF0YSkge1xuICAvLyBSZW1vdmVzIG5vZGVzIGB1YCBhbmQgYHZgIGZyb20gYGNnYCBhbmQgbWFrZXMgYW55IGVkZ2VzIGluY2lkZW50IG9uIHRoZW1cbiAgLy8gaW5jaWRlbnQgb24gYHdgIGluc3RlYWQuXG4gIGZ1bmN0aW9uIGNvbGxhcHNlTm9kZXModSwgdiwgdykge1xuICAgIC8vIFRPRE8gb3JpZ2luYWwgcGFwZXIgcmVtb3ZlcyBzZWxmIGxvb3BzLCBidXQgaXQgaXMgbm90IG9idmlvdXMgd2hlbiB0aGlzIHdvdWxkIGhhcHBlblxuICAgIGNnLmluRWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICBjZy5kZWxFZGdlKGUpO1xuICAgICAgY2cuYWRkRWRnZShudWxsLCBjZy5zb3VyY2UoZSksIHcpO1xuICAgIH0pO1xuXG4gICAgY2cub3V0RWRnZXModikuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICBjZy5kZWxFZGdlKGUpO1xuICAgICAgY2cuYWRkRWRnZShudWxsLCB3LCBjZy50YXJnZXQoZSkpO1xuICAgIH0pO1xuXG4gICAgY2cuZGVsTm9kZSh1KTtcbiAgICBjZy5kZWxOb2RlKHYpO1xuICB9XG5cbiAgdmFyIHZpb2xhdGVkO1xuICB3aGlsZSAoKHZpb2xhdGVkID0gZmluZFZpb2xhdGVkQ29uc3RyYWludChjZywgbm9kZURhdGEpKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIHNvdXJjZSA9IGNnLnNvdXJjZSh2aW9sYXRlZCksXG4gICAgICAgIHRhcmdldCA9IGNnLnRhcmdldCh2aW9sYXRlZCk7XG5cbiAgICB2YXIgdjtcbiAgICB3aGlsZSAoKHYgPSBjZy5hZGROb2RlKG51bGwpKSAmJiBnLmhhc05vZGUodikpIHtcbiAgICAgIGNnLmRlbE5vZGUodik7XG4gICAgfVxuXG4gICAgLy8gQ29sbGFwc2UgYmFyeWNlbnRlciBhbmQgbGlzdFxuICAgIG5vZGVEYXRhW3ZdID0gbWVyZ2VOb2RlRGF0YShnLCBub2RlRGF0YVtzb3VyY2VdLCBub2RlRGF0YVt0YXJnZXRdKTtcbiAgICBkZWxldGUgbm9kZURhdGFbc291cmNlXTtcbiAgICBkZWxldGUgbm9kZURhdGFbdGFyZ2V0XTtcblxuICAgIGNvbGxhcHNlTm9kZXMoc291cmNlLCB0YXJnZXQsIHYpO1xuICAgIGlmIChjZy5pbmNpZGVudEVkZ2VzKHYpLmxlbmd0aCA9PT0gMCkgeyBjZy5kZWxOb2RlKHYpOyB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZmluZFZpb2xhdGVkQ29uc3RyYWludChjZywgbm9kZURhdGEpIHtcbiAgdmFyIHVzID0gdG9wc29ydChjZyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdXMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgdSA9IHVzW2ldO1xuICAgIHZhciBpbkVkZ2VzID0gY2cuaW5FZGdlcyh1KTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGluRWRnZXMubGVuZ3RoOyArK2opIHtcbiAgICAgIHZhciBlID0gaW5FZGdlc1tqXTtcbiAgICAgIGlmIChub2RlRGF0YVtjZy5zb3VyY2UoZSldLmJhcnljZW50ZXIgPj0gbm9kZURhdGFbdV0uYmFyeWNlbnRlcikge1xuICAgICAgICByZXR1cm4gZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gQWRqdXN0IHdlaWdodHMgc28gdGhhdCB0aGV5IGZhbGwgaW4gdGhlIHJhbmdlIG9mIDAuLnxOfC0xLiBJZiBhIG5vZGUgaGFzIG5vXG4vLyB3ZWlnaHQgYXNzaWduZWQgdGhlbiBzZXQgaXRzIGFkanVzdGVkIHdlaWdodCB0byBpdHMgY3VycmVudCBwb3NpdGlvbi4gVGhpc1xuLy8gYWxsb3dzIHVzIHRvIGJldHRlciByZXRhaW4gdGhlIG9yaWdpaW5hbCBwb3NpdGlvbiBvZiBub2RlcyB3aXRob3V0IG5laWdoYm9ycy5cbmZ1bmN0aW9uIGFkanVzdFdlaWdodHMoZywgd2VpZ2h0cykge1xuICB2YXIgbWluVyA9IE51bWJlci5NQVhfVkFMVUUsXG4gICAgICBtYXhXID0gMCxcbiAgICAgIGFkanVzdGVkID0ge307XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkgcmV0dXJuO1xuXG4gICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICBpZiAod3MubGVuZ3RoKSB7XG4gICAgICBtaW5XID0gTWF0aC5taW4obWluVywgdXRpbC5taW4od3MpKTtcbiAgICAgIG1heFcgPSBNYXRoLm1heChtYXhXLCB1dGlsLm1heCh3cykpO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHJhbmdlVyA9IChtYXhXIC0gbWluVyk7XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkgcmV0dXJuO1xuXG4gICAgdmFyIHdzID0gd2VpZ2h0c1t1XTtcbiAgICBpZiAoIXdzLmxlbmd0aCkge1xuICAgICAgYWRqdXN0ZWRbdV0gPSBbZy5ub2RlKHUpLm9yZGVyXTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWRqdXN0ZWRbdV0gPSB3cy5tYXAoZnVuY3Rpb24odykge1xuICAgICAgICBpZiAocmFuZ2VXKSB7XG4gICAgICAgICAgcmV0dXJuICh3IC0gbWluVykgKiAoZy5vcmRlcigpIC0gMSkgLyByYW5nZVc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGcub3JkZXIoKSAtIDEgLyAyO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBhZGp1c3RlZDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLypcbiAqIFRoZSBhbGdvcml0aG1zIGhlcmUgYXJlIGJhc2VkIG9uIEJyYW5kZXMgYW5kIEvDtnBmLCBcIkZhc3QgYW5kIFNpbXBsZVxuICogSG9yaXpvbnRhbCBDb29yZGluYXRlIEFzc2lnbm1lbnRcIi5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgLy8gRXh0ZXJuYWwgY29uZmlndXJhdGlvblxuICB2YXIgY29uZmlnID0ge1xuICAgIG5vZGVTZXA6IDUwLFxuICAgIGVkZ2VTZXA6IDEwLFxuICAgIHVuaXZlcnNhbFNlcDogbnVsbCxcbiAgICByYW5rU2VwOiAzMFxuICB9O1xuXG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5ub2RlU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ25vZGVTZXAnKTtcbiAgc2VsZi5lZGdlU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ2VkZ2VTZXAnKTtcbiAgLy8gSWYgbm90IG51bGwgdGhpcyBzZXBhcmF0aW9uIHZhbHVlIGlzIHVzZWQgZm9yIGFsbCBub2RlcyBhbmQgZWRnZXNcbiAgLy8gcmVnYXJkbGVzcyBvZiB0aGVpciB3aWR0aHMuIGBub2RlU2VwYCBhbmQgYGVkZ2VTZXBgIGFyZSBpZ25vcmVkIHdpdGggdGhpc1xuICAvLyBvcHRpb24uXG4gIHNlbGYudW5pdmVyc2FsU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ3VuaXZlcnNhbFNlcCcpO1xuICBzZWxmLnJhbmtTZXAgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAncmFua1NlcCcpO1xuICBzZWxmLmRlYnVnTGV2ZWwgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAnZGVidWdMZXZlbCcpO1xuXG4gIHNlbGYucnVuID0gcnVuO1xuXG4gIHJldHVybiBzZWxmO1xuXG4gIGZ1bmN0aW9uIHJ1bihnKSB7XG4gICAgZyA9IGcuZmlsdGVyTm9kZXModXRpbC5maWx0ZXJOb25TdWJncmFwaHMoZykpO1xuXG4gICAgdmFyIGxheWVyaW5nID0gdXRpbC5vcmRlcmluZyhnKTtcblxuICAgIHZhciBjb25mbGljdHMgPSBmaW5kQ29uZmxpY3RzKGcsIGxheWVyaW5nKTtcblxuICAgIHZhciB4c3MgPSB7fTtcbiAgICBbJ3UnLCAnZCddLmZvckVhY2goZnVuY3Rpb24odmVydERpcikge1xuICAgICAgaWYgKHZlcnREaXIgPT09ICdkJykgbGF5ZXJpbmcucmV2ZXJzZSgpO1xuXG4gICAgICBbJ2wnLCAnciddLmZvckVhY2goZnVuY3Rpb24oaG9yaXpEaXIpIHtcbiAgICAgICAgaWYgKGhvcml6RGlyID09PSAncicpIHJldmVyc2VJbm5lck9yZGVyKGxheWVyaW5nKTtcblxuICAgICAgICB2YXIgZGlyID0gdmVydERpciArIGhvcml6RGlyO1xuICAgICAgICB2YXIgYWxpZ24gPSB2ZXJ0aWNhbEFsaWdubWVudChnLCBsYXllcmluZywgY29uZmxpY3RzLCB2ZXJ0RGlyID09PSAndScgPyAncHJlZGVjZXNzb3JzJyA6ICdzdWNjZXNzb3JzJyk7XG4gICAgICAgIHhzc1tkaXJdPSBob3Jpem9udGFsQ29tcGFjdGlvbihnLCBsYXllcmluZywgYWxpZ24ucG9zLCBhbGlnbi5yb290LCBhbGlnbi5hbGlnbik7XG5cbiAgICAgICAgaWYgKGNvbmZpZy5kZWJ1Z0xldmVsID49IDMpXG4gICAgICAgICAgZGVidWdQb3NpdGlvbmluZyh2ZXJ0RGlyICsgaG9yaXpEaXIsIGcsIGxheWVyaW5nLCB4c3NbZGlyXSk7XG5cbiAgICAgICAgaWYgKGhvcml6RGlyID09PSAncicpIGZsaXBIb3Jpem9udGFsbHkoeHNzW2Rpcl0pO1xuXG4gICAgICAgIGlmIChob3JpekRpciA9PT0gJ3InKSByZXZlcnNlSW5uZXJPcmRlcihsYXllcmluZyk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKHZlcnREaXIgPT09ICdkJykgbGF5ZXJpbmcucmV2ZXJzZSgpO1xuICAgIH0pO1xuXG4gICAgYmFsYW5jZShnLCBsYXllcmluZywgeHNzKTtcblxuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odikge1xuICAgICAgdmFyIHhzID0gW107XG4gICAgICBmb3IgKHZhciBhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICAgIHZhciBhbGlnbm1lbnRYID0geHNzW2FsaWdubWVudF1bdl07XG4gICAgICAgIHBvc1hEZWJ1ZyhhbGlnbm1lbnQsIGcsIHYsIGFsaWdubWVudFgpO1xuICAgICAgICB4cy5wdXNoKGFsaWdubWVudFgpO1xuICAgICAgfVxuICAgICAgeHMuc29ydChmdW5jdGlvbih4LCB5KSB7IHJldHVybiB4IC0geTsgfSk7XG4gICAgICBwb3NYKGcsIHYsICh4c1sxXSArIHhzWzJdKSAvIDIpO1xuICAgIH0pO1xuXG4gICAgLy8gQWxpZ24geSBjb29yZGluYXRlcyB3aXRoIHJhbmtzXG4gICAgdmFyIHkgPSAwLCByZXZlcnNlWSA9IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnQlQnIHx8IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnUkwnO1xuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciBtYXhIZWlnaHQgPSB1dGlsLm1heChsYXllci5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gaGVpZ2h0KGcsIHUpOyB9KSk7XG4gICAgICB5ICs9IG1heEhlaWdodCAvIDI7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgICAgcG9zWShnLCB1LCByZXZlcnNlWSA/IC15IDogeSk7XG4gICAgICB9KTtcbiAgICAgIHkgKz0gbWF4SGVpZ2h0IC8gMiArIGNvbmZpZy5yYW5rU2VwO1xuICAgIH0pO1xuXG4gICAgLy8gVHJhbnNsYXRlIGxheW91dCBzbyB0aGF0IHRvcCBsZWZ0IGNvcm5lciBvZiBib3VuZGluZyByZWN0YW5nbGUgaGFzXG4gICAgLy8gY29vcmRpbmF0ZSAoMCwgMCkuXG4gICAgdmFyIG1pblggPSB1dGlsLm1pbihnLm5vZGVzKCkubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIHBvc1goZywgdSkgLSB3aWR0aChnLCB1KSAvIDI7IH0pKTtcbiAgICB2YXIgbWluWSA9IHV0aWwubWluKGcubm9kZXMoKS5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gcG9zWShnLCB1KSAtIGhlaWdodChnLCB1KSAvIDI7IH0pKTtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICAgIHBvc1goZywgdSwgcG9zWChnLCB1KSAtIG1pblgpO1xuICAgICAgcG9zWShnLCB1LCBwb3NZKGcsIHUpIC0gbWluWSk7XG4gICAgfSk7XG4gIH1cblxuICAvKlxuICAgKiBHZW5lcmF0ZSBhbiBJRCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlcHJlc2VudCBhbnkgdW5kaXJlY3RlZCBlZGdlIHRoYXQgaXNcbiAgICogaW5jaWRlbnQgb24gYHVgIGFuZCBgdmAuXG4gICAqL1xuICBmdW5jdGlvbiB1bmRpckVkZ2VJZCh1LCB2KSB7XG4gICAgcmV0dXJuIHUgPCB2XG4gICAgICA/IHUudG9TdHJpbmcoKS5sZW5ndGggKyAnOicgKyB1ICsgJy0nICsgdlxuICAgICAgOiB2LnRvU3RyaW5nKCkubGVuZ3RoICsgJzonICsgdiArICctJyArIHU7XG4gIH1cblxuICBmdW5jdGlvbiBmaW5kQ29uZmxpY3RzKGcsIGxheWVyaW5nKSB7XG4gICAgdmFyIGNvbmZsaWN0cyA9IHt9LCAvLyBTZXQgb2YgY29uZmxpY3RpbmcgZWRnZSBpZHNcbiAgICAgICAgcG9zID0ge30sICAgICAgIC8vIFBvc2l0aW9uIG9mIG5vZGUgaW4gaXRzIGxheWVyXG4gICAgICAgIHByZXZMYXllcixcbiAgICAgICAgY3VyckxheWVyLFxuICAgICAgICBrMCwgICAgIC8vIFBvc2l0aW9uIG9mIHRoZSBsYXN0IGlubmVyIHNlZ21lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyXG4gICAgICAgIGwsICAgICAgLy8gQ3VycmVudCBwb3NpdGlvbiBpbiB0aGUgY3VycmVudCBsYXllciAoZm9yIGl0ZXJhdGlvbiB1cCB0byBgbDFgKVxuICAgICAgICBrMTsgICAgIC8vIFBvc2l0aW9uIG9mIHRoZSBuZXh0IGlubmVyIHNlZ21lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyIG9yXG4gICAgICAgICAgICAgICAgLy8gdGhlIHBvc2l0aW9uIG9mIHRoZSBsYXN0IGVsZW1lbnQgaW4gdGhlIHByZXZpb3VzIGxheWVyXG5cbiAgICBpZiAobGF5ZXJpbmcubGVuZ3RoIDw9IDIpIHJldHVybiBjb25mbGljdHM7XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVDb25mbGljdHModikge1xuICAgICAgdmFyIGsgPSBwb3Nbdl07XG4gICAgICBpZiAoayA8IGswIHx8IGsgPiBrMSkge1xuICAgICAgICBjb25mbGljdHNbdW5kaXJFZGdlSWQoY3VyckxheWVyW2xdLCB2KV0gPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxheWVyaW5nWzFdLmZvckVhY2goZnVuY3Rpb24odSwgaSkgeyBwb3NbdV0gPSBpOyB9KTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGxheWVyaW5nLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgcHJldkxheWVyID0gbGF5ZXJpbmdbaV07XG4gICAgICBjdXJyTGF5ZXIgPSBsYXllcmluZ1tpKzFdO1xuICAgICAgazAgPSAwO1xuICAgICAgbCA9IDA7XG5cbiAgICAgIC8vIFNjYW4gY3VycmVudCBsYXllciBmb3IgbmV4dCBub2RlIHRoYXQgaXMgaW5jaWRlbnQgdG8gYW4gaW5uZXIgc2VnZW1lbnRcbiAgICAgIC8vIGJldHdlZW4gbGF5ZXJpbmdbaSsxXSBhbmQgbGF5ZXJpbmdbaV0uXG4gICAgICBmb3IgKHZhciBsMSA9IDA7IGwxIDwgY3VyckxheWVyLmxlbmd0aDsgKytsMSkge1xuICAgICAgICB2YXIgdSA9IGN1cnJMYXllcltsMV07IC8vIE5leHQgaW5uZXIgc2VnbWVudCBpbiB0aGUgY3VycmVudCBsYXllciBvclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxhc3Qgbm9kZSBpbiB0aGUgY3VycmVudCBsYXllclxuICAgICAgICBwb3NbdV0gPSBsMTtcbiAgICAgICAgazEgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKGcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICAgIHZhciB1UHJlZCA9IGcucHJlZGVjZXNzb3JzKHUpWzBdO1xuICAgICAgICAgIC8vIE5vdGU6IEluIHRoZSBjYXNlIG9mIHNlbGYgbG9vcHMgYW5kIHNpZGV3YXlzIGVkZ2VzIGl0IGlzIHBvc3NpYmxlXG4gICAgICAgICAgLy8gZm9yIGEgZHVtbXkgbm90IHRvIGhhdmUgYSBwcmVkZWNlc3Nvci5cbiAgICAgICAgICBpZiAodVByZWQgIT09IHVuZGVmaW5lZCAmJiBnLm5vZGUodVByZWQpLmR1bW15KVxuICAgICAgICAgICAgazEgPSBwb3NbdVByZWRdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChrMSA9PT0gdW5kZWZpbmVkICYmIGwxID09PSBjdXJyTGF5ZXIubGVuZ3RoIC0gMSlcbiAgICAgICAgICBrMSA9IHByZXZMYXllci5sZW5ndGggLSAxO1xuXG4gICAgICAgIGlmIChrMSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgZm9yICg7IGwgPD0gbDE7ICsrbCkge1xuICAgICAgICAgICAgZy5wcmVkZWNlc3NvcnMoY3VyckxheWVyW2xdKS5mb3JFYWNoKHVwZGF0ZUNvbmZsaWN0cyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGswID0gazE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29uZmxpY3RzO1xuICB9XG5cbiAgZnVuY3Rpb24gdmVydGljYWxBbGlnbm1lbnQoZywgbGF5ZXJpbmcsIGNvbmZsaWN0cywgcmVsYXRpb25zaGlwKSB7XG4gICAgdmFyIHBvcyA9IHt9LCAgIC8vIFBvc2l0aW9uIGZvciBhIG5vZGUgaW4gaXRzIGxheWVyXG4gICAgICAgIHJvb3QgPSB7fSwgIC8vIFJvb3Qgb2YgdGhlIGJsb2NrIHRoYXQgdGhlIG5vZGUgcGFydGljaXBhdGVzIGluXG4gICAgICAgIGFsaWduID0ge307IC8vIFBvaW50cyB0byB0aGUgbmV4dCBub2RlIGluIHRoZSBibG9jayBvciwgaWYgdGhlIGxhc3RcbiAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCBpbiB0aGUgYmxvY2ssIHBvaW50cyB0byB0aGUgZmlyc3QgYmxvY2sncyByb290XG5cbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICAgICAgcm9vdFt1XSA9IHU7XG4gICAgICAgIGFsaWduW3VdID0gdTtcbiAgICAgICAgcG9zW3VdID0gaTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgdmFyIHByZXZJZHggPSAtMTtcbiAgICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICB2YXIgcmVsYXRlZCA9IGdbcmVsYXRpb25zaGlwXSh2KSwgLy8gQWRqYWNlbnQgbm9kZXMgZnJvbSB0aGUgcHJldmlvdXMgbGF5ZXJcbiAgICAgICAgICAgIG1pZDsgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBtaWQgcG9pbnQgaW4gdGhlIHJlbGF0ZWQgYXJyYXlcblxuICAgICAgICBpZiAocmVsYXRlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgcmVsYXRlZC5zb3J0KGZ1bmN0aW9uKHgsIHkpIHsgcmV0dXJuIHBvc1t4XSAtIHBvc1t5XTsgfSk7XG4gICAgICAgICAgbWlkID0gKHJlbGF0ZWQubGVuZ3RoIC0gMSkgLyAyO1xuICAgICAgICAgIHJlbGF0ZWQuc2xpY2UoTWF0aC5mbG9vcihtaWQpLCBNYXRoLmNlaWwobWlkKSArIDEpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICAgICAgaWYgKGFsaWduW3ZdID09PSB2KSB7XG4gICAgICAgICAgICAgIGlmICghY29uZmxpY3RzW3VuZGlyRWRnZUlkKHUsIHYpXSAmJiBwcmV2SWR4IDwgcG9zW3VdKSB7XG4gICAgICAgICAgICAgICAgYWxpZ25bdV0gPSB2O1xuICAgICAgICAgICAgICAgIGFsaWduW3ZdID0gcm9vdFt2XSA9IHJvb3RbdV07XG4gICAgICAgICAgICAgICAgcHJldklkeCA9IHBvc1t1XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7IHBvczogcG9zLCByb290OiByb290LCBhbGlnbjogYWxpZ24gfTtcbiAgfVxuXG4gIC8vIFRoaXMgZnVuY3Rpb24gZGV2aWF0ZXMgZnJvbSB0aGUgc3RhbmRhcmQgQksgYWxnb3JpdGhtIGluIHR3byB3YXlzLiBGaXJzdFxuICAvLyBpdCB0YWtlcyBpbnRvIGFjY291bnQgdGhlIHNpemUgb2YgdGhlIG5vZGVzLiBTZWNvbmQgaXQgaW5jbHVkZXMgYSBmaXggdG9cbiAgLy8gdGhlIG9yaWdpbmFsIGFsZ29yaXRobSB0aGF0IGlzIGRlc2NyaWJlZCBpbiBDYXJzdGVucywgXCJOb2RlIGFuZCBMYWJlbFxuICAvLyBQbGFjZW1lbnQgaW4gYSBMYXllcmVkIExheW91dCBBbGdvcml0aG1cIi5cbiAgZnVuY3Rpb24gaG9yaXpvbnRhbENvbXBhY3Rpb24oZywgbGF5ZXJpbmcsIHBvcywgcm9vdCwgYWxpZ24pIHtcbiAgICB2YXIgc2luayA9IHt9LCAgICAgICAvLyBNYXBwaW5nIG9mIG5vZGUgaWQgLT4gc2luayBub2RlIGlkIGZvciBjbGFzc1xuICAgICAgICBtYXliZVNoaWZ0ID0ge30sIC8vIE1hcHBpbmcgb2Ygc2luayBub2RlIGlkIC0+IHsgY2xhc3Mgbm9kZSBpZCwgbWluIHNoaWZ0IH1cbiAgICAgICAgc2hpZnQgPSB7fSwgICAgICAvLyBNYXBwaW5nIG9mIHNpbmsgbm9kZSBpZCAtPiBzaGlmdFxuICAgICAgICBwcmVkID0ge30sICAgICAgIC8vIE1hcHBpbmcgb2Ygbm9kZSBpZCAtPiBwcmVkZWNlc3NvciBub2RlIChvciBudWxsKVxuICAgICAgICB4cyA9IHt9OyAgICAgICAgIC8vIENhbGN1bGF0ZWQgWCBwb3NpdGlvbnNcblxuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odSwgaSkge1xuICAgICAgICBzaW5rW3VdID0gdTtcbiAgICAgICAgbWF5YmVTaGlmdFt1XSA9IHt9O1xuICAgICAgICBpZiAoaSA+IDApXG4gICAgICAgICAgcHJlZFt1XSA9IGxheWVyW2kgLSAxXTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlU2hpZnQodG9TaGlmdCwgbmVpZ2hib3IsIGRlbHRhKSB7XG4gICAgICBpZiAoIShuZWlnaGJvciBpbiBtYXliZVNoaWZ0W3RvU2hpZnRdKSkge1xuICAgICAgICBtYXliZVNoaWZ0W3RvU2hpZnRdW25laWdoYm9yXSA9IGRlbHRhO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWF5YmVTaGlmdFt0b1NoaWZ0XVtuZWlnaGJvcl0gPSBNYXRoLm1pbihtYXliZVNoaWZ0W3RvU2hpZnRdW25laWdoYm9yXSwgZGVsdGEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBsYWNlQmxvY2sodikge1xuICAgICAgaWYgKCEodiBpbiB4cykpIHtcbiAgICAgICAgeHNbdl0gPSAwO1xuICAgICAgICB2YXIgdyA9IHY7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICBpZiAocG9zW3ddID4gMCkge1xuICAgICAgICAgICAgdmFyIHUgPSByb290W3ByZWRbd11dO1xuICAgICAgICAgICAgcGxhY2VCbG9jayh1KTtcbiAgICAgICAgICAgIGlmIChzaW5rW3ZdID09PSB2KSB7XG4gICAgICAgICAgICAgIHNpbmtbdl0gPSBzaW5rW3VdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGRlbHRhID0gc2VwKGcsIHByZWRbd10pICsgc2VwKGcsIHcpO1xuICAgICAgICAgICAgaWYgKHNpbmtbdl0gIT09IHNpbmtbdV0pIHtcbiAgICAgICAgICAgICAgdXBkYXRlU2hpZnQoc2lua1t1XSwgc2lua1t2XSwgeHNbdl0gLSB4c1t1XSAtIGRlbHRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHhzW3ZdID0gTWF0aC5tYXgoeHNbdl0sIHhzW3VdICsgZGVsdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB3ID0gYWxpZ25bd107XG4gICAgICAgIH0gd2hpbGUgKHcgIT09IHYpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJvb3QgY29vcmRpbmF0ZXMgcmVsYXRpdmUgdG8gc2lua1xuICAgIHV0aWwudmFsdWVzKHJvb3QpLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgcGxhY2VCbG9jayh2KTtcbiAgICB9KTtcblxuICAgIC8vIEFic29sdXRlIGNvb3JkaW5hdGVzXG4gICAgLy8gVGhlcmUgaXMgYW4gYXNzdW1wdGlvbiBoZXJlIHRoYXQgd2UndmUgcmVzb2x2ZWQgc2hpZnRzIGZvciBhbnkgY2xhc3Nlc1xuICAgIC8vIHRoYXQgYmVnaW4gYXQgYW4gZWFybGllciBsYXllci4gV2UgZ3VhcmFudGVlIHRoaXMgYnkgdmlzaXRpbmcgbGF5ZXJzIGluXG4gICAgLy8gb3JkZXIuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICAgIHhzW3ZdID0geHNbcm9vdFt2XV07XG4gICAgICAgIGlmICh2ID09PSByb290W3ZdICYmIHYgPT09IHNpbmtbdl0pIHtcbiAgICAgICAgICB2YXIgbWluU2hpZnQgPSAwO1xuICAgICAgICAgIGlmICh2IGluIG1heWJlU2hpZnQgJiYgT2JqZWN0LmtleXMobWF5YmVTaGlmdFt2XSkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWluU2hpZnQgPSB1dGlsLm1pbihPYmplY3Qua2V5cyhtYXliZVNoaWZ0W3ZdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBtYXliZVNoaWZ0W3ZdW3VdICsgKHUgaW4gc2hpZnQgPyBzaGlmdFt1XSA6IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc2hpZnRbdl0gPSBtaW5TaGlmdDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgeHNbdl0gKz0gc2hpZnRbc2lua1tyb290W3ZdXV0gfHwgMDtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHhzO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZE1pbkNvb3JkKGcsIGxheWVyaW5nLCB4cykge1xuICAgIHJldHVybiB1dGlsLm1pbihsYXllcmluZy5tYXAoZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciB1ID0gbGF5ZXJbMF07XG4gICAgICByZXR1cm4geHNbdV07XG4gICAgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZE1heENvb3JkKGcsIGxheWVyaW5nLCB4cykge1xuICAgIHJldHVybiB1dGlsLm1heChsYXllcmluZy5tYXAoZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciB1ID0gbGF5ZXJbbGF5ZXIubGVuZ3RoIC0gMV07XG4gICAgICByZXR1cm4geHNbdV07XG4gICAgfSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmFsYW5jZShnLCBsYXllcmluZywgeHNzKSB7XG4gICAgdmFyIG1pbiA9IHt9LCAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBNaW4gY29vcmRpbmF0ZSBmb3IgdGhlIGFsaWdubWVudFxuICAgICAgICBtYXggPSB7fSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWF4IGNvb3JkaW5hdGUgZm9yIHRoZSBhbGdpbm1lbnRcbiAgICAgICAgc21hbGxlc3RBbGlnbm1lbnQsXG4gICAgICAgIHNoaWZ0ID0ge307ICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBbW91bnQgdG8gc2hpZnQgYSBnaXZlbiBhbGlnbm1lbnRcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUFsaWdubWVudCh2KSB7XG4gICAgICB4c3NbYWxpZ25tZW50XVt2XSArPSBzaGlmdFthbGlnbm1lbnRdO1xuICAgIH1cblxuICAgIHZhciBzbWFsbGVzdCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICBmb3IgKHZhciBhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICB2YXIgeHMgPSB4c3NbYWxpZ25tZW50XTtcbiAgICAgIG1pblthbGlnbm1lbnRdID0gZmluZE1pbkNvb3JkKGcsIGxheWVyaW5nLCB4cyk7XG4gICAgICBtYXhbYWxpZ25tZW50XSA9IGZpbmRNYXhDb29yZChnLCBsYXllcmluZywgeHMpO1xuICAgICAgdmFyIHcgPSBtYXhbYWxpZ25tZW50XSAtIG1pblthbGlnbm1lbnRdO1xuICAgICAgaWYgKHcgPCBzbWFsbGVzdCkge1xuICAgICAgICBzbWFsbGVzdCA9IHc7XG4gICAgICAgIHNtYWxsZXN0QWxpZ25tZW50ID0gYWxpZ25tZW50O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERldGVybWluZSBob3cgbXVjaCB0byBhZGp1c3QgcG9zaXRpb25pbmcgZm9yIGVhY2ggYWxpZ25tZW50XG4gICAgWyd1JywgJ2QnXS5mb3JFYWNoKGZ1bmN0aW9uKHZlcnREaXIpIHtcbiAgICAgIFsnbCcsICdyJ10uZm9yRWFjaChmdW5jdGlvbihob3JpekRpcikge1xuICAgICAgICB2YXIgYWxpZ25tZW50ID0gdmVydERpciArIGhvcml6RGlyO1xuICAgICAgICBzaGlmdFthbGlnbm1lbnRdID0gaG9yaXpEaXIgPT09ICdsJ1xuICAgICAgICAgICAgPyBtaW5bc21hbGxlc3RBbGlnbm1lbnRdIC0gbWluW2FsaWdubWVudF1cbiAgICAgICAgICAgIDogbWF4W3NtYWxsZXN0QWxpZ25tZW50XSAtIG1heFthbGlnbm1lbnRdO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBGaW5kIGF2ZXJhZ2Ugb2YgbWVkaWFucyBmb3IgeHNzIGFycmF5XG4gICAgZm9yIChhbGlnbm1lbnQgaW4geHNzKSB7XG4gICAgICBnLmVhY2hOb2RlKHVwZGF0ZUFsaWdubWVudCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZmxpcEhvcml6b250YWxseSh4cykge1xuICAgIGZvciAodmFyIHUgaW4geHMpIHtcbiAgICAgIHhzW3VdID0gLXhzW3VdO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJldmVyc2VJbm5lck9yZGVyKGxheWVyaW5nKSB7XG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIucmV2ZXJzZSgpO1xuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gd2lkdGgoZywgdSkge1xuICAgIHN3aXRjaCAoZy5ncmFwaCgpLnJhbmtEaXIpIHtcbiAgICAgIGNhc2UgJ0xSJzogcmV0dXJuIGcubm9kZSh1KS5oZWlnaHQ7XG4gICAgICBjYXNlICdSTCc6IHJldHVybiBnLm5vZGUodSkuaGVpZ2h0O1xuICAgICAgZGVmYXVsdDogICByZXR1cm4gZy5ub2RlKHUpLndpZHRoO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGhlaWdodChnLCB1KSB7XG4gICAgc3dpdGNoKGcuZ3JhcGgoKS5yYW5rRGlyKSB7XG4gICAgICBjYXNlICdMUic6IHJldHVybiBnLm5vZGUodSkud2lkdGg7XG4gICAgICBjYXNlICdSTCc6IHJldHVybiBnLm5vZGUodSkud2lkdGg7XG4gICAgICBkZWZhdWx0OiAgIHJldHVybiBnLm5vZGUodSkuaGVpZ2h0O1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcChnLCB1KSB7XG4gICAgaWYgKGNvbmZpZy51bml2ZXJzYWxTZXAgIT09IG51bGwpIHtcbiAgICAgIHJldHVybiBjb25maWcudW5pdmVyc2FsU2VwO1xuICAgIH1cbiAgICB2YXIgdyA9IHdpZHRoKGcsIHUpO1xuICAgIHZhciBzID0gZy5ub2RlKHUpLmR1bW15ID8gY29uZmlnLmVkZ2VTZXAgOiBjb25maWcubm9kZVNlcDtcbiAgICByZXR1cm4gKHcgKyBzKSAvIDI7XG4gIH1cblxuICBmdW5jdGlvbiBwb3NYKGcsIHUsIHgpIHtcbiAgICBpZiAoZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdMUicgfHwgZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdSTCcpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueSA9IHg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLng7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueCA9IHg7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcG9zWERlYnVnKG5hbWUsIGcsIHUsIHgpIHtcbiAgICBpZiAoZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdMUicgfHwgZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdSTCcpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpW25hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZy5ub2RlKHUpW25hbWVdID0geDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSlbbmFtZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSlbbmFtZV0gPSB4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc1koZywgdSwgeSkge1xuICAgIGlmIChnLmdyYXBoKCkucmFua0RpciA9PT0gJ0xSJyB8fCBnLmdyYXBoKCkucmFua0RpciA9PT0gJ1JMJykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSkueDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGcubm9kZSh1KS54ID0geTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgICAgIHJldHVybiBnLm5vZGUodSkueTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGcubm9kZSh1KS55ID0geTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZWJ1Z1Bvc2l0aW9uaW5nKGFsaWduLCBnLCBsYXllcmluZywgeHMpIHtcbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGwsIGxpKSB7XG4gICAgICB2YXIgdSwgeFU7XG4gICAgICBsLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICB2YXIgeFYgPSB4c1t2XTtcbiAgICAgICAgaWYgKHUpIHtcbiAgICAgICAgICB2YXIgcyA9IHNlcChnLCB1KSArIHNlcChnLCB2KTtcbiAgICAgICAgICBpZiAoeFYgLSB4VSA8IHMpXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnUG9zaXRpb24gcGhhc2U6IHNlcCB2aW9sYXRpb24uIEFsaWduOiAnICsgYWxpZ24gKyAnLiBMYXllcjogJyArIGxpICsgJy4gJyArXG4gICAgICAgICAgICAgICdVOiAnICsgdSArICcgVjogJyArIHYgKyAnLiBBY3R1YWwgc2VwOiAnICsgKHhWIC0geFUpICsgJyBFeHBlY3RlZCBzZXA6ICcgKyBzKTtcbiAgICAgICAgfVxuICAgICAgICB1ID0gdjtcbiAgICAgICAgeFUgPSB4VjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIGFjeWNsaWMgPSByZXF1aXJlKCcuL3JhbmsvYWN5Y2xpYycpLFxuICAgIGluaXRSYW5rID0gcmVxdWlyZSgnLi9yYW5rL2luaXRSYW5rJyksXG4gICAgZmVhc2libGVUcmVlID0gcmVxdWlyZSgnLi9yYW5rL2ZlYXNpYmxlVHJlZScpLFxuICAgIGNvbnN0cmFpbnRzID0gcmVxdWlyZSgnLi9yYW5rL2NvbnN0cmFpbnRzJyksXG4gICAgc2ltcGxleCA9IHJlcXVpcmUoJy4vcmFuay9zaW1wbGV4JyksXG4gICAgY29tcG9uZW50cyA9IHJlcXVpcmUoJ2dyYXBobGliJykuYWxnLmNvbXBvbmVudHMsXG4gICAgZmlsdGVyID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5maWx0ZXI7XG5cbmV4cG9ydHMucnVuID0gcnVuO1xuZXhwb3J0cy5yZXN0b3JlRWRnZXMgPSByZXN0b3JlRWRnZXM7XG5cbi8qXG4gKiBIZXVyaXN0aWMgZnVuY3Rpb24gdGhhdCBhc3NpZ25zIGEgcmFuayB0byBlYWNoIG5vZGUgb2YgdGhlIGlucHV0IGdyYXBoIHdpdGhcbiAqIHRoZSBpbnRlbnQgb2YgbWluaW1pemluZyBlZGdlIGxlbmd0aHMsIHdoaWxlIHJlc3BlY3RpbmcgdGhlIGBtaW5MZW5gXG4gKiBhdHRyaWJ1dGUgb2YgaW5jaWRlbnQgZWRnZXMuXG4gKlxuICogUHJlcmVxdWlzaXRlczpcbiAqXG4gKiAgKiBFYWNoIGVkZ2UgaW4gdGhlIGlucHV0IGdyYXBoIG11c3QgaGF2ZSBhbiBhc3NpZ25lZCAnbWluTGVuJyBhdHRyaWJ1dGVcbiAqL1xuZnVuY3Rpb24gcnVuKGcsIHVzZVNpbXBsZXgpIHtcbiAgZXhwYW5kU2VsZkxvb3BzKGcpO1xuXG4gIC8vIElmIHRoZXJlIGFyZSByYW5rIGNvbnN0cmFpbnRzIG9uIG5vZGVzLCB0aGVuIGJ1aWxkIGEgbmV3IGdyYXBoIHRoYXRcbiAgLy8gZW5jb2RlcyB0aGUgY29uc3RyYWludHMuXG4gIHV0aWwudGltZSgnY29uc3RyYWludHMuYXBwbHknLCBjb25zdHJhaW50cy5hcHBseSkoZyk7XG5cbiAgZXhwYW5kU2lkZXdheXNFZGdlcyhnKTtcblxuICAvLyBSZXZlcnNlIGVkZ2VzIHRvIGdldCBhbiBhY3ljbGljIGdyYXBoLCB3ZSBrZWVwIHRoZSBncmFwaCBpbiBhbiBhY3ljbGljXG4gIC8vIHN0YXRlIHVudGlsIHRoZSB2ZXJ5IGVuZC5cbiAgdXRpbC50aW1lKCdhY3ljbGljJywgYWN5Y2xpYykoZyk7XG5cbiAgLy8gQ29udmVydCB0aGUgZ3JhcGggaW50byBhIGZsYXQgZ3JhcGggZm9yIHJhbmtpbmdcbiAgdmFyIGZsYXRHcmFwaCA9IGcuZmlsdGVyTm9kZXModXRpbC5maWx0ZXJOb25TdWJncmFwaHMoZykpO1xuXG4gIC8vIEFzc2lnbiBhbiBpbml0aWFsIHJhbmtpbmcgdXNpbmcgREZTLlxuICBpbml0UmFuayhmbGF0R3JhcGgpO1xuXG4gIC8vIEZvciBlYWNoIGNvbXBvbmVudCBpbXByb3ZlIHRoZSBhc3NpZ25lZCByYW5rcy5cbiAgY29tcG9uZW50cyhmbGF0R3JhcGgpLmZvckVhY2goZnVuY3Rpb24oY21wdCkge1xuICAgIHZhciBzdWJncmFwaCA9IGZsYXRHcmFwaC5maWx0ZXJOb2RlcyhmaWx0ZXIubm9kZXNGcm9tTGlzdChjbXB0KSk7XG4gICAgcmFua0NvbXBvbmVudChzdWJncmFwaCwgdXNlU2ltcGxleCk7XG4gIH0pO1xuXG4gIC8vIFJlbGF4IG9yaWdpbmFsIGNvbnN0cmFpbnRzXG4gIHV0aWwudGltZSgnY29uc3RyYWludHMucmVsYXgnLCBjb25zdHJhaW50cy5yZWxheChnKSk7XG5cbiAgLy8gV2hlbiBoYW5kbGluZyBub2RlcyB3aXRoIGNvbnN0cmFpbmVkIHJhbmtzIGl0IGlzIHBvc3NpYmxlIHRvIGVuZCB1cCB3aXRoXG4gIC8vIGVkZ2VzIHRoYXQgcG9pbnQgdG8gcHJldmlvdXMgcmFua3MuIE1vc3Qgb2YgdGhlIHN1YnNlcXVlbnQgYWxnb3JpdGhtcyBhc3N1bWVcbiAgLy8gdGhhdCBlZGdlcyBhcmUgcG9pbnRpbmcgdG8gc3VjY2Vzc2l2ZSByYW5rcyBvbmx5LiBIZXJlIHdlIHJldmVyc2UgYW55IFwiYmFja1xuICAvLyBlZGdlc1wiIGFuZCBtYXJrIHRoZW0gYXMgc3VjaC4gVGhlIGFjeWNsaWMgYWxnb3JpdGhtIHdpbGwgcmV2ZXJzZSB0aGVtIGFzIGFcbiAgLy8gcG9zdCBwcm9jZXNzaW5nIHN0ZXAuXG4gIHV0aWwudGltZSgncmVvcmllbnRFZGdlcycsIHJlb3JpZW50RWRnZXMpKGcpO1xufVxuXG5mdW5jdGlvbiByZXN0b3JlRWRnZXMoZykge1xuICBhY3ljbGljLnVuZG8oZyk7XG59XG5cbi8qXG4gKiBFeHBhbmQgc2VsZiBsb29wcyBpbnRvIHRocmVlIGR1bW15IG5vZGVzLiBPbmUgd2lsbCBzaXQgYWJvdmUgdGhlIGluY2lkZW50XG4gKiBub2RlLCBvbmUgd2lsbCBiZSBhdCB0aGUgc2FtZSBsZXZlbCwgYW5kIG9uZSBiZWxvdy4gVGhlIHJlc3VsdCBsb29rcyBsaWtlOlxuICpcbiAqICAgICAgICAgLy0tPC0teC0tLT4tLVxcXG4gKiAgICAgbm9kZSAgICAgICAgICAgICAgeVxuICogICAgICAgICBcXC0tPC0tei0tLT4tLS9cbiAqXG4gKiBEdW1teSBub2RlcyB4LCB5LCB6IGdpdmUgdXMgdGhlIHNoYXBlIG9mIGEgbG9vcCBhbmQgbm9kZSB5IGlzIHdoZXJlIHdlIHBsYWNlXG4gKiB0aGUgbGFiZWwuXG4gKlxuICogVE9ETzogY29uc29saWRhdGUga25vd2xlZGdlIG9mIGR1bW15IG5vZGUgY29uc3RydWN0aW9uLlxuICogVE9ETzogc3VwcG9ydCBtaW5MZW4gPSAyXG4gKi9cbmZ1bmN0aW9uIGV4cGFuZFNlbGZMb29wcyhnKSB7XG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgYSkge1xuICAgIGlmICh1ID09PSB2KSB7XG4gICAgICB2YXIgeCA9IGFkZER1bW15Tm9kZShnLCBlLCB1LCB2LCBhLCAwLCBmYWxzZSksXG4gICAgICAgICAgeSA9IGFkZER1bW15Tm9kZShnLCBlLCB1LCB2LCBhLCAxLCB0cnVlKSxcbiAgICAgICAgICB6ID0gYWRkRHVtbXlOb2RlKGcsIGUsIHUsIHYsIGEsIDIsIGZhbHNlKTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB4LCB1LCB7bWluTGVuOiAxLCBzZWxmTG9vcDogdHJ1ZX0pO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHgsIHksIHttaW5MZW46IDEsIHNlbGZMb29wOiB0cnVlfSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgeiwge21pbkxlbjogMSwgc2VsZkxvb3A6IHRydWV9KTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB5LCB6LCB7bWluTGVuOiAxLCBzZWxmTG9vcDogdHJ1ZX0pO1xuICAgICAgZy5kZWxFZGdlKGUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGV4cGFuZFNpZGV3YXlzRWRnZXMoZykge1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIGEpIHtcbiAgICBpZiAodSA9PT0gdikge1xuICAgICAgdmFyIG9yaWdFZGdlID0gYS5vcmlnaW5hbEVkZ2UsXG4gICAgICAgICAgZHVtbXkgPSBhZGREdW1teU5vZGUoZywgb3JpZ0VkZ2UuZSwgb3JpZ0VkZ2UudSwgb3JpZ0VkZ2Uudiwgb3JpZ0VkZ2UudmFsdWUsIDAsIHRydWUpO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIGR1bW15LCB7bWluTGVuOiAxfSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgZHVtbXksIHYsIHttaW5MZW46IDF9KTtcbiAgICAgIGcuZGVsRWRnZShlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGREdW1teU5vZGUoZywgZSwgdSwgdiwgYSwgaW5kZXgsIGlzTGFiZWwpIHtcbiAgcmV0dXJuIGcuYWRkTm9kZShudWxsLCB7XG4gICAgd2lkdGg6IGlzTGFiZWwgPyBhLndpZHRoIDogMCxcbiAgICBoZWlnaHQ6IGlzTGFiZWwgPyBhLmhlaWdodCA6IDAsXG4gICAgZWRnZTogeyBpZDogZSwgc291cmNlOiB1LCB0YXJnZXQ6IHYsIGF0dHJzOiBhIH0sXG4gICAgZHVtbXk6IHRydWUsXG4gICAgaW5kZXg6IGluZGV4XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZW9yaWVudEVkZ2VzKGcpIHtcbiAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmIChnLm5vZGUodSkucmFuayA+IGcubm9kZSh2KS5yYW5rKSB7XG4gICAgICBnLmRlbEVkZ2UoZSk7XG4gICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgICBnLmFkZEVkZ2UoZSwgdiwgdSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJhbmtDb21wb25lbnQoc3ViZ3JhcGgsIHVzZVNpbXBsZXgpIHtcbiAgdmFyIHNwYW5uaW5nVHJlZSA9IGZlYXNpYmxlVHJlZShzdWJncmFwaCk7XG5cbiAgaWYgKHVzZVNpbXBsZXgpIHtcbiAgICB1dGlsLmxvZygxLCAnVXNpbmcgbmV0d29yayBzaW1wbGV4IGZvciByYW5raW5nJyk7XG4gICAgc2ltcGxleChzdWJncmFwaCwgc3Bhbm5pbmdUcmVlKTtcbiAgfVxuICBub3JtYWxpemUoc3ViZ3JhcGgpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemUoZykge1xuICB2YXIgbSA9IHV0aWwubWluKGcubm9kZXMoKS5tYXAoZnVuY3Rpb24odSkgeyByZXR1cm4gZy5ub2RlKHUpLnJhbms7IH0pKTtcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCBub2RlKSB7IG5vZGUucmFuayAtPSBtOyB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYWN5Y2xpYztcbm1vZHVsZS5leHBvcnRzLnVuZG8gPSB1bmRvO1xuXG4vKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGRpcmVjdGVkIGdyYXBoIHRoYXQgbWF5IGhhdmUgY3ljbGVzIGFuZCByZXZlcnNlcyBlZGdlc1xuICogYXMgYXBwcm9wcmlhdGUgdG8gYnJlYWsgdGhlc2UgY3ljbGVzLiBFYWNoIHJldmVyc2VkIGVkZ2UgaXMgYXNzaWduZWQgYVxuICogYHJldmVyc2VkYCBhdHRyaWJ1dGUgd2l0aCB0aGUgdmFsdWUgYHRydWVgLlxuICpcbiAqIFRoZXJlIHNob3VsZCBiZSBubyBzZWxmIGxvb3BzIGluIHRoZSBncmFwaC5cbiAqL1xuZnVuY3Rpb24gYWN5Y2xpYyhnKSB7XG4gIHZhciBvblN0YWNrID0ge30sXG4gICAgICB2aXNpdGVkID0ge30sXG4gICAgICByZXZlcnNlQ291bnQgPSAwO1xuICBcbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICBpZiAodSBpbiB2aXNpdGVkKSByZXR1cm47XG4gICAgdmlzaXRlZFt1XSA9IG9uU3RhY2tbdV0gPSB0cnVlO1xuICAgIGcub3V0RWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgdCA9IGcudGFyZ2V0KGUpLFxuICAgICAgICAgIHZhbHVlO1xuXG4gICAgICBpZiAodSA9PT0gdCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdXYXJuaW5nOiBmb3VuZCBzZWxmIGxvb3AgXCInICsgZSArICdcIiBmb3Igbm9kZSBcIicgKyB1ICsgJ1wiJyk7XG4gICAgICB9IGVsc2UgaWYgKHQgaW4gb25TdGFjaykge1xuICAgICAgICB2YWx1ZSA9IGcuZWRnZShlKTtcbiAgICAgICAgZy5kZWxFZGdlKGUpO1xuICAgICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgICAgICsrcmV2ZXJzZUNvdW50O1xuICAgICAgICBnLmFkZEVkZ2UoZSwgdCwgdSwgdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGZzKHQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZGVsZXRlIG9uU3RhY2tbdV07XG4gIH1cblxuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHsgZGZzKHUpOyB9KTtcblxuICB1dGlsLmxvZygyLCAnQWN5Y2xpYyBQaGFzZTogcmV2ZXJzZWQgJyArIHJldmVyc2VDb3VudCArICcgZWRnZShzKScpO1xuXG4gIHJldHVybiByZXZlcnNlQ291bnQ7XG59XG5cbi8qXG4gKiBHaXZlbiBhIGdyYXBoIHRoYXQgaGFzIGhhZCB0aGUgYWN5Y2xpYyBvcGVyYXRpb24gYXBwbGllZCwgdGhpcyBmdW5jdGlvblxuICogdW5kb2VzIHRoYXQgb3BlcmF0aW9uLiBNb3JlIHNwZWNpZmljYWxseSwgYW55IGVkZ2Ugd2l0aCB0aGUgYHJldmVyc2VkYFxuICogYXR0cmlidXRlIGlzIGFnYWluIHJldmVyc2VkIHRvIHJlc3RvcmUgdGhlIG9yaWdpbmFsIGRpcmVjdGlvbiBvZiB0aGUgZWRnZS5cbiAqL1xuZnVuY3Rpb24gdW5kbyhnKSB7XG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgcywgdCwgYSkge1xuICAgIGlmIChhLnJldmVyc2VkKSB7XG4gICAgICBkZWxldGUgYS5yZXZlcnNlZDtcbiAgICAgIGcuZGVsRWRnZShlKTtcbiAgICAgIGcuYWRkRWRnZShlLCB0LCBzLCBhKTtcbiAgICB9XG4gIH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmFwcGx5ID0gZnVuY3Rpb24oZykge1xuICBmdW5jdGlvbiBkZnMoc2cpIHtcbiAgICB2YXIgcmFua1NldHMgPSB7fTtcbiAgICBnLmNoaWxkcmVuKHNnKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkge1xuICAgICAgICBkZnModSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmFyIHZhbHVlID0gZy5ub2RlKHUpLFxuICAgICAgICAgIHByZWZSYW5rID0gdmFsdWUucHJlZlJhbms7XG4gICAgICBpZiAocHJlZlJhbmsgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIWNoZWNrU3VwcG9ydGVkUHJlZlJhbmsocHJlZlJhbmspKSB7IHJldHVybjsgfVxuXG4gICAgICAgIGlmICghKHByZWZSYW5rIGluIHJhbmtTZXRzKSkge1xuICAgICAgICAgIHJhbmtTZXRzLnByZWZSYW5rID0gW3VdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJhbmtTZXRzLnByZWZSYW5rLnB1c2godSk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbmV3VSA9IHJhbmtTZXRzW3ByZWZSYW5rXTtcbiAgICAgICAgaWYgKG5ld1UgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIG5ld1UgPSByYW5rU2V0c1twcmVmUmFua10gPSBnLmFkZE5vZGUobnVsbCwgeyBvcmlnaW5hbE5vZGVzOiBbXSB9KTtcbiAgICAgICAgICBnLnBhcmVudChuZXdVLCBzZyk7XG4gICAgICAgIH1cblxuICAgICAgICByZWRpcmVjdEluRWRnZXMoZywgdSwgbmV3VSwgcHJlZlJhbmsgPT09ICdtaW4nKTtcbiAgICAgICAgcmVkaXJlY3RPdXRFZGdlcyhnLCB1LCBuZXdVLCBwcmVmUmFuayA9PT0gJ21heCcpO1xuXG4gICAgICAgIC8vIFNhdmUgb3JpZ2luYWwgbm9kZSBhbmQgcmVtb3ZlIGl0IGZyb20gcmVkdWNlZCBncmFwaFxuICAgICAgICBnLm5vZGUobmV3VSkub3JpZ2luYWxOb2Rlcy5wdXNoKHsgdTogdSwgdmFsdWU6IHZhbHVlLCBwYXJlbnQ6IHNnIH0pO1xuICAgICAgICBnLmRlbE5vZGUodSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBhZGRMaWdodEVkZ2VzRnJvbU1pbk5vZGUoZywgc2csIHJhbmtTZXRzLm1pbik7XG4gICAgYWRkTGlnaHRFZGdlc1RvTWF4Tm9kZShnLCBzZywgcmFua1NldHMubWF4KTtcbiAgfVxuXG4gIGRmcyhudWxsKTtcbn07XG5cbmZ1bmN0aW9uIGNoZWNrU3VwcG9ydGVkUHJlZlJhbmsocHJlZlJhbmspIHtcbiAgaWYgKHByZWZSYW5rICE9PSAnbWluJyAmJiBwcmVmUmFuayAhPT0gJ21heCcgJiYgcHJlZlJhbmsuaW5kZXhPZignc2FtZV8nKSAhPT0gMCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1Vuc3VwcG9ydGVkIHJhbmsgdHlwZTogJyArIHByZWZSYW5rKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlZGlyZWN0SW5FZGdlcyhnLCB1LCBuZXdVLCByZXZlcnNlKSB7XG4gIGcuaW5FZGdlcyh1KS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgb3JpZ1ZhbHVlID0gZy5lZGdlKGUpLFxuICAgICAgICB2YWx1ZTtcbiAgICBpZiAob3JpZ1ZhbHVlLm9yaWdpbmFsRWRnZSkge1xuICAgICAgdmFsdWUgPSBvcmlnVmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gIHtcbiAgICAgICAgb3JpZ2luYWxFZGdlOiB7IGU6IGUsIHU6IGcuc291cmNlKGUpLCB2OiBnLnRhcmdldChlKSwgdmFsdWU6IG9yaWdWYWx1ZSB9LFxuICAgICAgICBtaW5MZW46IGcuZWRnZShlKS5taW5MZW5cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRG8gbm90IHJldmVyc2UgZWRnZXMgZm9yIHNlbGYtbG9vcHMuXG4gICAgaWYgKG9yaWdWYWx1ZS5zZWxmTG9vcCkge1xuICAgICAgcmV2ZXJzZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBhbGwgZWRnZXMgdG8gbWluIGFyZSByZXZlcnNlZFxuICAgICAgZy5hZGRFZGdlKG51bGwsIG5ld1UsIGcuc291cmNlKGUpLCB2YWx1ZSk7XG4gICAgICB2YWx1ZS5yZXZlcnNlZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCBnLnNvdXJjZShlKSwgbmV3VSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlZGlyZWN0T3V0RWRnZXMoZywgdSwgbmV3VSwgcmV2ZXJzZSkge1xuICBnLm91dEVkZ2VzKHUpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgIHZhciBvcmlnVmFsdWUgPSBnLmVkZ2UoZSksXG4gICAgICAgIHZhbHVlO1xuICAgIGlmIChvcmlnVmFsdWUub3JpZ2luYWxFZGdlKSB7XG4gICAgICB2YWx1ZSA9IG9yaWdWYWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgPSAge1xuICAgICAgICBvcmlnaW5hbEVkZ2U6IHsgZTogZSwgdTogZy5zb3VyY2UoZSksIHY6IGcudGFyZ2V0KGUpLCB2YWx1ZTogb3JpZ1ZhbHVlIH0sXG4gICAgICAgIG1pbkxlbjogZy5lZGdlKGUpLm1pbkxlblxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBEbyBub3QgcmV2ZXJzZSBlZGdlcyBmb3Igc2VsZi1sb29wcy5cbiAgICBpZiAob3JpZ1ZhbHVlLnNlbGZMb29wKSB7XG4gICAgICByZXZlcnNlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHJldmVyc2UpIHtcbiAgICAgIC8vIEVuc3VyZSB0aGF0IGFsbCBlZGdlcyBmcm9tIG1heCBhcmUgcmV2ZXJzZWRcbiAgICAgIGcuYWRkRWRnZShudWxsLCBnLnRhcmdldChlKSwgbmV3VSwgdmFsdWUpO1xuICAgICAgdmFsdWUucmV2ZXJzZWQgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgbmV3VSwgZy50YXJnZXQoZSksIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBhZGRMaWdodEVkZ2VzRnJvbU1pbk5vZGUoZywgc2csIG1pbk5vZGUpIHtcbiAgaWYgKG1pbk5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgIGcuY2hpbGRyZW4oc2cpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgLy8gVGhlIGR1bW15IGNoZWNrIGVuc3VyZXMgd2UgZG9uJ3QgYWRkIGFuIGVkZ2UgaWYgdGhlIG5vZGUgaXMgaW52b2x2ZWRcbiAgICAgIC8vIGluIGEgc2VsZiBsb29wIG9yIHNpZGV3YXlzIGVkZ2UuXG4gICAgICBpZiAodSAhPT0gbWluTm9kZSAmJiAhZy5vdXRFZGdlcyhtaW5Ob2RlLCB1KS5sZW5ndGggJiYgIWcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICBnLmFkZEVkZ2UobnVsbCwgbWluTm9kZSwgdSwgeyBtaW5MZW46IDAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYWRkTGlnaHRFZGdlc1RvTWF4Tm9kZShnLCBzZywgbWF4Tm9kZSkge1xuICBpZiAobWF4Tm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZy5jaGlsZHJlbihzZykuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICAvLyBUaGUgZHVtbXkgY2hlY2sgZW5zdXJlcyB3ZSBkb24ndCBhZGQgYW4gZWRnZSBpZiB0aGUgbm9kZSBpcyBpbnZvbHZlZFxuICAgICAgLy8gaW4gYSBzZWxmIGxvb3Agb3Igc2lkZXdheXMgZWRnZS5cbiAgICAgIGlmICh1ICE9PSBtYXhOb2RlICYmICFnLm91dEVkZ2VzKHUsIG1heE5vZGUpLmxlbmd0aCAmJiAhZy5ub2RlKHUpLmR1bW15KSB7XG4gICAgICAgIGcuYWRkRWRnZShudWxsLCB1LCBtYXhOb2RlLCB7IG1pbkxlbjogMCB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG4vKlxuICogVGhpcyBmdW5jdGlvbiBcInJlbGF4ZXNcIiB0aGUgY29uc3RyYWludHMgYXBwbGllZCBwcmV2aW91c2x5IGJ5IHRoZSBcImFwcGx5XCJcbiAqIGZ1bmN0aW9uLiBJdCBleHBhbmRzIGFueSBub2RlcyB0aGF0IHdlcmUgY29sbGFwc2VkIGFuZCBhc3NpZ25zIHRoZSByYW5rIG9mXG4gKiB0aGUgY29sbGFwc2VkIG5vZGUgdG8gZWFjaCBvZiB0aGUgZXhwYW5kZWQgbm9kZXMuIEl0IGFsc28gcmVzdG9yZXMgdGhlXG4gKiBvcmlnaW5hbCBlZGdlcyBhbmQgcmVtb3ZlcyBhbnkgZHVtbXkgZWRnZXMgcG9pbnRpbmcgYXQgdGhlIGNvbGxhcHNlZCBub2Rlcy5cbiAqXG4gKiBOb3RlIHRoYXQgdGhlIHByb2Nlc3Mgb2YgcmVtb3ZpbmcgY29sbGFwc2VkIG5vZGVzIGFsc28gcmVtb3ZlcyBkdW1teSBlZGdlc1xuICogYXV0b21hdGljYWxseS5cbiAqL1xuZXhwb3J0cy5yZWxheCA9IGZ1bmN0aW9uKGcpIHtcbiAgLy8gU2F2ZSBvcmlnaW5hbCBlZGdlc1xuICB2YXIgb3JpZ2luYWxFZGdlcyA9IFtdO1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgdmFyIG9yaWdpbmFsRWRnZSA9IHZhbHVlLm9yaWdpbmFsRWRnZTtcbiAgICBpZiAob3JpZ2luYWxFZGdlKSB7XG4gICAgICBvcmlnaW5hbEVkZ2VzLnB1c2gob3JpZ2luYWxFZGdlKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEV4cGFuZCBjb2xsYXBzZWQgbm9kZXNcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciBvcmlnaW5hbE5vZGVzID0gdmFsdWUub3JpZ2luYWxOb2RlcztcbiAgICBpZiAob3JpZ2luYWxOb2Rlcykge1xuICAgICAgb3JpZ2luYWxOb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG9yaWdpbmFsTm9kZSkge1xuICAgICAgICBvcmlnaW5hbE5vZGUudmFsdWUucmFuayA9IHZhbHVlLnJhbms7XG4gICAgICAgIGcuYWRkTm9kZShvcmlnaW5hbE5vZGUudSwgb3JpZ2luYWxOb2RlLnZhbHVlKTtcbiAgICAgICAgZy5wYXJlbnQob3JpZ2luYWxOb2RlLnUsIG9yaWdpbmFsTm9kZS5wYXJlbnQpO1xuICAgICAgfSk7XG4gICAgICBnLmRlbE5vZGUodSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBSZXN0b3JlIG9yaWdpbmFsIGVkZ2VzXG4gIG9yaWdpbmFsRWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XG4gICAgZy5hZGRFZGdlKGVkZ2UuZSwgZWRnZS51LCBlZGdlLnYsIGVkZ2UudmFsdWUpO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoJ2NwLWRhdGEnKS5TZXQsXG4vKiBqc2hpbnQgK1cwNzkgKi9cbiAgICBEaWdyYXBoID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5EaWdyYXBoLFxuICAgIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZmVhc2libGVUcmVlO1xuXG4vKlxuICogR2l2ZW4gYW4gYWN5Y2xpYyBncmFwaCB3aXRoIGVhY2ggbm9kZSBhc3NpZ25lZCBhIGByYW5rYCBhdHRyaWJ1dGUsIHRoaXNcbiAqIGZ1bmN0aW9uIGNvbnN0cnVjdHMgYW5kIHJldHVybnMgYSBzcGFubmluZyB0cmVlLiBUaGlzIGZ1bmN0aW9uIG1heSByZWR1Y2VcbiAqIHRoZSBsZW5ndGggb2Ygc29tZSBlZGdlcyBmcm9tIHRoZSBpbml0aWFsIHJhbmsgYXNzaWdubWVudCB3aGlsZSBtYWludGFpbmluZ1xuICogdGhlIGBtaW5MZW5gIHNwZWNpZmllZCBieSBlYWNoIGVkZ2UuXG4gKlxuICogUHJlcmVxdWlzaXRlczpcbiAqXG4gKiAqIFRoZSBpbnB1dCBncmFwaCBpcyBhY3ljbGljXG4gKiAqIEVhY2ggbm9kZSBpbiB0aGUgaW5wdXQgZ3JhcGggaGFzIGFuIGFzc2lnbmVkIGByYW5rYCBhdHRyaWJ1dGVcbiAqICogRWFjaCBlZGdlIGluIHRoZSBpbnB1dCBncmFwaCBoYXMgYW4gYXNzaWduZWQgYG1pbkxlbmAgYXR0cmlidXRlXG4gKlxuICogT3V0cHV0czpcbiAqXG4gKiBBIGZlYXNpYmxlIHNwYW5uaW5nIHRyZWUgZm9yIHRoZSBpbnB1dCBncmFwaCAoaS5lLiBhIHNwYW5uaW5nIHRyZWUgdGhhdFxuICogcmVzcGVjdHMgZWFjaCBncmFwaCBlZGdlJ3MgYG1pbkxlbmAgYXR0cmlidXRlKSByZXByZXNlbnRlZCBhcyBhIERpZ3JhcGggd2l0aFxuICogYSBgcm9vdGAgYXR0cmlidXRlIG9uIGdyYXBoLlxuICpcbiAqIE5vZGVzIGhhdmUgdGhlIHNhbWUgaWQgYW5kIHZhbHVlIGFzIHRoYXQgaW4gdGhlIGlucHV0IGdyYXBoLlxuICpcbiAqIEVkZ2VzIGluIHRoZSB0cmVlIGhhdmUgYXJiaXRyYXJpbHkgYXNzaWduZWQgaWRzLiBUaGUgYXR0cmlidXRlcyBmb3IgZWRnZXNcbiAqIGluY2x1ZGUgYHJldmVyc2VkYC4gYHJldmVyc2VkYCBpbmRpY2F0ZXMgdGhhdCB0aGUgZWRnZSBpcyBhXG4gKiBiYWNrIGVkZ2UgaW4gdGhlIGlucHV0IGdyYXBoLlxuICovXG5mdW5jdGlvbiBmZWFzaWJsZVRyZWUoZykge1xuICB2YXIgcmVtYWluaW5nID0gbmV3IFNldChnLm5vZGVzKCkpLFxuICAgICAgdHJlZSA9IG5ldyBEaWdyYXBoKCk7XG5cbiAgaWYgKHJlbWFpbmluZy5zaXplKCkgPT09IDEpIHtcbiAgICB2YXIgcm9vdCA9IGcubm9kZXMoKVswXTtcbiAgICB0cmVlLmFkZE5vZGUocm9vdCwge30pO1xuICAgIHRyZWUuZ3JhcGgoeyByb290OiByb290IH0pO1xuICAgIHJldHVybiB0cmVlO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkVGlnaHRFZGdlcyh2KSB7XG4gICAgdmFyIGNvbnRpbnVlVG9TY2FuID0gdHJ1ZTtcbiAgICBnLnByZWRlY2Vzc29ycyh2KS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGlmIChyZW1haW5pbmcuaGFzKHUpICYmICFzbGFjayhnLCB1LCB2KSkge1xuICAgICAgICBpZiAocmVtYWluaW5nLmhhcyh2KSkge1xuICAgICAgICAgIHRyZWUuYWRkTm9kZSh2LCB7fSk7XG4gICAgICAgICAgcmVtYWluaW5nLnJlbW92ZSh2KTtcbiAgICAgICAgICB0cmVlLmdyYXBoKHsgcm9vdDogdiB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyZWUuYWRkTm9kZSh1LCB7fSk7XG4gICAgICAgIHRyZWUuYWRkRWRnZShudWxsLCB1LCB2LCB7IHJldmVyc2VkOiB0cnVlIH0pO1xuICAgICAgICByZW1haW5pbmcucmVtb3ZlKHUpO1xuICAgICAgICBhZGRUaWdodEVkZ2VzKHUpO1xuICAgICAgICBjb250aW51ZVRvU2NhbiA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgZy5zdWNjZXNzb3JzKHYpLmZvckVhY2goZnVuY3Rpb24odykgIHtcbiAgICAgIGlmIChyZW1haW5pbmcuaGFzKHcpICYmICFzbGFjayhnLCB2LCB3KSkge1xuICAgICAgICBpZiAocmVtYWluaW5nLmhhcyh2KSkge1xuICAgICAgICAgIHRyZWUuYWRkTm9kZSh2LCB7fSk7XG4gICAgICAgICAgcmVtYWluaW5nLnJlbW92ZSh2KTtcbiAgICAgICAgICB0cmVlLmdyYXBoKHsgcm9vdDogdiB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyZWUuYWRkTm9kZSh3LCB7fSk7XG4gICAgICAgIHRyZWUuYWRkRWRnZShudWxsLCB2LCB3LCB7fSk7XG4gICAgICAgIHJlbWFpbmluZy5yZW1vdmUodyk7XG4gICAgICAgIGFkZFRpZ2h0RWRnZXModyk7XG4gICAgICAgIGNvbnRpbnVlVG9TY2FuID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvbnRpbnVlVG9TY2FuO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlVGlnaHRFZGdlKCkge1xuICAgIHZhciBtaW5TbGFjayA9IE51bWJlci5NQVhfVkFMVUU7XG4gICAgcmVtYWluaW5nLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGcucHJlZGVjZXNzb3JzKHYpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgICBpZiAoIXJlbWFpbmluZy5oYXModSkpIHtcbiAgICAgICAgICB2YXIgZWRnZVNsYWNrID0gc2xhY2soZywgdSwgdik7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKGVkZ2VTbGFjaykgPCBNYXRoLmFicyhtaW5TbGFjaykpIHtcbiAgICAgICAgICAgIG1pblNsYWNrID0gLWVkZ2VTbGFjaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBnLnN1Y2Nlc3NvcnModikuZm9yRWFjaChmdW5jdGlvbih3KSB7XG4gICAgICAgIGlmICghcmVtYWluaW5nLmhhcyh3KSkge1xuICAgICAgICAgIHZhciBlZGdlU2xhY2sgPSBzbGFjayhnLCB2LCB3KTtcbiAgICAgICAgICBpZiAoTWF0aC5hYnMoZWRnZVNsYWNrKSA8IE1hdGguYWJzKG1pblNsYWNrKSkge1xuICAgICAgICAgICAgbWluU2xhY2sgPSBlZGdlU2xhY2s7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHRyZWUuZWFjaE5vZGUoZnVuY3Rpb24odSkgeyBnLm5vZGUodSkucmFuayAtPSBtaW5TbGFjazsgfSk7XG4gIH1cblxuICB3aGlsZSAocmVtYWluaW5nLnNpemUoKSkge1xuICAgIHZhciBub2Rlc1RvU2VhcmNoID0gIXRyZWUub3JkZXIoKSA/IHJlbWFpbmluZy5rZXlzKCkgOiB0cmVlLm5vZGVzKCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGlsID0gbm9kZXNUb1NlYXJjaC5sZW5ndGg7XG4gICAgICAgICBpIDwgaWwgJiYgYWRkVGlnaHRFZGdlcyhub2Rlc1RvU2VhcmNoW2ldKTtcbiAgICAgICAgICsraSk7XG4gICAgaWYgKHJlbWFpbmluZy5zaXplKCkpIHtcbiAgICAgIGNyZWF0ZVRpZ2h0RWRnZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cmVlO1xufVxuXG5mdW5jdGlvbiBzbGFjayhnLCB1LCB2KSB7XG4gIHZhciByYW5rRGlmZiA9IGcubm9kZSh2KS5yYW5rIC0gZy5ub2RlKHUpLnJhbms7XG4gIHZhciBtYXhNaW5MZW4gPSB1dGlsLm1heChnLm91dEVkZ2VzKHUsIHYpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbihlKSB7IHJldHVybiBnLmVkZ2UoZSkubWluTGVuOyB9KSk7XG4gIHJldHVybiByYW5rRGlmZiAtIG1heE1pbkxlbjtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gICAgdG9wc29ydCA9IHJlcXVpcmUoJ2dyYXBobGliJykuYWxnLnRvcHNvcnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gaW5pdFJhbms7XG5cbi8qXG4gKiBBc3NpZ25zIGEgYHJhbmtgIGF0dHJpYnV0ZSB0byBlYWNoIG5vZGUgaW4gdGhlIGlucHV0IGdyYXBoIGFuZCBlbnN1cmVzIHRoYXRcbiAqIHRoaXMgcmFuayByZXNwZWN0cyB0aGUgYG1pbkxlbmAgYXR0cmlidXRlIG9mIGluY2lkZW50IGVkZ2VzLlxuICpcbiAqIFByZXJlcXVpc2l0ZXM6XG4gKlxuICogICogVGhlIGlucHV0IGdyYXBoIG11c3QgYmUgYWN5Y2xpY1xuICogICogRWFjaCBlZGdlIGluIHRoZSBpbnB1dCBncmFwaCBtdXN0IGhhdmUgYW4gYXNzaWduZWQgJ21pbkxlbicgYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIGluaXRSYW5rKGcpIHtcbiAgdmFyIHNvcnRlZCA9IHRvcHNvcnQoZyk7XG5cbiAgc29ydGVkLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIHZhciBpbkVkZ2VzID0gZy5pbkVkZ2VzKHUpO1xuICAgIGlmIChpbkVkZ2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZy5ub2RlKHUpLnJhbmsgPSAwO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBtaW5MZW5zID0gaW5FZGdlcy5tYXAoZnVuY3Rpb24oZSkge1xuICAgICAgcmV0dXJuIGcubm9kZShnLnNvdXJjZShlKSkucmFuayArIGcuZWRnZShlKS5taW5MZW47XG4gICAgfSk7XG4gICAgZy5ub2RlKHUpLnJhbmsgPSB1dGlsLm1heChtaW5MZW5zKTtcbiAgfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzbGFjazogc2xhY2tcbn07XG5cbi8qXG4gKiBBIGhlbHBlciB0byBjYWxjdWxhdGUgdGhlIHNsYWNrIGJldHdlZW4gdHdvIG5vZGVzIChgdWAgYW5kIGB2YCkgZ2l2ZW4gYVxuICogYG1pbkxlbmAgY29uc3RyYWludC4gVGhlIHNsYWNrIHJlcHJlc2VudHMgaG93IG11Y2ggdGhlIGRpc3RhbmNlIGJldHdlZW4gYHVgXG4gKiBhbmQgYHZgIGNvdWxkIHNocmluayB3aGlsZSBtYWludGFpbmluZyB0aGUgYG1pbkxlbmAgY29uc3RyYWludC4gSWYgdGhlIHZhbHVlXG4gKiBpcyBuZWdhdGl2ZSB0aGVuIHRoZSBjb25zdHJhaW50IGlzIGN1cnJlbnRseSB2aW9sYXRlZC5cbiAqXG4gIFRoaXMgZnVuY3Rpb24gcmVxdWlyZXMgdGhhdCBgdWAgYW5kIGB2YCBhcmUgaW4gYGdyYXBoYCBhbmQgdGhleSBib3RoIGhhdmUgYVxuICBgcmFua2AgYXR0cmlidXRlLlxuICovXG5mdW5jdGlvbiBzbGFjayhncmFwaCwgdSwgdiwgbWluTGVuKSB7XG4gIHJldHVybiBNYXRoLmFicyhncmFwaC5ub2RlKHUpLnJhbmsgLSBncmFwaC5ub2RlKHYpLnJhbmspIC0gbWluTGVuO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKSxcbiAgICByYW5rVXRpbCA9IHJlcXVpcmUoJy4vcmFua1V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGV4O1xuXG5mdW5jdGlvbiBzaW1wbGV4KGdyYXBoLCBzcGFubmluZ1RyZWUpIHtcbiAgLy8gVGhlIG5ldHdvcmsgc2ltcGxleCBhbGdvcml0aG0gcmVwZWF0ZWRseSByZXBsYWNlcyBlZGdlcyBvZlxuICAvLyB0aGUgc3Bhbm5pbmcgdHJlZSB3aXRoIG5lZ2F0aXZlIGN1dCB2YWx1ZXMgdW50aWwgbm8gc3VjaFxuICAvLyBlZGdlIGV4aXN0cy5cbiAgaW5pdEN1dFZhbHVlcyhncmFwaCwgc3Bhbm5pbmdUcmVlKTtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgZSA9IGxlYXZlRWRnZShzcGFubmluZ1RyZWUpO1xuICAgIGlmIChlID09PSBudWxsKSBicmVhaztcbiAgICB2YXIgZiA9IGVudGVyRWRnZShncmFwaCwgc3Bhbm5pbmdUcmVlLCBlKTtcbiAgICBleGNoYW5nZShncmFwaCwgc3Bhbm5pbmdUcmVlLCBlLCBmKTtcbiAgfVxufVxuXG4vKlxuICogU2V0IHRoZSBjdXQgdmFsdWVzIG9mIGVkZ2VzIGluIHRoZSBzcGFubmluZyB0cmVlIGJ5IGEgZGVwdGgtZmlyc3RcbiAqIHBvc3RvcmRlciB0cmF2ZXJzYWwuICBUaGUgY3V0IHZhbHVlIGNvcnJlc3BvbmRzIHRvIHRoZSBjb3N0LCBpblxuICogdGVybXMgb2YgYSByYW5raW5nJ3MgZWRnZSBsZW5ndGggc3VtLCBvZiBsZW5ndGhlbmluZyBhbiBlZGdlLlxuICogTmVnYXRpdmUgY3V0IHZhbHVlcyB0eXBpY2FsbHkgaW5kaWNhdGUgZWRnZXMgdGhhdCB3b3VsZCB5aWVsZCBhXG4gKiBzbWFsbGVyIGVkZ2UgbGVuZ3RoIHN1bSBpZiB0aGV5IHdlcmUgbGVuZ3RoZW5lZC5cbiAqL1xuZnVuY3Rpb24gaW5pdEN1dFZhbHVlcyhncmFwaCwgc3Bhbm5pbmdUcmVlKSB7XG4gIGNvbXB1dGVMb3dMaW0oc3Bhbm5pbmdUcmVlKTtcblxuICBzcGFubmluZ1RyZWUuZWFjaEVkZ2UoZnVuY3Rpb24oaWQsIHUsIHYsIHRyZWVWYWx1ZSkge1xuICAgIHRyZWVWYWx1ZS5jdXRWYWx1ZSA9IDA7XG4gIH0pO1xuXG4gIC8vIFByb3BhZ2F0ZSBjdXQgdmFsdWVzIHVwIHRoZSB0cmVlLlxuICBmdW5jdGlvbiBkZnMobikge1xuICAgIHZhciBjaGlsZHJlbiA9IHNwYW5uaW5nVHJlZS5zdWNjZXNzb3JzKG4pO1xuICAgIGZvciAodmFyIGMgaW4gY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2NdO1xuICAgICAgZGZzKGNoaWxkKTtcbiAgICB9XG4gICAgaWYgKG4gIT09IHNwYW5uaW5nVHJlZS5ncmFwaCgpLnJvb3QpIHtcbiAgICAgIHNldEN1dFZhbHVlKGdyYXBoLCBzcGFubmluZ1RyZWUsIG4pO1xuICAgIH1cbiAgfVxuICBkZnMoc3Bhbm5pbmdUcmVlLmdyYXBoKCkucm9vdCk7XG59XG5cbi8qXG4gKiBQZXJmb3JtIGEgREZTIHBvc3RvcmRlciB0cmF2ZXJzYWwsIGxhYmVsaW5nIGVhY2ggbm9kZSB2IHdpdGhcbiAqIGl0cyB0cmF2ZXJzYWwgb3JkZXIgJ2xpbSh2KScgYW5kIHRoZSBtaW5pbXVtIHRyYXZlcnNhbCBudW1iZXJcbiAqIG9mIGFueSBvZiBpdHMgZGVzY2VuZGFudHMgJ2xvdyh2KScuICBUaGlzIHByb3ZpZGVzIGFuIGVmZmljaWVudFxuICogd2F5IHRvIHRlc3Qgd2hldGhlciB1IGlzIGFuIGFuY2VzdG9yIG9mIHYgc2luY2VcbiAqIGxvdyh1KSA8PSBsaW0odikgPD0gbGltKHUpIGlmIGFuZCBvbmx5IGlmIHUgaXMgYW4gYW5jZXN0b3IuXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVMb3dMaW0odHJlZSkge1xuICB2YXIgcG9zdE9yZGVyTnVtID0gMDtcbiAgXG4gIGZ1bmN0aW9uIGRmcyhuKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdHJlZS5zdWNjZXNzb3JzKG4pO1xuICAgIHZhciBsb3cgPSBwb3N0T3JkZXJOdW07XG4gICAgZm9yICh2YXIgYyBpbiBjaGlsZHJlbikge1xuICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5bY107XG4gICAgICBkZnMoY2hpbGQpO1xuICAgICAgbG93ID0gTWF0aC5taW4obG93LCB0cmVlLm5vZGUoY2hpbGQpLmxvdyk7XG4gICAgfVxuICAgIHRyZWUubm9kZShuKS5sb3cgPSBsb3c7XG4gICAgdHJlZS5ub2RlKG4pLmxpbSA9IHBvc3RPcmRlck51bSsrO1xuICB9XG5cbiAgZGZzKHRyZWUuZ3JhcGgoKS5yb290KTtcbn1cblxuLypcbiAqIFRvIGNvbXB1dGUgdGhlIGN1dCB2YWx1ZSBvZiB0aGUgZWRnZSBwYXJlbnQgLT4gY2hpbGQsIHdlIGNvbnNpZGVyXG4gKiBpdCBhbmQgYW55IG90aGVyIGdyYXBoIGVkZ2VzIHRvIG9yIGZyb20gdGhlIGNoaWxkLlxuICogICAgICAgICAgcGFyZW50XG4gKiAgICAgICAgICAgICB8XG4gKiAgICAgICAgICAgY2hpbGRcbiAqICAgICAgICAgIC8gICAgICBcXFxuICogICAgICAgICB1ICAgICAgICB2XG4gKi9cbmZ1bmN0aW9uIHNldEN1dFZhbHVlKGdyYXBoLCB0cmVlLCBjaGlsZCkge1xuICB2YXIgcGFyZW50RWRnZSA9IHRyZWUuaW5FZGdlcyhjaGlsZClbMF07XG5cbiAgLy8gTGlzdCBvZiBjaGlsZCdzIGNoaWxkcmVuIGluIHRoZSBzcGFubmluZyB0cmVlLlxuICB2YXIgZ3JhbmRjaGlsZHJlbiA9IFtdO1xuICB2YXIgZ3JhbmRjaGlsZEVkZ2VzID0gdHJlZS5vdXRFZGdlcyhjaGlsZCk7XG4gIGZvciAodmFyIGdjZSBpbiBncmFuZGNoaWxkRWRnZXMpIHtcbiAgICBncmFuZGNoaWxkcmVuLnB1c2godHJlZS50YXJnZXQoZ3JhbmRjaGlsZEVkZ2VzW2djZV0pKTtcbiAgfVxuXG4gIHZhciBjdXRWYWx1ZSA9IDA7XG5cbiAgLy8gVE9ETzogUmVwbGFjZSB1bml0IGluY3JlbWVudC9kZWNyZW1lbnQgd2l0aCBlZGdlIHdlaWdodHMuXG4gIHZhciBFID0gMDsgICAgLy8gRWRnZXMgZnJvbSBjaGlsZCB0byBncmFuZGNoaWxkJ3Mgc3VidHJlZS5cbiAgdmFyIEYgPSAwOyAgICAvLyBFZGdlcyB0byBjaGlsZCBmcm9tIGdyYW5kY2hpbGQncyBzdWJ0cmVlLlxuICB2YXIgRyA9IDA7ICAgIC8vIEVkZ2VzIGZyb20gY2hpbGQgdG8gbm9kZXMgb3V0c2lkZSBvZiBjaGlsZCdzIHN1YnRyZWUuXG4gIHZhciBIID0gMDsgICAgLy8gRWRnZXMgZnJvbSBub2RlcyBvdXRzaWRlIG9mIGNoaWxkJ3Mgc3VidHJlZSB0byBjaGlsZC5cblxuICAvLyBDb25zaWRlciBhbGwgZ3JhcGggZWRnZXMgZnJvbSBjaGlsZC5cbiAgdmFyIG91dEVkZ2VzID0gZ3JhcGgub3V0RWRnZXMoY2hpbGQpO1xuICB2YXIgZ2M7XG4gIGZvciAodmFyIG9lIGluIG91dEVkZ2VzKSB7XG4gICAgdmFyIHN1Y2MgPSBncmFwaC50YXJnZXQob3V0RWRnZXNbb2VdKTtcbiAgICBmb3IgKGdjIGluIGdyYW5kY2hpbGRyZW4pIHtcbiAgICAgIGlmIChpblN1YnRyZWUodHJlZSwgc3VjYywgZ3JhbmRjaGlsZHJlbltnY10pKSB7XG4gICAgICAgIEUrKztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpblN1YnRyZWUodHJlZSwgc3VjYywgY2hpbGQpKSB7XG4gICAgICBHKys7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29uc2lkZXIgYWxsIGdyYXBoIGVkZ2VzIHRvIGNoaWxkLlxuICB2YXIgaW5FZGdlcyA9IGdyYXBoLmluRWRnZXMoY2hpbGQpO1xuICBmb3IgKHZhciBpZSBpbiBpbkVkZ2VzKSB7XG4gICAgdmFyIHByZWQgPSBncmFwaC5zb3VyY2UoaW5FZGdlc1tpZV0pO1xuICAgIGZvciAoZ2MgaW4gZ3JhbmRjaGlsZHJlbikge1xuICAgICAgaWYgKGluU3VidHJlZSh0cmVlLCBwcmVkLCBncmFuZGNoaWxkcmVuW2djXSkpIHtcbiAgICAgICAgRisrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWluU3VidHJlZSh0cmVlLCBwcmVkLCBjaGlsZCkpIHtcbiAgICAgIEgrKztcbiAgICB9XG4gIH1cblxuICAvLyBDb250cmlidXRpb25zIGRlcGVuZCBvbiB0aGUgYWxpZ25tZW50IG9mIHRoZSBwYXJlbnQgLT4gY2hpbGQgZWRnZVxuICAvLyBhbmQgdGhlIGNoaWxkIC0+IHUgb3IgdiBlZGdlcy5cbiAgdmFyIGdyYW5kY2hpbGRDdXRTdW0gPSAwO1xuICBmb3IgKGdjIGluIGdyYW5kY2hpbGRyZW4pIHtcbiAgICB2YXIgY3YgPSB0cmVlLmVkZ2UoZ3JhbmRjaGlsZEVkZ2VzW2djXSkuY3V0VmFsdWU7XG4gICAgaWYgKCF0cmVlLmVkZ2UoZ3JhbmRjaGlsZEVkZ2VzW2djXSkucmV2ZXJzZWQpIHtcbiAgICAgIGdyYW5kY2hpbGRDdXRTdW0gKz0gY3Y7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdyYW5kY2hpbGRDdXRTdW0gLT0gY3Y7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF0cmVlLmVkZ2UocGFyZW50RWRnZSkucmV2ZXJzZWQpIHtcbiAgICBjdXRWYWx1ZSArPSBncmFuZGNoaWxkQ3V0U3VtIC0gRSArIEYgLSBHICsgSDtcbiAgfSBlbHNlIHtcbiAgICBjdXRWYWx1ZSAtPSBncmFuZGNoaWxkQ3V0U3VtIC0gRSArIEYgLSBHICsgSDtcbiAgfVxuXG4gIHRyZWUuZWRnZShwYXJlbnRFZGdlKS5jdXRWYWx1ZSA9IGN1dFZhbHVlO1xufVxuXG4vKlxuICogUmV0dXJuIHdoZXRoZXIgbiBpcyBhIG5vZGUgaW4gdGhlIHN1YnRyZWUgd2l0aCB0aGUgZ2l2ZW5cbiAqIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGluU3VidHJlZSh0cmVlLCBuLCByb290KSB7XG4gIHJldHVybiAodHJlZS5ub2RlKHJvb3QpLmxvdyA8PSB0cmVlLm5vZGUobikubGltICYmXG4gICAgICAgICAgdHJlZS5ub2RlKG4pLmxpbSA8PSB0cmVlLm5vZGUocm9vdCkubGltKTtcbn1cblxuLypcbiAqIFJldHVybiBhbiBlZGdlIGZyb20gdGhlIHRyZWUgd2l0aCBhIG5lZ2F0aXZlIGN1dCB2YWx1ZSwgb3IgbnVsbCBpZiB0aGVyZVxuICogaXMgbm9uZS5cbiAqL1xuZnVuY3Rpb24gbGVhdmVFZGdlKHRyZWUpIHtcbiAgdmFyIGVkZ2VzID0gdHJlZS5lZGdlcygpO1xuICBmb3IgKHZhciBuIGluIGVkZ2VzKSB7XG4gICAgdmFyIGUgPSBlZGdlc1tuXTtcbiAgICB2YXIgdHJlZVZhbHVlID0gdHJlZS5lZGdlKGUpO1xuICAgIGlmICh0cmVlVmFsdWUuY3V0VmFsdWUgPCAwKSB7XG4gICAgICByZXR1cm4gZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qXG4gKiBUaGUgZWRnZSBlIHNob3VsZCBiZSBhbiBlZGdlIGluIHRoZSB0cmVlLCB3aXRoIGFuIHVuZGVybHlpbmcgZWRnZVxuICogaW4gdGhlIGdyYXBoLCB3aXRoIGEgbmVnYXRpdmUgY3V0IHZhbHVlLiAgT2YgdGhlIHR3byBub2RlcyBpbmNpZGVudFxuICogb24gdGhlIGVkZ2UsIHRha2UgdGhlIGxvd2VyIG9uZS4gIGVudGVyRWRnZSByZXR1cm5zIGFuIGVkZ2Ugd2l0aFxuICogbWluaW11bSBzbGFjayBnb2luZyBmcm9tIG91dHNpZGUgb2YgdGhhdCBub2RlJ3Mgc3VidHJlZSB0byBpbnNpZGVcbiAqIG9mIHRoYXQgbm9kZSdzIHN1YnRyZWUuXG4gKi9cbmZ1bmN0aW9uIGVudGVyRWRnZShncmFwaCwgdHJlZSwgZSkge1xuICB2YXIgc291cmNlID0gdHJlZS5zb3VyY2UoZSk7XG4gIHZhciB0YXJnZXQgPSB0cmVlLnRhcmdldChlKTtcbiAgdmFyIGxvd2VyID0gdHJlZS5ub2RlKHRhcmdldCkubGltIDwgdHJlZS5ub2RlKHNvdXJjZSkubGltID8gdGFyZ2V0IDogc291cmNlO1xuXG4gIC8vIElzIHRoZSB0cmVlIGVkZ2UgYWxpZ25lZCB3aXRoIHRoZSBncmFwaCBlZGdlP1xuICB2YXIgYWxpZ25lZCA9ICF0cmVlLmVkZ2UoZSkucmV2ZXJzZWQ7XG5cbiAgdmFyIG1pblNsYWNrID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICB2YXIgbWluU2xhY2tFZGdlO1xuICBpZiAoYWxpZ25lZCkge1xuICAgIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGlkLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgaWYgKGlkICE9PSBlICYmIGluU3VidHJlZSh0cmVlLCB1LCBsb3dlcikgJiYgIWluU3VidHJlZSh0cmVlLCB2LCBsb3dlcikpIHtcbiAgICAgICAgdmFyIHNsYWNrID0gcmFua1V0aWwuc2xhY2soZ3JhcGgsIHUsIHYsIHZhbHVlLm1pbkxlbik7XG4gICAgICAgIGlmIChzbGFjayA8IG1pblNsYWNrKSB7XG4gICAgICAgICAgbWluU2xhY2sgPSBzbGFjaztcbiAgICAgICAgICBtaW5TbGFja0VkZ2UgPSBpZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGlkLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgaWYgKGlkICE9PSBlICYmICFpblN1YnRyZWUodHJlZSwgdSwgbG93ZXIpICYmIGluU3VidHJlZSh0cmVlLCB2LCBsb3dlcikpIHtcbiAgICAgICAgdmFyIHNsYWNrID0gcmFua1V0aWwuc2xhY2soZ3JhcGgsIHUsIHYsIHZhbHVlLm1pbkxlbik7XG4gICAgICAgIGlmIChzbGFjayA8IG1pblNsYWNrKSB7XG4gICAgICAgICAgbWluU2xhY2sgPSBzbGFjaztcbiAgICAgICAgICBtaW5TbGFja0VkZ2UgPSBpZDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgaWYgKG1pblNsYWNrRWRnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIG91dHNpZGUgPSBbXTtcbiAgICB2YXIgaW5zaWRlID0gW107XG4gICAgZ3JhcGguZWFjaE5vZGUoZnVuY3Rpb24oaWQpIHtcbiAgICAgIGlmICghaW5TdWJ0cmVlKHRyZWUsIGlkLCBsb3dlcikpIHtcbiAgICAgICAgb3V0c2lkZS5wdXNoKGlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluc2lkZS5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVkZ2UgZm91bmQgZnJvbSBvdXRzaWRlIG9mIHRyZWUgdG8gaW5zaWRlJyk7XG4gIH1cblxuICByZXR1cm4gbWluU2xhY2tFZGdlO1xufVxuXG4vKlxuICogUmVwbGFjZSBlZGdlIGUgd2l0aCBlZGdlIGYgaW4gdGhlIHRyZWUsIHJlY2FsY3VsYXRpbmcgdGhlIHRyZWUgcm9vdCxcbiAqIHRoZSBub2RlcycgbG93IGFuZCBsaW0gcHJvcGVydGllcyBhbmQgdGhlIGVkZ2VzJyBjdXQgdmFsdWVzLlxuICovXG5mdW5jdGlvbiBleGNoYW5nZShncmFwaCwgdHJlZSwgZSwgZikge1xuICB0cmVlLmRlbEVkZ2UoZSk7XG4gIHZhciBzb3VyY2UgPSBncmFwaC5zb3VyY2UoZik7XG4gIHZhciB0YXJnZXQgPSBncmFwaC50YXJnZXQoZik7XG5cbiAgLy8gUmVkaXJlY3QgZWRnZXMgc28gdGhhdCB0YXJnZXQgaXMgdGhlIHJvb3Qgb2YgaXRzIHN1YnRyZWUuXG4gIGZ1bmN0aW9uIHJlZGlyZWN0KHYpIHtcbiAgICB2YXIgZWRnZXMgPSB0cmVlLmluRWRnZXModik7XG4gICAgZm9yICh2YXIgaSBpbiBlZGdlcykge1xuICAgICAgdmFyIGUgPSBlZGdlc1tpXTtcbiAgICAgIHZhciB1ID0gdHJlZS5zb3VyY2UoZSk7XG4gICAgICB2YXIgdmFsdWUgPSB0cmVlLmVkZ2UoZSk7XG4gICAgICByZWRpcmVjdCh1KTtcbiAgICAgIHRyZWUuZGVsRWRnZShlKTtcbiAgICAgIHZhbHVlLnJldmVyc2VkID0gIXZhbHVlLnJldmVyc2VkO1xuICAgICAgdHJlZS5hZGRFZGdlKGUsIHYsIHUsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICByZWRpcmVjdCh0YXJnZXQpO1xuXG4gIHZhciByb290ID0gc291cmNlO1xuICB2YXIgZWRnZXMgPSB0cmVlLmluRWRnZXMocm9vdCk7XG4gIHdoaWxlIChlZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgcm9vdCA9IHRyZWUuc291cmNlKGVkZ2VzWzBdKTtcbiAgICBlZGdlcyA9IHRyZWUuaW5FZGdlcyhyb290KTtcbiAgfVxuXG4gIHRyZWUuZ3JhcGgoKS5yb290ID0gcm9vdDtcblxuICB0cmVlLmFkZEVkZ2UobnVsbCwgc291cmNlLCB0YXJnZXQsIHtjdXRWYWx1ZTogMH0pO1xuXG4gIGluaXRDdXRWYWx1ZXMoZ3JhcGgsIHRyZWUpO1xuXG4gIGFkanVzdFJhbmtzKGdyYXBoLCB0cmVlKTtcbn1cblxuLypcbiAqIFJlc2V0IHRoZSByYW5rcyBvZiBhbGwgbm9kZXMgYmFzZWQgb24gdGhlIGN1cnJlbnQgc3Bhbm5pbmcgdHJlZS5cbiAqIFRoZSByYW5rIG9mIHRoZSB0cmVlJ3Mgcm9vdCByZW1haW5zIHVuY2hhbmdlZCwgd2hpbGUgYWxsIG90aGVyXG4gKiBub2RlcyBhcmUgc2V0IHRvIHRoZSBzdW0gb2YgbWluaW11bSBsZW5ndGggY29uc3RyYWludHMgYWxvbmdcbiAqIHRoZSBwYXRoIGZyb20gdGhlIHJvb3QuXG4gKi9cbmZ1bmN0aW9uIGFkanVzdFJhbmtzKGdyYXBoLCB0cmVlKSB7XG4gIGZ1bmN0aW9uIGRmcyhwKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdHJlZS5zdWNjZXNzb3JzKHApO1xuICAgIGNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oYykge1xuICAgICAgdmFyIG1pbkxlbiA9IG1pbmltdW1MZW5ndGgoZ3JhcGgsIHAsIGMpO1xuICAgICAgZ3JhcGgubm9kZShjKS5yYW5rID0gZ3JhcGgubm9kZShwKS5yYW5rICsgbWluTGVuO1xuICAgICAgZGZzKGMpO1xuICAgIH0pO1xuICB9XG5cbiAgZGZzKHRyZWUuZ3JhcGgoKS5yb290KTtcbn1cblxuLypcbiAqIElmIHUgYW5kIHYgYXJlIGNvbm5lY3RlZCBieSBzb21lIGVkZ2VzIGluIHRoZSBncmFwaCwgcmV0dXJuIHRoZVxuICogbWluaW11bSBsZW5ndGggb2YgdGhvc2UgZWRnZXMsIGFzIGEgcG9zaXRpdmUgbnVtYmVyIGlmIHYgc3VjY2VlZHNcbiAqIHUgYW5kIGFzIGEgbmVnYXRpdmUgbnVtYmVyIGlmIHYgcHJlY2VkZXMgdS5cbiAqL1xuZnVuY3Rpb24gbWluaW11bUxlbmd0aChncmFwaCwgdSwgdikge1xuICB2YXIgb3V0RWRnZXMgPSBncmFwaC5vdXRFZGdlcyh1LCB2KTtcbiAgaWYgKG91dEVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gdXRpbC5tYXgob3V0RWRnZXMubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBncmFwaC5lZGdlKGUpLm1pbkxlbjtcbiAgICB9KSk7XG4gIH1cblxuICB2YXIgaW5FZGdlcyA9IGdyYXBoLmluRWRnZXModSwgdik7XG4gIGlmIChpbkVkZ2VzLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gLXV0aWwubWF4KGluRWRnZXMubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBncmFwaC5lZGdlKGUpLm1pbkxlbjtcbiAgICB9KSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypcbiAqIFJldHVybnMgdGhlIHNtYWxsZXN0IHZhbHVlIGluIHRoZSBhcnJheS5cbiAqL1xuZXhwb3J0cy5taW4gPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIHZhbHVlcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgbGFyZ2VzdCB2YWx1ZSBpbiB0aGUgYXJyYXkuXG4gKi9cbmV4cG9ydHMubWF4ID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYHRydWVgIG9ubHkgaWYgYGYoeClgIGlzIGB0cnVlYCBmb3IgYWxsIGB4YCBpbiBgeHNgLiBPdGhlcndpc2VcbiAqIHJldHVybnMgYGZhbHNlYC4gVGhpcyBmdW5jdGlvbiB3aWxsIHJldHVybiBpbW1lZGlhdGVseSBpZiBpdCBmaW5kcyBhXG4gKiBjYXNlIHdoZXJlIGBmKHgpYCBkb2VzIG5vdCBob2xkLlxuICovXG5leHBvcnRzLmFsbCA9IGZ1bmN0aW9uKHhzLCBmKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoIWYoeHNbaV0pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufTtcblxuLypcbiAqIEFjY3VtdWxhdGVzIHRoZSBzdW0gb2YgZWxlbWVudHMgaW4gdGhlIGdpdmVuIGFycmF5IHVzaW5nIHRoZSBgK2Agb3BlcmF0b3IuXG4gKi9cbmV4cG9ydHMuc3VtID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiB2YWx1ZXMucmVkdWNlKGZ1bmN0aW9uKGFjYywgeCkgeyByZXR1cm4gYWNjICsgeDsgfSwgMCk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdmFsdWVzIGluIHRoZSBnaXZlbiBvYmplY3QuXG4gKi9cbmV4cG9ydHMudmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmopLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBvYmpba107IH0pO1xufTtcblxuZXhwb3J0cy5zaHVmZmxlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgZm9yICh2YXIgaSA9IGFycmF5Lmxlbmd0aCAtIDE7IGkgPiAwOyAtLWkpIHtcbiAgICB2YXIgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgIHZhciBhaiA9IGFycmF5W2pdO1xuICAgIGFycmF5W2pdID0gYXJyYXlbaV07XG4gICAgYXJyYXlbaV0gPSBhajtcbiAgfVxufTtcblxuZXhwb3J0cy5wcm9wZXJ0eUFjY2Vzc29yID0gZnVuY3Rpb24oc2VsZiwgY29uZmlnLCBmaWVsZCwgc2V0SG9vaykge1xuICByZXR1cm4gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGNvbmZpZ1tmaWVsZF07XG4gICAgY29uZmlnW2ZpZWxkXSA9IHg7XG4gICAgaWYgKHNldEhvb2spIHNldEhvb2soeCk7XG4gICAgcmV0dXJuIHNlbGY7XG4gIH07XG59O1xuXG4vKlxuICogR2l2ZW4gYSBsYXllcmVkLCBkaXJlY3RlZCBncmFwaCB3aXRoIGByYW5rYCBhbmQgYG9yZGVyYCBub2RlIGF0dHJpYnV0ZXMsXG4gKiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYW4gYXJyYXkgb2Ygb3JkZXJlZCByYW5rcy4gRWFjaCByYW5rIGNvbnRhaW5zIGFuIGFycmF5XG4gKiBvZiB0aGUgaWRzIG9mIHRoZSBub2RlcyBpbiB0aGF0IHJhbmsgaW4gdGhlIG9yZGVyIHNwZWNpZmllZCBieSB0aGUgYG9yZGVyYFxuICogYXR0cmlidXRlLlxuICovXG5leHBvcnRzLm9yZGVyaW5nID0gZnVuY3Rpb24oZykge1xuICB2YXIgb3JkZXJpbmcgPSBbXTtcbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIHZhciByYW5rID0gb3JkZXJpbmdbdmFsdWUucmFua10gfHwgKG9yZGVyaW5nW3ZhbHVlLnJhbmtdID0gW10pO1xuICAgIHJhbmtbdmFsdWUub3JkZXJdID0gdTtcbiAgfSk7XG4gIHJldHVybiBvcmRlcmluZztcbn07XG5cbi8qXG4gKiBBIGZpbHRlciB0aGF0IGNhbiBiZSB1c2VkIHdpdGggYGZpbHRlck5vZGVzYCB0byBnZXQgYSBncmFwaCB0aGF0IG9ubHlcbiAqIGluY2x1ZGVzIG5vZGVzIHRoYXQgZG8gbm90IGNvbnRhaW4gb3RoZXJzIG5vZGVzLlxuICovXG5leHBvcnRzLmZpbHRlck5vblN1YmdyYXBocyA9IGZ1bmN0aW9uKGcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHUpIHtcbiAgICByZXR1cm4gZy5jaGlsZHJlbih1KS5sZW5ndGggPT09IDA7XG4gIH07XG59O1xuXG4vKlxuICogUmV0dXJucyBhIG5ldyBmdW5jdGlvbiB0aGF0IHdyYXBzIGBmdW5jYCB3aXRoIGEgdGltZXIuIFRoZSB3cmFwcGVyIGxvZ3MgdGhlXG4gKiB0aW1lIGl0IHRha2VzIHRvIGV4ZWN1dGUgdGhlIGZ1bmN0aW9uLlxuICpcbiAqIFRoZSB0aW1lciB3aWxsIGJlIGVuYWJsZWQgcHJvdmlkZWQgYGxvZy5sZXZlbCA+PSAxYC5cbiAqL1xuZnVuY3Rpb24gdGltZShuYW1lLCBmdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3RhcnQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgbG9nKDEsIG5hbWUgKyAnIHRpbWU6ICcgKyAobmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydCkgKyAnbXMnKTtcbiAgICB9XG4gIH07XG59XG50aW1lLmVuYWJsZWQgPSBmYWxzZTtcblxuZXhwb3J0cy50aW1lID0gdGltZTtcblxuLypcbiAqIEEgZ2xvYmFsIGxvZ2dlciB3aXRoIHRoZSBzcGVjaWZpY2F0aW9uIGBsb2cobGV2ZWwsIG1lc3NhZ2UsIC4uLilgIHRoYXRcbiAqIHdpbGwgbG9nIGEgbWVzc2FnZSB0byB0aGUgY29uc29sZSBpZiBgbG9nLmxldmVsID49IGxldmVsYC5cbiAqL1xuZnVuY3Rpb24gbG9nKGxldmVsKSB7XG4gIGlmIChsb2cubGV2ZWwgPj0gbGV2ZWwpIHtcbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfVxufVxubG9nLmxldmVsID0gMDtcblxuZXhwb3J0cy5sb2cgPSBsb2c7XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcwLjQuNic7XG4iLCJleHBvcnRzLlNldCA9IHJlcXVpcmUoJy4vbGliL1NldCcpO1xuZXhwb3J0cy5Qcmlvcml0eVF1ZXVlID0gcmVxdWlyZSgnLi9saWIvUHJpb3JpdHlRdWV1ZScpO1xuZXhwb3J0cy52ZXJzaW9uID0gcmVxdWlyZSgnLi9saWIvdmVyc2lvbicpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBQcmlvcml0eVF1ZXVlO1xuXG4vKipcbiAqIEEgbWluLXByaW9yaXR5IHF1ZXVlIGRhdGEgc3RydWN0dXJlLiBUaGlzIGFsZ29yaXRobSBpcyBkZXJpdmVkIGZyb20gQ29ybWVuLFxuICogZXQgYWwuLCBcIkludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zXCIuIFRoZSBiYXNpYyBpZGVhIG9mIGEgbWluLXByaW9yaXR5XG4gKiBxdWV1ZSBpcyB0aGF0IHlvdSBjYW4gZWZmaWNpZW50bHkgKGluIE8oMSkgdGltZSkgZ2V0IHRoZSBzbWFsbGVzdCBrZXkgaW5cbiAqIHRoZSBxdWV1ZS4gQWRkaW5nIGFuZCByZW1vdmluZyBlbGVtZW50cyB0YWtlcyBPKGxvZyBuKSB0aW1lLiBBIGtleSBjYW5cbiAqIGhhdmUgaXRzIHByaW9yaXR5IGRlY3JlYXNlZCBpbiBPKGxvZyBuKSB0aW1lLlxuICovXG5mdW5jdGlvbiBQcmlvcml0eVF1ZXVlKCkge1xuICB0aGlzLl9hcnIgPSBbXTtcbiAgdGhpcy5fa2V5SW5kaWNlcyA9IHt9O1xufVxuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiB0aGUgcXVldWUuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9hcnIubGVuZ3RoO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBrZXlzIHRoYXQgYXJlIGluIHRoZSBxdWV1ZS4gVGFrZXMgYE8obilgIHRpbWUuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2Fyci5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5rZXk7IH0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGB0cnVlYCBpZiAqKmtleSoqIGlzIGluIHRoZSBxdWV1ZSBhbmQgYGZhbHNlYCBpZiBub3QuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGtleSkge1xuICByZXR1cm4ga2V5IGluIHRoaXMuX2tleUluZGljZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIHByaW9yaXR5IGZvciAqKmtleSoqLiBJZiAqKmtleSoqIGlzIG5vdCBwcmVzZW50IGluIHRoZSBxdWV1ZVxuICogdGhlbiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYHVuZGVmaW5lZGAuIFRha2VzIGBPKDEpYCB0aW1lLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBrZXlcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucHJpb3JpdHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5fa2V5SW5kaWNlc1trZXldO1xuICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5O1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGtleSBmb3IgdGhlIG1pbmltdW0gZWxlbWVudCBpbiB0aGlzIHF1ZXVlLiBJZiB0aGUgcXVldWUgaXNcbiAqIGVtcHR5IHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLiBUYWtlcyBgTygxKWAgdGltZS5cbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUubWluID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNpemUoKSA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlF1ZXVlIHVuZGVyZmxvd1wiKTtcbiAgfVxuICByZXR1cm4gdGhpcy5fYXJyWzBdLmtleTtcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhIG5ldyBrZXkgaW50byB0aGUgcHJpb3JpdHkgcXVldWUuIElmIHRoZSBrZXkgYWxyZWFkeSBleGlzdHMgaW5cbiAqIHRoZSBxdWV1ZSB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYGZhbHNlYDsgb3RoZXJ3aXNlIGl0IHdpbGwgcmV0dXJuIGB0cnVlYC5cbiAqIFRha2VzIGBPKG4pYCB0aW1lLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBrZXkgdGhlIGtleSB0byBhZGRcbiAqIEBwYXJhbSB7TnVtYmVyfSBwcmlvcml0eSB0aGUgaW5pdGlhbCBwcmlvcml0eSBmb3IgdGhlIGtleVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihrZXksIHByaW9yaXR5KSB7XG4gIHZhciBrZXlJbmRpY2VzID0gdGhpcy5fa2V5SW5kaWNlcztcbiAgaWYgKCEoa2V5IGluIGtleUluZGljZXMpKSB7XG4gICAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgICB2YXIgaW5kZXggPSBhcnIubGVuZ3RoO1xuICAgIGtleUluZGljZXNba2V5XSA9IGluZGV4O1xuICAgIGFyci5wdXNoKHtrZXk6IGtleSwgcHJpb3JpdHk6IHByaW9yaXR5fSk7XG4gICAgdGhpcy5fZGVjcmVhc2UoaW5kZXgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbmQgcmV0dXJucyB0aGUgc21hbGxlc3Qga2V5IGluIHRoZSBxdWV1ZS4gVGFrZXMgYE8obG9nIG4pYCB0aW1lLlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5yZW1vdmVNaW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fc3dhcCgwLCB0aGlzLl9hcnIubGVuZ3RoIC0gMSk7XG4gIHZhciBtaW4gPSB0aGlzLl9hcnIucG9wKCk7XG4gIGRlbGV0ZSB0aGlzLl9rZXlJbmRpY2VzW21pbi5rZXldO1xuICB0aGlzLl9oZWFwaWZ5KDApO1xuICByZXR1cm4gbWluLmtleTtcbn07XG5cbi8qKlxuICogRGVjcmVhc2VzIHRoZSBwcmlvcml0eSBmb3IgKiprZXkqKiB0byAqKnByaW9yaXR5KiouIElmIHRoZSBuZXcgcHJpb3JpdHkgaXNcbiAqIGdyZWF0ZXIgdGhhbiB0aGUgcHJldmlvdXMgcHJpb3JpdHksIHRoaXMgZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0ga2V5IHRoZSBrZXkgZm9yIHdoaWNoIHRvIHJhaXNlIHByaW9yaXR5XG4gKiBAcGFyYW0ge051bWJlcn0gcHJpb3JpdHkgdGhlIG5ldyBwcmlvcml0eSBmb3IgdGhlIGtleVxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5kZWNyZWFzZSA9IGZ1bmN0aW9uKGtleSwgcHJpb3JpdHkpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5fa2V5SW5kaWNlc1trZXldO1xuICBpZiAocHJpb3JpdHkgPiB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTmV3IHByaW9yaXR5IGlzIGdyZWF0ZXIgdGhhbiBjdXJyZW50IHByaW9yaXR5LiBcIiArXG4gICAgICAgIFwiS2V5OiBcIiArIGtleSArIFwiIE9sZDogXCIgKyB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5ICsgXCIgTmV3OiBcIiArIHByaW9yaXR5KTtcbiAgfVxuICB0aGlzLl9hcnJbaW5kZXhdLnByaW9yaXR5ID0gcHJpb3JpdHk7XG4gIHRoaXMuX2RlY3JlYXNlKGluZGV4KTtcbn07XG5cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9oZWFwaWZ5ID0gZnVuY3Rpb24oaSkge1xuICB2YXIgYXJyID0gdGhpcy5fYXJyO1xuICB2YXIgbCA9IDIgKiBpLFxuICAgICAgciA9IGwgKyAxLFxuICAgICAgbGFyZ2VzdCA9IGk7XG4gIGlmIChsIDwgYXJyLmxlbmd0aCkge1xuICAgIGxhcmdlc3QgPSBhcnJbbF0ucHJpb3JpdHkgPCBhcnJbbGFyZ2VzdF0ucHJpb3JpdHkgPyBsIDogbGFyZ2VzdDtcbiAgICBpZiAociA8IGFyci5sZW5ndGgpIHtcbiAgICAgIGxhcmdlc3QgPSBhcnJbcl0ucHJpb3JpdHkgPCBhcnJbbGFyZ2VzdF0ucHJpb3JpdHkgPyByIDogbGFyZ2VzdDtcbiAgICB9XG4gICAgaWYgKGxhcmdlc3QgIT09IGkpIHtcbiAgICAgIHRoaXMuX3N3YXAoaSwgbGFyZ2VzdCk7XG4gICAgICB0aGlzLl9oZWFwaWZ5KGxhcmdlc3QpO1xuICAgIH1cbiAgfVxufTtcblxuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuX2RlY3JlYXNlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgdmFyIHByaW9yaXR5ID0gYXJyW2luZGV4XS5wcmlvcml0eTtcbiAgdmFyIHBhcmVudDtcbiAgd2hpbGUgKGluZGV4ICE9PSAwKSB7XG4gICAgcGFyZW50ID0gaW5kZXggPj4gMTtcbiAgICBpZiAoYXJyW3BhcmVudF0ucHJpb3JpdHkgPCBwcmlvcml0eSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHRoaXMuX3N3YXAoaW5kZXgsIHBhcmVudCk7XG4gICAgaW5kZXggPSBwYXJlbnQ7XG4gIH1cbn07XG5cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9zd2FwID0gZnVuY3Rpb24oaSwgaikge1xuICB2YXIgYXJyID0gdGhpcy5fYXJyO1xuICB2YXIga2V5SW5kaWNlcyA9IHRoaXMuX2tleUluZGljZXM7XG4gIHZhciBvcmlnQXJySSA9IGFycltpXTtcbiAgdmFyIG9yaWdBcnJKID0gYXJyW2pdO1xuICBhcnJbaV0gPSBvcmlnQXJySjtcbiAgYXJyW2pdID0gb3JpZ0Fyckk7XG4gIGtleUluZGljZXNbb3JpZ0Fyckoua2V5XSA9IGk7XG4gIGtleUluZGljZXNbb3JpZ0Fyckkua2V5XSA9IGo7XG59O1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTZXQ7XG5cbi8qKlxuICogQ29uc3RydWN0cyBhIG5ldyBTZXQgd2l0aCBhbiBvcHRpb25hbCBzZXQgb2YgYGluaXRpYWxLZXlzYC5cbiAqXG4gKiBJdCBpcyBpbXBvcnRhbnQgdG8gbm90ZSB0aGF0IGtleXMgYXJlIGNvZXJjZWQgdG8gU3RyaW5nIGZvciBtb3N0IHB1cnBvc2VzXG4gKiB3aXRoIHRoaXMgb2JqZWN0LCBzaW1pbGFyIHRvIHRoZSBiZWhhdmlvciBvZiBKYXZhU2NyaXB0J3MgT2JqZWN0LiBGb3JcbiAqIGV4YW1wbGUsIHRoZSBmb2xsb3dpbmcgd2lsbCBhZGQgb25seSBvbmUga2V5OlxuICpcbiAqICAgICB2YXIgcyA9IG5ldyBTZXQoKTtcbiAqICAgICBzLmFkZCgxKTtcbiAqICAgICBzLmFkZChcIjFcIik7XG4gKlxuICogSG93ZXZlciwgdGhlIHR5cGUgb2YgdGhlIGtleSBpcyBwcmVzZXJ2ZWQgaW50ZXJuYWxseSBzbyB0aGF0IGBrZXlzYCByZXR1cm5zXG4gKiB0aGUgb3JpZ2luYWwga2V5IHNldCB1bmNvZXJjZWQuIEZvciB0aGUgYWJvdmUgZXhhbXBsZSwgYGtleXNgIHdvdWxkIHJldHVyblxuICogYFsxXWAuXG4gKi9cbmZ1bmN0aW9uIFNldChpbml0aWFsS2V5cykge1xuICB0aGlzLl9zaXplID0gMDtcbiAgdGhpcy5fa2V5cyA9IHt9O1xuXG4gIGlmIChpbml0aWFsS2V5cykge1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IGluaXRpYWxLZXlzLmxlbmd0aDsgaSA8IGlsOyArK2kpIHtcbiAgICAgIHRoaXMuYWRkKGluaXRpYWxLZXlzW2ldKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IFNldCB0aGF0IHJlcHJlc2VudHMgdGhlIHNldCBpbnRlcnNlY3Rpb24gb2YgdGhlIGFycmF5IG9mIGdpdmVuXG4gKiBzZXRzLlxuICovXG5TZXQuaW50ZXJzZWN0ID0gZnVuY3Rpb24oc2V0cykge1xuICBpZiAoc2V0cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IFNldCgpO1xuICB9XG5cbiAgdmFyIHJlc3VsdCA9IG5ldyBTZXQoIXV0aWwuaXNBcnJheShzZXRzWzBdKSA/IHNldHNbMF0ua2V5cygpIDogc2V0c1swXSk7XG4gIGZvciAodmFyIGkgPSAxLCBpbCA9IHNldHMubGVuZ3RoOyBpIDwgaWw7ICsraSkge1xuICAgIHZhciByZXN1bHRLZXlzID0gcmVzdWx0LmtleXMoKSxcbiAgICAgICAgb3RoZXIgPSAhdXRpbC5pc0FycmF5KHNldHNbaV0pID8gc2V0c1tpXSA6IG5ldyBTZXQoc2V0c1tpXSk7XG4gICAgZm9yICh2YXIgaiA9IDAsIGpsID0gcmVzdWx0S2V5cy5sZW5ndGg7IGogPCBqbDsgKytqKSB7XG4gICAgICB2YXIga2V5ID0gcmVzdWx0S2V5c1tqXTtcbiAgICAgIGlmICghb3RoZXIuaGFzKGtleSkpIHtcbiAgICAgICAgcmVzdWx0LnJlbW92ZShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgU2V0IHRoYXQgcmVwcmVzZW50cyB0aGUgc2V0IHVuaW9uIG9mIHRoZSBhcnJheSBvZiBnaXZlbiBzZXRzLlxuICovXG5TZXQudW5pb24gPSBmdW5jdGlvbihzZXRzKSB7XG4gIHZhciB0b3RhbEVsZW1zID0gdXRpbC5yZWR1Y2Uoc2V0cywgZnVuY3Rpb24obGhzLCByaHMpIHtcbiAgICByZXR1cm4gbGhzICsgKHJocy5zaXplID8gcmhzLnNpemUoKSA6IHJocy5sZW5ndGgpO1xuICB9LCAwKTtcbiAgdmFyIGFyciA9IG5ldyBBcnJheSh0b3RhbEVsZW1zKTtcblxuICB2YXIgayA9IDA7XG4gIGZvciAodmFyIGkgPSAwLCBpbCA9IHNldHMubGVuZ3RoOyBpIDwgaWw7ICsraSkge1xuICAgIHZhciBjdXIgPSBzZXRzW2ldLFxuICAgICAgICBrZXlzID0gIXV0aWwuaXNBcnJheShjdXIpID8gY3VyLmtleXMoKSA6IGN1cjtcbiAgICBmb3IgKHZhciBqID0gMCwgamwgPSBrZXlzLmxlbmd0aDsgaiA8IGpsOyArK2opIHtcbiAgICAgIGFycltrKytdID0ga2V5c1tqXTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFNldChhcnIpO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBzaXplIG9mIHRoaXMgc2V0IGluIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX3NpemU7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGtleXMgaW4gdGhpcyBzZXQuIFRha2VzIGBPKG4pYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHZhbHVlcyh0aGlzLl9rZXlzKTtcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgYSBrZXkgaXMgcHJlc2VudCBpbiB0aGlzIFNldC4gUmV0dXJucyBgdHJ1ZWAgaWYgaXQgaXMgYW5kIGBmYWxzZWBcbiAqIGlmIG5vdC4gVGFrZXMgYE8oMSlgIHRpbWUuXG4gKi9cblNldC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24oa2V5KSB7XG4gIHJldHVybiBrZXkgaW4gdGhpcy5fa2V5cztcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBrZXkgdG8gdGhpcyBTZXQgaWYgaXQgaXMgbm90IGFscmVhZHkgcHJlc2VudC4gUmV0dXJucyBgdHJ1ZWAgaWZcbiAqIHRoZSBrZXkgd2FzIGFkZGVkIGFuZCBgZmFsc2VgIGlmIGl0IHdhcyBhbHJlYWR5IHByZXNlbnQuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uKGtleSkge1xuICBpZiAoIShrZXkgaW4gdGhpcy5fa2V5cykpIHtcbiAgICB0aGlzLl9rZXlzW2tleV0gPSBrZXk7XG4gICAgKyt0aGlzLl9zaXplO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGtleSBmcm9tIHRoaXMgU2V0LiBJZiB0aGUga2V5IHdhcyByZW1vdmVkIHRoaXMgZnVuY3Rpb24gcmV0dXJuc1xuICogYHRydWVgLiBJZiBub3QsIGl0IHJldHVybnMgYGZhbHNlYC4gVGFrZXMgYE8oMSlgIHRpbWUuXG4gKi9cblNldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oa2V5KSB7XG4gIGlmIChrZXkgaW4gdGhpcy5fa2V5cykge1xuICAgIGRlbGV0ZSB0aGlzLl9rZXlzW2tleV07XG4gICAgLS10aGlzLl9zaXplO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCB2YWx1ZXMgZm9yIHByb3BlcnRpZXMgb2YgKipvKiouXG4gKi9cbmZ1bmN0aW9uIHZhbHVlcyhvKSB7XG4gIHZhciBrcyA9IE9iamVjdC5rZXlzKG8pLFxuICAgICAgbGVuID0ga3MubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbiksXG4gICAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSBvW2tzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuIiwiLypcbiAqIFRoaXMgcG9seWZpbGwgY29tZXMgZnJvbVxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvaXNBcnJheVxuICovXG5pZighQXJyYXkuaXNBcnJheSkge1xuICBleHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbiAodkFyZykge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodkFyZykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLmlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xufVxuXG4vKlxuICogU2xpZ2h0bHkgYWRhcHRlZCBwb2x5ZmlsbCBmcm9tXG4gKiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9BcnJheS9SZWR1Y2VcbiAqL1xuaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBBcnJheS5wcm90b3R5cGUucmVkdWNlKSB7XG4gIGV4cG9ydHMucmVkdWNlID0gZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGlmIChudWxsID09PSBhcnJheSB8fCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIGFycmF5KSB7XG4gICAgICAvLyBBdCB0aGUgbW9tZW50IGFsbCBtb2Rlcm4gYnJvd3NlcnMsIHRoYXQgc3VwcG9ydCBzdHJpY3QgbW9kZSwgaGF2ZVxuICAgICAgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uIG9mIEFycmF5LnByb3RvdHlwZS5yZWR1Y2UuIEZvciBpbnN0YW5jZSwgSUU4XG4gICAgICAvLyBkb2VzIG5vdCBzdXBwb3J0IHN0cmljdCBtb2RlLCBzbyB0aGlzIGNoZWNrIGlzIGFjdHVhbGx5IHVzZWxlc3MuXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICdBcnJheS5wcm90b3R5cGUucmVkdWNlIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAoJ2Z1bmN0aW9uJyAhPT0gdHlwZW9mIGNhbGxiYWNrKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKGNhbGxiYWNrICsgJyBpcyBub3QgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgaW5kZXgsIHZhbHVlLFxuICAgICAgICBsZW5ndGggPSBhcnJheS5sZW5ndGggPj4+IDAsXG4gICAgICAgIGlzVmFsdWVTZXQgPSBmYWxzZTtcbiAgICBpZiAoMSA8IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHZhbHVlID0gb3B0X2luaXRpYWxWYWx1ZTtcbiAgICAgIGlzVmFsdWVTZXQgPSB0cnVlO1xuICAgIH1cbiAgICBmb3IgKGluZGV4ID0gMDsgbGVuZ3RoID4gaW5kZXg7ICsraW5kZXgpIHtcbiAgICAgIGlmIChhcnJheS5oYXNPd25Qcm9wZXJ0eShpbmRleCkpIHtcbiAgICAgICAgaWYgKGlzVmFsdWVTZXQpIHtcbiAgICAgICAgICB2YWx1ZSA9IGNhbGxiYWNrKHZhbHVlLCBhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBhcnJheVtpbmRleF07XG4gICAgICAgICAgaXNWYWx1ZVNldCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpc1ZhbHVlU2V0KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJyk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbn0gZWxzZSB7XG4gIGV4cG9ydHMucmVkdWNlID0gZnVuY3Rpb24oYXJyYXksIGNhbGxiYWNrLCBvcHRfaW5pdGlhbFZhbHVlKSB7XG4gICAgcmV0dXJuIGFycmF5LnJlZHVjZShjYWxsYmFjaywgb3B0X2luaXRpYWxWYWx1ZSk7XG4gIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcxLjEuMyc7XG4iLCJleHBvcnRzLkdyYXBoID0gcmVxdWlyZShcIi4vbGliL0dyYXBoXCIpO1xuZXhwb3J0cy5EaWdyYXBoID0gcmVxdWlyZShcIi4vbGliL0RpZ3JhcGhcIik7XG5leHBvcnRzLkNHcmFwaCA9IHJlcXVpcmUoXCIuL2xpYi9DR3JhcGhcIik7XG5leHBvcnRzLkNEaWdyYXBoID0gcmVxdWlyZShcIi4vbGliL0NEaWdyYXBoXCIpO1xucmVxdWlyZShcIi4vbGliL2dyYXBoLWNvbnZlcnRlcnNcIik7XG5cbmV4cG9ydHMuYWxnID0ge1xuICBpc0FjeWNsaWM6IHJlcXVpcmUoXCIuL2xpYi9hbGcvaXNBY3ljbGljXCIpLFxuICBjb21wb25lbnRzOiByZXF1aXJlKFwiLi9saWIvYWxnL2NvbXBvbmVudHNcIiksXG4gIGRpamtzdHJhOiByZXF1aXJlKFwiLi9saWIvYWxnL2RpamtzdHJhXCIpLFxuICBkaWprc3RyYUFsbDogcmVxdWlyZShcIi4vbGliL2FsZy9kaWprc3RyYUFsbFwiKSxcbiAgZmluZEN5Y2xlczogcmVxdWlyZShcIi4vbGliL2FsZy9maW5kQ3ljbGVzXCIpLFxuICBmbG95ZFdhcnNoYWxsOiByZXF1aXJlKFwiLi9saWIvYWxnL2Zsb3lkV2Fyc2hhbGxcIiksXG4gIHBvc3RvcmRlcjogcmVxdWlyZShcIi4vbGliL2FsZy9wb3N0b3JkZXJcIiksXG4gIHByZW9yZGVyOiByZXF1aXJlKFwiLi9saWIvYWxnL3ByZW9yZGVyXCIpLFxuICBwcmltOiByZXF1aXJlKFwiLi9saWIvYWxnL3ByaW1cIiksXG4gIHRhcmphbjogcmVxdWlyZShcIi4vbGliL2FsZy90YXJqYW5cIiksXG4gIHRvcHNvcnQ6IHJlcXVpcmUoXCIuL2xpYi9hbGcvdG9wc29ydFwiKVxufTtcblxuZXhwb3J0cy5jb252ZXJ0ZXIgPSB7XG4gIGpzb246IHJlcXVpcmUoXCIuL2xpYi9jb252ZXJ0ZXIvanNvbi5qc1wiKVxufTtcblxudmFyIGZpbHRlciA9IHJlcXVpcmUoXCIuL2xpYi9maWx0ZXJcIik7XG5leHBvcnRzLmZpbHRlciA9IHtcbiAgYWxsOiBmaWx0ZXIuYWxsLFxuICBub2Rlc0Zyb21MaXN0OiBmaWx0ZXIubm9kZXNGcm9tTGlzdFxufTtcblxuZXhwb3J0cy52ZXJzaW9uID0gcmVxdWlyZShcIi4vbGliL3ZlcnNpb25cIik7XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlR3JhcGg7XG5cbmZ1bmN0aW9uIEJhc2VHcmFwaCgpIHtcbiAgLy8gVGhlIHZhbHVlIGFzc2lnbmVkIHRvIHRoZSBncmFwaCBpdHNlbGYuXG4gIHRoaXMuX3ZhbHVlID0gdW5kZWZpbmVkO1xuXG4gIC8vIE1hcCBvZiBub2RlIGlkIC0+IHsgaWQsIHZhbHVlIH1cbiAgdGhpcy5fbm9kZXMgPSB7fTtcblxuICAvLyBNYXAgb2YgZWRnZSBpZCAtPiB7IGlkLCB1LCB2LCB2YWx1ZSB9XG4gIHRoaXMuX2VkZ2VzID0ge307XG5cbiAgLy8gVXNlZCB0byBnZW5lcmF0ZSBhIHVuaXF1ZSBpZCBpbiB0aGUgZ3JhcGhcbiAgdGhpcy5fbmV4dElkID0gMDtcbn1cblxuLy8gTnVtYmVyIG9mIG5vZGVzXG5CYXNlR3JhcGgucHJvdG90eXBlLm9yZGVyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9ub2RlcykubGVuZ3RoO1xufTtcblxuLy8gTnVtYmVyIG9mIGVkZ2VzXG5CYXNlR3JhcGgucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuX2VkZ2VzKS5sZW5ndGg7XG59O1xuXG4vLyBBY2Nlc3NvciBmb3IgZ3JhcGggbGV2ZWwgdmFsdWVcbkJhc2VHcmFwaC5wcm90b3R5cGUuZ3JhcGggPSBmdW5jdGlvbih2YWx1ZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgfVxuICB0aGlzLl92YWx1ZSA9IHZhbHVlO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5oYXNOb2RlID0gZnVuY3Rpb24odSkge1xuICByZXR1cm4gdSBpbiB0aGlzLl9ub2Rlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUubm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIHZhciBub2RlID0gdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgfVxuICBub2RlLnZhbHVlID0gdmFsdWU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLm5vZGVzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBub2RlcyA9IFtdO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKGlkKSB7IG5vZGVzLnB1c2goaWQpOyB9KTtcbiAgcmV0dXJuIG5vZGVzO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5lYWNoTm9kZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgZm9yICh2YXIgayBpbiB0aGlzLl9ub2Rlcykge1xuICAgIHZhciBub2RlID0gdGhpcy5fbm9kZXNba107XG4gICAgZnVuYyhub2RlLmlkLCBub2RlLnZhbHVlKTtcbiAgfVxufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5oYXNFZGdlID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4gZSBpbiB0aGlzLl9lZGdlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuZWRnZSA9IGZ1bmN0aW9uKGUsIHZhbHVlKSB7XG4gIHZhciBlZGdlID0gdGhpcy5fc3RyaWN0R2V0RWRnZShlKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gZWRnZS52YWx1ZTtcbiAgfVxuICBlZGdlLnZhbHVlID0gdmFsdWU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmVkZ2VzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBlcyA9IFtdO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGlkKSB7IGVzLnB1c2goaWQpOyB9KTtcbiAgcmV0dXJuIGVzO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5lYWNoRWRnZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgZm9yICh2YXIgayBpbiB0aGlzLl9lZGdlcykge1xuICAgIHZhciBlZGdlID0gdGhpcy5fZWRnZXNba107XG4gICAgZnVuYyhlZGdlLmlkLCBlZGdlLnUsIGVkZ2UudiwgZWRnZS52YWx1ZSk7XG4gIH1cbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuaW5jaWRlbnROb2RlcyA9IGZ1bmN0aW9uKGUpIHtcbiAgdmFyIGVkZ2UgPSB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpO1xuICByZXR1cm4gW2VkZ2UudSwgZWRnZS52XTtcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIGlmICh1ID09PSB1bmRlZmluZWQgfHwgdSA9PT0gbnVsbCkge1xuICAgIGRvIHtcbiAgICAgIHUgPSBcIl9cIiArICgrK3RoaXMuX25leHRJZCk7XG4gICAgfSB3aGlsZSAodGhpcy5oYXNOb2RlKHUpKTtcbiAgfSBlbHNlIGlmICh0aGlzLmhhc05vZGUodSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJHcmFwaCBhbHJlYWR5IGhhcyBub2RlICdcIiArIHUgKyBcIidcIik7XG4gIH1cbiAgdGhpcy5fbm9kZXNbdV0gPSB7IGlkOiB1LCB2YWx1ZTogdmFsdWUgfTtcbiAgcmV0dXJuIHU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmRlbE5vZGUgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHRoaXMuaW5jaWRlbnRFZGdlcyh1KS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHsgdGhpcy5kZWxFZGdlKGUpOyB9LCB0aGlzKTtcbiAgZGVsZXRlIHRoaXMuX25vZGVzW3VdO1xufTtcblxuLy8gaW5NYXAgYW5kIG91dE1hcCBhcmUgb3Bwb3NpdGUgc2lkZXMgb2YgYW4gaW5jaWRlbmNlIG1hcC4gRm9yIGV4YW1wbGUsIGZvclxuLy8gR3JhcGggdGhlc2Ugd291bGQgYm90aCBjb21lIGZyb20gdGhlIF9pbmNpZGVudEVkZ2VzIG1hcCwgd2hpbGUgZm9yIERpZ3JhcGhcbi8vIHRoZXkgd291bGQgY29tZSBmcm9tIF9pbkVkZ2VzIGFuZCBfb3V0RWRnZXMuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlID0gZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUsIGluTWFwLCBvdXRNYXApIHtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh2KTtcblxuICBpZiAoZSA9PT0gdW5kZWZpbmVkIHx8IGUgPT09IG51bGwpIHtcbiAgICBkbyB7XG4gICAgICBlID0gXCJfXCIgKyAoKyt0aGlzLl9uZXh0SWQpO1xuICAgIH0gd2hpbGUgKHRoaXMuaGFzRWRnZShlKSk7XG4gIH1cbiAgZWxzZSBpZiAodGhpcy5oYXNFZGdlKGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiR3JhcGggYWxyZWFkeSBoYXMgZWRnZSAnXCIgKyBlICsgXCInXCIpO1xuICB9XG5cbiAgdGhpcy5fZWRnZXNbZV0gPSB7IGlkOiBlLCB1OiB1LCB2OiB2LCB2YWx1ZTogdmFsdWUgfTtcbiAgYWRkRWRnZVRvTWFwKGluTWFwW3ZdLCB1LCBlKTtcbiAgYWRkRWRnZVRvTWFwKG91dE1hcFt1XSwgdiwgZSk7XG5cbiAgcmV0dXJuIGU7XG59O1xuXG4vLyBTZWUgbm90ZSBmb3IgX2FkZEVkZ2UgcmVnYXJkaW5nIGluTWFwIGFuZCBvdXRNYXAuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9kZWxFZGdlID0gZnVuY3Rpb24oZSwgaW5NYXAsIG91dE1hcCkge1xuICB2YXIgZWRnZSA9IHRoaXMuX3N0cmljdEdldEVkZ2UoZSk7XG4gIGRlbEVkZ2VGcm9tTWFwKGluTWFwW2VkZ2Uudl0sIGVkZ2UudSwgZSk7XG4gIGRlbEVkZ2VGcm9tTWFwKG91dE1hcFtlZGdlLnVdLCBlZGdlLnYsIGUpO1xuICBkZWxldGUgdGhpcy5fZWRnZXNbZV07XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGNvcHkgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcigpO1xuICBjb3B5LmdyYXBoKHRoaXMuZ3JhcGgoKSk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgY29weS5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHsgY29weS5hZGRFZGdlKGUsIHUsIHYsIHZhbHVlKTsgfSk7XG4gIGNvcHkuX25leHRJZCA9IHRoaXMuX25leHRJZDtcbiAgcmV0dXJuIGNvcHk7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmZpbHRlck5vZGVzID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gIHZhciBjb3B5ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoKTtcbiAgY29weS5ncmFwaCh0aGlzLmdyYXBoKCkpO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgaWYgKGZpbHRlcih1KSkge1xuICAgICAgY29weS5hZGROb2RlKHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgaWYgKGNvcHkuaGFzTm9kZSh1KSAmJiBjb3B5Lmhhc05vZGUodikpIHtcbiAgICAgIGNvcHkuYWRkRWRnZShlLCB1LCB2LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNvcHk7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9zdHJpY3RHZXROb2RlID0gZnVuY3Rpb24odSkge1xuICB2YXIgbm9kZSA9IHRoaXMuX25vZGVzW3VdO1xuICBpZiAobm9kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTm9kZSAnXCIgKyB1ICsgXCInIGlzIG5vdCBpbiBncmFwaFwiKTtcbiAgfVxuICByZXR1cm4gbm9kZTtcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuX3N0cmljdEdldEVkZ2UgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBlZGdlID0gdGhpcy5fZWRnZXNbZV07XG4gIGlmIChlZGdlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFZGdlICdcIiArIGUgKyBcIicgaXMgbm90IGluIGdyYXBoXCIpO1xuICB9XG4gIHJldHVybiBlZGdlO1xufTtcblxuZnVuY3Rpb24gYWRkRWRnZVRvTWFwKG1hcCwgdiwgZSkge1xuICAobWFwW3ZdIHx8IChtYXBbdl0gPSBuZXcgU2V0KCkpKS5hZGQoZSk7XG59XG5cbmZ1bmN0aW9uIGRlbEVkZ2VGcm9tTWFwKG1hcCwgdiwgZSkge1xuICB2YXIgdkVudHJ5ID0gbWFwW3ZdO1xuICB2RW50cnkucmVtb3ZlKGUpO1xuICBpZiAodkVudHJ5LnNpemUoKSA9PT0gMCkge1xuICAgIGRlbGV0ZSBtYXBbdl07XG4gIH1cbn1cblxuIiwidmFyIERpZ3JhcGggPSByZXF1aXJlKFwiLi9EaWdyYXBoXCIpLFxuICAgIGNvbXBvdW5kaWZ5ID0gcmVxdWlyZShcIi4vY29tcG91bmRpZnlcIik7XG5cbnZhciBDRGlncmFwaCA9IGNvbXBvdW5kaWZ5KERpZ3JhcGgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENEaWdyYXBoO1xuXG5DRGlncmFwaC5mcm9tRGlncmFwaCA9IGZ1bmN0aW9uKHNyYykge1xuICB2YXIgZyA9IG5ldyBDRGlncmFwaCgpLFxuICAgICAgZ3JhcGhWYWx1ZSA9IHNyYy5ncmFwaCgpO1xuXG4gIGlmIChncmFwaFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBnLmdyYXBoKGdyYXBoVmFsdWUpO1xuICB9XG5cbiAgc3JjLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkTm9kZSh1KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGROb2RlKHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICBzcmMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBnO1xufTtcblxuQ0RpZ3JhcGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkNEaWdyYXBoIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG59O1xuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4vR3JhcGhcIiksXG4gICAgY29tcG91bmRpZnkgPSByZXF1aXJlKFwiLi9jb21wb3VuZGlmeVwiKTtcblxudmFyIENHcmFwaCA9IGNvbXBvdW5kaWZ5KEdyYXBoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDR3JhcGg7XG5cbkNHcmFwaC5mcm9tR3JhcGggPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIGcgPSBuZXcgQ0dyYXBoKCksXG4gICAgICBncmFwaFZhbHVlID0gc3JjLmdyYXBoKCk7XG5cbiAgaWYgKGdyYXBoVmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIGcuZ3JhcGgoZ3JhcGhWYWx1ZSk7XG4gIH1cblxuICBzcmMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZy5hZGROb2RlKHUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZE5vZGUodSwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHNyYy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGc7XG59O1xuXG5DR3JhcGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkNHcmFwaCBcIiArIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xufTtcbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgb3JnYW5pemVkIHdpdGggaW4gdGhlIGZvbGxvd2luZyBvcmRlcjpcbiAqXG4gKiBFeHBvcnRzXG4gKiBHcmFwaCBjb25zdHJ1Y3RvcnNcbiAqIEdyYXBoIHF1ZXJpZXMgKGUuZy4gbm9kZXMoKSwgZWRnZXMoKVxuICogR3JhcGggbXV0YXRvcnNcbiAqIEhlbHBlciBmdW5jdGlvbnNcbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIiksXG4gICAgQmFzZUdyYXBoID0gcmVxdWlyZShcIi4vQmFzZUdyYXBoXCIpLFxuLyoganNoaW50IC1XMDc5ICovXG4gICAgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gRGlncmFwaDtcblxuLypcbiAqIENvbnN0cnVjdG9yIHRvIGNyZWF0ZSBhIG5ldyBkaXJlY3RlZCBtdWx0aS1ncmFwaC5cbiAqL1xuZnVuY3Rpb24gRGlncmFwaCgpIHtcbiAgQmFzZUdyYXBoLmNhbGwodGhpcyk7XG5cbiAgLyohIE1hcCBvZiBzb3VyY2VJZCAtPiB7dGFyZ2V0SWQgLT4gU2V0IG9mIGVkZ2UgaWRzfSAqL1xuICB0aGlzLl9pbkVkZ2VzID0ge307XG5cbiAgLyohIE1hcCBvZiB0YXJnZXRJZCAtPiB7c291cmNlSWQgLT4gU2V0IG9mIGVkZ2UgaWRzfSAqL1xuICB0aGlzLl9vdXRFZGdlcyA9IHt9O1xufVxuXG5EaWdyYXBoLnByb3RvdHlwZSA9IG5ldyBCYXNlR3JhcGgoKTtcbkRpZ3JhcGgucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRGlncmFwaDtcblxuLypcbiAqIEFsd2F5cyByZXR1cm5zIGB0cnVlYC5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuaXNEaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBzdWNjZXNzb3JzIG9mIHRoZSBub2RlIHdpdGggdGhlIGlkIGB1YC4gVGhhdCBpcywgYWxsIG5vZGVzXG4gKiB0aGF0IGhhdmUgdGhlIG5vZGUgYHVgIGFzIHRoZWlyIHNvdXJjZSBhcmUgcmV0dXJuZWQuXG4gKiBcbiAqIElmIG5vIG5vZGUgYHVgIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgYSBub2RlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnN1Y2Nlc3NvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9vdXRFZGdlc1t1XSlcbiAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gdGhpcy5fbm9kZXNbdl0uaWQ7IH0sIHRoaXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYWxsIHByZWRlY2Vzc29ycyBvZiB0aGUgbm9kZSB3aXRoIHRoZSBpZCBgdWAuIFRoYXQgaXMsIGFsbCBub2Rlc1xuICogdGhhdCBoYXZlIHRoZSBub2RlIGB1YCBhcyB0aGVpciB0YXJnZXQgYXJlIHJldHVybmVkLlxuICogXG4gKiBJZiBubyBub2RlIGB1YCBleGlzdHMgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5wcmVkZWNlc3NvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9pbkVkZ2VzW3VdKVxuICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiB0aGlzLl9ub2Rlc1t2XS5pZDsgfSwgdGhpcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgdGhhdCBhcmUgYWRqYWNlbnQgdG8gdGhlIG5vZGUgd2l0aCB0aGUgaWQgYHVgLiBJbiBvdGhlclxuICogd29yZHMsIHRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgc2V0IG9mIGFsbCBzdWNjZXNzb3JzIGFuZCBwcmVkZWNlc3NvcnMgb2ZcbiAqIG5vZGUgYHVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5uZWlnaGJvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHJldHVybiBTZXQudW5pb24oW3RoaXMuc3VjY2Vzc29ycyh1KSwgdGhpcy5wcmVkZWNlc3NvcnModSldKS5rZXlzKCk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSBubyBpbi1lZGdlcy5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuc291cmNlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiB0aGlzLl9maWx0ZXJOb2RlcyhmdW5jdGlvbih1KSB7XG4gICAgLy8gVGhpcyBjb3VsZCBoYXZlIGJldHRlciBzcGFjZSBjaGFyYWN0ZXJpc3RpY3MgaWYgd2UgaGFkIGFuIGluRGVncmVlIGZ1bmN0aW9uLlxuICAgIHJldHVybiBzZWxmLmluRWRnZXModSkubGVuZ3RoID09PSAwO1xuICB9KTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggdGhhdCBoYXZlIG5vIG91dC1lZGdlcy5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuc2lua3MgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5fZmlsdGVyTm9kZXMoZnVuY3Rpb24odSkge1xuICAgIC8vIFRoaXMgY291bGQgaGF2ZSBiZXR0ZXIgc3BhY2UgY2hhcmFjdGVyaXN0aWNzIGlmIHdlIGhhdmUgYW4gb3V0RGVncmVlIGZ1bmN0aW9uLlxuICAgIHJldHVybiBzZWxmLm91dEVkZ2VzKHUpLmxlbmd0aCA9PT0gMDtcbiAgfSk7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgc291cmNlIG5vZGUgaW5jaWRlbnQgb24gdGhlIGVkZ2UgaWRlbnRpZmllZCBieSB0aGUgaWQgYGVgLiBJZiBub1xuICogc3VjaCBlZGdlIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5zb3VyY2UgPSBmdW5jdGlvbihlKSB7XG4gIHJldHVybiB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpLnU7XG59O1xuXG4vKlxuICogUmV0dXJucyB0aGUgdGFyZ2V0IG5vZGUgaW5jaWRlbnQgb24gdGhlIGVkZ2UgaWRlbnRpZmllZCBieSB0aGUgaWQgYGVgLiBJZiBub1xuICogc3VjaCBlZGdlIGV4aXN0cyBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS50YXJnZXQgPSBmdW5jdGlvbihlKSB7XG4gIHJldHVybiB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpLnY7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBpZHMgZm9yIGFsbCBlZGdlcyBpbiB0aGUgZ3JhcGggdGhhdCBoYXZlIHRoZSBub2RlXG4gKiBgdGFyZ2V0YCBhcyB0aGVpciB0YXJnZXQuIElmIHRoZSBub2RlIGB0YXJnZXRgIGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhpc1xuICogZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIE9wdGlvbmFsbHkgYSBgc291cmNlYCBub2RlIGNhbiBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHNcbiAqIHRvIGJlIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgYXJlIGluY2x1ZGVkLlxuICogSWYgdGhlIG5vZGUgYHNvdXJjZWAgaXMgc3BlY2lmaWVkIGJ1dCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoZW4gdGhpcyBmdW5jdGlvblxuICogcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YXJnZXQgdGhlIHRhcmdldCBub2RlIGlkXG4gKiBAcGFyYW0ge1N0cmluZ30gW3NvdXJjZV0gYW4gb3B0aW9uYWwgc291cmNlIG5vZGUgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuaW5FZGdlcyA9IGZ1bmN0aW9uKHRhcmdldCwgc291cmNlKSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodGFyZ2V0KTtcbiAgdmFyIHJlc3VsdHMgPSBTZXQudW5pb24odXRpbC52YWx1ZXModGhpcy5faW5FZGdlc1t0YXJnZXRdKSkua2V5cygpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHNvdXJjZSk7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uKGUpIHsgcmV0dXJuIHRoaXMuc291cmNlKGUpID09PSBzb3VyY2U7IH0sIHRoaXMpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSB0aGUgbm9kZVxuICogYHNvdXJjZWAgYXMgdGhlaXIgc291cmNlLiBJZiB0aGUgbm9kZSBgc291cmNlYCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoaXNcbiAqIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBPcHRpb25hbGx5IGEgYHRhcmdldGAgbm9kZSBtYXkgYWxzbyBiZSBzcGVjaWZpZWQuIFRoaXMgY2F1c2VzIHRoZSByZXN1bHRzXG4gKiB0byBiZSBmaWx0ZXJlZCBzdWNoIHRoYXQgb25seSBlZGdlcyBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIGFyZSBpbmNsdWRlZC5cbiAqIElmIHRoZSBub2RlIGB0YXJnZXRgIGlzIHNwZWNpZmllZCBidXQgaXMgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXMgZnVuY3Rpb25cbiAqIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIHRoZSBzb3VyY2Ugbm9kZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IFt0YXJnZXRdIGFuIG9wdGlvbmFsIHRhcmdldCBub2RlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLm91dEVkZ2VzID0gZnVuY3Rpb24oc291cmNlLCB0YXJnZXQpIHtcbiAgdGhpcy5fc3RyaWN0R2V0Tm9kZShzb3VyY2UpO1xuICB2YXIgcmVzdWx0cyA9IFNldC51bmlvbih1dGlsLnZhbHVlcyh0aGlzLl9vdXRFZGdlc1tzb3VyY2VdKSkua2V5cygpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHRhcmdldCk7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uKGUpIHsgcmV0dXJuIHRoaXMudGFyZ2V0KGUpID09PSB0YXJnZXQ7IH0sIHRoaXMpO1xuICB9XG4gIHJldHVybiByZXN1bHRzO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSB0aGUgYHVgIGFzXG4gKiB0aGVpciBzb3VyY2Ugb3IgdGhlaXIgdGFyZ2V0LiBJZiB0aGUgbm9kZSBgdWAgaXMgbm90IGluIHRoZSBncmFwaCB0aGlzXG4gKiBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogT3B0aW9uYWxseSBhIGB2YCBub2RlIG1heSBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHMgdG8gYmVcbiAqIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGJldHdlZW4gYHVgIGFuZCBgdmAgLSBpbiBlaXRoZXIgZGlyZWN0aW9uIC1cbiAqIGFyZSBpbmNsdWRlZC4gSUYgdGhlIG5vZGUgYHZgIGlzIHNwZWNpZmllZCBidXQgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXNcbiAqIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSB0aGUgbm9kZSBmb3Igd2hpY2ggdG8gZmluZCBpbmNpZGVudCBlZGdlc1xuICogQHBhcmFtIHtTdHJpbmd9IFt2XSBvcHRpb24gbm9kZSB0aGF0IG11c3QgYmUgYWRqYWNlbnQgdG8gYHVgXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmluY2lkZW50RWRnZXMgPSBmdW5jdGlvbih1LCB2KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHJldHVybiBTZXQudW5pb24oW3RoaXMub3V0RWRnZXModSwgdiksIHRoaXMub3V0RWRnZXModiwgdSldKS5rZXlzKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFNldC51bmlvbihbdGhpcy5pbkVkZ2VzKHUpLCB0aGlzLm91dEVkZ2VzKHUpXSkua2V5cygpO1xuICB9XG59O1xuXG4vKlxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIGdyYXBoLlxuICovXG5EaWdyYXBoLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJEaWdyYXBoIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG59O1xuXG4vKlxuICogQWRkcyBhIG5ldyBub2RlIHdpdGggdGhlIGlkIGB1YCB0byB0aGUgZ3JhcGggYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlXG4gKiBgdmFsdWVgLiBJZiBhIG5vZGUgd2l0aCB0aGUgaWQgaXMgYWxyZWFkeSBhIHBhcnQgb2YgdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb25cbiAqIHRocm93cyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgbm9kZVxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgdSA9IEJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgdGhpcy5faW5FZGdlc1t1XSA9IHt9O1xuICB0aGlzLl9vdXRFZGdlc1t1XSA9IHt9O1xuICByZXR1cm4gdTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGEgbm9kZSBmcm9tIHRoZSBncmFwaCB0aGF0IGhhcyB0aGUgaWQgYHVgLiBBbnkgZWRnZXMgaW5jaWRlbnQgb24gdGhlXG4gKiBub2RlIGFyZSBhbHNvIHJlbW92ZWQuIElmIHRoZSBncmFwaCBkb2VzIG5vdCBjb250YWluIGEgbm9kZSB3aXRoIHRoZSBpZCB0aGlzXG4gKiBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5kZWxOb2RlID0gZnVuY3Rpb24odSkge1xuICBCYXNlR3JhcGgucHJvdG90eXBlLmRlbE5vZGUuY2FsbCh0aGlzLCB1KTtcbiAgZGVsZXRlIHRoaXMuX2luRWRnZXNbdV07XG4gIGRlbGV0ZSB0aGlzLl9vdXRFZGdlc1t1XTtcbn07XG5cbi8qXG4gKiBBZGRzIGEgbmV3IGVkZ2UgdG8gdGhlIGdyYXBoIHdpdGggdGhlIGlkIGBlYCBmcm9tIGEgbm9kZSB3aXRoIHRoZSBpZCBgc291cmNlYFxuICogdG8gYSBub2RlIHdpdGggYW4gaWQgYHRhcmdldGAgYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlIGB2YWx1ZWAuIFRoaXMgZ3JhcGhcbiAqIGFsbG93cyBtb3JlIHRoYW4gb25lIGVkZ2UgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YCBhcyBsb25nIGFzIHRoZSBpZCBgZWBcbiAqIGlzIHVuaXF1ZSBpbiB0aGUgc2V0IG9mIGVkZ2VzLiBJZiBgZWAgaXMgYG51bGxgIHRoZSBncmFwaCB3aWxsIGFzc2lnbiBhXG4gKiB1bmlxdWUgaWRlbnRpZmllciB0byB0aGUgZWRnZS5cbiAqXG4gKiBJZiBgc291cmNlYCBvciBgdGFyZ2V0YCBhcmUgbm90IHByZXNlbnQgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IFtlXSBhbiBlZGdlIGlkXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIHRoZSBzb3VyY2Ugbm9kZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IHRhcmdldCB0aGUgdGFyZ2V0IG5vZGUgaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgZWRnZVxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5hZGRFZGdlID0gZnVuY3Rpb24oZSwgc291cmNlLCB0YXJnZXQsIHZhbHVlKSB7XG4gIHJldHVybiBCYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlLmNhbGwodGhpcywgZSwgc291cmNlLCB0YXJnZXQsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2luRWRnZXMsIHRoaXMuX291dEVkZ2VzKTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGFuIGVkZ2UgaW4gdGhlIGdyYXBoIHdpdGggdGhlIGlkIGBlYC4gSWYgbm8gZWRnZSBpbiB0aGUgZ3JhcGggaGFzXG4gKiB0aGUgaWQgYGVgIHRoaXMgZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZSBhbiBlZGdlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmRlbEVkZ2UgPSBmdW5jdGlvbihlKSB7XG4gIEJhc2VHcmFwaC5wcm90b3R5cGUuX2RlbEVkZ2UuY2FsbCh0aGlzLCBlLCB0aGlzLl9pbkVkZ2VzLCB0aGlzLl9vdXRFZGdlcyk7XG59O1xuXG4vLyBVbmxpa2UgQmFzZUdyYXBoLmZpbHRlck5vZGVzLCB0aGlzIGhlbHBlciBqdXN0IHJldHVybnMgbm9kZXMgdGhhdFxuLy8gc2F0aXNmeSBhIHByZWRpY2F0ZS5cbkRpZ3JhcGgucHJvdG90eXBlLl9maWx0ZXJOb2RlcyA9IGZ1bmN0aW9uKHByZWQpIHtcbiAgdmFyIGZpbHRlcmVkID0gW107XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIGlmIChwcmVkKHUpKSB7XG4gICAgICBmaWx0ZXJlZC5wdXNoKHUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmaWx0ZXJlZDtcbn07XG5cbiIsIi8qXG4gKiBUaGlzIGZpbGUgaXMgb3JnYW5pemVkIHdpdGggaW4gdGhlIGZvbGxvd2luZyBvcmRlcjpcbiAqXG4gKiBFeHBvcnRzXG4gKiBHcmFwaCBjb25zdHJ1Y3RvcnNcbiAqIEdyYXBoIHF1ZXJpZXMgKGUuZy4gbm9kZXMoKSwgZWRnZXMoKVxuICogR3JhcGggbXV0YXRvcnNcbiAqIEhlbHBlciBmdW5jdGlvbnNcbiAqL1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoXCIuL3V0aWxcIiksXG4gICAgQmFzZUdyYXBoID0gcmVxdWlyZShcIi4vQmFzZUdyYXBoXCIpLFxuLyoganNoaW50IC1XMDc5ICovXG4gICAgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gR3JhcGg7XG5cbi8qXG4gKiBDb25zdHJ1Y3RvciB0byBjcmVhdGUgYSBuZXcgdW5kaXJlY3RlZCBtdWx0aS1ncmFwaC5cbiAqL1xuZnVuY3Rpb24gR3JhcGgoKSB7XG4gIEJhc2VHcmFwaC5jYWxsKHRoaXMpO1xuXG4gIC8qISBNYXAgb2Ygbm9kZUlkIC0+IHsgb3RoZXJOb2RlSWQgLT4gU2V0IG9mIGVkZ2UgaWRzIH0gKi9cbiAgdGhpcy5faW5jaWRlbnRFZGdlcyA9IHt9O1xufVxuXG5HcmFwaC5wcm90b3R5cGUgPSBuZXcgQmFzZUdyYXBoKCk7XG5HcmFwaC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBHcmFwaDtcblxuLypcbiAqIEFsd2F5cyByZXR1cm5zIGBmYWxzZWAuXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5pc0RpcmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmYWxzZTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBub2RlcyB0aGF0IGFyZSBhZGphY2VudCB0byB0aGUgbm9kZSB3aXRoIHRoZSBpZCBgdWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgYSBub2RlIGlkXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5uZWlnaGJvcnMgPSBmdW5jdGlvbih1KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9pbmNpZGVudEVkZ2VzW3VdKVxuICAgICAgICAgICAgICAgLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiB0aGlzLl9ub2Rlc1t2XS5pZDsgfSwgdGhpcyk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBpZHMgZm9yIGFsbCBlZGdlcyBpbiB0aGUgZ3JhcGggdGhhdCBhcmUgaW5jaWRlbnQgb24gYHVgLlxuICogSWYgdGhlIG5vZGUgYHVgIGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogT3B0aW9uYWxseSBhIGB2YCBub2RlIG1heSBhbHNvIGJlIHNwZWNpZmllZC4gVGhpcyBjYXVzZXMgdGhlIHJlc3VsdHMgdG8gYmVcbiAqIGZpbHRlcmVkIHN1Y2ggdGhhdCBvbmx5IGVkZ2VzIGJldHdlZW4gYHVgIGFuZCBgdmAgYXJlIGluY2x1ZGVkLiBJZiB0aGUgbm9kZVxuICogYHZgIGlzIHNwZWNpZmllZCBidXQgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXMgZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IHRoZSBub2RlIGZvciB3aGljaCB0byBmaW5kIGluY2lkZW50IGVkZ2VzXG4gKiBAcGFyYW0ge1N0cmluZ30gW3ZdIG9wdGlvbiBub2RlIHRoYXQgbXVzdCBiZSBhZGphY2VudCB0byBgdWBcbiAqL1xuR3JhcGgucHJvdG90eXBlLmluY2lkZW50RWRnZXMgPSBmdW5jdGlvbih1LCB2KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIHRoaXMuX3N0cmljdEdldE5vZGUodik7XG4gICAgcmV0dXJuIHYgaW4gdGhpcy5faW5jaWRlbnRFZGdlc1t1XSA/IHRoaXMuX2luY2lkZW50RWRnZXNbdV1bdl0ua2V5cygpIDogW107XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFNldC51bmlvbih1dGlsLnZhbHVlcyh0aGlzLl9pbmNpZGVudEVkZ2VzW3VdKSkua2V5cygpO1xuICB9XG59O1xuXG4vKlxuICogUmV0dXJucyBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiB0aGlzIGdyYXBoLlxuICovXG5HcmFwaC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiR3JhcGggXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCAyKTtcbn07XG5cbi8qXG4gKiBBZGRzIGEgbmV3IG5vZGUgd2l0aCB0aGUgaWQgYHVgIHRvIHRoZSBncmFwaCBhbmQgYXNzaWducyBpdCB0aGUgdmFsdWVcbiAqIGB2YWx1ZWAuIElmIGEgbm9kZSB3aXRoIHRoZSBpZCBpcyBhbHJlYWR5IGEgcGFydCBvZiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvblxuICogdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICogQHBhcmFtIHtPYmplY3R9IFt2YWx1ZV0gYW4gb3B0aW9uYWwgdmFsdWUgdG8gYXR0YWNoIHRvIHRoZSBub2RlXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgdSA9IEJhc2VHcmFwaC5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgdGhpcy5faW5jaWRlbnRFZGdlc1t1XSA9IHt9O1xuICByZXR1cm4gdTtcbn07XG5cbi8qXG4gKiBSZW1vdmVzIGEgbm9kZSBmcm9tIHRoZSBncmFwaCB0aGF0IGhhcyB0aGUgaWQgYHVgLiBBbnkgZWRnZXMgaW5jaWRlbnQgb24gdGhlXG4gKiBub2RlIGFyZSBhbHNvIHJlbW92ZWQuIElmIHRoZSBncmFwaCBkb2VzIG5vdCBjb250YWluIGEgbm9kZSB3aXRoIHRoZSBpZCB0aGlzXG4gKiBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5HcmFwaC5wcm90b3R5cGUuZGVsTm9kZSA9IGZ1bmN0aW9uKHUpIHtcbiAgQmFzZUdyYXBoLnByb3RvdHlwZS5kZWxOb2RlLmNhbGwodGhpcywgdSk7XG4gIGRlbGV0ZSB0aGlzLl9pbmNpZGVudEVkZ2VzW3VdO1xufTtcblxuLypcbiAqIEFkZHMgYSBuZXcgZWRnZSB0byB0aGUgZ3JhcGggd2l0aCB0aGUgaWQgYGVgIGJldHdlZW4gYSBub2RlIHdpdGggdGhlIGlkIGB1YFxuICogYW5kIGEgbm9kZSB3aXRoIGFuIGlkIGB2YCBhbmQgYXNzaWducyBpdCB0aGUgdmFsdWUgYHZhbHVlYC4gVGhpcyBncmFwaFxuICogYWxsb3dzIG1vcmUgdGhhbiBvbmUgZWRnZSBiZXR3ZWVuIGB1YCBhbmQgYHZgIGFzIGxvbmcgYXMgdGhlIGlkIGBlYFxuICogaXMgdW5pcXVlIGluIHRoZSBzZXQgb2YgZWRnZXMuIElmIGBlYCBpcyBgbnVsbGAgdGhlIGdyYXBoIHdpbGwgYXNzaWduIGFcbiAqIHVuaXF1ZSBpZGVudGlmaWVyIHRvIHRoZSBlZGdlLlxuICpcbiAqIElmIGB1YCBvciBgdmAgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBncmFwaCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW5cbiAqIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZV0gYW4gZWRnZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IHUgdGhlIG5vZGUgaWQgb2Ygb25lIG9mIHRoZSBhZGphY2VudCBub2Rlc1xuICogQHBhcmFtIHtTdHJpbmd9IHYgdGhlIG5vZGUgaWQgb2YgdGhlIG90aGVyIGFkamFjZW50IG5vZGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgZWRnZVxuICovXG5HcmFwaC5wcm90b3R5cGUuYWRkRWRnZSA9IGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gIHJldHVybiBCYXNlR3JhcGgucHJvdG90eXBlLl9hZGRFZGdlLmNhbGwodGhpcywgZSwgdSwgdiwgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5faW5jaWRlbnRFZGdlcywgdGhpcy5faW5jaWRlbnRFZGdlcyk7XG59O1xuXG4vKlxuICogUmVtb3ZlcyBhbiBlZGdlIGluIHRoZSBncmFwaCB3aXRoIHRoZSBpZCBgZWAuIElmIG5vIGVkZ2UgaW4gdGhlIGdyYXBoIGhhc1xuICogdGhlIGlkIGBlYCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5HcmFwaC5wcm90b3R5cGUuZGVsRWRnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgQmFzZUdyYXBoLnByb3RvdHlwZS5fZGVsRWRnZS5jYWxsKHRoaXMsIGUsIHRoaXMuX2luY2lkZW50RWRnZXMsIHRoaXMuX2luY2lkZW50RWRnZXMpO1xufTtcblxuIiwiLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG9uZW50cztcblxuLyoqXG4gKiBGaW5kcyBhbGwgW2Nvbm5lY3RlZCBjb21wb25lbnRzXVtdIGluIGEgZ3JhcGggYW5kIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlc2VcbiAqIGNvbXBvbmVudHMuIEVhY2ggY29tcG9uZW50IGlzIGl0c2VsZiBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSBpZHMgb2Ygbm9kZXNcbiAqIGluIHRoZSBjb21wb25lbnQuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIHdpdGggdW5kaXJlY3RlZCBHcmFwaHMuXG4gKlxuICogW2Nvbm5lY3RlZCBjb21wb25lbnRzXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Db25uZWN0ZWRfY29tcG9uZW50XyhncmFwaF90aGVvcnkpXG4gKlxuICogQHBhcmFtIHtHcmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIGNvbXBvbmVudHMoZykge1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICB2YXIgdmlzaXRlZCA9IG5ldyBTZXQoKTtcblxuICBmdW5jdGlvbiBkZnModiwgY29tcG9uZW50KSB7XG4gICAgaWYgKCF2aXNpdGVkLmhhcyh2KSkge1xuICAgICAgdmlzaXRlZC5hZGQodik7XG4gICAgICBjb21wb25lbnQucHVzaCh2KTtcbiAgICAgIGcubmVpZ2hib3JzKHYpLmZvckVhY2goZnVuY3Rpb24odykge1xuICAgICAgICBkZnModywgY29tcG9uZW50KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGcubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gW107XG4gICAgZGZzKHYsIGNvbXBvbmVudCk7XG4gICAgaWYgKGNvbXBvbmVudC5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHRzLnB1c2goY29tcG9uZW50KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwidmFyIFByaW9yaXR5UXVldWUgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5Qcmlvcml0eVF1ZXVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpamtzdHJhO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgW0RpamtzdHJhJ3MgYWxnb3JpdGhtXVtdIHdoaWNoIGZpbmRzXG4gKiB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tICoqc291cmNlKiogdG8gYWxsIG90aGVyIG5vZGVzIGluICoqZyoqLiBUaGlzXG4gKiBmdW5jdGlvbiByZXR1cm5zIGEgbWFwIG9mIGB1IC0+IHsgZGlzdGFuY2UsIHByZWRlY2Vzc29yIH1gLiBUaGUgZGlzdGFuY2VcbiAqIHByb3BlcnR5IGhvbGRzIHRoZSBzdW0gb2YgdGhlIHdlaWdodHMgZnJvbSAqKnNvdXJjZSoqIHRvIGB1YCBhbG9uZyB0aGVcbiAqIHNob3J0ZXN0IHBhdGggb3IgYE51bWJlci5QT1NJVElWRV9JTkZJTklUWWAgaWYgdGhlcmUgaXMgbm8gcGF0aCBmcm9tXG4gKiAqKnNvdXJjZSoqLiBUaGUgcHJlZGVjZXNzb3IgcHJvcGVydHkgY2FuIGJlIHVzZWQgdG8gd2FsayB0aGUgaW5kaXZpZHVhbFxuICogZWxlbWVudHMgb2YgdGhlIHBhdGggZnJvbSAqKnNvdXJjZSoqIHRvICoqdSoqIGluIHJldmVyc2Ugb3JkZXIuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgd2VpZ2h0RnVuYyhlKWAgd2hpY2ggcmV0dXJucyB0aGVcbiAqIHdlaWdodCBvZiB0aGUgZWRnZSBgZWAuIElmIG5vIHdlaWdodEZ1bmMgaXMgc3VwcGxpZWQgdGhlbiBlYWNoIGVkZ2UgaXNcbiAqIGFzc3VtZWQgdG8gaGF2ZSBhIHdlaWdodCBvZiAxLiBUaGlzIGZ1bmN0aW9uIHRocm93cyBhbiBFcnJvciBpZiBhbnkgb2ZcbiAqIHRoZSB0cmF2ZXJzZWQgZWRnZXMgaGF2ZSBhIG5lZ2F0aXZlIGVkZ2Ugd2VpZ2h0LlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYGluY2lkZW50RnVuYyh1KWAgd2hpY2ggcmV0dXJucyB0aGUgaWRzIG9mXG4gKiBhbGwgZWRnZXMgaW5jaWRlbnQgdG8gdGhlIG5vZGUgYHVgIGZvciB0aGUgcHVycG9zZXMgb2Ygc2hvcnRlc3QgcGF0aFxuICogdHJhdmVyc2FsLiBCeSBkZWZhdWx0IHRoaXMgZnVuY3Rpb24gdXNlcyB0aGUgYGcub3V0RWRnZXNgIGZvciBEaWdyYXBocyBhbmRcbiAqIGBnLmluY2lkZW50RWRnZXNgIGZvciBHcmFwaHMuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBgTygofEV8ICsgfFZ8KSAqIGxvZyB8VnwpYCB0aW1lLlxuICpcbiAqIFtEaWprc3RyYSdzIGFsZ29yaXRobV06IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGlqa3N0cmElMjdzX2FsZ29yaXRobVxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3Igc2hvcnRlc3QgcGF0aHMgZnJvbSAqKnNvdXJjZSoqXG4gKiBAcGFyYW0ge09iamVjdH0gc291cmNlIHRoZSBzb3VyY2UgZnJvbSB3aGljaCB0byBzdGFydCB0aGUgc2VhcmNoXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbd2VpZ2h0RnVuY10gb3B0aW9uYWwgd2VpZ2h0IGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaW5jaWRlbnRGdW5jXSBvcHRpb25hbCBpbmNpZGVudCBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBkaWprc3RyYShnLCBzb3VyY2UsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYykge1xuICB2YXIgcmVzdWx0cyA9IHt9LFxuICAgICAgcHEgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpO1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZU5laWdoYm9ycyhlKSB7XG4gICAgdmFyIGluY2lkZW50Tm9kZXMgPSBnLmluY2lkZW50Tm9kZXMoZSksXG4gICAgICAgIHYgPSBpbmNpZGVudE5vZGVzWzBdICE9PSB1ID8gaW5jaWRlbnROb2Rlc1swXSA6IGluY2lkZW50Tm9kZXNbMV0sXG4gICAgICAgIHZFbnRyeSA9IHJlc3VsdHNbdl0sXG4gICAgICAgIHdlaWdodCA9IHdlaWdodEZ1bmMoZSksXG4gICAgICAgIGRpc3RhbmNlID0gdUVudHJ5LmRpc3RhbmNlICsgd2VpZ2h0O1xuXG4gICAgaWYgKHdlaWdodCA8IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImRpamtzdHJhIGRvZXMgbm90IGFsbG93IG5lZ2F0aXZlIGVkZ2Ugd2VpZ2h0cy4gQmFkIGVkZ2U6IFwiICsgZSArIFwiIFdlaWdodDogXCIgKyB3ZWlnaHQpO1xuICAgIH1cblxuICAgIGlmIChkaXN0YW5jZSA8IHZFbnRyeS5kaXN0YW5jZSkge1xuICAgICAgdkVudHJ5LmRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICB2RW50cnkucHJlZGVjZXNzb3IgPSB1O1xuICAgICAgcHEuZGVjcmVhc2UodiwgZGlzdGFuY2UpO1xuICAgIH1cbiAgfVxuXG4gIHdlaWdodEZ1bmMgPSB3ZWlnaHRGdW5jIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTsgfTtcbiAgaW5jaWRlbnRGdW5jID0gaW5jaWRlbnRGdW5jIHx8IChnLmlzRGlyZWN0ZWQoKVxuICAgICAgPyBmdW5jdGlvbih1KSB7IHJldHVybiBnLm91dEVkZ2VzKHUpOyB9XG4gICAgICA6IGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcuaW5jaWRlbnRFZGdlcyh1KTsgfSk7XG5cbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7XG4gICAgdmFyIGRpc3RhbmNlID0gdSA9PT0gc291cmNlID8gMCA6IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICByZXN1bHRzW3VdID0geyBkaXN0YW5jZTogZGlzdGFuY2UgfTtcbiAgICBwcS5hZGQodSwgZGlzdGFuY2UpO1xuICB9KTtcblxuICB2YXIgdSwgdUVudHJ5O1xuICB3aGlsZSAocHEuc2l6ZSgpID4gMCkge1xuICAgIHUgPSBwcS5yZW1vdmVNaW4oKTtcbiAgICB1RW50cnkgPSByZXN1bHRzW3VdO1xuICAgIGlmICh1RW50cnkuZGlzdGFuY2UgPT09IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgaW5jaWRlbnRGdW5jKHUpLmZvckVhY2godXBkYXRlTmVpZ2hib3JzKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwidmFyIGRpamtzdHJhID0gcmVxdWlyZShcIi4vZGlqa3N0cmFcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGlqa3N0cmFBbGw7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBmaW5kcyB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tIGVhY2ggbm9kZSB0byBldmVyeSBvdGhlclxuICogcmVhY2hhYmxlIG5vZGUgaW4gdGhlIGdyYXBoLiBJdCBpcyBzaW1pbGFyIHRvIFthbGcuZGlqa3N0cmFdW10sIGJ1dFxuICogaW5zdGVhZCBvZiByZXR1cm5pbmcgYSBzaW5nbGUtc291cmNlIGFycmF5LCBpdCByZXR1cm5zIGEgbWFwcGluZyBvZlxuICogb2YgYHNvdXJjZSAtPiBhbGcuZGlqa3N0YShnLCBzb3VyY2UsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYylgLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYHdlaWdodEZ1bmMoZSlgIHdoaWNoIHJldHVybnMgdGhlXG4gKiB3ZWlnaHQgb2YgdGhlIGVkZ2UgYGVgLiBJZiBubyB3ZWlnaHRGdW5jIGlzIHN1cHBsaWVkIHRoZW4gZWFjaCBlZGdlIGlzXG4gKiBhc3N1bWVkIHRvIGhhdmUgYSB3ZWlnaHQgb2YgMS4gVGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IgaWYgYW55IG9mXG4gKiB0aGUgdHJhdmVyc2VkIGVkZ2VzIGhhdmUgYSBuZWdhdGl2ZSBlZGdlIHdlaWdodC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGBpbmNpZGVudEZ1bmModSlgIHdoaWNoIHJldHVybnMgdGhlIGlkcyBvZlxuICogYWxsIGVkZ2VzIGluY2lkZW50IHRvIHRoZSBub2RlIGB1YCBmb3IgdGhlIHB1cnBvc2VzIG9mIHNob3J0ZXN0IHBhdGhcbiAqIHRyYXZlcnNhbC4gQnkgZGVmYXVsdCB0aGlzIGZ1bmN0aW9uIHVzZXMgdGhlIGBvdXRFZGdlc2AgZnVuY3Rpb24gb24gdGhlXG4gKiBzdXBwbGllZCBncmFwaC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGBPKHxWfCAqICh8RXwgKyB8VnwpICogbG9nIHxWfClgIHRpbWUuXG4gKlxuICogW2FsZy5kaWprc3RyYV06IGRpamtzdHJhLmpzLmh0bWwjZGlqa3N0cmFcbiAqXG4gKiBAcGFyYW0ge0dyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHNob3J0ZXN0IHBhdGhzIGZyb20gKipzb3VyY2UqKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3dlaWdodEZ1bmNdIG9wdGlvbmFsIHdlaWdodCBmdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2luY2lkZW50RnVuY10gb3B0aW9uYWwgaW5jaWRlbnQgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGlqa3N0cmFBbGwoZywgd2VpZ2h0RnVuYywgaW5jaWRlbnRGdW5jKSB7XG4gIHZhciByZXN1bHRzID0ge307XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIHJlc3VsdHNbdV0gPSBkaWprc3RyYShnLCB1LCB3ZWlnaHRGdW5jLCBpbmNpZGVudEZ1bmMpO1xuICB9KTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCJ2YXIgdGFyamFuID0gcmVxdWlyZShcIi4vdGFyamFuXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZpbmRDeWNsZXM7XG5cbi8qXG4gKiBHaXZlbiBhIERpZ3JhcGggKipnKiogdGhpcyBmdW5jdGlvbiByZXR1cm5zIGFsbCBub2RlcyB0aGF0IGFyZSBwYXJ0IG9mIGFcbiAqIGN5Y2xlLiBTaW5jZSB0aGVyZSBtYXkgYmUgbW9yZSB0aGFuIG9uZSBjeWNsZSBpbiBhIGdyYXBoIHRoaXMgZnVuY3Rpb25cbiAqIHJldHVybnMgYW4gYXJyYXkgb2YgdGhlc2UgY3ljbGVzLCB3aGVyZSBlYWNoIGN5Y2xlIGlzIGl0c2VsZiByZXByZXNlbnRlZFxuICogYnkgYW4gYXJyYXkgb2YgaWRzIGZvciBlYWNoIG5vZGUgaW52b2x2ZWQgaW4gdGhhdCBjeWNsZS5cbiAqXG4gKiBbYWxnLmlzQWN5Y2xpY11bXSBpcyBtb3JlIGVmZmljaWVudCBpZiB5b3Ugb25seSBuZWVkIHRvIGRldGVybWluZSB3aGV0aGVyXG4gKiBhIGdyYXBoIGhhcyBhIGN5Y2xlIG9yIG5vdC5cbiAqXG4gKiBbYWxnLmlzQWN5Y2xpY106IGlzQWN5Y2xpYy5qcy5odG1sI2lzQWN5Y2xpY1xuICpcbiAqIEBwYXJhbSB7RGlncmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBjeWNsZXMuXG4gKi9cbmZ1bmN0aW9uIGZpbmRDeWNsZXMoZykge1xuICByZXR1cm4gdGFyamFuKGcpLmZpbHRlcihmdW5jdGlvbihjbXB0KSB7IHJldHVybiBjbXB0Lmxlbmd0aCA+IDE7IH0pO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmbG95ZFdhcnNoYWxsO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIFtGbG95ZC1XYXJzaGFsbCBhbGdvcml0aG1dW10sXG4gKiB3aGljaCBmaW5kcyB0aGUgc2hvcnRlc3QgcGF0aCBmcm9tIGVhY2ggbm9kZSB0byBldmVyeSBvdGhlciByZWFjaGFibGUgbm9kZVxuICogaW4gdGhlIGdyYXBoLiBJdCBpcyBzaW1pbGFyIHRvIFthbGcuZGlqa3N0cmFBbGxdW10sIGJ1dCBpdCBoYW5kbGVzIG5lZ2F0aXZlXG4gKiBlZGdlIHdlaWdodHMgYW5kIGlzIG1vcmUgZWZmaWNpZW50IGZvciBzb21lIHR5cGVzIG9mIGdyYXBocy4gVGhpcyBmdW5jdGlvblxuICogcmV0dXJucyBhIG1hcCBvZiBgc291cmNlIC0+IHsgdGFyZ2V0IC0+IHsgZGlzdGFuY2UsIHByZWRlY2Vzc29yIH1gLiBUaGVcbiAqIGRpc3RhbmNlIHByb3BlcnR5IGhvbGRzIHRoZSBzdW0gb2YgdGhlIHdlaWdodHMgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YFxuICogYWxvbmcgdGhlIHNob3J0ZXN0IHBhdGggb2YgYE51bWJlci5QT1NJVElWRV9JTkZJTklUWWAgaWYgdGhlcmUgaXMgbm8gcGF0aFxuICogZnJvbSBgc291cmNlYC4gVGhlIHByZWRlY2Vzc29yIHByb3BlcnR5IGNhbiBiZSB1c2VkIHRvIHdhbGsgdGhlIGluZGl2aWR1YWxcbiAqIGVsZW1lbnRzIG9mIHRoZSBwYXRoIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgaW4gcmV2ZXJzZSBvcmRlci5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGB3ZWlnaHRGdW5jKGUpYCB3aGljaCByZXR1cm5zIHRoZVxuICogd2VpZ2h0IG9mIHRoZSBlZGdlIGBlYC4gSWYgbm8gd2VpZ2h0RnVuYyBpcyBzdXBwbGllZCB0aGVuIGVhY2ggZWRnZSBpc1xuICogYXNzdW1lZCB0byBoYXZlIGEgd2VpZ2h0IG9mIDEuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgaW5jaWRlbnRGdW5jKHUpYCB3aGljaCByZXR1cm5zIHRoZSBpZHMgb2ZcbiAqIGFsbCBlZGdlcyBpbmNpZGVudCB0byB0aGUgbm9kZSBgdWAgZm9yIHRoZSBwdXJwb3NlcyBvZiBzaG9ydGVzdCBwYXRoXG4gKiB0cmF2ZXJzYWwuIEJ5IGRlZmF1bHQgdGhpcyBmdW5jdGlvbiB1c2VzIHRoZSBgb3V0RWRnZXNgIGZ1bmN0aW9uIG9uIHRoZVxuICogc3VwcGxpZWQgZ3JhcGguXG4gKlxuICogVGhpcyBhbGdvcml0aG0gdGFrZXMgTyh8VnxeMykgdGltZS5cbiAqXG4gKiBbRmxveWQtV2Fyc2hhbGwgYWxnb3JpdGhtXTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmxveWQtV2Fyc2hhbGxfYWxnb3JpdGhtXG4gKiBbYWxnLmRpamtzdHJhQWxsXTogZGlqa3N0cmFBbGwuanMuaHRtbCNkaWprc3RyYUFsbFxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3Igc2hvcnRlc3QgcGF0aHMgZnJvbSAqKnNvdXJjZSoqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbd2VpZ2h0RnVuY10gb3B0aW9uYWwgd2VpZ2h0IGZ1bmN0aW9uXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbaW5jaWRlbnRGdW5jXSBvcHRpb25hbCBpbmNpZGVudCBmdW5jdGlvblxuICovXG5mdW5jdGlvbiBmbG95ZFdhcnNoYWxsKGcsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYykge1xuICB2YXIgcmVzdWx0cyA9IHt9LFxuICAgICAgbm9kZXMgPSBnLm5vZGVzKCk7XG5cbiAgd2VpZ2h0RnVuYyA9IHdlaWdodEZ1bmMgfHwgZnVuY3Rpb24oKSB7IHJldHVybiAxOyB9O1xuICBpbmNpZGVudEZ1bmMgPSBpbmNpZGVudEZ1bmMgfHwgKGcuaXNEaXJlY3RlZCgpXG4gICAgICA/IGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcub3V0RWRnZXModSk7IH1cbiAgICAgIDogZnVuY3Rpb24odSkgeyByZXR1cm4gZy5pbmNpZGVudEVkZ2VzKHUpOyB9KTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICByZXN1bHRzW3VdID0ge307XG4gICAgcmVzdWx0c1t1XVt1XSA9IHsgZGlzdGFuY2U6IDAgfTtcbiAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh1ICE9PSB2KSB7XG4gICAgICAgIHJlc3VsdHNbdV1bdl0gPSB7IGRpc3RhbmNlOiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpbmNpZGVudEZ1bmModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgICB2YXIgaW5jaWRlbnROb2RlcyA9IGcuaW5jaWRlbnROb2RlcyhlKSxcbiAgICAgICAgICB2ID0gaW5jaWRlbnROb2Rlc1swXSAhPT0gdSA/IGluY2lkZW50Tm9kZXNbMF0gOiBpbmNpZGVudE5vZGVzWzFdLFxuICAgICAgICAgIGQgPSB3ZWlnaHRGdW5jKGUpO1xuICAgICAgaWYgKGQgPCByZXN1bHRzW3VdW3ZdLmRpc3RhbmNlKSB7XG4gICAgICAgIHJlc3VsdHNbdV1bdl0gPSB7IGRpc3RhbmNlOiBkLCBwcmVkZWNlc3NvcjogdSB9O1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICB2YXIgcm93SyA9IHJlc3VsdHNba107XG4gICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihpKSB7XG4gICAgICB2YXIgcm93SSA9IHJlc3VsdHNbaV07XG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGopIHtcbiAgICAgICAgdmFyIGlrID0gcm93SVtrXTtcbiAgICAgICAgdmFyIGtqID0gcm93S1tqXTtcbiAgICAgICAgdmFyIGlqID0gcm93SVtqXTtcbiAgICAgICAgdmFyIGFsdERpc3RhbmNlID0gaWsuZGlzdGFuY2UgKyBrai5kaXN0YW5jZTtcbiAgICAgICAgaWYgKGFsdERpc3RhbmNlIDwgaWouZGlzdGFuY2UpIHtcbiAgICAgICAgICBpai5kaXN0YW5jZSA9IGFsdERpc3RhbmNlO1xuICAgICAgICAgIGlqLnByZWRlY2Vzc29yID0ga2oucHJlZGVjZXNzb3I7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsInZhciB0b3Bzb3J0ID0gcmVxdWlyZShcIi4vdG9wc29ydFwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBpc0FjeWNsaWM7XG5cbi8qXG4gKiBHaXZlbiBhIERpZ3JhcGggKipnKiogdGhpcyBmdW5jdGlvbiByZXR1cm5zIGB0cnVlYCBpZiB0aGUgZ3JhcGggaGFzIG5vXG4gKiBjeWNsZXMgYW5kIHJldHVybnMgYGZhbHNlYCBpZiBpdCBkb2VzLiBUaGlzIGFsZ29yaXRobSByZXR1cm5zIGFzIHNvb24gYXMgaXRcbiAqIGRldGVjdHMgdGhlIGZpcnN0IGN5Y2xlLlxuICpcbiAqIFVzZSBbYWxnLmZpbmRDeWNsZXNdW10gaWYgeW91IG5lZWQgdGhlIGFjdHVhbCBsaXN0IG9mIGN5Y2xlcyBpbiBhIGdyYXBoLlxuICpcbiAqIFthbGcuZmluZEN5Y2xlc106IGZpbmRDeWNsZXMuanMuaHRtbCNmaW5kQ3ljbGVzXG4gKlxuICogQHBhcmFtIHtEaWdyYXBofSBnIHRoZSBncmFwaCB0byB0ZXN0IGZvciBjeWNsZXNcbiAqL1xuZnVuY3Rpb24gaXNBY3ljbGljKGcpIHtcbiAgdHJ5IHtcbiAgICB0b3Bzb3J0KGcpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGUgaW5zdGFuY2VvZiB0b3Bzb3J0LkN5Y2xlRXhjZXB0aW9uKSByZXR1cm4gZmFsc2U7XG4gICAgdGhyb3cgZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cbiIsIi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBvc3RvcmRlcjtcblxuLy8gUG9zdG9yZGVyIHRyYXZlcnNhbCBvZiBnLCBjYWxsaW5nIGYgZm9yIGVhY2ggdmlzaXRlZCBub2RlLiBBc3N1bWVzIHRoZSBncmFwaFxuLy8gaXMgYSB0cmVlLlxuZnVuY3Rpb24gcG9zdG9yZGVyKGcsIHJvb3QsIGYpIHtcbiAgdmFyIHZpc2l0ZWQgPSBuZXcgU2V0KCk7XG4gIGlmIChnLmlzRGlyZWN0ZWQoKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBmb3IgdW5kaXJlY3RlZCBncmFwaHNcIik7XG4gIH1cbiAgZnVuY3Rpb24gZGZzKHUsIHByZXYpIHtcbiAgICBpZiAodmlzaXRlZC5oYXModSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBpbnB1dCBncmFwaCBpcyBub3QgYSB0cmVlOiBcIiArIGcpO1xuICAgIH1cbiAgICB2aXNpdGVkLmFkZCh1KTtcbiAgICBnLm5laWdoYm9ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh2ICE9PSBwcmV2KSBkZnModiwgdSk7XG4gICAgfSk7XG4gICAgZih1KTtcbiAgfVxuICBkZnMocm9vdCk7XG59XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwcmVvcmRlcjtcblxuLy8gUHJlb3JkZXIgdHJhdmVyc2FsIG9mIGcsIGNhbGxpbmcgZiBmb3IgZWFjaCB2aXNpdGVkIG5vZGUuIEFzc3VtZXMgdGhlIGdyYXBoXG4vLyBpcyBhIHRyZWUuXG5mdW5jdGlvbiBwcmVvcmRlcihnLCByb290LCBmKSB7XG4gIHZhciB2aXNpdGVkID0gbmV3IFNldCgpO1xuICBpZiAoZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgZm9yIHVuZGlyZWN0ZWQgZ3JhcGhzXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGRmcyh1LCBwcmV2KSB7XG4gICAgaWYgKHZpc2l0ZWQuaGFzKHUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgaW5wdXQgZ3JhcGggaXMgbm90IGEgdHJlZTogXCIgKyBnKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQodSk7XG4gICAgZih1KTtcbiAgICBnLm5laWdoYm9ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICh2ICE9PSBwcmV2KSBkZnModiwgdSk7XG4gICAgfSk7XG4gIH1cbiAgZGZzKHJvb3QpO1xufVxuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4uL0dyYXBoXCIpLFxuICAgIFByaW9yaXR5UXVldWUgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5Qcmlvcml0eVF1ZXVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHByaW07XG5cbi8qKlxuICogW1ByaW0ncyBhbGdvcml0aG1dW10gdGFrZXMgYSBjb25uZWN0ZWQgdW5kaXJlY3RlZCBncmFwaCBhbmQgZ2VuZXJhdGVzIGFcbiAqIFttaW5pbXVtIHNwYW5uaW5nIHRyZWVdW10uIFRoaXMgZnVuY3Rpb24gcmV0dXJucyB0aGUgbWluaW11bSBzcGFubmluZ1xuICogdHJlZSBhcyBhbiB1bmRpcmVjdGVkIGdyYXBoLiBUaGlzIGFsZ29yaXRobSBpcyBkZXJpdmVkIGZyb20gdGhlIGRlc2NyaXB0aW9uXG4gKiBpbiBcIkludHJvZHVjdGlvbiB0byBBbGdvcml0aG1zXCIsIFRoaXJkIEVkaXRpb24sIENvcm1lbiwgZXQgYWwuLCBQZyA2MzQuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhIGB3ZWlnaHRGdW5jKGUpYCB3aGljaCByZXR1cm5zIHRoZSB3ZWlnaHQgb2YgdGhlIGVkZ2VcbiAqIGBlYC4gSXQgdGhyb3dzIGFuIEVycm9yIGlmIHRoZSBncmFwaCBpcyBub3QgY29ubmVjdGVkLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYE8ofEV8IGxvZyB8VnwpYCB0aW1lLlxuICpcbiAqIFtQcmltJ3MgYWxnb3JpdGhtXTogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvUHJpbSdzX2FsZ29yaXRobVxuICogW21pbmltdW0gc3Bhbm5pbmcgdHJlZV06IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL01pbmltdW1fc3Bhbm5pbmdfdHJlZVxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIG1pbmltdW0gc3Bhbm5pbmcgdHJlZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gd2VpZ2h0RnVuYyB0aGUgd2VpZ2h0IGZ1bmN0aW9uIHRvIHVzZVxuICovXG5mdW5jdGlvbiBwcmltKGcsIHdlaWdodEZ1bmMpIHtcbiAgdmFyIHJlc3VsdCA9IG5ldyBHcmFwaCgpLFxuICAgICAgcGFyZW50cyA9IHt9LFxuICAgICAgcHEgPSBuZXcgUHJpb3JpdHlRdWV1ZSgpLFxuICAgICAgdTtcblxuICBmdW5jdGlvbiB1cGRhdGVOZWlnaGJvcnMoZSkge1xuICAgIHZhciBpbmNpZGVudE5vZGVzID0gZy5pbmNpZGVudE5vZGVzKGUpLFxuICAgICAgICB2ID0gaW5jaWRlbnROb2Rlc1swXSAhPT0gdSA/IGluY2lkZW50Tm9kZXNbMF0gOiBpbmNpZGVudE5vZGVzWzFdLFxuICAgICAgICBwcmkgPSBwcS5wcmlvcml0eSh2KTtcbiAgICBpZiAocHJpICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBlZGdlV2VpZ2h0ID0gd2VpZ2h0RnVuYyhlKTtcbiAgICAgIGlmIChlZGdlV2VpZ2h0IDwgcHJpKSB7XG4gICAgICAgIHBhcmVudHNbdl0gPSB1O1xuICAgICAgICBwcS5kZWNyZWFzZSh2LCBlZGdlV2VpZ2h0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoZy5vcmRlcigpID09PSAwKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIHBxLmFkZCh1LCBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkpO1xuICAgIHJlc3VsdC5hZGROb2RlKHUpO1xuICB9KTtcblxuICAvLyBTdGFydCBmcm9tIGFuIGFyYml0cmFyeSBub2RlXG4gIHBxLmRlY3JlYXNlKGcubm9kZXMoKVswXSwgMCk7XG5cbiAgdmFyIGluaXQgPSBmYWxzZTtcbiAgd2hpbGUgKHBxLnNpemUoKSA+IDApIHtcbiAgICB1ID0gcHEucmVtb3ZlTWluKCk7XG4gICAgaWYgKHUgaW4gcGFyZW50cykge1xuICAgICAgcmVzdWx0LmFkZEVkZ2UobnVsbCwgdSwgcGFyZW50c1t1XSk7XG4gICAgfSBlbHNlIGlmIChpbml0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnB1dCBncmFwaCBpcyBub3QgY29ubmVjdGVkOiBcIiArIGcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbml0ID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBnLmluY2lkZW50RWRnZXModSkuZm9yRWFjaCh1cGRhdGVOZWlnaGJvcnMpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdGFyamFuO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgW1RhcmphbidzIGFsZ29yaXRobV1bXSB3aGljaCBmaW5kc1xuICogYWxsIFtzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50c11bXSBpbiB0aGUgZGlyZWN0ZWQgZ3JhcGggKipnKiouIEVhY2hcbiAqIHN0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnQgaXMgY29tcG9zZWQgb2Ygbm9kZXMgdGhhdCBjYW4gcmVhY2ggYWxsIG90aGVyXG4gKiBub2RlcyBpbiB0aGUgY29tcG9uZW50IHZpYSBkaXJlY3RlZCBlZGdlcy4gQSBzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50XG4gKiBjYW4gY29uc2lzdCBvZiBhIHNpbmdsZSBub2RlIGlmIHRoYXQgbm9kZSBjYW5ub3QgYm90aCByZWFjaCBhbmQgYmUgcmVhY2hlZFxuICogYnkgYW55IG90aGVyIHNwZWNpZmljIG5vZGUgaW4gdGhlIGdyYXBoLiBDb21wb25lbnRzIG9mIG1vcmUgdGhhbiBvbmUgbm9kZVxuICogYXJlIGd1YXJhbnRlZWQgdG8gaGF2ZSBhdCBsZWFzdCBvbmUgY3ljbGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGFuIGFycmF5IG9mIGNvbXBvbmVudHMuIEVhY2ggY29tcG9uZW50IGlzIGl0c2VsZiBhblxuICogYXJyYXkgdGhhdCBjb250YWlucyB0aGUgaWRzIG9mIGFsbCBub2RlcyBpbiB0aGUgY29tcG9uZW50LlxuICpcbiAqIFtUYXJqYW4ncyBhbGdvcml0aG1dOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RhcmphbidzX3N0cm9uZ2x5X2Nvbm5lY3RlZF9jb21wb25lbnRzX2FsZ29yaXRobVxuICogW3N0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnRzXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9TdHJvbmdseV9jb25uZWN0ZWRfY29tcG9uZW50XG4gKlxuICogQHBhcmFtIHtEaWdyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHN0cm9uZ2x5IGNvbm5lY3RlZCBjb21wb25lbnRzXG4gKi9cbmZ1bmN0aW9uIHRhcmphbihnKSB7XG4gIGlmICghZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0YXJqYW4gY2FuIG9ubHkgYmUgYXBwbGllZCB0byBhIGRpcmVjdGVkIGdyYXBoLiBCYWQgaW5wdXQ6IFwiICsgZyk7XG4gIH1cblxuICB2YXIgaW5kZXggPSAwLFxuICAgICAgc3RhY2sgPSBbXSxcbiAgICAgIHZpc2l0ZWQgPSB7fSwgLy8gbm9kZSBpZCAtPiB7IG9uU3RhY2ssIGxvd2xpbmssIGluZGV4IH1cbiAgICAgIHJlc3VsdHMgPSBbXTtcblxuICBmdW5jdGlvbiBkZnModSkge1xuICAgIHZhciBlbnRyeSA9IHZpc2l0ZWRbdV0gPSB7XG4gICAgICBvblN0YWNrOiB0cnVlLFxuICAgICAgbG93bGluazogaW5kZXgsXG4gICAgICBpbmRleDogaW5kZXgrK1xuICAgIH07XG4gICAgc3RhY2sucHVzaCh1KTtcblxuICAgIGcuc3VjY2Vzc29ycyh1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghKHYgaW4gdmlzaXRlZCkpIHtcbiAgICAgICAgZGZzKHYpO1xuICAgICAgICBlbnRyeS5sb3dsaW5rID0gTWF0aC5taW4oZW50cnkubG93bGluaywgdmlzaXRlZFt2XS5sb3dsaW5rKTtcbiAgICAgIH0gZWxzZSBpZiAodmlzaXRlZFt2XS5vblN0YWNrKSB7XG4gICAgICAgIGVudHJ5Lmxvd2xpbmsgPSBNYXRoLm1pbihlbnRyeS5sb3dsaW5rLCB2aXNpdGVkW3ZdLmluZGV4KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmIChlbnRyeS5sb3dsaW5rID09PSBlbnRyeS5pbmRleCkge1xuICAgICAgdmFyIGNtcHQgPSBbXSxcbiAgICAgICAgICB2O1xuICAgICAgZG8ge1xuICAgICAgICB2ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZpc2l0ZWRbdl0ub25TdGFjayA9IGZhbHNlO1xuICAgICAgICBjbXB0LnB1c2godik7XG4gICAgICB9IHdoaWxlICh1ICE9PSB2KTtcbiAgICAgIHJlc3VsdHMucHVzaChjbXB0KTtcbiAgICB9XG4gIH1cblxuICBnLm5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgaWYgKCEodSBpbiB2aXNpdGVkKSkge1xuICAgICAgZGZzKHUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvcHNvcnQ7XG50b3Bzb3J0LkN5Y2xlRXhjZXB0aW9uID0gQ3ljbGVFeGNlcHRpb247XG5cbi8qXG4gKiBHaXZlbiBhIGdyYXBoICoqZyoqLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYW4gb3JkZXJlZCBsaXN0IG9mIG5vZGVzIHN1Y2hcbiAqIHRoYXQgZm9yIGVhY2ggZWRnZSBgdSAtPiB2YCwgYHVgIGFwcGVhcnMgYmVmb3JlIGB2YCBpbiB0aGUgbGlzdC4gSWYgdGhlXG4gKiBncmFwaCBoYXMgYSBjeWNsZSBpdCBpcyBpbXBvc3NpYmxlIHRvIGdlbmVyYXRlIHN1Y2ggYSBsaXN0IGFuZFxuICogKipDeWNsZUV4Y2VwdGlvbioqIGlzIHRocm93bi5cbiAqXG4gKiBTZWUgW3RvcG9sb2dpY2FsIHNvcnRpbmddKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1RvcG9sb2dpY2FsX3NvcnRpbmcpXG4gKiBmb3IgbW9yZSBkZXRhaWxzIGFib3V0IGhvdyB0aGlzIGFsZ29yaXRobSB3b3Jrcy5cbiAqXG4gKiBAcGFyYW0ge0RpZ3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNvcnRcbiAqL1xuZnVuY3Rpb24gdG9wc29ydChnKSB7XG4gIGlmICghZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0b3Bzb3J0IGNhbiBvbmx5IGJlIGFwcGxpZWQgdG8gYSBkaXJlY3RlZCBncmFwaC4gQmFkIGlucHV0OiBcIiArIGcpO1xuICB9XG5cbiAgdmFyIHZpc2l0ZWQgPSB7fTtcbiAgdmFyIHN0YWNrID0ge307XG4gIHZhciByZXN1bHRzID0gW107XG5cbiAgZnVuY3Rpb24gdmlzaXQobm9kZSkge1xuICAgIGlmIChub2RlIGluIHN0YWNrKSB7XG4gICAgICB0aHJvdyBuZXcgQ3ljbGVFeGNlcHRpb24oKTtcbiAgICB9XG5cbiAgICBpZiAoIShub2RlIGluIHZpc2l0ZWQpKSB7XG4gICAgICBzdGFja1tub2RlXSA9IHRydWU7XG4gICAgICB2aXNpdGVkW25vZGVdID0gdHJ1ZTtcbiAgICAgIGcucHJlZGVjZXNzb3JzKG5vZGUpLmZvckVhY2goZnVuY3Rpb24ocHJlZCkge1xuICAgICAgICB2aXNpdChwcmVkKTtcbiAgICAgIH0pO1xuICAgICAgZGVsZXRlIHN0YWNrW25vZGVdO1xuICAgICAgcmVzdWx0cy5wdXNoKG5vZGUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBzaW5rcyA9IGcuc2lua3MoKTtcbiAgaWYgKGcub3JkZXIoKSAhPT0gMCAmJiBzaW5rcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgQ3ljbGVFeGNlcHRpb24oKTtcbiAgfVxuXG4gIGcuc2lua3MoKS5mb3JFYWNoKGZ1bmN0aW9uKHNpbmspIHtcbiAgICB2aXNpdChzaW5rKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIEN5Y2xlRXhjZXB0aW9uKCkge31cblxuQ3ljbGVFeGNlcHRpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkdyYXBoIGhhcyBhdCBsZWFzdCBvbmUgY3ljbGVcIjtcbn07XG4iLCIvLyBUaGlzIGZpbGUgcHJvdmlkZXMgYSBoZWxwZXIgZnVuY3Rpb24gdGhhdCBtaXhlcy1pbiBEb3QgYmVoYXZpb3IgdG8gYW5cbi8vIGV4aXN0aW5nIGdyYXBoIHByb3RvdHlwZS5cblxuLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gY29tcG91bmRpZnk7XG5cbi8vIEV4dGVuZHMgdGhlIGdpdmVuIFN1cGVyQ29uc3RydWN0b3Igd2l0aCB0aGUgYWJpbGl0eSBmb3Igbm9kZXMgdG8gY29udGFpblxuLy8gb3RoZXIgbm9kZXMuIEEgc3BlY2lhbCBub2RlIGlkIGBudWxsYCBpcyB1c2VkIHRvIGluZGljYXRlIHRoZSByb290IGdyYXBoLlxuZnVuY3Rpb24gY29tcG91bmRpZnkoU3VwZXJDb25zdHJ1Y3Rvcikge1xuICBmdW5jdGlvbiBDb25zdHJ1Y3RvcigpIHtcbiAgICBTdXBlckNvbnN0cnVjdG9yLmNhbGwodGhpcyk7XG5cbiAgICAvLyBNYXAgb2Ygb2JqZWN0IGlkIC0+IHBhcmVudCBpZCAob3IgbnVsbCBmb3Igcm9vdCBncmFwaClcbiAgICB0aGlzLl9wYXJlbnRzID0ge307XG5cbiAgICAvLyBNYXAgb2YgaWQgKG9yIG51bGwpIC0+IGNoaWxkcmVuIHNldFxuICAgIHRoaXMuX2NoaWxkcmVuID0ge307XG4gICAgdGhpcy5fY2hpbGRyZW5bbnVsbF0gPSBuZXcgU2V0KCk7XG4gIH1cblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBuZXcgU3VwZXJDb25zdHJ1Y3RvcigpO1xuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdHJ1Y3RvcjtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUucGFyZW50ID0gZnVuY3Rpb24odSwgcGFyZW50KSB7XG4gICAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcblxuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhcmVudHNbdV07XG4gICAgfVxuXG4gICAgaWYgKHUgPT09IHBhcmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG1ha2UgXCIgKyB1ICsgXCIgYSBwYXJlbnQgb2YgaXRzZWxmXCIpO1xuICAgIH1cbiAgICBpZiAocGFyZW50ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHBhcmVudCk7XG4gICAgfVxuXG4gICAgdGhpcy5fY2hpbGRyZW5bdGhpcy5fcGFyZW50c1t1XV0ucmVtb3ZlKHUpO1xuICAgIHRoaXMuX3BhcmVudHNbdV0gPSBwYXJlbnQ7XG4gICAgdGhpcy5fY2hpbGRyZW5bcGFyZW50XS5hZGQodSk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmNoaWxkcmVuID0gZnVuY3Rpb24odSkge1xuICAgIGlmICh1ICE9PSBudWxsKSB7XG4gICAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW5bdV0ua2V5cygpO1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5hZGROb2RlID0gZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB1ID0gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuYWRkTm9kZS5jYWxsKHRoaXMsIHUsIHZhbHVlKTtcbiAgICB0aGlzLl9wYXJlbnRzW3VdID0gbnVsbDtcbiAgICB0aGlzLl9jaGlsZHJlblt1XSA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLl9jaGlsZHJlbltudWxsXS5hZGQodSk7XG4gICAgcmV0dXJuIHU7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmRlbE5vZGUgPSBmdW5jdGlvbih1KSB7XG4gICAgLy8gUHJvbW90ZSBhbGwgY2hpbGRyZW4gdG8gdGhlIHBhcmVudCBvZiB0aGUgc3ViZ3JhcGhcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnQodSk7XG4gICAgdGhpcy5fY2hpbGRyZW5bdV0ua2V5cygpLmZvckVhY2goZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgIHRoaXMucGFyZW50KGNoaWxkLCBwYXJlbnQpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgdGhpcy5fY2hpbGRyZW5bcGFyZW50XS5yZW1vdmUodSk7XG4gICAgZGVsZXRlIHRoaXMuX3BhcmVudHNbdV07XG4gICAgZGVsZXRlIHRoaXMuX2NoaWxkcmVuW3VdO1xuXG4gICAgcmV0dXJuIFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmRlbE5vZGUuY2FsbCh0aGlzLCB1KTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb3B5ID0gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuY29weS5jYWxsKHRoaXMpO1xuICAgIHRoaXMubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIGNvcHkucGFyZW50KHUsIHRoaXMucGFyZW50KHUpKTtcbiAgICB9LCB0aGlzKTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmlsdGVyTm9kZXMgPSBmdW5jdGlvbihmaWx0ZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGNvcHkgPSBTdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZS5maWx0ZXJOb2Rlcy5jYWxsKHRoaXMsIGZpbHRlcik7XG5cbiAgICB2YXIgcGFyZW50cyA9IHt9O1xuICAgIGZ1bmN0aW9uIGZpbmRQYXJlbnQodSkge1xuICAgICAgdmFyIHBhcmVudCA9IHNlbGYucGFyZW50KHUpO1xuICAgICAgaWYgKHBhcmVudCA9PT0gbnVsbCB8fCBjb3B5Lmhhc05vZGUocGFyZW50KSkge1xuICAgICAgICBwYXJlbnRzW3VdID0gcGFyZW50O1xuICAgICAgICByZXR1cm4gcGFyZW50O1xuICAgICAgfSBlbHNlIGlmIChwYXJlbnQgaW4gcGFyZW50cykge1xuICAgICAgICByZXR1cm4gcGFyZW50c1twYXJlbnRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZpbmRQYXJlbnQocGFyZW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb3B5LmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHsgY29weS5wYXJlbnQodSwgZmluZFBhcmVudCh1KSk7IH0pO1xuXG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgcmV0dXJuIENvbnN0cnVjdG9yO1xufVxuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4uL0dyYXBoXCIpLFxuICAgIERpZ3JhcGggPSByZXF1aXJlKFwiLi4vRGlncmFwaFwiKSxcbiAgICBDR3JhcGggPSByZXF1aXJlKFwiLi4vQ0dyYXBoXCIpLFxuICAgIENEaWdyYXBoID0gcmVxdWlyZShcIi4uL0NEaWdyYXBoXCIpO1xuXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uKG5vZGVzLCBlZGdlcywgQ3Rvcikge1xuICBDdG9yID0gQ3RvciB8fCBEaWdyYXBoO1xuXG4gIGlmICh0eXBlT2Yobm9kZXMpICE9PSBcIkFycmF5XCIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJub2RlcyBpcyBub3QgYW4gQXJyYXlcIik7XG4gIH1cblxuICBpZiAodHlwZU9mKGVkZ2VzKSAhPT0gXCJBcnJheVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiZWRnZXMgaXMgbm90IGFuIEFycmF5XCIpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBDdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgc3dpdGNoKEN0b3IpIHtcbiAgICAgIGNhc2UgXCJncmFwaFwiOiBDdG9yID0gR3JhcGg7IGJyZWFrO1xuICAgICAgY2FzZSBcImRpZ3JhcGhcIjogQ3RvciA9IERpZ3JhcGg7IGJyZWFrO1xuICAgICAgY2FzZSBcImNncmFwaFwiOiBDdG9yID0gQ0dyYXBoOyBicmVhaztcbiAgICAgIGNhc2UgXCJjZGlncmFwaFwiOiBDdG9yID0gQ0RpZ3JhcGg7IGJyZWFrO1xuICAgICAgZGVmYXVsdDogdGhyb3cgbmV3IEVycm9yKFwiVW5yZWNvZ25pemVkIGdyYXBoIHR5cGU6IFwiICsgQ3Rvcik7XG4gICAgfVxuICB9XG5cbiAgdmFyIGdyYXBoID0gbmV3IEN0b3IoKTtcblxuICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICBncmFwaC5hZGROb2RlKHUuaWQsIHUudmFsdWUpO1xuICB9KTtcblxuICAvLyBJZiB0aGUgZ3JhcGggaXMgY29tcG91bmQsIHNldCB1cCBjaGlsZHJlbi4uLlxuICBpZiAoZ3JhcGgucGFyZW50KSB7XG4gICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICBpZiAodS5jaGlsZHJlbikge1xuICAgICAgICB1LmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICAgIGdyYXBoLnBhcmVudCh2LCB1LmlkKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBlZGdlcy5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICBncmFwaC5hZGRFZGdlKGUuaWQsIGUudSwgZS52LCBlLnZhbHVlKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGdyYXBoO1xufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbihncmFwaCkge1xuICB2YXIgbm9kZXMgPSBbXTtcbiAgdmFyIGVkZ2VzID0gW107XG5cbiAgZ3JhcGguZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB2YXIgbm9kZSA9IHtpZDogdSwgdmFsdWU6IHZhbHVlfTtcbiAgICBpZiAoZ3JhcGguY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IGdyYXBoLmNoaWxkcmVuKHUpO1xuICAgICAgaWYgKGNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICBub2RlLmNoaWxkcmVuID0gY2hpbGRyZW47XG4gICAgICB9XG4gICAgfVxuICAgIG5vZGVzLnB1c2gobm9kZSk7XG4gIH0pO1xuXG4gIGdyYXBoLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgZWRnZXMucHVzaCh7aWQ6IGUsIHU6IHUsIHY6IHYsIHZhbHVlOiB2YWx1ZX0pO1xuICB9KTtcblxuICB2YXIgdHlwZTtcbiAgaWYgKGdyYXBoIGluc3RhbmNlb2YgQ0RpZ3JhcGgpIHtcbiAgICB0eXBlID0gXCJjZGlncmFwaFwiO1xuICB9IGVsc2UgaWYgKGdyYXBoIGluc3RhbmNlb2YgQ0dyYXBoKSB7XG4gICAgdHlwZSA9IFwiY2dyYXBoXCI7XG4gIH0gZWxzZSBpZiAoZ3JhcGggaW5zdGFuY2VvZiBEaWdyYXBoKSB7XG4gICAgdHlwZSA9IFwiZGlncmFwaFwiO1xuICB9IGVsc2UgaWYgKGdyYXBoIGluc3RhbmNlb2YgR3JhcGgpIHtcbiAgICB0eXBlID0gXCJncmFwaFwiO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGRldGVybWluZSB0eXBlIG9mIGdyYXBoOiBcIiArIGdyYXBoKTtcbiAgfVxuXG4gIHJldHVybiB7IG5vZGVzOiBub2RlcywgZWRnZXM6IGVkZ2VzLCB0eXBlOiB0eXBlIH07XG59O1xuXG5mdW5jdGlvbiB0eXBlT2Yob2JqKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5zbGljZSg4LCAtMSk7XG59XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxuZXhwb3J0cy5hbGwgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbn07XG5cbmV4cG9ydHMubm9kZXNGcm9tTGlzdCA9IGZ1bmN0aW9uKG5vZGVzKSB7XG4gIHZhciBzZXQgPSBuZXcgU2V0KG5vZGVzKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHUpIHtcbiAgICByZXR1cm4gc2V0Lmhhcyh1KTtcbiAgfTtcbn07XG4iLCJ2YXIgR3JhcGggPSByZXF1aXJlKFwiLi9HcmFwaFwiKSxcbiAgICBEaWdyYXBoID0gcmVxdWlyZShcIi4vRGlncmFwaFwiKTtcblxuLy8gU2lkZS1lZmZlY3QgYmFzZWQgY2hhbmdlcyBhcmUgbG91c3ksIGJ1dCBub2RlIGRvZXNuJ3Qgc2VlbSB0byByZXNvbHZlIHRoZVxuLy8gcmVxdWlyZXMgY3ljbGUuXG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBkaXJlY3RlZCBncmFwaCB1c2luZyB0aGUgbm9kZXMgYW5kIGVkZ2VzIGZyb20gdGhpcyBncmFwaC4gVGhlXG4gKiBuZXcgZ3JhcGggd2lsbCBoYXZlIHRoZSBzYW1lIG5vZGVzLCBidXQgd2lsbCBoYXZlIHR3aWNlIHRoZSBudW1iZXIgb2YgZWRnZXM6XG4gKiBlYWNoIGVkZ2UgaXMgc3BsaXQgaW50byB0d28gZWRnZXMgd2l0aCBvcHBvc2l0ZSBkaXJlY3Rpb25zLiBFZGdlIGlkcyxcbiAqIGNvbnNlcXVlbnRseSwgYXJlIG5vdCBwcmVzZXJ2ZWQgYnkgdGhpcyB0cmFuc2Zvcm1hdGlvbi5cbiAqL1xuR3JhcGgucHJvdG90eXBlLnRvRGlncmFwaCA9XG5HcmFwaC5wcm90b3R5cGUuYXNEaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZyA9IG5ldyBEaWdyYXBoKCk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgZy5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgdmFsdWUpO1xuICAgIGcuYWRkRWRnZShudWxsLCB2LCB1LCB2YWx1ZSk7XG4gIH0pO1xuICByZXR1cm4gZztcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyB1bmRpcmVjdGVkIGdyYXBoIHVzaW5nIHRoZSBub2RlcyBhbmQgZWRnZXMgZnJvbSB0aGlzIGdyYXBoLlxuICogVGhlIG5ldyBncmFwaCB3aWxsIGhhdmUgdGhlIHNhbWUgbm9kZXMsIGJ1dCB0aGUgZWRnZXMgd2lsbCBiZSBtYWRlXG4gKiB1bmRpcmVjdGVkLiBFZGdlIGlkcyBhcmUgcHJlc2VydmVkIGluIHRoaXMgdHJhbnNmb3JtYXRpb24uXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnRvR3JhcGggPVxuRGlncmFwaC5wcm90b3R5cGUuYXNVbmRpcmVjdGVkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBnID0gbmV3IEdyYXBoKCk7XG4gIHRoaXMuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHsgZy5hZGROb2RlKHUsIHZhbHVlKTsgfSk7XG4gIHRoaXMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBnLmFkZEVkZ2UoZSwgdSwgdiwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGc7XG59O1xuIiwiLy8gUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdmFsdWVzIGZvciBwcm9wZXJ0aWVzIG9mICoqbyoqLlxuZXhwb3J0cy52YWx1ZXMgPSBmdW5jdGlvbihvKSB7XG4gIHZhciBrcyA9IE9iamVjdC5rZXlzKG8pLFxuICAgICAgbGVuID0ga3MubGVuZ3RoLFxuICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGxlbiksXG4gICAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICByZXN1bHRbaV0gPSBvW2tzW2ldXTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gJzAuNy40JztcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL3NoYXJlZC91dGlscycpO1xudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbmFwcC5jb250cm9sbGVyKCdBcGlDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlJywgJ2RpYWxvZycsICdhcGlQcm9taXNlJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRkaWFsb2csIGFwaVByb21pc2UpIHtcblxuICAgICRzY29wZS5hcGkgPSBhcGk7IC8vUHJvbWlzZTtcblxuICAgICRzY29wZS5jb250cm9sbGVyVGFiSW5kZXggPSAwO1xuXG4gICAgJHNjb3BlLmRlbGV0ZUNvbnRyb2xsZXIgPSBmdW5jdGlvbihjb250cm9sbGVyKSB7XG5cbiAgICAgICRkaWFsb2cuY29uZmlybSh7XG4gICAgICAgIHRpdGxlOiAnRGVsZXRlIENvbnRyb2xsZXInLFxuICAgICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSBjb250cm9sbGVyIFsnICsgY29udHJvbGxlci5uYW1lICsgJ10/J1xuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHBhcmVudCA9IGNvbnRyb2xsZXIuY29udHJvbGxlcjtcbiAgICAgICAgcGFyZW50LnJlbW92ZUNvbnRyb2xsZXIoY29udHJvbGxlcik7XG4gICAgICAgIC8vIGdvIHRvIHBhcmVudCBjb250cm9sbGVyXG4gICAgICAgICRzdGF0ZS5nbygnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgICAgY29udHJvbGxlcklkOiBwYXJlbnQuaWRcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZVJvdXRlID0gZnVuY3Rpb24ocm91dGUpIHtcblxuICAgICAgJGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6ICdEZWxldGUgUm91dGUnLFxuICAgICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIGRlbGV0ZSByb3V0ZSBbJyArIHJvdXRlLmRlc2NyaXB0aW9uICsgJ10/J1xuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcm91dGUuY29udHJvbGxlci5yZW1vdmVSb3V0ZShyb3V0ZSk7XG4gICAgICAgIC8vIGdvIHRvIHBhcmVudCBjb250cm9sbGVyXG4gICAgICAgICRzdGF0ZS5nbygnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgICAgY29udHJvbGxlcklkOiByb3V0ZS5jb250cm9sbGVyLmlkXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzdGF0ZS5nbygnYXBpLnJvdXRlJywge1xuICAgICAgcm91dGVJZDogYXBpLnJvb3QuaWRcbiAgICB9KTtcblxuICAgICRzY29wZS5yb3V0ZXMgPSBbYXBpLnJvb3RdO1xuICB9XG5dKTtcblxuXG4vKlxuICogUm91dGUgQ29uc3RydWN0b3IgRnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gUm91dGUoZGF0YSkge1xuICB0aGlzLmlkID0gZGF0YS5pZCB8fCB1dGlscy5nZXR1aWQoKTtcbiAgdGhpcy5wYXJlbnQgPSBkYXRhLnBhcmVudDtcbiAgdGhpcy5wYXRoID0gZGF0YS5wYXRoO1xuICB0aGlzLmFjdGlvbnMgPSBkYXRhLmFjdGlvbnMgaW5zdGFuY2VvZiBBY3Rpb24gPyBbZGF0YS5hY3Rpb25zXSA6IChkYXRhLmFjdGlvbnMgfHwgW10pO1xuICB0aGlzLnJvdXRlcyA9IGRhdGEucm91dGVzIHx8IFtdO1xuICB0aGlzLmhhbmRsZXJzID0gZGF0YS5oYW5kbGVycyB8fCBbXTtcbn1cblJvdXRlLnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uKHBhdGgsIGFjdGlvbnMpIHtcbiAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHtcbiAgICBpZDogdXRpbHMuZ2V0dWlkKCksXG4gICAgcGFyZW50OiB0aGlzLFxuICAgIHBhdGg6IHBhdGgsXG4gICAgYWN0aW9uczogYWN0aW9uc1xuICB9KTtcbiAgdGhpcy5yb3V0ZXMucHVzaChyb3V0ZSk7XG4gIHJldHVybiByb3V0ZTtcbn07XG5Sb3V0ZS5wcm90b3R5cGUuYWRkQWN0aW9uID0gZnVuY3Rpb24odmVyYiwgaGFuZGxlcnMpIHtcbiAgdmFyIGFjdGlvbiA9IG5ldyBBY3Rpb24oe1xuICAgIGlkOiB1dGlscy5nZXR1aWQoKSxcbiAgICByb3V0ZTogdGhpcyxcbiAgICB2ZXJiOiAnR0VUJyxcbiAgICBoYW5kbGVyczogaGFuZGxlcnNcbiAgfSk7XG4gIHRoaXMuYWN0aW9ucy5wdXNoKGFjdGlvbik7XG4gIHJldHVybiBhY3Rpb247XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUm91dGUucHJvdG90eXBlLCB7XG4gIGFuY2VzdG9yczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYW5jZXN0b3JzID0gW10sXG4gICAgICAgIHIgPSB0aGlzO1xuXG4gICAgICB3aGlsZSAoci5wYXJlbnQpIHtcbiAgICAgICAgYW5jZXN0b3JzLnB1c2goci5wYXJlbnQpO1xuICAgICAgICByID0gci5wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhbmNlc3RvcnM7XG4gICAgfVxuICB9LFxuICBkZXNjZW5kYW50czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZGVzY2VuZGFudHMgPSBbXS5jb25jYXQodGhpcy5jaGlsZHJlbik7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShkZXNjZW5kYW50cywgdGhpcy5jaGlsZHJlbltpXS5kZXNjZW5kYW50cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZXNjZW5kYW50cztcbiAgICB9XG4gIH0sXG4gIGlzUm9vdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXRoaXMuaGFzQW5jZXN0b3JzO1xuICAgIH1cbiAgfSxcbiAgaGFzQW5jZXN0b3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuYW5jZXN0b3JzLmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIGhhc0RlY2VuZGVudHM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5kZXNjZW5kYW50cy5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBjaGlsZHJlbjoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZXM7XG4gICAgfVxuICB9LFxuICBoYXNDaGlsZHJlbjoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLmNoaWxkcmVuLmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIGhhc0FjdGlvbnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5hY3Rpb25zLmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIHVybDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcGFydHMgPSBbdGhpcy5wYXRoXTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmFuY2VzdG9ycy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0cy51bnNoaWZ0KHRoaXMuYW5jZXN0b3JzW2ldLnBhdGgpO1xuICAgICAgfVxuXG4gICAgICBpZiAocGFydHMubGVuZ3RoID4gMSAmJiBwYXJ0c1swXSA9PT0gJy8nKSB7XG4gICAgICAgIHBhcnRzLnNwbGljZSgwLCAxKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oJycpO1xuICAgIH1cbiAgfVxufSk7XG5cbi8qXG4gKiBBY3Rpb24gQ29uc3RydWN0b3IgRnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gQWN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yb3V0ZSA9IGRhdGEucm91dGU7XG4gIHRoaXMuaWQgPSBkYXRhLmlkIHx8IHV0aWxzLmdldHVpZCgpO1xuICB0aGlzLnZlcmIgPSBkYXRhLnZlcmI7XG4gIHRoaXMuaGFuZGxlcnMgPSBkYXRhLmhhbmRsZXJzIGluc3RhbmNlb2YgSGFuZGxlciA/IFtkYXRhLmhhbmRsZXJzXSA6IChkYXRhLmhhbmRsZXJzIHx8IFtdKTs7XG59XG5BY3Rpb24ucHJvdG90eXBlLnZlcmJzID0gWydBTEwnLCAnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURSddO1xuQWN0aW9uLnByb3RvdHlwZS5hZGRIYW5kbGVyID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgaGFuZGxlciA9IG5ldyBIYW5kbGVyKGRhdGEpO1xuICB0aGlzLmhhbmRsZXJzLnB1c2goaGFuZGxlcik7XG4gIHJldHVybiBoYW5kbGVyO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFjdGlvbi5wcm90b3R5cGUsIHtcbiAgaGFzSGFuZGxlcnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5oYW5kbGVycy5sZW5ndGg7XG4gICAgfVxuICB9XG59KTtcblxuLypcbiAqIEhhbmRsZXIgQ29uc3RydWN0b3IgRnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gSGFuZGxlcihkYXRhKSB7XG4gIHRoaXMuaWQgPSBkYXRhLmlkIHx8IHV0aWxzLmdldHVpZCgpO1xuICB0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG4gIHRoaXMuY29kZSA9IGRhdGEuY29kZTtcbn1cblxuXG4vKlxuICogSGFuZGxlciBDb25zdHJ1Y3RvciBGdW5jdGlvblxuICovXG5mdW5jdGlvbiBBcGkobmFtZSwgcm91dGUpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5yb290ID0gcm91dGU7XG59XG5BcGkucHJvdG90eXBlLmZpbmRSb3V0ZSA9IGZ1bmN0aW9uKGlkKSB7XG4gIHJldHVybiB0aGlzLnJvdXRlcy5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5pZCA9PT0gaWQ7XG4gIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwaS5wcm90b3R5cGUsIHtcbiAgcm91dGVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbihpZCkge1xuICAgICAgcmV0dXJuIFt0aGlzLnJvb3RdLmNvbmNhdCh0aGlzLnJvb3QuZGVzY2VuZGFudHMpO1xuICAgIH1cbiAgfVxufSk7XG5cblxudmFyIHJlcXVpcmVzQXV0aGVudGljYXRpb24gPSBuZXcgSGFuZGxlcih7XG4gIG5hbWU6ICdyZXF1aXJlc0F1dGhlbnRpY2F0aW9uJyxcbiAgY29kZTogXCJmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkgeyBuZXh0KHJlcS5xdWVyeS5hdXRobWUgPyBudWxsIDogbmV3IEVycm9yKCdVbmF1dGhvcml6ZWQnKSk7IH1cIlxufSk7XG5cbnZhciBob21lUm91dGUgPSBuZXcgUm91dGUoe1xuICBwYXRoOiAnLycsXG4gIGFjdGlvbnM6IG5ldyBBY3Rpb24oe1xuICAgIHZlcmI6ICdHRVQnLFxuICAgIGhhbmRsZXJzOiBuZXcgSGFuZGxlcih7XG4gICAgICBuYW1lOiAnZ2V0SG9tZVBhZ2UnLFxuICAgICAgY29kZTogJ2Z1bmN0aW9uKHJlcSwgcmVzKSB7IHJlcS5zZW5kKFwiZ2V0SG9tZVBhZ2VcIik7IH0nXG4gICAgfSlcbiAgfSlcbn0pO1xuXG5ob21lUm91dGUuYWRkQ2hpbGQoJy9waW5nJywgbmV3IEFjdGlvbih7XG4gIHZlcmI6ICdHRVQnLFxuICBoYW5kbGVyczogbmV3IEhhbmRsZXIoe1xuICAgIG5hbWU6ICdnZXRQaW5nUGFnZScsXG4gICAgY29kZTogJ2Z1bmN0aW9uKHJlcSwgcmVzKSB7IHJlcS5zZW5kKFwicG9uZ1wiKTsgfSdcbiAgfSlcbn0pKTtcblxudmFyIHVzZXIgPSBob21lUm91dGUuYWRkQ2hpbGQoJy91c2VyJywgW25ldyBBY3Rpb24oe1xuICAgIHZlcmI6ICdBTEwnLFxuICAgIGhhbmRsZXJzOiByZXF1aXJlc0F1dGhlbnRpY2F0aW9uXG4gIH0pLFxuICBuZXcgQWN0aW9uKHtcbiAgICB2ZXJiOiAnR0VUJyxcbiAgICBoYW5kbGVyczogbmV3IEhhbmRsZXIoe1xuICAgICAgbmFtZTogJ2dldFVzZXJQYWdlJyxcbiAgICAgIGNvZGU6ICdmdW5jdGlvbihyZXEsIHJlcykgeyByZXEuc2VuZChcImdldFVzZXJQYWdlXCIpOyB9J1xuICAgIH0pXG4gIH0pXG5dKTtcblxudmFyIGF1dGhVc2VycyA9IG5ldyBBY3Rpb24oe1xuICB2ZXJiOiAnQUxMJyxcbiAgaGFuZGxlcnM6IHJlcXVpcmVzQXV0aGVudGljYXRpb25cbn0pO1xuXG52YXIgbG9hZFVzZXIgPSBuZXcgQWN0aW9uKHtcbiAgdmVyYjogJ0FMTCcsXG4gIGhhbmRsZXJzOiBuZXcgSGFuZGxlcih7XG4gICAgbmFtZTogJ2xvYWRVc2VyJyxcbiAgICBjb2RlOiAnZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHsgcmVxLnVzZXIgPSB7IG5hbWU6IFwiZnJlZFwiIH07IG5leHQoKTsgfSdcbiAgfSlcbn0pO1xuXG52YXIgcHV0VXNlciA9IG5ldyBBY3Rpb24oe1xuICB2ZXJiOiAnUFVUJyxcbiAgaGFuZGxlcnM6IFtuZXcgSGFuZGxlcih7XG4gICAgbmFtZTogJ3NhdmVVc2VyJyxcbiAgICBjb2RlOiAnZnVuY3Rpb24ocmVxLCByZXMpIHsgcmVxLnNlbmQoXCJzYXZlVXNlclwiKTsgfSdcbiAgfSldXG59KTtcblxudmFyIGRlbGV0ZVVzZXIgPSBuZXcgQWN0aW9uKHtcbiAgdmVyYjogJ0RFTEVURScsXG4gIGhhbmRsZXJzOiBuZXcgSGFuZGxlcih7XG4gICAgbmFtZTogJ2RlbGV0ZVVzZXInLFxuICAgIGNvZGU6ICdmdW5jdGlvbihyZXEsIHJlcykgeyByZXEuc2VuZChcImRlbGV0ZVVzZXJcIik7IH0nXG4gIH0pXG59KTtcblxuXG52YXIgYXV0aGVudGljYXRlVXNlcnMgPSB1c2VyLmFkZENoaWxkKCcvKicsIFthdXRoVXNlcnNdKTtcblxudmFyIHVzZXJpZCA9IHVzZXIuYWRkQ2hpbGQoJy86aWQnLCBbbG9hZFVzZXIsIHB1dFVzZXIsIGRlbGV0ZVVzZXJdKTtcblxudXNlcmlkLmFkZENoaWxkKCcvdmlkZW9zJyk7XG5cblxudmFyIGNvbnRhY3R1cyA9IGhvbWVSb3V0ZS5hZGRDaGlsZCgnL2NvbnRhY3QtdXMnLCBbbmV3IEFjdGlvbih7XG4gICAgdmVyYjogJ0dFVCcsXG4gICAgaGFuZGxlcnM6IG5ldyBIYW5kbGVyKHtcbiAgICAgIG5hbWU6ICdnZXRDb250YWN0VXNQYWdlJyxcbiAgICAgIGNvZGU6ICdmdW5jdGlvbihyZXEsIHJlcykgeyByZXEuc2VuZChcImdldENvbnRhY3RVc1BhZ2VcIik7IH0nXG4gICAgfSlcbiAgfSksXG4gIG5ldyBBY3Rpb24oe1xuICAgIHZlcmI6ICdQT1NUJyxcbiAgICBoYW5kbGVyczogbmV3IEhhbmRsZXIoe1xuICAgICAgbmFtZTogJ3Bvc3RDb250YWN0VXNQYWdlJyxcbiAgICAgIGNvZGU6ICdmdW5jdGlvbihyZXEsIHJlcykgeyByZXEuc2VuZChcInBvc3RDb250YWN0VXNQYWdlXCIpOyB9J1xuICAgIH0pXG4gIH0pXG5dKTtcblxudmFyIGFwaSA9IG5ldyBBcGkoJ2RlbW8nLCBob21lUm91dGUpO1xuXG5cbndpbmRvdy5hcGkgPSBhcGk7XG4iLCJhcHAuY29udHJvbGxlcignQXBpQ29udHJvbGxlckN0cmwnLCBbJyRzY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuXG4gICAgdmFyIGNvbnRyb2xsZXIgPSAkc2NvcGUuYXBpLmZpbmRDb250cm9sbGVyKCRzdGF0ZVBhcmFtcy5jb250cm9sbGVySWQpO1xuXG4gICAgJHNjb3BlLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuXG4gICAgJHNjb3BlLmFkZENvbnRyb2xsZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBuZXdDb250cm9sbGVyID0gY29udHJvbGxlci5hZGRDb250cm9sbGVyKCk7XG5cbiAgICAgICRzdGF0ZS5nbygnYXBpLmNvbnRyb2xsZXInLCB7XG4gICAgICAgIGNvbnRyb2xsZXJJZDogbmV3Q29udHJvbGxlci5pZFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5hZGRSb3V0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5ld1JvdXRlID0gY29udHJvbGxlci5hZGRSb3V0ZSgpO1xuXG4gICAgICAkc3RhdGUuZ28oJ2FwaS5jb250cm9sbGVyLnJvdXRlJywge1xuICAgICAgICByb3V0ZUlkOiBuZXdSb3V0ZS5pZFxuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS50YWJzID0gW3tcbiAgICAgIGFjdGl2ZTogJHNjb3BlLmNvbnRyb2xsZXJUYWJJbmRleCA9PT0gMFxuICAgIH0sIHtcbiAgICAgIGFjdGl2ZTogJHNjb3BlLmNvbnRyb2xsZXJUYWJJbmRleCA9PT0gMVxuICAgIH0sIHtcbiAgICAgIGFjdGl2ZTogJHNjb3BlLmNvbnRyb2xsZXJUYWJJbmRleCA9PT0gMlxuICAgIH0sIHtcbiAgICAgIGFjdGl2ZTogJHNjb3BlLmNvbnRyb2xsZXJUYWJJbmRleCA9PT0gM1xuICAgIH1dO1xuXG4gICAgJHNjb3BlLnNlbGVjdFRhYiA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gICAgICAkc2NvcGUuJHBhcmVudC5jb250cm9sbGVyVGFiSW5kZXggPSBpbmRleDtcbiAgICB9O1xuXG4gIH1cbl0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0FwaURpYWdyYW1DdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcblxuICAgIHZhciBtID0gWzIwLCAxMjAsIDIwLCAxMjBdLFxuICAgICAgdyA9IDEyODAgLSBtWzFdIC0gbVszXSxcbiAgICAgIGggPSA4MDAgLSBtWzBdIC0gbVsyXSxcbiAgICAgIGkgPSAwLFxuICAgICAgaiA9IDAsXG4gICAgICByb290LCBqc29uO1xuXG4gICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAuc2l6ZShbaCwgd10pO1xuXG4gICAgdmFyIGRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsKClcbiAgICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgcmV0dXJuIFtkLnksIGQueF07XG4gICAgICB9KTtcblxuICAgIHZhciB2aXMgPSBkMy5zZWxlY3QoXCIjYXBpLWRpYWdyYW1cIikuYXBwZW5kKFwic3ZnOnN2Z1wiKVxuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3ICsgbVsxXSArIG1bM10pXG4gICAgICAuYXR0cihcImhlaWdodFwiLCBoICsgbVswXSArIG1bMl0pXG4gICAgICAuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbVszXSArIFwiLFwiICsgbVswXSArIFwiKVwiKTtcblxuXG4gICAgZnVuY3Rpb24gYnVpbGQoY29udHJvbGxlcikge1xuXG4gICAgICB2YXIgbyA9IHtcbiAgICAgICAgbmFtZTogY29udHJvbGxlci5uYW1lXG4gICAgICB9O1xuXG4gICAgICBpZiAoY29udHJvbGxlci5jb250cm9sbGVycy5sZW5ndGgpIHtcbiAgICAgICAgby5jaGlsZHJlbiA9IFtdO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29udHJvbGxlci5jb250cm9sbGVycy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIG8uY2hpbGRyZW4ucHVzaChidWlsZChjb250cm9sbGVyLmNvbnRyb2xsZXJzW2pdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNvbnRyb2xsZXIucm91dGVzLmxlbmd0aCkge1xuICAgICAgICBpZiAoIW8uY2hpbGRyZW4pIHtcbiAgICAgICAgICBvLmNoaWxkcmVuID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGNvbnRyb2xsZXIucm91dGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgby5jaGlsZHJlbi5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IGNvbnRyb2xsZXIucm91dGVzW2pdLm5hbWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbztcblxuICAgICAgLy9cbiAgICAgIC8vXG4gICAgICAvLyBjaGlsZHJlbi5jb25jYXQoY29udHJvbGxlci5yb3V0ZXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIC8vICAgcmV0dXJuIHsgbmFtZTogaXRlbS5uYW1lIH07XG4gICAgICAvLyB9KSk7XG4gICAgICAvL1xuXG5cbiAgICB9XG4gICAgLy9cbiAgICAvLyBqc29uID0ge1xuICAgIC8vICAgbmFtZTogJHNjb3BlLmFwaS5jb250cm9sbGVyLm5hbWUsXG4gICAgLy8gICBjaGlsZHJlbjogW3tcbiAgICAvLyAgICAgICBcIm5hbWVcIjogXCJhbmFseXRpY3NcIixcbiAgICAvLyAgICAgICBcImNoaWxkcmVuXCI6IFt7XG4gICAgLy8gICAgICAgICBcIm5hbWVcIjogXCJjbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICBcImNoaWxkcmVuXCI6IFt7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIkFnZ2xvbWVyYXRpdmVDbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICAgIFwic2l6ZVwiOiAzOTM4XG4gICAgLy8gICAgICAgICB9LCB7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIkNvbW11bml0eVN0cnVjdHVyZVwiLFxuICAgIC8vICAgICAgICAgICBcInNpemVcIjogMzgxMlxuICAgIC8vICAgICAgICAgfSwge1xuICAgIC8vICAgICAgICAgICBcIm5hbWVcIjogXCJIaWVyYXJjaGljYWxDbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICAgIFwic2l6ZVwiOiA2NzE0XG4gICAgLy8gICAgICAgICB9LCB7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIk1lcmdlRWRnZVwiLFxuICAgIC8vICAgICAgICAgICBcInNpemVcIjogNzQzXG4gICAgLy8gICAgICAgICB9XVxuICAgIC8vICAgICAgIH1dXG4gICAgLy8gICAgIH1dXG4gICAgLy8gICB9O1xuICAgIGpzb24gPSBidWlsZCgkc2NvcGUuYXBpLmNvbnRyb2xsZXIpO1xuXG5cbiAgICByb290ID0ganNvbjtcbiAgICByb290LngwID0gaCAvIDI7XG4gICAgcm9vdC55MCA9IDA7XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVBbGwoZCkge1xuICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgZC5jaGlsZHJlbi5mb3JFYWNoKHRvZ2dsZUFsbCk7XG4gICAgICAgIHRvZ2dsZShkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBkaXNwbGF5IHRvIHNob3cgYSBmZXcgbm9kZXMuXG4gICAgcm9vdC5jaGlsZHJlbi5mb3JFYWNoKHRvZ2dsZUFsbCk7XG4gICAgLy90b2dnbGUocm9vdC5jaGlsZHJlblsxXSk7XG4gICAgLy8gdG9nZ2xlKHJvb3QuY2hpbGRyZW5bMV0uY2hpbGRyZW5bMl0pO1xuICAgIC8vIHRvZ2dsZShyb290LmNoaWxkcmVuWzldKTtcbiAgICAvLyB0b2dnbGUocm9vdC5jaGlsZHJlbls5XS5jaGlsZHJlblswXSk7XG5cbiAgICB1cGRhdGUocm9vdCk7XG5cblxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuICAgICAgdmFyIGR1cmF0aW9uID0gZDMuZXZlbnQgJiYgZDMuZXZlbnQuYWx0S2V5ID8gNTAwMCA6IDUwMDtcblxuICAgICAgLy8gQ29tcHV0ZSB0aGUgbmV3IHRyZWUgbGF5b3V0LlxuICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KS5yZXZlcnNlKCk7XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZC55ID0gZC5kZXB0aCAqIDE4MDtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIG5vZGVz4oCmXG4gICAgICB2YXIgbm9kZSA9IHZpcy5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBFbnRlciBhbnkgbmV3IG5vZGVzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKCkuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55MCArIFwiLFwiICsgc291cmNlLngwICsgXCIpXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB0b2dnbGUoZCk7XG4gICAgICAgICAgdXBkYXRlKGQpO1xuICAgICAgICB9KTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcInN2ZzpjaXJjbGVcIilcbiAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpXG4gICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLl9jaGlsZHJlbiA/IFwibGlnaHRzdGVlbGJsdWVcIiA6IFwiI2ZmZlwiO1xuICAgICAgICB9KTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcInN2Zzp0ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyAtMTAgOiAxMDtcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gXCJlbmRcIiA6IFwic3RhcnRcIjtcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBub2RlcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICB2YXIgbm9kZVVwZGF0ZSA9IG5vZGUudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueSArIFwiLFwiICsgZC54ICsgXCIpXCI7XG4gICAgICAgIH0pO1xuXG4gICAgICBub2RlVXBkYXRlLnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImxpZ2h0c3RlZWxibHVlXCIgOiBcIiNmZmZcIjtcbiAgICAgICAgfSk7XG5cbiAgICAgIG5vZGVVcGRhdGUuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgdmFyIG5vZGVFeGl0ID0gbm9kZS5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55ICsgXCIsXCIgKyBzb3VyY2UueCArIFwiKVwiO1xuICAgICAgICB9KVxuICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcInJcIiwgMWUtNik7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcInRleHRcIilcbiAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDFlLTYpO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIGxpbmtz4oCmXG4gICAgICB2YXIgbGluayA9IHZpcy5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIilcbiAgICAgICAgLmRhdGEodHJlZS5saW5rcyhub2RlcyksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC50YXJnZXQuaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBFbnRlciBhbnkgbmV3IGxpbmtzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJzdmc6cGF0aFwiLCBcImdcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICAgIHg6IHNvdXJjZS54MCxcbiAgICAgICAgICAgIHk6IHNvdXJjZS55MFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIGRpYWdvbmFsKHtcbiAgICAgICAgICAgIHNvdXJjZTogbyxcbiAgICAgICAgICAgIHRhcmdldDogb1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBsaW5rcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICBsaW5rLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgbGluay5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICAgIHg6IHNvdXJjZS54LFxuICAgICAgICAgICAgeTogc291cmNlLnlcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7XG4gICAgICAgICAgICBzb3VyY2U6IG8sXG4gICAgICAgICAgICB0YXJnZXQ6IG9cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICAvLyBTdGFzaCB0aGUgb2xkIHBvc2l0aW9ucyBmb3IgdHJhbnNpdGlvbi5cbiAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICBkLngwID0gZC54O1xuICAgICAgICBkLnkwID0gZC55O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVG9nZ2xlIGNoaWxkcmVuLlxuICAgIGZ1bmN0aW9uIHRvZ2dsZShkKSB7XG4gICAgICBpZiAoZC5jaGlsZHJlbikge1xuICAgICAgICBkLl9jaGlsZHJlbiA9IGQuY2hpbGRyZW47XG4gICAgICAgIGQuY2hpbGRyZW4gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5jaGlsZHJlbiA9IGQuX2NoaWxkcmVuO1xuICAgICAgICBkLl9jaGlsZHJlbiA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG5cblxuXG5cbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignQXBpUm91dGVDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcblxuICAgICRzY29wZS5yb3V0ZSA9ICRzY29wZS5hcGkuZmluZFJvdXRlKCRzdGF0ZVBhcmFtcy5yb3V0ZUlkKTtcblxuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbJyRzY29wZScsICckbW9kYWxJbnN0YW5jZScsICdkYXRhJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuXG4gICAgJHNjb3BlLnRpdGxlID0gZGF0YS50aXRsZTtcbiAgICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAgICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoKTtcbiAgICB9O1xuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdBcHBDdHJsJywgWyckc2NvcGUnLFxuICBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAkc2NvcGUubmF2YmFyQ29sbGFwc2VkID0gZmFsc2U7XG4gIH1cbl0pO1xuXG5hcHAuY29udHJvbGxlcignQXJyYXlEZWZDdHJsJywgWyckc2NvcGUnLCAnZGlhbG9nJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkZGlhbG9nKSB7XG5cbiAgICB2YXIgZGVmID0gJHNjb3BlLmRlZjtcblxuICAgICRzY29wZS5kZWZEYXRhID0ge1xuICAgICAgb2Z0eXBlOiBkZWYub2Z0eXBlXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2RlZkRhdGEub2Z0eXBlJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICBpZiAobmV3VmFsdWUgPT09IG9sZFZhbHVlIHx8IG5ld1ZhbHVlID09PSBkZWYub2Z0eXBlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6ICdNb2RpZnkga2V5IHR5cGUnLFxuICAgICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IGNoYW5nZSB0aGUgdHlwZSBvZiBBcnJheSBrZXkgWycgKyBkZWYua2V5Lm5hbWUgKyAnXT8nXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIHJlZGVmaW5lIGRlZiBvZnR5cGVcbiAgICAgICAgdmFyIHR5cGUgPSBuZXdWYWx1ZTtcblxuICAgICAgICBkZWYuZGVmaW5lKHtcbiAgICAgICAgICBvZnR5cGU6IHR5cGUsXG4gICAgICAgICAgZGVmOiB7fVxuICAgICAgICB9LCBkZWYua2V5KTtcblxuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5kZWZEYXRhLm9mdHlwZSA9IG9sZFZhbHVlO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuXG4gIH1cbl0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAnZGF0YScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UsIGRhdGEpIHtcblxuICAgICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2U7XG5cbiAgICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICAgIH07XG4gIH1cbl0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0RiQ3RybCcsIFsnJHNjb3BlJywgJyRzdGF0ZScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlKSB7XG5cblxuXG4gICAgJHNjb3BlLmdvdG9Nb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCdkYi5tb2RlbCcsIHtcbiAgICAgICAgLy9wYXRoOiBvYmoucGF0aCA/IG9iai5wYXRoKCkubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAubmFtZTsgfSkuam9pbignLycpIDogJydcbiAgICAgICAgbW9kZWxOYW1lOiAnZGVtbydcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdLZXlDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ2RpYWxvZycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkZGlhbG9nKSB7XG4gICAgdmFyIGtleSA9ICRzY29wZS5tb2RlbC5nZXRLZXlCeUlkKCRzdGF0ZVBhcmFtcy5rZXlJZCk7XG5cbiAgICAkc2NvcGUua2V5ID0ga2V5O1xuXG4gICAgJHNjb3BlLmtleURhdGEgPSB7XG4gICAgICB0eXBlOiBrZXkgPyBrZXkudHlwZSA6ICcnXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2tleURhdGEudHlwZScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgaWYgKG5ld1ZhbHVlID09PSBvbGRWYWx1ZSB8fCBuZXdWYWx1ZSA9PT0ga2V5LnR5cGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgICB0aXRsZTogJ01vZGlmeSBrZXkgdHlwZScsXG4gICAgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gbW9kaWZ5IGtleSBbJyArIGtleS5uYW1lICsgJ10/J1xuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyByZWRlZmluZSBrZXkgdHlwZVxuICAgICAgICB2YXIgdHlwZSA9IG5ld1ZhbHVlO1xuICAgICAgICB2YXIgbmV3RGVmID0gdHlwZSA9PT0gJ0FycmF5JyA/IHtcbiAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgIGRlZjoge1xuICAgICAgICAgICAgb2Z0eXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgIGRlZjoge31cbiAgICAgICAgICB9XG4gICAgICAgIH0gOiB7XG4gICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICBkZWY6IHt9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcmVkZWZpbmUga2V5IGRlZlxuICAgICAgICBrZXkudHlwZSA9IHR5cGU7XG4gICAgICAgIGtleS5kZWZpbmUobmV3RGVmKTtcblxuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5rZXlEYXRhLnR5cGUgPSBvbGRWYWx1ZTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgfVxuXSk7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBkYiA9IHJlcXVpcmUoJy4uL21vZGVscy9kYicpO1xudmFyIGRhZ3JlID0gcmVxdWlyZSgnZGFncmUnKTtcblxuYXBwLmNvbnRyb2xsZXIoJ01vZGVsQ3RybCcsIFsnJHNjb3BlJywgJyRodHRwJywgJyRzdGF0ZScsICckbW9kYWwnLCAnZGlhbG9nJywgJyR0aW1lb3V0JywgJ21vZGVsUHJvbWlzZScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHAsICRzdGF0ZSwgJG1vZGFsLCAkZGlhbG9nLCAkdGltZW91dCwgbW9kZWxQcm9taXNlKSB7XG5cbiAgICB2YXIgbW9kZWwgPSBPYmplY3QuY3JlYXRlKGRiKTtcblxuICAgIG1vZGVsLmluaXRpYWxpemUobW9kZWxQcm9taXNlLmRhdGEpO1xuXG4gICAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBzY29wZSBkYXRhXG4gICAgJHNjb3BlLmRhdGEgPSB7XG4gICAgICBpc0NvbGxhcHNlZDogZmFsc2VcbiAgICB9O1xuXG5cbiAgICAvLyR0aW1lb3V0KGF1dG9MYXlvdXQpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kZWwubmFtZScsIGZ1bmN0aW9uKG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgY29uc29sZS5sb2coJ3Jlbm1hZSBmaWxlJyk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUubW9kZWxBc0pzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHN0cmlwIG91dCAkJGhhc2hLZXkgZXRjLlxuICAgICAgcmV0dXJuIGFuZ3VsYXIudG9Kc29uKEpTT04ucGFyc2UobW9kZWwudG9Kc29uKCkpLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNob3dNb2RlbEpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi1qc29uLmh0bWwnLFxuICAgICAgICBzY29wZTogJHNjb3BlXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNob3dNb2RlbERpYWdyYW0gPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi1kaWFncmFtLmh0bWwnLFxuICAgICAgICBzY29wZTogJHNjb3BlXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvdG9QYXRoID0gZnVuY3Rpb24ob2JqKSB7XG5cbiAgICAgIHZhciBpc01vZGVsID0gb2JqLnNjaGVtYXM7XG4gICAgICB2YXIgaXNTY2hlbWEgPSAhaXNNb2RlbCAmJiAhb2JqLnR5cGU7XG5cbiAgICAgIGlmIChpc01vZGVsKSB7XG5cbiAgICAgICAgJHN0YXRlLmdvKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgICAgIG1vZGVsTmFtZTogb2JqLm5hbWVcbiAgICAgICAgfSk7XG5cbiAgICAgIH0gZWxzZSBpZiAoaXNTY2hlbWEpIHtcblxuICAgICAgICAkc3RhdGUuZ28oJ2RiLm1vZGVsLnNjaGVtYScsIHtcbiAgICAgICAgICBzY2hlbWFJZDogb2JqLmlkXG4gICAgICAgIH0pO1xuXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgICRzdGF0ZS5nbygnZGIubW9kZWwuc2NoZW1hLmtleScsIHtcbiAgICAgICAgICBzY2hlbWFJZDogb2JqLmtleXMuc2NoZW1hLmlkLFxuICAgICAgICAgIGtleUlkOiBvYmouaWRcbiAgICAgICAgfSk7XG5cbiAgICAgIH1cblxuXG4gICAgfTtcblxuICAgIHZhciBpZGVtcG90ZW50aWFsaXplID0gZnVuY3Rpb24oZikge1xuICAgICAgdmFyIHByZXZpb3VzO1xuICAgICAgdmFyIGZfaWRlbXBvdGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmV0ID0gZigpO1xuICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMocmV0LCBwcmV2aW91cykpIHtcbiAgICAgICAgICByZXQgPSBwcmV2aW91cztcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IHJldDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZl9pZGVtcG90ZW50O1xuICAgIH07XG5cbiAgICAkc2NvcGUuZXJyb3JzID0gaWRlbXBvdGVudGlhbGl6ZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lcnJvcnMoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRTY2hlbWEgPSBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHNjaGVtYSA9IG1vZGVsLmNyZWF0ZVNjaGVtYSgpO1xuICAgICAgc2NoZW1hLmluaXRpYWxpemUoe1xuICAgICAgICBpZDogdXRpbHMuZ2V0dWlkKCksXG4gICAgICAgIG5hbWU6ICdOZXdTY2hlbWFOYW1lJyxcbiAgICAgICAgaW5zdGFsbGVkOiB0cnVlLFxuICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgaXRlbXM6IFt7XG4gICAgICAgICAgICAnbmFtZSc6ICdGaXJzdEtleU5hbWUnLFxuICAgICAgICAgICAgJ3R5cGUnOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICdkZWYnOiB7XG4gICAgICAgICAgICAgICdyZXF1aXJlZCc6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgbW9kZWwuaW5zZXJ0U2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICRzY29wZS5nb3RvUGF0aChzY2hlbWEpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlU2NoZW1hID0gZnVuY3Rpb24oc2NoZW1hKSB7XG5cbiAgICAgICRkaWFsb2cuY29uZmlybSh7XG4gICAgICAgIHRpdGxlOiAnRGVsZXRlIHNjaGVtYScsXG4gICAgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHNjaGVtYSBbJyArIHNjaGVtYS5kb3RQYXRoKCkgKyAnXT8nXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBzY2hlbWEuZGIucmVtb3ZlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIC8vIGdvIHRvIG1vZGVsIHJvb3RcbiAgICAgICAgJHNjb3BlLmdvdG9QYXRoKHNjaGVtYS5kYik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEtleSA9IGZ1bmN0aW9uKGtleXMsIHNpYmxpbmcsIGluc2VydEFib3ZlKSB7XG5cbiAgICAgIC8vIGFkZCBhIG5ldyBLZXksIG9wdGlvbmFsbHkgcGFzc2luZyBhIHJlbGF0aXZlIHNpYmxpbmcgdG8gaW5zZXJ0IG5leHQgdG8gZWl0aGVyIGFib3ZlIG9yIGJlbG93XG5cbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBpZDogdXRpbHMuZ2V0dWlkKCksXG4gICAgICAgIG5hbWU6ICdOZXdLZXlOYW1lJyxcbiAgICAgICAgdHlwZTogJ1N0cmluZycsXG4gICAgICAgIGRlZjoge31cbiAgICAgIH07XG5cbiAgICAgIHZhciBrZXk7XG4gICAgICBpZiAoc2libGluZykge1xuICAgICAgICB2YXIgc2libGluZ0luZGV4ID0gc2libGluZy5rZXlzLml0ZW1zLmluZGV4T2Yoc2libGluZyk7XG4gICAgICAgIHZhciBpbmRleCA9IGluc2VydEFib3ZlID8gc2libGluZ0luZGV4IDogKytzaWJsaW5nSW5kZXg7XG4gICAgICAgIGtleSA9IGtleXMuaW5zZXJ0S2V5KGRhdGEsIGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleSA9IGtleXMuYWRkS2V5KGRhdGEpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuZ290b1BhdGgoa2V5KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUtleSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgJGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6ICdEZWxldGUga2V5JyxcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUga2V5IFsnICsga2V5LmRvdFBhdGgoKSArICddPydcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGtleS5rZXlzLmRlbGV0ZUtleShrZXkpO1xuICAgICAgICAkc2NvcGUuZ290b1BhdGgoa2V5LmtleXMuc2NoZW1hKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUtleVVwID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgaXRlbXMgPSBrZXkua2V5cy5pdGVtcztcbiAgICAgIHZhciBpbmRleCA9IGl0ZW1zLmluZGV4T2Yoa2V5KTtcbiAgICAgIGl0ZW1zLm1vdmUoaW5kZXgsIC0taW5kZXgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUtleURvd24gPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBpdGVtcyA9IGtleS5rZXlzLml0ZW1zO1xuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihrZXkpO1xuICAgICAgaXRlbXMubW92ZShpbmRleCwgKytpbmRleCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGF1dG9MYXlvdXQoKSB7XG4gICAgICB2YXIgZyA9IG5ldyBkYWdyZS5EaWdyYXBoKCk7XG4gICAgICB2YXIgZWRnZXMgPSBbXTtcbiAgICAgIHZhciBlbDtcbiAgICAgIC8vICQoJy5zY2hlbWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAvLyAgICAgdmFyIGlkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgLy8gICAgIGcuYWRkTm9kZShpZCwge1xuICAgICAgLy8gICAgICAgICBsYWJlbDogaWQsXG4gICAgICAvLyAgICAgICAgIHdpZHRoOiAkdGhpcy53aWR0aCgpLFxuICAgICAgLy8gICAgICAgICBoZWlnaHQ6ICR0aGlzLmhlaWdodCgpXG4gICAgICAvLyAgICAgfSk7XG4gICAgICAvLyAgICAgJHRoaXMuZmluZCgnLmtleS1oZWFkZXJbZGF0YS1yZWZdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIC8vICAgICAgICAgZWRnZXMucHVzaChbJCh0aGlzKS5kYXRhKCdyZWYnKSwgaWRdKTtcbiAgICAgIC8vICAgICB9KTtcbiAgICAgIC8vIH0pO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vZGVsLnNjaGVtYXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNjaGVtYSA9IG1vZGVsLnNjaGVtYXNbaV07XG4gICAgICAgIHZhciBpZCA9IHNjaGVtYS5pZDtcbiAgICAgICAgLy8gZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgIC8vIGVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgLy8gdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpO1xuXG4gICAgICAgIGcuYWRkTm9kZShpZCwge1xuICAgICAgICAgIGxhYmVsOiBpZCxcbiAgICAgICAgICAvLyB3aWR0aDogcGFyc2VGbG9hdChzdHlsZS53aWR0aCksXG4gICAgICAgICAgLy8gaGVpZ2h0OiBwYXJzZUZsb2F0KHN0eWxlLmhlaWdodClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHNjaGVtYVJlZmVyZW5jZXMgPSBzY2hlbWEuc2NoZW1hUmVmZXJlbmNlcygpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNjaGVtYVJlZmVyZW5jZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBlZGdlcy5wdXNoKFtzY2hlbWFSZWZlcmVuY2VzW2pdLmtleXMuc2NoZW1hLmlkLCBpZF0pO1xuICAgICAgICB9XG5cbiAgICAgIH1cblxuXG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IGVkZ2VzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIGcuYWRkRWRnZShudWxsLCBlZGdlc1trXVswXSwgZWRnZXNba11bMV0pO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGF5b3V0ID0gZGFncmUubGF5b3V0KCkubm9kZVNlcCgyMCkuZWRnZVNlcCg1KS5yYW5rU2VwKDIwKS5ydW4oZyk7XG4gICAgICAvLyB2YXIgbGF5b3V0ID0gZGFncmUubGF5b3V0KCkucnVuKGcpO1xuICAgICAgbGF5b3V0LmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG5cbiAgICAgICAgLy8gZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh1KTtcbiAgICAgICAgLy8gZWwuc3R5bGUudG9wID0gdmFsdWUueSArICdweCc7XG4gICAgICAgIC8vIGVsLnN0eWxlLmxlZnQgPSB2YWx1ZS54ICsgJ3B4JztcbiAgICAgICAgLy8gZWwuc3R5bGUud2lkdGggPSAnMjAwcHgnO1xuICAgICAgICAvLyBlbC5zdHlsZS5oZWlnaHQgPSAnMzAwcHgnO1xuICAgICAgICAvLyBlbC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignUHJvbXB0Q3RybCcsIFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgJ2RhdGEnLFxuICBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG5cbiAgICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAgICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAgICRzY29wZS5wbGFjZWhvbGRlciA9IGRhdGEucGxhY2Vob2xkZXI7XG4gICAgJHNjb3BlLmlucHV0ID0ge1xuICAgICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gICAgfTtcblxuICAgICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gICAgfTtcbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignU2NoZW1hQ3RybCcsIFsnJHNjb3BlJywgJyRzdGF0ZVBhcmFtcycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnNjaGVtYSA9ICRzY29wZS5tb2RlbC5nZXRTY2hlbWFCeUlkKCRzdGF0ZVBhcmFtcy5zY2hlbWFJZCk7XG4gIH1cbl0pO1xuIiwidmFyIEJlaGF2ZSA9IHJlcXVpcmUoJy4uL3ZlbmRvci9iZWhhdmUnKTtcblxuLy8gLy8gQXV0b3NpemUgYmVoYXZlIHRleHRhcmVhXG4vLyBCZWhhdmVIb29rcy5hZGQoWydrZXlkb3duJ10sIGZ1bmN0aW9uKGRhdGEpIHtcbi8vICAgdmFyIG51bUxpbmVzID0gZGF0YS5saW5lcy50b3RhbCxcbi8vICAgICBmb250U2l6ZSA9IHBhcnNlSW50KGdldENvbXB1dGVkU3R5bGUoZGF0YS5lZGl0b3IuZWxlbWVudClbJ2ZvbnQtc2l6ZSddKSxcbi8vICAgICBwYWRkaW5nID0gcGFyc2VJbnQoZ2V0Q29tcHV0ZWRTdHlsZShkYXRhLmVkaXRvci5lbGVtZW50KVsncGFkZGluZyddKTtcbi8vICAgZGF0YS5lZGl0b3IuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAoKChudW1MaW5lcyAqIGZvbnRTaXplKSArIHBhZGRpbmcpKSArICdweCc7XG4vLyB9KTtcblxuXG5hcHAuZGlyZWN0aXZlKCdiZWhhdmUnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgdmFyIGVkaXRvciA9IG5ldyBCZWhhdmUoe1xuICAgICAgICB0ZXh0YXJlYTogZWxlbWVudFswXSxcbiAgICAgICAgcmVwbGFjZVRhYjogdHJ1ZSxcbiAgICAgICAgc29mdFRhYnM6IHRydWUsXG4gICAgICAgIHRhYlNpemU6IDIsXG4gICAgICAgIGF1dG9PcGVuOiB0cnVlLFxuICAgICAgICBvdmVyd3JpdGU6IHRydWUsXG4gICAgICAgIGF1dG9TdHJpcDogdHJ1ZSxcbiAgICAgICAgYXV0b0luZGVudDogdHJ1ZSxcbiAgICAgICAgZmVuY2U6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImRlc3Ryb3lcIik7XG4gICAgICAgIGVkaXRvci5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2RiRGlhZ3JhbScsIFsnJHRpbWVvdXQnLCBmdW5jdGlvbigkdGltZW91dCkge1xuICByZXR1cm4ge1xuICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvZGlyZWN0aXZlcy9kYi1kaWFncmFtLmh0bWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG5cbiAgICAgIHZhciBtb2RlbCA9IHNjb3BlLm1vZGVsO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcblxuXG4gICAgICAgIHZhciBzdGF0ZXMgPSBtb2RlbC5zY2hlbWFzLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgbGFiZWw6IGl0ZW0ubmFtZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBlZGdlcyA9IG1vZGVsLnNjaGVtYVJlZmVyZW5jZXMoKS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1OiBpdGVtLmtleXMuc2NoZW1hLmlkLFxuICAgICAgICAgICAgdjogaXRlbS5yZWYoKSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgIGxhYmVsOiBpdGVtLm5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIENyZWF0ZSBhIGdyYXBoIGZyb20gdGhlIEpTT05cbiAgICAgICAgdmFyIGcgPSBkYWdyZUQzLmpzb24uZGVjb2RlKHN0YXRlcywgZWRnZXMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVuZGVyZXJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gbmV3IGRhZ3JlRDMuUmVuZGVyZXIoKTtcblxuICAgICAgICAvLyBTZXQgdXAgYW4gU1ZHIGdyb3VwIHNvIHRoYXQgd2UgY2FuIHRyYW5zbGF0ZSB0aGUgZmluYWwgZ3JhcGguXG4gICAgICAgIHZhciBzdmdFbCA9IGVsZW1lbnQuZmluZCgnc3ZnJylbMF07XG4gICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3Qoc3ZnRWwpO1xuICAgICAgICAvL3ZhciBzdmcgPSBkMy5zZWxlY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGQzLm5zLnByZWZpeC5zdmcsICdzdmcnKSk7XG4gICAgICAgIC8vc3ZnLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuICAgICAgICB2YXIgc3ZnR3JvdXAgPSBzdmcuYXBwZW5kKCdnJyk7XG5cbiAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3ZnRWwpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwid2lkdGhcIiwgc3ZnRWwud2lkdGgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImhlaWdodFwiLCBzdmdFbC5oZWlnaHQpO1xuXG4gICAgICAgIC8vc3ZnLmF0dHIoXCJ3aWR0aFwiLCBzdHlsZS53aWR0aCkuYXR0cihcImhlaWdodFwiLCBlbGVtZW50LmhlaWdodCk7XG4gIC8vZWxlbWVudC5hcHBlbmQoc3ZnWzBdWzBdKTtcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgem9vbSB0byA3NSVcbiAgICAgICAgdmFyIGluaXRpYWxTY2FsZSA9IDAuNzU7XG4gICAgICAgIHZhciBvbGRab29tID0gcmVuZGVyZXIuem9vbSgpO1xuICAgICAgICByZW5kZXJlci56b29tKGZ1bmN0aW9uKGdyYXBoLCBzdmcpIHtcbiAgICAgICAgICB2YXIgem9vbSA9IG9sZFpvb20oZ3JhcGgsIHN2Zyk7XG5cbiAgICAgICAgICAvLyBXZSBtdXN0IHNldCB0aGUgem9vbSBhbmQgdGhlbiB0cmlnZ2VyIHRoZSB6b29tIGV2ZW50IHRvIHN5bmNocm9uaXplXG4gICAgICAgICAgLy8gRDMgYW5kIHRoZSBET00uXG4gICAgICAgICAgem9vbS5zY2FsZShpbml0aWFsU2NhbGUpLmV2ZW50KHN2Zyk7XG4gICAgICAgICAgcmV0dXJuIHpvb207XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJ1biB0aGUgcmVuZGVyZXIuIFRoaXMgaXMgd2hhdCBkcmF3cyB0aGUgZmluYWwgZ3JhcGguXG4gICAgICAgIHZhciBsYXlvdXQgPSByZW5kZXJlci5ydW4oZywgc3ZnR3JvdXApO1xuXG4gICAgICAgIC8vIENlbnRlciB0aGUgZ3JhcGhcbiAgICAgICAgdmFyIHhDZW50ZXJPZmZzZXQgPSAoc3ZnLmF0dHIoJ3dpZHRoJykgLSBsYXlvdXQuZ3JhcGgoKS53aWR0aCAqIGluaXRpYWxTY2FsZSkgLyAyO1xuICAgICAgICBzdmdHcm91cC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB4Q2VudGVyT2Zmc2V0ICsgJywgMjApJyk7XG4gICAgICAgIC8vc3ZnLmF0dHIoJ2hlaWdodCcsIGxheW91dC5ncmFwaCgpLmhlaWdodCAqIGluaXRpYWxTY2FsZSArIDQwKTtcblxuICAgICAgfSwgNTAwKTtcblxuXG5cblxuICAgIH1cbiAgfTtcbn1dKTtcbiIsImFwcC5kaXJlY3RpdmUoJ2ZvY3VzJyxcblxuICBmdW5jdGlvbigkdGltZW91dCkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHRyaWdnZXI6ICdAZm9jdXMnXG4gICAgICB9LFxuXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICBzY29wZS4kd2F0Y2goJ3RyaWdnZXInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWxlbWVudFswXS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIFxuKTtcbiIsImFwcC5kaXJlY3RpdmUoJ25lZ2F0ZScsIFtcblxuICBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJpYnV0ZSwgbmdNb2RlbENvbnRyb2xsZXIpIHtcbiAgICAgICAgbmdNb2RlbENvbnRyb2xsZXIuJGlzRW1wdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiAhIXZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIG5nTW9kZWxDb250cm9sbGVyLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gIXZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZ01vZGVsQ29udHJvbGxlci4kcGFyc2Vycy51bnNoaWZ0KGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuICF2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXSk7Iiwid2luZG93LmFwcCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hcHAnKTtcblxuLy8gKioqKioqKioqKipcbi8vIFNoaW1zXG4vLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9zaGltcy9hcnJheScpO1xuXG53aW5kb3cuX2FwaSA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9hcGkvYXBpJyk7XG5cblxuLy8gKioqKioqKioqKipcbi8vIERpcmVjdGl2ZXNcbi8vICoqKioqKioqKioqXG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvbmVnYXRlJyk7XG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbnJlcXVpcmUoJy4vZGlyZWN0aXZlcy9kYi1kaWFncmFtJyk7XG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvYmVoYXZlJyk7XG5cblxuLy8gKioqKioqKioqKipcbi8vIENvbnRyb2xsZXJzXG4vLyAqKioqKioqKioqKlxuXG4vLyBkaWFsb2cgY29udHJvbGxlcnNcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMvY29uZmlybScpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9hbGVydCcpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9wcm9tcHQnKTtcblxuLy8gZGIgbW9kZWwgY29udHJvbGxlcnNcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMva2V5Jyk7XG5yZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuXG5cbi8vIGFwaSBtb2RlbCBjb250cm9sbGVyc1xucmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYXBpJyk7XG5yZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9jb250cm9sbGVyJyk7XG5yZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9yb3V0ZScpO1xucmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuXG5cblxuLy8gKioqKioqKioqKipcbi8vIFNlcnZpY2VzXG4vLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKTtcblxuXG5cbi8vIE1haW4gQXBwIEN0cmxcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXBwJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7fSxcbiAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShhbmd1bGFyLnRvSnNvbih0aGlzKSk7XG4gIH0sXG4gIG5hbWVSZWdleFZhbGlkYXRlOiAvXlthLXpBLVpdW2EtekEtWjAtOV9dezAsMjl9JC9cbn07XG5cbi8vICB2YXIgcHJvcGVydHlEZWZpbml0aW9ucyA9IHtcbi8vICAgIG51bWJlclByb3BlcnR5OiBmdW5jdGlvbiAoaW5pdGlhbFZhbHVlKSB7XG4vLyAgICAgIHZhciBwcm9wZXJ0eVZhbHVlLCBwcm9wZXJ0eURlc2NyaXB0b3I7XG4vL1xuLy8gICAgICBwcm9wZXJ0eURlc2NyaXB0b3IgPSB7XG4vLyAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICByZXR1cm4gcHJvcGVydHlWYWx1ZTtcbi8vICAgICAgICB9LFxuLy8gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4vLyAgICAgICAgICBpZiAoIWlzTmFOKHZhbHVlKSkge1xuLy8gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbi8vICAgICAgICAgIH1cbi8vICAgICAgICB9XG4vLyAgICAgIH07XG4vLyAgICAgIGlmIChpbml0aWFsVmFsdWUpIHtcbi8vICAgICAgICBwcm9wZXJ0eURlc2NyaXB0b3Iuc2V0KGluaXRpYWxWYWx1ZSk7XG4vLyAgICAgIH1cbi8vICAgICAgcmV0dXJuIHByb3BlcnR5RGVzY3JpcHRvcjtcbi8vICAgIH0sXG4vLyAgICBib29sZWFuUHJvcGVydHk6IGZ1bmN0aW9uIChpbml0aWFsVmFsdWUpIHtcbi8vICAgICAgdmFyIHByb3BlcnR5VmFsdWUsIHByb3BlcnR5RGVzY3JpcHRvcjtcbi8vXG4vLyAgICAgIHByb3BlcnR5RGVzY3JpcHRvciA9IHtcbi8vICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgIHJldHVybiBwcm9wZXJ0eVZhbHVlO1xuLy8gICAgICAgIH0sXG4vLyAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbi8vICAgICAgICAgIHZhciB2YWwgPSB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUudG9Mb3dlckNhc2UoKSA6IHZhbHVlO1xuLy8gICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHZhbCA/IEJvb2xlYW4odmFsID09PSAnZmFsc2UnIHx8IHZhbCA9PT0gJ29mZicgPyB1bmRlZmluZWQgOiB2YWwpIDogdW5kZWZpbmVkO1xuLy8gICAgICAgIH1cbi8vICAgICAgfTtcbi8vICAgICAgaWYgKGluaXRpYWxWYWx1ZSkge1xuLy8gICAgICAgIHByb3BlcnR5RGVzY3JpcHRvci5zZXQoaW5pdGlhbFZhbHVlKTtcbi8vICAgICAgfVxuLy8gICAgICByZXR1cm4gcHJvcGVydHlEZXNjcmlwdG9yO1xuLy8gICAgfSxcbi8vICAgIGRhdGVQcm9wZXJ0eTogZnVuY3Rpb24gKGluaXRpYWxWYWx1ZSkge1xuLy8gICAgICB2YXIgcHJvcGVydHlWYWx1ZSwgcHJvcGVydHlEZXNjcmlwdG9yO1xuLy9cbi8vICAgICAgcHJvcGVydHlEZXNjcmlwdG9yID0ge1xuLy8gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgcmV0dXJuIHByb3BlcnR5VmFsdWU7XG4vLyAgICAgICAgfSxcbi8vICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuLy8gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlO1xuLy8gICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHZhbCA/IG5ldyBEYXRlKHZhbCkgOiB1bmRlZmluZWQ7XG4vLyAgICAgICAgfVxuLy8gICAgICB9O1xuLy8gICAgICBpZiAoaW5pdGlhbFZhbHVlKSB7XG4vLyAgICAgICAgcHJvcGVydHlEZXNjcmlwdG9yLnNldChpbml0aWFsVmFsdWUpO1xuLy8gICAgICB9XG4vLyAgICAgIHJldHVybiBwcm9wZXJ0eURlc2NyaXB0b3I7XG4vLyAgICB9XG4vLyAgfTtcbiIsInZhciBiYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIgc3RhdGljVHlwZXMgPSAnU3RyaW5nIEJvb2xlYW4gTnVtYmVyIERhdGUgTmVzdGVkRG9jdW1lbnQgQXJyYXkgRm9yZWlnbktleSBPYmplY3RJZCBNaXhlZCBCdWZmZXInLnNwbGl0KCcgJyk7XG52YXIgY2hpbGREb2N1bWVudFR5cGUgPSBbJ0NoaWxkRG9jdW1lbnQnXTtcblxudmFyIGRiID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAgaWQ6IG51bGwsXG4gIG5hbWU6IG51bGwsXG4gIGRlc2NyaXB0aW9uOiBudWxsLFxuICBzY2hlbWFzOiBbXSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgZGF0YSA9IChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YS5zY2hlbWFzKSkgPyBkYXRhIDoge1xuICAgICAgc2NoZW1hczogW11cbiAgICB9O1xuXG4gICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuICAgIHRoaXMuc2NoZW1hcyA9IFtdO1xuICAgIGlmIChkYXRhLnNjaGVtYXMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuYWRkU2NoZW1hKGRhdGEuc2NoZW1hc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBhZGRTY2hlbWE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgcyA9IHRoaXMuY3JlYXRlU2NoZW1hKCk7XG4gICAgcy5pbml0aWFsaXplKGRhdGEpO1xuICAgIHRoaXMuc2NoZW1hcy5wdXNoKHMpO1xuICAgIHJldHVybiBzO1xuICB9LFxuICBpbnNlcnRTY2hlbWE6IGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgIHRoaXMuc2NoZW1hcy5wdXNoKHNjaGVtYSk7XG4gICAgcmV0dXJuIHNjaGVtYTtcbiAgfSxcbiAgY3JlYXRlU2NoZW1hOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShzY2hlbWEsIHtcbiAgICAgIGRiOiB7XG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHZhbHVlOiB0aGlzXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGdldFNjaGVtYUJ5SWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKHRoaXMuc2NoZW1hcywge1xuICAgICAgaWQ6IGlkXG4gICAgfSk7XG4gIH0sXG4gIGdldFNjaGVtYUJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYXMuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5uYW1lID09PSBuYW1lO1xuICAgIH0pO1xuICB9LFxuICByZW1vdmVTY2hlbWE6IGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgIHRoaXMuc2NoZW1hcy5zcGxpY2UodGhpcy5zY2hlbWFzLmluZGV4T2Yoc2NoZW1hKSwgMSk7XG4gIH0sXG4gIGVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLm5hbWUpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ01vZGVsIG5hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHNjaGVtYSBuYW1lc1xuICAgIHZhciBzY2hlbWFOYW1lcyA9IHRoaXMuc2NoZW1hcy5tYXAoZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4gc2NoZW1hLm5hbWU7XG4gICAgfSk7XG5cbiAgICAvLyBlbnN1cmUgdW5pcXVlIHNjaGVtYSBuYW1lc1xuICAgIHZhciBkdXBlcyA9IHNjaGVtYU5hbWVzLnNvcnQoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycikge1xuICAgICAgcmV0dXJuIChpbmRleCAhPT0gMCkgJiYgKGl0ZW0gPT09IGFycltpbmRleCAtIDFdKTtcbiAgICB9KTtcblxuICAgIGlmIChkdXBlcy5sZW5ndGgpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ0R1cGxpY2F0ZSBzY2hlbWEgbmFtZXM6ICcgKyBfLnVuaXEoZHVwZXMpLmpvaW4oJywgJykpKTtcbiAgICB9XG5cbiAgICAvLyBidWJibGUgYW55IGluZGl2aWR1YWwgc2NoZW1hIGVycm9yc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlcnJvcnMsIHRoaXMuc2NoZW1hc1tpXS5lcnJvcnMoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfSxcbiAgaXNWYWxpZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3JzKCkubGVuZ3RoID09PSAwO1xuICB9LFxuICB2YWxpZGF0ZVNjaGVtYU5hbWU6IGZ1bmN0aW9uKG5hbWUsIGlnbm9yZVNjaGVtYSkge1xuICAgIGlmICghbmFtZSkgcmV0dXJuIG5ldyBNc2coJ05hbWUgY2Fubm90IGJlIGJsYW5rLiBQbGVhc2Ugc3VwcGx5IGEgbmFtZS4nKTtcbiAgICB2YXIgZHVwZXMgPSBfLmZpbmQodGhpcy5zY2hlbWFzLCBmdW5jdGlvbihzKSB7XG4gICAgICByZXR1cm4gcyAhPT0gaWdub3JlU2NoZW1hICYmIHMubmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGR1cGVzID8gbmV3IE1zZygnRHVwbGljYXRlIFNjaGVtYSBuYW1lLiBQbGVhc2Ugc3VwcGx5IGEgdW5pcXVlIG5hbWUuJykgOiB0cnVlO1xuICB9LFxuICBzY2hlbWFSZWZlcmVuY2VzOiBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICByZXR1cm4gdGhpcy5jaGlsZEtleXMoKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gc2NoZW1hID8ga2V5LnJlZigpID09PSBzY2hlbWEuaWQgOiBrZXkucmVmKCk7XG4gICAgfSk7XG4gIH0sXG4gIGlzU2NoZW1hUmVmZXJlbmNlZDogZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hUmVmZXJlbmNlcyhzY2hlbWEpLmxlbmd0aCA+IDA7XG4gIH0sXG4gIHN0YXRpY1R5cGVzOiBzdGF0aWNUeXBlcyxcbiAgY2hpbGREb2N1bWVudFR5cGU6IGNoaWxkRG9jdW1lbnRUeXBlLFxuICBhbGxUeXBlczogW10uY29uY2F0KHN0YXRpY1R5cGVzLCBjaGlsZERvY3VtZW50VHlwZSksXG4gIG5vdEluc3RhbGxlZFNjaGVtYXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmZpbHRlcih0aGlzLnNjaGVtYXMsIGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgICAgcmV0dXJuICFzY2hlbWEuaW5zdGFsbGVkO1xuICAgIH0pO1xuICB9LFxuICBpbnN0YWxsZWRTY2hlbWFzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIodGhpcy5zY2hlbWFzLCBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICAgIHJldHVybiBzY2hlbWEuaW5zdGFsbGVkO1xuICAgIH0pO1xuICB9LFxuICBhdmFpbGFibGVEb2N1bWVudFJlZnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLm1hcCh0aGlzLmluc3RhbGxlZFNjaGVtYXMoKSwgZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogc2NoZW1hLmlkLFxuICAgICAgICBuYW1lOiBzY2hlbWEubmFtZVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSxcbiAgYXZhaWxhYmxlQ2hpbGREb2N1bWVudFJlZnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLm1hcCh0aGlzLm5vdEluc3RhbGxlZFNjaGVtYXMoKSwgZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogc2NoZW1hLmlkLFxuICAgICAgICBuYW1lOiBzY2hlbWEubmFtZVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSxcbiAgY2hpbGRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShrZXlzLCB0aGlzLnNjaGVtYXNbaV0ua2V5cy5jaGlsZEtleXMoKSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzO1xuICB9LFxuICBmaW5kQnlQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2NoZW1hQnlOYW1lKHBhcnRzWzFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRLZXlzKCkuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLnNsYXNoUGF0aCgpID09PSBwYXRoO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBnZXRLZXlCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLmNoaWxkS2V5cygpLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0uaWQgPT09IGlkO1xuICAgIH0pO1xuICB9LFxuICB0b0pzb246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5wcm9wZXJ0eUlzRW51bWVyYWJsZShrZXkpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSwgMik7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5kYiA9IGRiO1xuIiwidmFyIGJhc2UgPSByZXF1aXJlKCcuL2Jhc2UnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG4vL1xuLy8gdG9kbyAtIHR5cGUgZ2V0dGVycy9zZXR0ZXJzIGNhc3Rpbmcgb2YgcHJvcGVydGllcyBmb3IgbnVtYmVycywgZGF0ZXMgZXRjLlxuLy9cblxudmFyIFN0cmluZ0RlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG4gIHRoaXMuZGVmYXVsdFZhbHVlID0gZGF0YS5kZWZhdWx0VmFsdWU7XG4gIHRoaXMuZW51bWVyYXRpb24gPSBkYXRhLmVudW1lcmF0aW9uO1xuICB0aGlzLnVwcGVyY2FzZSA9IGRhdGEudXBwZXJjYXNlO1xuICB0aGlzLmxvd2VyY2FzZSA9IGRhdGEubG93ZXJjYXNlO1xuICB0aGlzLm1hdGNoID0gZGF0YS5tYXRjaDtcbiAgdGhpcy50cmltID0gZGF0YS50cmltO1xufTtcblxudmFyIEJvb2xlYW5EZWYgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHRoaXMucmVxdWlyZWQgPSBkYXRhLnJlcXVpcmVkO1xuICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRhdGEuZGVmYXVsdFZhbHVlO1xufTtcblxudmFyIE51bWJlckRlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG4gIHRoaXMuZGVmYXVsdFZhbHVlID0gZGF0YS5kZWZhdWx0VmFsdWU7XG4gIHRoaXMubWluID0gZGF0YS5taW47XG4gIHRoaXMubWF4ID0gZGF0YS5tYXg7XG4gIHRoaXMuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuICAgIHZhciBtaW4gPSB0aGlzLm1pbjtcbiAgICB2YXIgbWF4ID0gdGhpcy5tYXg7XG4gICAgdmFyIGRmbHQgPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICAgIGlmIChkZmx0IDwgbWluKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdUaGUgRGVmYXVsdCB2YWx1ZSBzaG91bGQgYmUgZ3JlYXRlciB0aGFuIE1pbicpKTtcbiAgICB9XG4gICAgaWYgKGRmbHQgPiBtYXgpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ1RoZSBEZWZhdWx0IHZhbHVlIHNob3VsZCBiZSBsZXNzIHRoYW4gTWF4JykpO1xuICAgIH1cblxuICAgIGlmIChtYXggPD0gbWluKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdNYXggdmFsdWUgc2hvdWxkIGJlIGdyZWF0ZXIgdGhhbiBNaW4nKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfTtcbn07XG5cbnZhciBEYXRlRGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkYXRhLmRlZmF1bHRWYWx1ZTtcbn07XG5cbnZhciBOZXN0ZWREb2N1bWVudERlZiA9IGZ1bmN0aW9uKGRhdGEsIGtleSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5rZXlzID0gT2JqZWN0LmNyZWF0ZShyZXF1aXJlKCcuL2tleXMnKSwgeyAvLyByZXF1aXJlKCdrZXlzJykgaXMgdXNlZCBsYXppbHkgaGVyZSBzaW5jZSAna2V5cycgaXMgYSBjaXJjdWxhciBkZXBlbmRlbmN5XG4gICAgc2NoZW1hOiB7XG4gICAgICB2YWx1ZToga2V5LmtleXMuc2NoZW1hLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICB9LFxuICAgIGtleToge1xuICAgICAgdmFsdWU6IGtleSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgfVxuICB9KTtcbiAgdGhpcy5rZXlzLmluaXRpYWxpemUoZGF0YS5rZXlzID8gZGF0YS5rZXlzLml0ZW1zIDogW10pO1xuXG4gIHRoaXMuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5lcnJvcnMoKTtcbiAgfTtcbn07XG5cbnZhciBBcnJheURlZiA9IGZ1bmN0aW9uKGRhdGEsIGtleSkge1xuICB0aGlzLmRlZmluZShkYXRhLCBrZXkpO1xuICB0aGlzLmVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmRlZi5lcnJvcnMgPyB0aGlzLmRlZi5lcnJvcnMoKSA6IFtdO1xuICB9O1xufTtcbkFycmF5RGVmLnByb3RvdHlwZS5kZWZpbmUgPSBmdW5jdGlvbihkYXRhLCBrZXkpIHtcbiAgdGhpcy5vZnR5cGUgPSBkYXRhLm9mdHlwZTtcbiAgdGhpcy5kZWYgPSBPYmplY3QuY3JlYXRlKGRlZiwge1xuICAgIGtleToge1xuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZToga2V5XG4gICAgfVxuICB9KTtcbiAgdGhpcy5kZWYuaW5pdGlhbGl6ZShkYXRhKTtcbn07XG5cbnZhciBGb3JlaWduS2V5RGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5yZWYgPSBkYXRhLnJlZjtcbn07XG5cbnZhciBNaXhlZERlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG59O1xuXG52YXIgT2JqZWN0SWREZWYgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHRoaXMucmVxdWlyZWQgPSBkYXRhLnJlcXVpcmVkO1xuICB0aGlzLmF1dG8gPSBkYXRhLmF1dG87XG59O1xuXG52YXIgQnVmZmVyRGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5yZWYgPSBkYXRhLnJlZjtcbn07XG5cbnZhciBDaGlsZERvY3VtZW50RGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlZiA9IGRhdGEucmVmO1xufTtcblxuZnVuY3Rpb24gZmFjdG9yeURlZihkYXRhLCBrZXkpIHtcbiAgdmFyIHR5cGUgPSAoZGF0YS50eXBlIHx8IGRhdGEub2Z0eXBlKS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgZGVmID0gZGF0YS5kZWY7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gbmV3IFN0cmluZ0RlZihkZWYpO1xuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIG5ldyBCb29sZWFuRGVmKGRlZik7XG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyRGVmKGRlZik7XG4gICAgY2FzZSAnZGF0ZSc6XG4gICAgICByZXR1cm4gbmV3IERhdGVEZWYoZGVmKTtcbiAgICBjYXNlICduZXN0ZWRkb2N1bWVudCc6XG4gICAgICByZXR1cm4gbmV3IE5lc3RlZERvY3VtZW50RGVmKGRlZiwga2V5KTtcbiAgICBjYXNlICdhcnJheSc6XG4gICAgICByZXR1cm4gbmV3IEFycmF5RGVmKGRlZiwga2V5KTtcbiAgICBjYXNlICdmb3JlaWdua2V5JzpcbiAgICAgIHJldHVybiBuZXcgRm9yZWlnbktleURlZihkZWYpO1xuICAgIGNhc2UgJ29iamVjdGlkJzpcbiAgICAgIHJldHVybiBuZXcgT2JqZWN0SWREZWYoZGVmKTtcbiAgICBjYXNlICdtaXhlZCc6XG4gICAgICByZXR1cm4gbmV3IE1peGVkRGVmKGRlZik7XG4gICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgIHJldHVybiBuZXcgQnVmZmVyRGVmKGRlZik7XG4gICAgY2FzZSAnY2hpbGRkb2N1bWVudCc6XG4gICAgICByZXR1cm4gbmV3IENoaWxkRG9jdW1lbnREZWYoZGVmKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlIG5vdCBzdXBwb3J0ZWQnKTtcbiAgfVxufVxuXG52YXIgZGVmID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAga2V5OiBudWxsLFxuICBpbml0aWFsaXplOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgXy5leHRlbmQodGhpcywgZmFjdG9yeURlZihkYXRhLCB0aGlzLmtleSkpO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBiYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG52YXIgZGVmID0gcmVxdWlyZSgnLi9kZWYnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIga2V5ID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAga2V5czogbnVsbCxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMuaWQgPSBkYXRhLmlkIHx8IHV0aWxzLmdldHVpZCgpO1xuICAgIHRoaXMubmFtZSA9IGRhdGEubmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGF0YS5kZXNjcmlwdGlvbjtcbiAgICB0aGlzLmRlZmluZShkYXRhKTtcbiAgfSxcbiAgZGVmaW5lOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdGhpcy50eXBlID0gZGF0YS50eXBlO1xuICAgIHRoaXMuZGVmID0gT2JqZWN0LmNyZWF0ZShkZWYsIHtcbiAgICAgIGtleToge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGVmLmluaXRpYWxpemUoZGF0YSk7XG4gIH0sXG4gIHR5cGVBc1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5hbWVzID0gXy5vYmplY3QoXy5tYXAodGhpcy5rZXlzLnNjaGVtYS5kYi5zY2hlbWFzLCBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICAgIHJldHVybiBbc2NoZW1hLmlkLCBzY2hlbWEubmFtZV07XG4gICAgfSkpO1xuXG4gICAgdmFyIGRlZiA9IHRoaXMuZGVmO1xuICAgIHZhciB0ID0gdGhpcy50eXBlO1xuICAgIGlmICh0ID09PSAnQXJyYXknKSB7XG4gICAgICB2YXIgb2ZUID0gZGVmLm9mdHlwZTtcbiAgICAgIGlmIChvZlQgPT09ICdGb3JlaWduS2V5Jykge1xuICAgICAgICByZXR1cm4gJ1snICsgb2ZUICsgJzwnICsgbmFtZXNbZGVmLmRlZi5yZWZdICsgJz5dJztcbiAgICAgIH0gZWxzZSBpZiAob2ZUID09PSAnQ2hpbGREb2N1bWVudCcpIHtcbiAgICAgICAgcmV0dXJuICdbJyArIG9mVCArICc8JyArIG5hbWVzW2RlZi5kZWYucmVmXSArICc+XSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ1snICsgb2ZUICsgJ10nO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodCA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdCArICc8JyArIG5hbWVzW2RlZi5yZWZdICsgJz4nO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdDtcbiAgICB9XG4gIH0sXG4gIHJlZjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWYucmVmO1xuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSAnQXJyYXknICYmIHRoaXMuZGVmLm9mdHlwZSA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWYuZGVmLnJlZjtcbiAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gJ0FycmF5JyAmJiB0aGlzLmRlZi5vZnR5cGUgPT09ICdDaGlsZERvY3VtZW50Jykge1xuICAgICAgcmV0dXJuIHRoaXMuZGVmLmRlZi5yZWY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG4gIGlzTmVzdGVkVHlwZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PSAnTmVzdGVkRG9jdW1lbnQnO1xuICB9LFxuICBpc05lc3RlZFR5cGVBcnJheTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNBcnJheSgpICYmIHRoaXMuZGVmLm9mdHlwZSA9PT0gJ05lc3RlZERvY3VtZW50JztcbiAgfSxcbiAgaXNOZXN0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzTmVzdGVkVHlwZSgpIHx8IHRoaXMuaXNOZXN0ZWRUeXBlQXJyYXkoKTtcbiAgfSxcbiAgaXNBcnJheTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ0FycmF5JztcbiAgfSxcbiAgcGF0aDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBbdGhpc107XG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KHRoaXMua2V5cy5wYXRoKCkpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkocGF0aCwgYXJncyk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH0sXG4gIGRvdFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBhdGgoKS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5uYW1lOyB9KS5qb2luKCcuJyk7XG4gIH0sXG4gIHNsYXNoUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucGF0aCgpLm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLm5hbWU7IH0pLmpvaW4oJy8nKTtcbiAgfSxcbiAgY2hpbGRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pc05lc3RlZFR5cGUoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVmLmtleXMuY2hpbGRLZXlzKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzTmVzdGVkVHlwZUFycmF5KCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlZi5kZWYua2V5cy5jaGlsZEtleXMoKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG4gIHNpYmxpbmdzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5pdGVtcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0gIT09IHNlbGY7XG4gICAgfSk7XG4gIH0sXG4gIGVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLm5hbWUpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ05hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgdmFyIGRlZiA9IHRoaXMuZGVmO1xuICAgIHJldHVybiBkZWYuZXJyb3JzID8gZXJyb3JzLmNvbmNhdChkZWYuZXJyb3JzKCkpIDogZXJyb3JzO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXk7XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5Jyk7XG52YXIgTXNnID0gcmVxdWlyZSgnLi9tc2cnKTtcblxudmFyIGtleXMgPSBfLmV4dGVuZCh7fSwgYmFzZSwge1xuICBzY2hlbWE6IG51bGwsXG4gIGtleTogbnVsbCxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMuaXRlbXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuYWRkS2V5KGRhdGFbaV0pO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlS2V5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIG8gPSBPYmplY3QuY3JlYXRlKGtleSwge1xuICAgICAga2V5czoge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuICAgIG8uaW5pdGlhbGl6ZShkYXRhKTtcbiAgICByZXR1cm4gbztcbiAgfSxcbiAgYWRkS2V5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIG8gPSB0aGlzLmNyZWF0ZUtleShkYXRhKTtcbiAgICB0aGlzLml0ZW1zLnB1c2gobyk7XG4gICAgcmV0dXJuIG87XG4gIH0sXG4gIGluc2VydEtleTogZnVuY3Rpb24oZGF0YSwgaW5kZXgpIHtcbiAgICB2YXIgbyA9IHRoaXMuY3JlYXRlS2V5KGRhdGEpO1xuICAgIHRoaXMuaXRlbXMuc3BsaWNlKGluZGV4LCAwLCBvKTtcbiAgICByZXR1cm4gbztcbiAgfSxcbiAgZGVsZXRlS2V5OiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLml0ZW1zLmluZGV4T2Yoa2V5KTtcbiAgICBpZiAofmluZGV4KSB7XG4gICAgICB0aGlzLml0ZW1zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9LFxuICBwYXRoOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5rZXkgPyB0aGlzLmtleS5wYXRoKCkgOiB0aGlzLnNjaGVtYS5wYXRoKCk7XG4gIH0sXG4gIGNoaWxkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShrZXlzLCB0aGlzLml0ZW1zKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGtleXMsIHRoaXMuaXRlbXNbaV0uY2hpbGRLZXlzKCkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbiAgfSxcbiAgZXJyb3JzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXJyb3JzID0gW107XG4gICAgdmFyIGtleU5hbWVzID0gW107XG5cbiAgICAvLyBrZXkgZXJyb3JzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXlOYW1lcy5wdXNoKHRoaXMuaXRlbXNbaV0ubmFtZSk7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlcnJvcnMsIHRoaXMuaXRlbXNbaV0uZXJyb3JzKCkpO1xuICAgIH1cblxuICAgIC8vIGVuc3VyZSB1bmlxdWUgbmFtZXNcbiAgICB2YXIgZHVwZXMgPSBrZXlOYW1lcy5zb3J0KCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnIpIHtcbiAgICAgIHJldHVybiAoaW5kZXggIT09IDApICYmIChpdGVtID09PSBhcnJbaW5kZXggLSAxXSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZHVwZXMubGVuZ3RoKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdEdXBsaWNhdGUga2V5IG5hbWVzOiAnICsgXy51bmlxKGR1cGVzKS5qb2luKCcsICcpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5cztcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gTXNnKG1lc3NhZ2UpIHtcclxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG59O1xyXG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xudmFyIGtleXMgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIgc2NoZW1hID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAgZGI6IG51bGwsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICB0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRhdGEuZGVzY3JpcHRpb247XG4gICAgdGhpcy5pbnN0YWxsZWQgPSBkYXRhLmluc3RhbGxlZCB8fCBmYWxzZTtcbiAgICB0aGlzLmtleXMgPSBPYmplY3QuY3JlYXRlKGtleXMsIHtcbiAgICAgIHNjaGVtYToge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5rZXlzLmluaXRpYWxpemUoKGRhdGEua2V5cyAmJiBkYXRhLmtleXMuaXRlbXMpIHx8IHt9ICk7XG4gIH0sXG4gIHBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBbdGhpcy5kYiwgdGhpc107XG4gIH0sXG4gIGRvdFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBhdGgoKS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5uYW1lOyB9KS5qb2luKCcuJyk7XG4gIH0sXG4gIHNsYXNoUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucGF0aCgpLm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLm5hbWU7IH0pLmpvaW4oJy8nKTtcbiAgfSxcbiAgZXJyb3JzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXJyb3JzID0gW107XG5cbiAgICBpZiAoIXRoaXMubmFtZSkge1xuICAgICAgZXJyb3JzLnB1c2gobmV3IE1zZygnU2NoZW1hIG5hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB0aGlzLmtleXMuZXJyb3JzKCkpO1xuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfSxcbiAgc2NoZW1hUmVmZXJlbmNlczogZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgcmV0dXJuIHRoaXMuZGIuc2NoZW1hUmVmZXJlbmNlcyh0aGlzKTtcbiAgfSxcbiAgaXNTY2hlbWFSZWZlcmVuY2VkOiBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICByZXR1cm4gdGhpcy5kYi5pc1NjaGVtYVJlZmVyZW5jZWQodGhpcyk7XG4gIH0sXG4gIGNoaWxkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5jaGlsZEtleXMoKTtcbiAgfSxcbiAgZmluZEtleTogZnVuY3Rpb24ocGF0aCkge1xuICAgIHJldHVybiB0aGlzLmNoaWxkS2V5cygpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpdGVtLnBhdGgoKSA9PT0gcGF0aDtcbiAgICB9KTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZW1hO1xuIiwidmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ25nUm91dGUnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICd1aS5hY2UnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9kYlxuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKFwiL2RiXCIpO1xuXG4gIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnZGInLCB7XG4gICAgICB1cmw6ICcvZGInLFxuICAgICAgY29udHJvbGxlcjogJ0RiQ3RybCcsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLmh0bWwnXG4gICAgfSlcbiAgICAuc3RhdGUoJ2RiLm1vZGVsJywge1xuICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICBjb250cm9sbGVyOiAnTW9kZWxDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwuaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIG1vZGVsUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9tb2RlbC1lZGl0b3IuaHRtbCdcbiAgICB9KVxuICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgdXJsOiAnLzpzY2hlbWFJZCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnU2NoZW1hQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9zY2hlbWEuaHRtbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgdXJsOiAnLzprZXlJZCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnS2V5Q3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9rZXkuaHRtbCcsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnZGIubW9kZWwuZGlhZ3JhbScsIHtcbiAgICAgIHVybDogJyNkaWFncmFtJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgIC8vY29udHJvbGxlcjogJ0RpYWdyYW1DdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyQXBpU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlclxuICAgICAgLnN0YXRlKCdhcGknLCB7XG4gICAgICAgIHVybDogJy9hcGkvOmFwaU5hbWUnLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FwaS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIGFwaVByb21pc2U6IFsnJGh0dHAnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5fYXBpOyAvLyRodHRwLmdldCgnLycgKyAkc3RhdGVQYXJhbXMubW9kZWxOYW1lICsgJy5qc29uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuZGlhZ3JhbScsIHtcbiAgICAgICAgdXJsOiAnL2RpYWdyYW0nLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpRGlhZ3JhbUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9kaWFncmFtLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkucm91dGUnLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBcGlSb3V0ZUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9yb3V0ZS5odG1sJ1xuICAgICAgfSlcbiAgICAgIC5zdGF0ZSgnYXBpLmNvbnRyb2xsZXIucm91dGUnLCB7XG4gICAgICAgIHVybDogJy86cm91dGVJZCcsXG4gICAgICAgIHZpZXdzOiB7XG4gICAgICAgICAgJ3NlY29uZGFyeUBhcGknOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nc2Vjb25kYXJ5JyBpbiByb290IHN0YXRlICdhcGknXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnQXBpUm91dGVDdHJsJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL3JvdXRlLmh0bWwnXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgfVxuXG5cblxuICByZWdpc3RlckFwaVN0YXRlcygkc3RhdGVQcm92aWRlcik7XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcDtcbiIsImFwcC5zZXJ2aWNlKCdkaWFsb2cnLCBbJyRtb2RhbCcsXG4gIGZ1bmN0aW9uKCRtb2RhbCkge1xuXG4gICAgdmFyIHNlcnZpY2UgPSB7fTtcblxuICAgIHNlcnZpY2UuYWxlcnQgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYWxlcnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBbGVydEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkucmVzdWx0O1xuXG4gICAgfTtcblxuICAgIHNlcnZpY2UuY29uZmlybSA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9jb25maXJtLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnQ29uZmlybUN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkucmVzdWx0O1xuXG4gICAgfTtcblxuICAgIHNlcnZpY2UucHJvbXB0ID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL3Byb21wdC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1Byb21wdEN0cmwnLFxuICAgICAgICByZXNvbHZlOiB7XG4gICAgICAgICAgZGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0aXRsZTogZGF0YS50aXRsZSxcbiAgICAgICAgICAgICAgbWVzc2FnZTogZGF0YS5tZXNzYWdlLFxuICAgICAgICAgICAgICBkZWZhdWx0VmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlLFxuICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZGF0YS5wbGFjZWhvbGRlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLnJlc3VsdDtcblxuICAgIH07XG5cbiAgICByZXR1cm4gc2VydmljZTtcblxuICB9XG5dKTtcbiIsIkFycmF5LnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24ob2xkSW5kZXgsIG5ld0luZGV4KSB7XG5cbiAgaWYgKGlzTmFOKG5ld0luZGV4KSB8fCBpc05hTihvbGRJbmRleCkgfHwgb2xkSW5kZXggPCAwIHx8IG9sZEluZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG5ld0luZGV4IDwgMCkge1xuICAgIG5ld0luZGV4ID0gdGhpcy5sZW5ndGggLSAxO1xuICB9IGVsc2UgaWYgKG5ld0luZGV4ID49IHRoaXMubGVuZ3RoKSB7XG4gICAgbmV3SW5kZXggPSAwO1xuICB9XG5cbiAgdGhpcy5zcGxpY2UobmV3SW5kZXgsIDAsIHRoaXMuc3BsaWNlKG9sZEluZGV4LCAxKVswXSk7XG5cbiAgcmV0dXJuIG5ld0luZGV4O1xufTtcblxuaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICBBcnJheS5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgIGlmICh0aGlzID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcnJheS5wcm90b3R5cGUuZmluZCBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBPYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoID4+PiAwO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlID0gbGlzdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgbGlzdCkpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9O1xufVxuIiwiLypcbiAqIEJlaGF2ZS5qc1xuICpcbiAqIENvcHlyaWdodCAyMDEzLCBKYWNvYiBLZWxsZXkgLSBodHRwOi8vamFraWVzdGZ1LmNvbS9cbiAqIFJlbGVhc2VkIHVuZGVyIHRoZSBNSVQgTGljZW5jZVxuICogaHR0cDovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVFxuICpcbiAqIEdpdGh1YjogIGh0dHA6Ly9naXRodWIuY29tL2pha2llc3RmdS9CZWhhdmUuanMvXG4gKiBWZXJzaW9uOiAxLjVcbiAqL1xuXG5cbihmdW5jdGlvbih1bmRlZmluZWQpe1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgdmFyIEJlaGF2ZUhvb2tzID0gQmVoYXZlSG9va3MgfHwgKGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGhvb2tzID0ge307XG5cblx0XHRyZXR1cm4ge1xuXHRcdCAgICBhZGQ6IGZ1bmN0aW9uKGhvb2tOYW1lLCBmbil7XG5cdFx0XHQgICAgaWYodHlwZW9mIGhvb2tOYW1lID09IFwib2JqZWN0XCIpe1xuXHRcdFx0ICAgIFx0dmFyIGk7XG5cdFx0XHQgICAgXHRmb3IoaT0wOyBpPGhvb2tOYW1lLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0ICAgIFx0dmFyIHRoZUhvb2sgPSBob29rTmFtZVtpXTtcblx0XHRcdFx0ICAgIFx0aWYoIWhvb2tzW3RoZUhvb2tdKXtcblx0XHRcdFx0XHQgICAgXHRob29rc1t0aGVIb29rXSA9IFtdO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdGhvb2tzW3RoZUhvb2tdLnB1c2goZm4pO1xuXHRcdFx0ICAgIFx0fVxuXHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBpZighaG9va3NbaG9va05hbWVdKXtcblx0XHRcdFx0ICAgIFx0aG9va3NbaG9va05hbWVdID0gW107XG5cdFx0XHQgICAgXHR9XG5cdFx0XHQgICAgXHRob29rc1tob29rTmFtZV0ucHVzaChmbik7XG5cdFx0XHQgICAgfVxuXHRcdCAgICB9LFxuXHRcdCAgICBnZXQ6IGZ1bmN0aW9uKGhvb2tOYW1lKXtcblx0XHRcdCAgICBpZihob29rc1tob29rTmFtZV0pe1xuXHRcdFx0ICAgIFx0cmV0dXJuIGhvb2tzW2hvb2tOYW1lXTtcblx0XHQgICAgXHR9XG5cdFx0ICAgIH1cblx0ICAgIH07XG5cblx0fSkoKSxcblx0QmVoYXZlID0gQmVoYXZlIHx8IGZ1bmN0aW9uICh1c2VyT3B0cykge1xuXG4gICAgICAgIGlmICh0eXBlb2YgU3RyaW5nLnByb3RvdHlwZS5yZXBlYXQgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIFN0cmluZy5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24odGltZXMpIHtcbiAgICAgICAgICAgICAgICBpZih0aW1lcyA8IDEpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKHRpbWVzICUgMil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlcGVhdCh0aW1lcyAtIDEpICsgdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGhhbGYgPSB0aGlzLnJlcGVhdCh0aW1lcyAvIDIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBoYWxmICsgaGFsZjtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIEFycmF5LnByb3RvdHlwZS5maWx0ZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5maWx0ZXIgPSBmdW5jdGlvbihmdW5jIC8qLCB0aGlzcCAqLykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdCA9IE9iamVjdCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgbGVuID0gdC5sZW5ndGggPj4+IDA7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBmdW5jICE9IFwiZnVuY3Rpb25cIil7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICB0aGlzcCA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpIGluIHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSB0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZ1bmMuY2FsbCh0aGlzcCwgdmFsLCBpLCB0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICB0ZXh0YXJlYTogbnVsbCxcbiAgICAgICAgICAgIHJlcGxhY2VUYWI6IHRydWUsXG4gICAgICAgICAgICBzb2Z0VGFiczogdHJ1ZSxcbiAgICAgICAgICAgIHRhYlNpemU6IDQsXG4gICAgICAgICAgICBhdXRvT3BlbjogdHJ1ZSxcbiAgICAgICAgICAgIG92ZXJ3cml0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9TdHJpcDogdHJ1ZSxcbiAgICAgICAgICAgIGF1dG9JbmRlbnQ6IHRydWUsXG4gICAgICAgICAgICBmZW5jZTogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgdGFiLFxuICAgICAgICBuZXdMaW5lLFxuICAgICAgICBjaGFyU2V0dGluZ3MgPSB7XG5cbiAgICAgICAgICAgIGtleU1hcDogW1xuICAgICAgICAgICAgICAgIHsgb3BlbjogXCJcXFwiXCIsIGNsb3NlOiBcIlxcXCJcIiwgY2FuQnJlYWs6IGZhbHNlIH0sXG4gICAgICAgICAgICAgICAgeyBvcGVuOiBcIidcIiwgY2xvc2U6IFwiJ1wiLCBjYW5CcmVhazogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICB7IG9wZW46IFwiKFwiLCBjbG9zZTogXCIpXCIsIGNhbkJyZWFrOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgIHsgb3BlbjogXCJbXCIsIGNsb3NlOiBcIl1cIiwgY2FuQnJlYWs6IHRydWUgfSxcbiAgICAgICAgICAgICAgICB7IG9wZW46IFwie1wiLCBjbG9zZTogXCJ9XCIsIGNhbkJyZWFrOiB0cnVlIH1cbiAgICAgICAgICAgIF1cblxuICAgICAgICB9LFxuICAgICAgICB1dGlscyA9IHtcblxuICAgICAgICBcdF9jYWxsSG9vazogZnVuY3Rpb24oaG9va05hbWUsIHBhc3NEYXRhKXtcbiAgICBcdFx0XHR2YXIgaG9va3MgPSBCZWhhdmVIb29rcy5nZXQoaG9va05hbWUpO1xuXHQgICAgXHRcdHBhc3NEYXRhID0gdHlwZW9mIHBhc3NEYXRhPT1cImJvb2xlYW5cIiAmJiBwYXNzRGF0YSA9PT0gZmFsc2UgPyBmYWxzZSA6IHRydWU7XG5cblx0ICAgIFx0XHRpZihob29rcyl7XG5cdFx0XHQgICAgXHRpZihwYXNzRGF0YSl7XG5cdFx0XHRcdCAgICBcdHZhciB0aGVFZGl0b3IgPSBkZWZhdWx0cy50ZXh0YXJlYSxcblx0XHRcdFx0ICAgIFx0XHR0ZXh0VmFsID0gdGhlRWRpdG9yLnZhbHVlLFxuXHRcdFx0XHQgICAgXHRcdGNhcmV0UG9zID0gdXRpbHMuY3Vyc29yLmdldCgpLFxuXHRcdFx0XHQgICAgXHRcdGk7XG5cblx0XHRcdFx0ICAgIFx0Zm9yKGk9MDsgaTxob29rcy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdFx0ICAgIFx0aG9va3NbaV0uY2FsbCh1bmRlZmluZWQsIHtcblx0XHRcdFx0XHQgICAgXHRcdGVkaXRvcjoge1xuXHRcdFx0XHRcdFx0ICAgIFx0XHRlbGVtZW50OiB0aGVFZGl0b3IsXG5cdFx0XHRcdFx0XHQgICAgXHRcdHRleHQ6IHRleHRWYWwsXG5cdFx0XHRcdFx0XHQgICAgXHRcdGxldmVsc0RlZXA6IHV0aWxzLmxldmVsc0RlZXAoKVxuXHRcdFx0XHRcdCAgICBcdFx0fSxcblx0XHRcdFx0XHRcdCAgICBcdGNhcmV0OiB7XG5cdFx0XHRcdFx0XHRcdCAgICBcdHBvczogY2FyZXRQb3Ncblx0XHRcdFx0XHRcdCAgICBcdH0sXG5cdFx0XHRcdFx0XHQgICAgXHRsaW5lczoge1xuXHRcdFx0XHRcdFx0XHQgICAgXHRjdXJyZW50OiB1dGlscy5jdXJzb3IuZ2V0TGluZSh0ZXh0VmFsLCBjYXJldFBvcyksXG5cdFx0XHRcdFx0XHRcdCAgICBcdHRvdGFsOiB1dGlscy5lZGl0b3IuZ2V0TGluZXModGV4dFZhbClcblx0XHRcdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0XHQgICAgXHR9KTtcblx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0ICAgIFx0fSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Zm9yKGk9MDsgaTxob29rcy5sZW5ndGg7IGkrKyl7XG5cdFx0XHRcdCAgICBcdFx0aG9va3NbaV0uY2FsbCh1bmRlZmluZWQpO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHQgICAgXHR9XG5cdFx0ICAgIFx0fVxuXHQgICAgXHR9LFxuXG4gICAgICAgICAgICBkZWZpbmVOZXdMaW5lOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHZhciB0YSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJyk7XG4gICAgICAgICAgICAgICAgdGEudmFsdWUgPSBcIlxcblwiO1xuXG4gICAgICAgICAgICAgICAgaWYodGEudmFsdWUubGVuZ3RoPT0yKXtcbiAgICAgICAgICAgICAgICAgICAgbmV3TGluZSA9IFwiXFxyXFxuXCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3TGluZSA9IFwiXFxuXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlZmluZVRhYlNpemU6IGZ1bmN0aW9uKHRhYlNpemUpe1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS5PVGFiU2l6ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHMudGV4dGFyZWEuc3R5bGUuT1RhYlNpemUgPSB0YWJTaXplOyByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS5Nb3pUYWJTaXplICE9IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS5Nb3pUYWJTaXplID0gdGFiU2l6ZTsgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGVmYXVsdHMudGV4dGFyZWEuc3R5bGUudGFiU2l6ZSAhPSBcInVuZGVmaW5lZFwiKXtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHMudGV4dGFyZWEuc3R5bGUudGFiU2l6ZSA9IHRhYlNpemU7IHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY3Vyc29yOiB7XG5cdCAgICAgICAgICAgIGdldExpbmU6IGZ1bmN0aW9uKHRleHRWYWwsIHBvcyl7XG5cdFx0ICAgICAgICBcdHJldHVybiAoKHRleHRWYWwuc3Vic3RyaW5nKDAscG9zKSkuc3BsaXQoXCJcXG5cIikpLmxlbmd0aDtcblx0ICAgICAgICBcdH0sXG5cdCAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpLnNlbGVjdGlvblN0YXJ0PT09XCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRzLnRleHRhcmVhLnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGRvY3VtZW50LnNlbGVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhcmV0UG9zID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZSA9IGRlZmF1bHRzLnRleHRhcmVhLmNyZWF0ZVRleHRSYW5nZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlRHVwZSA9IGRvY3VtZW50LnNlbGVjdGlvbi5jcmVhdGVSYW5nZSgpLmR1cGxpY2F0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlRHVwZUJvb2ttYXJrID0gcmFuZ2VEdXBlLmdldEJvb2ttYXJrKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlVG9Cb29rbWFyayhyYW5nZUR1cGVCb29rbWFyayk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyYW5nZS5tb3ZlU3RhcnQoJ2NoYXJhY3RlcicgLCAtMSkgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXJldFBvcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhcmV0UG9zO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFlbmQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRzLnRleHRhcmVhLnNldFNlbGVjdGlvblJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0cy50ZXh0YXJlYS5mb2N1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHMudGV4dGFyZWEuc2V0U2VsZWN0aW9uUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZGVmYXVsdHMudGV4dGFyZWEuY3JlYXRlVGV4dFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmFuZ2UgPSBkZWZhdWx0cy50ZXh0YXJlYS5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2UubW92ZUVuZCgnY2hhcmFjdGVyJywgZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJywgc3RhcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2Uuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNlbGVjdGlvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRleHRBcmVhRWxlbWVudCA9IGRlZmF1bHRzLnRleHRhcmVhLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dElucHV0UmFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBsZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRSYW5nZTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRleHRBcmVhRWxlbWVudC5zZWxlY3Rpb25TdGFydCA9PSBcIm51bWJlclwiICYmIHR5cGVvZiB0ZXh0QXJlYUVsZW1lbnQuc2VsZWN0aW9uRW5kID09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gdGV4dEFyZWFFbGVtZW50LnNlbGVjdGlvblN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gdGV4dEFyZWFFbGVtZW50LnNlbGVjdGlvbkVuZDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlID0gZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyYW5nZSAmJiByYW5nZS5wYXJlbnRFbGVtZW50KCkgPT0gdGV4dEFyZWFFbGVtZW50KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3JtYWxpemVkVmFsdWUgPSB1dGlscy5lZGl0b3IuZ2V0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuID0gbm9ybWFsaXplZFZhbHVlLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRJbnB1dFJhbmdlID0gdGV4dEFyZWFFbGVtZW50LmNyZWF0ZVRleHRSYW5nZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHRJbnB1dFJhbmdlLm1vdmVUb0Jvb2ttYXJrKHJhbmdlLmdldEJvb2ttYXJrKCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kUmFuZ2UgPSB0ZXh0QXJlYUVsZW1lbnQuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kUmFuZ2UuY29sbGFwc2UoZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHRJbnB1dFJhbmdlLmNvbXBhcmVFbmRQb2ludHMoXCJTdGFydFRvRW5kXCIsIGVuZFJhbmdlKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gZW5kID0gbGVuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0ID0gLXRleHRJbnB1dFJhbmdlLm1vdmVTdGFydChcImNoYXJhY3RlclwiLCAtbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgKz0gbm9ybWFsaXplZFZhbHVlLnNsaWNlKDAsIHN0YXJ0KS5zcGxpdChuZXdMaW5lKS5sZW5ndGggLSAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZXh0SW5wdXRSYW5nZS5jb21wYXJlRW5kUG9pbnRzKFwiRW5kVG9FbmRcIiwgZW5kUmFuZ2UpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IGxlbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IC10ZXh0SW5wdXRSYW5nZS5tb3ZlRW5kKFwiY2hhcmFjdGVyXCIsIC1sZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kICs9IG5vcm1hbGl6ZWRWYWx1ZS5zbGljZSgwLCBlbmQpLnNwbGl0KG5ld0xpbmUpLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RhcnQ9PWVuZCA/IGZhbHNlIDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kOiBlbmRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWRpdG9yOiB7XG4gICAgICAgICAgICAgICAgZ2V0TGluZXM6IGZ1bmN0aW9uKHRleHRWYWwpe1xuXHRcdCAgICAgICAgXHRyZXR1cm4gKHRleHRWYWwpLnNwbGl0KFwiXFxuXCIpLmxlbmd0aDtcblx0ICAgICAgICBcdH0sXG5cdCAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlZmF1bHRzLnRleHRhcmVhLnZhbHVlLnJlcGxhY2UoL1xcci9nLCcnKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzLnRleHRhcmVhLnZhbHVlID0gZGF0YTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmVuY2VSYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2YgZGVmYXVsdHMuZmVuY2UgPT0gXCJzdHJpbmdcIil7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGRhdGEgPSB1dGlscy5lZGl0b3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBoYWNrZWQgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEZlbmNlID0gZGF0YS5pbmRleE9mKGRlZmF1bHRzLmZlbmNlKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoQ2FzZSA9IDA7XG5cbiAgICAgICAgICAgICAgICAgICAgd2hpbGUobWF0Y2hlZEZlbmNlPj0wKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoQ2FzZSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIHBvcyA8IChtYXRjaGVkRmVuY2UraGFja2VkKSApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBoYWNrZWQgKz0gbWF0Y2hlZEZlbmNlK2RlZmF1bHRzLmZlbmNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhLnN1YnN0cmluZyhtYXRjaGVkRmVuY2UrZGVmYXVsdHMuZmVuY2UubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRGZW5jZSA9IGRhdGEuaW5kZXhPZihkZWZhdWx0cy5mZW5jZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmKCAoaGFja2VkKSA8IHBvcyAmJiAoIChtYXRjaGVkRmVuY2UraGFja2VkKSA+IHBvcyApICYmIG1hdGNoQ2FzZSUyPT09MCl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzRXZlbjogZnVuY3Rpb24oX3RoaXMsaSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGklMjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsZXZlbHNEZWVwOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHZhciBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHV0aWxzLmVkaXRvci5nZXQoKTtcblxuICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gdmFsLnN1YnN0cmluZygwLCBwb3MpLFxuICAgICAgICAgICAgICAgICAgICBsZXZlbHMgPSAwLFxuICAgICAgICAgICAgICAgICAgICBpLCBqO1xuXG4gICAgICAgICAgICAgICAgZm9yKGk9MDsgaTxsZWZ0Lmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChqPTA7IGo8Y2hhclNldHRpbmdzLmtleU1hcC5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2hhclNldHRpbmdzLmtleU1hcFtqXS5jYW5CcmVhayl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2hhclNldHRpbmdzLmtleU1hcFtqXS5vcGVuID09IGxlZnQuY2hhckF0KGkpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWxzKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoY2hhclNldHRpbmdzLmtleU1hcFtqXS5jbG9zZSA9PSBsZWZ0LmNoYXJBdChpKSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVscy0tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0b0RlY3JlbWVudCA9IDAsXG4gICAgICAgICAgICAgICAgICAgIHF1b3RlTWFwID0gW1wiJ1wiLCBcIlxcXCJcIl07XG4gICAgICAgICAgICAgICAgZm9yKGk9MDsgaTxjaGFyU2V0dGluZ3Mua2V5TWFwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0uY2FuQnJlYWspe1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGogaW4gcXVvdGVNYXApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvRGVjcmVtZW50ICs9IGxlZnQuc3BsaXQocXVvdGVNYXBbal0pLmZpbHRlcih1dGlscy5pc0V2ZW4pLmpvaW4oJycpLnNwbGl0KGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0ub3BlbikubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBmaW5hbExldmVscyA9IGxldmVscyAtIHRvRGVjcmVtZW50O1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZpbmFsTGV2ZWxzID49MCA/IGZpbmFsTGV2ZWxzIDogMDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWVwRXh0ZW5kOiBmdW5jdGlvbihkZXN0aW5hdGlvbiwgc291cmNlKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzb3VyY2VbcHJvcGVydHldICYmIHNvdXJjZVtwcm9wZXJ0eV0uY29uc3RydWN0b3IgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVtwcm9wZXJ0eV0uY29uc3RydWN0b3IgPT09IE9iamVjdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gZGVzdGluYXRpb25bcHJvcGVydHldIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuZGVlcEV4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVzdGluYXRpb25bcHJvcGVydHldID0gc291cmNlW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGVzdGluYXRpb247XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWRkRXZlbnQ6IGZ1bmN0aW9uIGFkZEV2ZW50KGVsZW1lbnQsIGV2ZW50TmFtZSwgZnVuYykge1xuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIpe1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLGZ1bmMsZmFsc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dGFjaEV2ZW50KFwib25cIitldmVudE5hbWUsIGZ1bmMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW1vdmVFdmVudDogZnVuY3Rpb24gYWRkRXZlbnQoZWxlbWVudCwgZXZlbnROYW1lLCBmdW5jKXtcblx0ICAgICAgICAgICAgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcil7XG5cdCAgICAgICAgICAgICAgICBlbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLGZ1bmMsZmFsc2UpO1xuXHQgICAgICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcblx0ICAgICAgICAgICAgICAgIGVsZW1lbnQuZGV0YWNoRXZlbnQoXCJvblwiK2V2ZW50TmFtZSwgZnVuYyk7XG5cdCAgICAgICAgICAgIH1cblx0ICAgICAgICB9LFxuXG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdEV2ZW50OiBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgICAgICBpZihlLnByZXZlbnREZWZhdWx0KXtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGUucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGludGVyY2VwdCA9IHtcbiAgICAgICAgICAgIHRhYktleTogZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgICAgIGlmKCF1dGlscy5mZW5jZVJhbmdlKCkpeyByZXR1cm47IH1cblxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gOSkge1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5wcmV2ZW50RGVmYXVsdEV2ZW50KGUpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b1JldHVybiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygndGFiOmJlZm9yZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBzZWxlY3Rpb24gPSB1dGlscy5jdXJzb3Iuc2VsZWN0aW9uKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB1dGlscy5lZGl0b3IuZ2V0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoc2VsZWN0aW9uKXtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBTdGFydCA9IHNlbGVjdGlvbi5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKHRlbXBTdGFydC0tKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih2YWwuY2hhckF0KHRlbXBTdGFydCk9PVwiXFxuXCIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxlY3Rpb24uc3RhcnQgPSB0ZW1wU3RhcnQgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0luZGVudCA9IHZhbC5zdWJzdHJpbmcoc2VsZWN0aW9uLnN0YXJ0LCBzZWxlY3Rpb24uZW5kKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lcyA9IHRvSW5kZW50LnNwbGl0KFwiXFxuXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGUuc2hpZnRLZXkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihpID0gMDsgaTxsaW5lcy5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxpbmVzW2ldLnN1YnN0cmluZygwLHRhYi5sZW5ndGgpID09IHRhYil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lc1tpXSA9IGxpbmVzW2ldLnN1YnN0cmluZyh0YWIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b0luZGVudCA9IGxpbmVzLmpvaW4oXCJcXG5cIik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5lZGl0b3Iuc2V0KCB2YWwuc3Vic3RyaW5nKDAsc2VsZWN0aW9uLnN0YXJ0KSArIHRvSW5kZW50ICsgdmFsLnN1YnN0cmluZyhzZWxlY3Rpb24uZW5kKSApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmN1cnNvci5zZXQoc2VsZWN0aW9uLnN0YXJ0LCBzZWxlY3Rpb24uc3RhcnQrdG9JbmRlbnQubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IoaSBpbiBsaW5lcyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzW2ldID0gdGFiICsgbGluZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvSW5kZW50ID0gbGluZXMuam9pbihcIlxcblwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoIHZhbC5zdWJzdHJpbmcoMCxzZWxlY3Rpb24uc3RhcnQpICsgdG9JbmRlbnQgKyB2YWwuc3Vic3RyaW5nKHNlbGVjdGlvbi5lbmQpICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChzZWxlY3Rpb24uc3RhcnQsIHNlbGVjdGlvbi5zdGFydCt0b0luZGVudC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGxlZnQgPSB2YWwuc3Vic3RyaW5nKDAsIHBvcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB2YWwuc3Vic3RyaW5nKHBvcyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdGVkID0gbGVmdCArIHRhYiArIHJpZ2h0O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihlLnNoaWZ0S2V5KXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih2YWwuc3Vic3RyaW5nKHBvcy10YWIubGVuZ3RoLCBwb3MpID09IHRhYil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRlZCA9IHZhbC5zdWJzdHJpbmcoMCwgcG9zLXRhYi5sZW5ndGgpICsgcmlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoZWRpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MtdGFiLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5lZGl0b3Iuc2V0KGVkaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MgKyB0YWIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1JldHVybiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygndGFiOmFmdGVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0b1JldHVybjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnRlcktleTogZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgICAgIGlmKCF1dGlscy5mZW5jZVJhbmdlKCkpeyByZXR1cm47IH1cblxuICAgICAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT0gMTMpIHtcblxuICAgICAgICAgICAgICAgICAgICB1dGlscy5wcmV2ZW50RGVmYXVsdEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5fY2FsbEhvb2soJ2VudGVyOmJlZm9yZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWwgPSB1dGlscy5lZGl0b3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gdmFsLnN1YnN0cmluZygwLCBwb3MpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB2YWwuc3Vic3RyaW5nKHBvcyksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZWZ0Q2hhciA9IGxlZnQuY2hhckF0KGxlZnQubGVuZ3RoIC0gMSksXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodENoYXIgPSByaWdodC5jaGFyQXQoMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBudW1UYWJzID0gdXRpbHMubGV2ZWxzRGVlcCgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3VySW5kZW50ID0gXCJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NpbmdCcmVhayA9IFwiXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5hbEN1cnNvclBvcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGk7XG4gICAgICAgICAgICAgICAgICAgIGlmKCFudW1UYWJzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsQ3Vyc29yUG9zID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlKG51bVRhYnMtLSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3VySW5kZW50Kz10YWI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXJJbmRlbnQgPSBvdXJJbmRlbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaW5hbEN1cnNvclBvcyA9IG91ckluZGVudC5sZW5ndGggKyAxO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaT0wOyBpPGNoYXJTZXR0aW5ncy5rZXlNYXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhclNldHRpbmdzLmtleU1hcFtpXS5vcGVuID09IGxlZnRDaGFyICYmIGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0uY2xvc2UgPT0gcmlnaHRDaGFyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2luZ0JyZWFrID0gbmV3TGluZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZhciBlZGl0ZWQgPSBsZWZ0ICsgbmV3TGluZSArIG91ckluZGVudCArIGNsb3NpbmdCcmVhayArIChvdXJJbmRlbnQuc3Vic3RyaW5nKDAsIG91ckluZGVudC5sZW5ndGgtdGFiLmxlbmd0aCkgKSArIHJpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5lZGl0b3Iuc2V0KGVkaXRlZCk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLmN1cnNvci5zZXQocG9zICsgZmluYWxDdXJzb3JQb3MpO1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5fY2FsbEhvb2soJ2VudGVyOmFmdGVyJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlbGV0ZUtleTogZnVuY3Rpb24gKGUpIHtcblxuXHQgICAgICAgICAgICBpZighdXRpbHMuZmVuY2VSYW5nZSgpKXsgcmV0dXJuOyB9XG5cblx0ICAgICAgICAgICAgaWYoZS5rZXlDb2RlID09IDgpe1xuXHQgICAgICAgICAgICBcdHV0aWxzLnByZXZlbnREZWZhdWx0RXZlbnQoZSk7XG5cblx0ICAgICAgICAgICAgXHR1dGlscy5fY2FsbEhvb2soJ2RlbGV0ZTpiZWZvcmUnKTtcblxuXHQgICAgICAgICAgICBcdHZhciBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG5cdCAgICAgICAgICAgICAgICAgICAgdmFsID0gdXRpbHMuZWRpdG9yLmdldCgpLFxuXHQgICAgICAgICAgICAgICAgICAgIGxlZnQgPSB2YWwuc3Vic3RyaW5nKDAsIHBvcyksXG5cdCAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB2YWwuc3Vic3RyaW5nKHBvcyksXG5cdCAgICAgICAgICAgICAgICAgICAgbGVmdENoYXIgPSBsZWZ0LmNoYXJBdChsZWZ0Lmxlbmd0aCAtIDEpLFxuXHQgICAgICAgICAgICAgICAgICAgIHJpZ2h0Q2hhciA9IHJpZ2h0LmNoYXJBdCgwKSxcblx0ICAgICAgICAgICAgICAgICAgICBpO1xuXG5cdCAgICAgICAgICAgICAgICBpZiggdXRpbHMuY3Vyc29yLnNlbGVjdGlvbigpID09PSBmYWxzZSApe1xuXHQgICAgICAgICAgICAgICAgICAgIGZvcihpPTA7IGk8Y2hhclNldHRpbmdzLmtleU1hcC5sZW5ndGg7IGkrKykge1xuXHQgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhclNldHRpbmdzLmtleU1hcFtpXS5vcGVuID09IGxlZnRDaGFyICYmIGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0uY2xvc2UgPT0gcmlnaHRDaGFyKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWRpdGVkID0gdmFsLnN1YnN0cmluZygwLHBvcy0xKSArIHZhbC5zdWJzdHJpbmcocG9zKzEpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuZWRpdG9yLnNldChlZGl0ZWQpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MgLSAxKTtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgIH1cblx0ICAgICAgICAgICAgICAgICAgICB2YXIgZWRpdGVkID0gdmFsLnN1YnN0cmluZygwLHBvcy0xKSArIHZhbC5zdWJzdHJpbmcocG9zKTtcblx0ICAgICAgICAgICAgICAgICAgICB1dGlscy5lZGl0b3Iuc2V0KGVkaXRlZCk7XG5cdCAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MgLSAxKTtcblx0ICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICAgICAgICAgICAgICBcdHZhciBzZWwgPSB1dGlscy5jdXJzb3Iuc2VsZWN0aW9uKCksXG5cdCAgICAgICAgICAgICAgICBcdFx0ZWRpdGVkID0gdmFsLnN1YnN0cmluZygwLHNlbC5zdGFydCkgKyB2YWwuc3Vic3RyaW5nKHNlbC5lbmQpO1xuXHQgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoZWRpdGVkKTtcblx0ICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHBvcyk7XG5cdCAgICAgICAgICAgICAgICB9XG5cblx0ICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnZGVsZXRlOmFmdGVyJyk7XG5cblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2hhckZ1bmNzID0ge1xuICAgICAgICAgICAgb3BlbmVkQ2hhcjogZnVuY3Rpb24gKF9jaGFyLCBlKSB7XG4gICAgICAgICAgICAgICAgdXRpbHMucHJldmVudERlZmF1bHRFdmVudChlKTtcbiAgICAgICAgICAgICAgICB1dGlscy5fY2FsbEhvb2soJ29wZW5DaGFyOmJlZm9yZScpO1xuICAgICAgICAgICAgICAgIHZhciBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHV0aWxzLmVkaXRvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHZhbC5zdWJzdHJpbmcoMCwgcG9zKSxcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQgPSB2YWwuc3Vic3RyaW5nKHBvcyksXG4gICAgICAgICAgICAgICAgICAgIGVkaXRlZCA9IGxlZnQgKyBfY2hhci5vcGVuICsgX2NoYXIuY2xvc2UgKyByaWdodDtcblxuICAgICAgICAgICAgICAgIGRlZmF1bHRzLnRleHRhcmVhLnZhbHVlID0gZWRpdGVkO1xuICAgICAgICAgICAgICAgIHV0aWxzLmN1cnNvci5zZXQocG9zICsgMSk7XG4gICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCdvcGVuQ2hhcjphZnRlcicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsb3NlZENoYXI6IGZ1bmN0aW9uIChfY2hhciwgZSkge1xuICAgICAgICAgICAgICAgIHZhciBwb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG4gICAgICAgICAgICAgICAgICAgIHZhbCA9IHV0aWxzLmVkaXRvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgdG9PdmVyd3JpdGUgPSB2YWwuc3Vic3RyaW5nKHBvcywgcG9zICsgMSk7XG4gICAgICAgICAgICAgICAgaWYgKHRvT3ZlcndyaXRlID09IF9jaGFyLmNsb3NlKSB7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLnByZXZlbnREZWZhdWx0RXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnY2xvc2VDaGFyOmJlZm9yZScpO1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHV0aWxzLmN1cnNvci5nZXQoKSArIDEpO1xuICAgICAgICAgICAgICAgICAgICB1dGlscy5fY2FsbEhvb2soJ2Nsb3NlQ2hhcjphZnRlcicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhY3Rpb24gPSB7XG4gICAgICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uIChlKSB7XG5cbiAgICAgICAgICAgICAgICBpZighdXRpbHMuZmVuY2VSYW5nZSgpKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgICAgICB2YXIgdGhlQ29kZSA9IGUud2hpY2ggfHwgZS5rZXlDb2RlO1xuXG4gICAgICAgICAgICAgICAgaWYodGhlQ29kZSA9PSAzOSB8fCB0aGVDb2RlID09IDQwICYmIGUud2hpY2g9PT0wKXsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgICAgICB2YXIgX2NoYXIgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHRoZUNvZGUpLFxuICAgICAgICAgICAgICAgICAgICBpO1xuXG4gICAgICAgICAgICAgICAgZm9yKGk9MDsgaTxjaGFyU2V0dGluZ3Mua2V5TWFwLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0uY2xvc2UgPT0gX2NoYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaWRDbG9zZSA9IGRlZmF1bHRzLm92ZXJ3cml0ZSAmJiBjaGFyRnVuY3MuY2xvc2VkQ2hhcihjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLCBlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkaWRDbG9zZSAmJiBjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLm9wZW4gPT0gX2NoYXIgJiYgZGVmYXVsdHMuYXV0b09wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGFyRnVuY3Mub3BlbmVkQ2hhcihjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLCBlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLm9wZW4gPT0gX2NoYXIgJiYgZGVmYXVsdHMuYXV0b09wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJGdW5jcy5vcGVuZWRDaGFyKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0sIGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3RlbjogZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICAgICAgaWYoZGVmYXVsdHMucmVwbGFjZVRhYil7IHV0aWxzLmFkZEV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC50YWJLZXkpOyB9XG4gICAgICAgICAgICAgICAgaWYoZGVmYXVsdHMuYXV0b0luZGVudCl7IHV0aWxzLmFkZEV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC5lbnRlcktleSk7IH1cbiAgICAgICAgICAgICAgICBpZihkZWZhdWx0cy5hdXRvU3RyaXApeyB1dGlscy5hZGRFdmVudChkZWZhdWx0cy50ZXh0YXJlYSwgJ2tleWRvd24nLCBpbnRlcmNlcHQuZGVsZXRlS2V5KTsgfVxuXG4gICAgICAgICAgICAgICAgdXRpbHMuYWRkRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlwcmVzcycsIGFjdGlvbi5maWx0ZXIpO1xuXG4gICAgICAgICAgICAgICAgdXRpbHMuYWRkRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlkb3duJywgZnVuY3Rpb24oKXsgdXRpbHMuX2NhbGxIb29rKCdrZXlkb3duJyk7IH0pO1xuICAgICAgICAgICAgICAgIHV0aWxzLmFkZEV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5dXAnLCBmdW5jdGlvbigpeyB1dGlscy5fY2FsbEhvb2soJ2tleXVwJyk7IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBpbml0ID0gZnVuY3Rpb24gKG9wdHMpIHtcblxuICAgICAgICAgICAgaWYob3B0cy50ZXh0YXJlYSl7XG4gICAgICAgICAgICBcdHV0aWxzLl9jYWxsSG9vaygnaW5pdDpiZWZvcmUnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgdXRpbHMuZGVlcEV4dGVuZChkZWZhdWx0cywgb3B0cyk7XG4gICAgICAgICAgICAgICAgdXRpbHMuZGVmaW5lTmV3TGluZSgpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRzLnNvZnRUYWJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYiA9IFwiIFwiLnJlcGVhdChkZWZhdWx0cy50YWJTaXplKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0YWIgPSBcIlxcdFwiO1xuXG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLmRlZmluZVRhYlNpemUoZGVmYXVsdHMudGFiU2l6ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYWN0aW9uLmxpc3RlbigpO1xuICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnaW5pdDphZnRlcicsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB1dGlscy5yZW1vdmVFdmVudChkZWZhdWx0cy50ZXh0YXJlYSwgJ2tleWRvd24nLCBpbnRlcmNlcHQudGFiS2V5KTtcblx0ICAgICAgICB1dGlscy5yZW1vdmVFdmVudChkZWZhdWx0cy50ZXh0YXJlYSwgJ2tleWRvd24nLCBpbnRlcmNlcHQuZW50ZXJLZXkpO1xuXHQgICAgICAgIHV0aWxzLnJlbW92ZUV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC5kZWxldGVLZXkpO1xuXHQgICAgICAgIHV0aWxzLnJlbW92ZUV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5cHJlc3MnLCBhY3Rpb24uZmlsdGVyKTtcbiAgICAgICAgfTtcblxuICAgICAgICBpbml0KHVzZXJPcHRzKTtcblxuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBCZWhhdmU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBlbmRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdGhpcy5CZWhhdmUgPSBCZWhhdmU7XG4gICAgICAgIHRoaXMuQmVoYXZlSG9va3MgPSBCZWhhdmVIb29rcztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgZGVmaW5lKFwiYmVoYXZlXCIsIFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gQmVoYXZlO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pLmNhbGwodGhpcyk7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5mdW5jdGlvbiBSb3V0ZShjb250cm9sbGVyLCBpZCwgdmVyYiwgdXJsLCByb3V0ZVBpcGVsaW5lKSB7XG4gIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gIHRoaXMuaWQgPSBpZDtcbiAgdGhpcy51cmwgPSB1cmw7XG4gIHRoaXMudmVyYiA9IHZlcmI7XG4gIHRoaXMucm91dGVQaXBlbGluZSA9IHJvdXRlUGlwZWxpbmU7XG59XG5Sb3V0ZS5wcm90b3R5cGUudmVyYnMgPSBbJ0FMTCcsICdHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJ107XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhSb3V0ZS5wcm90b3R5cGUsIHtcbiAgaGFuZGxlcnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMucm91dGVQaXBlbGluZS5oYW5kbGVyQXJncy5tYXAoZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICByZXR1cm4gaGFuZGxlci50b1N0cmluZygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gUm91dGVQaXBlbGluZShoYW5kbGVycykge1xuICAvLyBlbnN1cmUgJ0FjdGlvbicgdHlwZSBoYW5kbGVyIGlzIGxhc3QgYW5kIG9ubHkgcHJlc2VudCBvbmNlIGlmIGF0IGFsbCBwcmVzZW50XG4gIHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVycztcbn1cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFJvdXRlUGlwZWxpbmUucHJvdG90eXBlLCB7XG4gIGhhbmRsZXJBcmdzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW107XG4gICAgICB0aGlzLmhhbmRsZXJzLmZvckVhY2goZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICBhcmdzLnB1c2goaGFuZGxlciBpbnN0YW5jZW9mIEhhbmRsZXIgPyBoYW5kbGVyLmhhbmRsZXIgOiBoYW5kbGVyKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gSGFuZGxlcihuYW1lLCBoYW5kbGVyKSB7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG59XG5cbmZ1bmN0aW9uIE1pZGRsZXdhcmUobmFtZSwgaGFuZGxlcikge1xuICBIYW5kbGVyLmNhbGwodGhpcywgbmFtZSwgaGFuZGxlcik7XG59XG5NaWRkbGV3YXJlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSGFuZGxlci5wcm90b3R5cGUsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICB2YWx1ZTogTWlkZGxld2FyZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIEFjdGlvbihuYW1lLCBoYW5kbGVyKSB7XG4gIEhhbmRsZXIuY2FsbCh0aGlzLCBuYW1lLCBoYW5kbGVyKTtcbn1cbkFjdGlvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEhhbmRsZXIucHJvdG90eXBlLCB7XG4gIGNvbnN0cnVjdG9yOiB7XG4gICAgdmFsdWU6IEFjdGlvbixcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IHRydWVcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIENvbnRyb2xsZXIobmFtZSwgYmFzZVVybCwgY29kZSkge1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLmJhc2VVcmwgPSBiYXNlVXJsO1xuICB0aGlzLmNvZGUgPSBjb2RlO1xuICB0aGlzLl9yb3V0ZXMgPSBbXTtcbiAgdGhpcy5fbWlkZGxld2FyZSA9IFtdO1xuICB0aGlzLl9hY3Rpb25zID0gW107XG59XG5Db250cm9sbGVyLnByb3RvdHlwZSA9IHtcbiAgYWRkUm91dGU6IGZ1bmN0aW9uKHZlcmIsIHVybCkge1xuICAgIHZhciBoYW5kbGVycyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykuc3BsaWNlKDIpO1xuICAgIHZhciByb3V0ZVBpcGVsaW5lID0gbmV3IFJvdXRlUGlwZWxpbmUoaGFuZGxlcnMpO1xuICAgIHZhciByb3V0ZSA9IG5ldyBSb3V0ZSh0aGlzLCB1dGlscy5nZXR1aWQoKSwgdmVyYiwgdXJsLCByb3V0ZVBpcGVsaW5lKTtcbiAgICB0aGlzLl9yb3V0ZXMucHVzaChyb3V0ZSk7XG4gICAgcmV0dXJuIHJvdXRlO1xuICB9LFxuICBmaW5kUm91dGU6IGZ1bmN0aW9uKHZlcmIsIHVybCkge1xuICAgIHJldHVybiB0aGlzLl9yb3V0ZXMuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS52ZXJiID09PSBuYW1lICYmIGl0ZW0udXJsID09IHVybDtcbiAgICB9KTtcbiAgfSxcbiAgYWRkQWN0aW9uOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIGFjdGlvbiA9IG5ldyBBY3Rpb24obmFtZSwgaGFuZGxlcik7XG4gICAgdGhpcy5fYWN0aW9ucy5wdXNoKGFjdGlvbik7XG4gICAgcmV0dXJuIGFjdGlvbjtcbiAgfSxcbiAgZmluZEFjdGlvbjogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9hY3Rpb25zLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0ubmFtZSA9PT0gbmFtZTtcbiAgICB9KTtcbiAgfSxcbiAgYWRkTWlkZGxld2FyZTogZnVuY3Rpb24obmFtZSwgaGFuZGxlcikge1xuICAgIHZhciBtaWRkbGV3YXJlID0gbmV3IE1pZGRsZXdhcmUobmFtZSwgaGFuZGxlcik7XG4gICAgdGhpcy5fbWlkZGxld2FyZS5wdXNoKG1pZGRsZXdhcmUpO1xuICAgIHJldHVybiBtaWRkbGV3YXJlO1xuICB9LFxuICBmaW5kTWlkZGxld2FyZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLl9taWRkbGV3YXJlLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0ubmFtZSA9PT0gbmFtZTtcbiAgICB9KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBBcGkoYmFzZVVybCkge1xuICB0aGlzLl9iYXNlVXJsID0gYmFzZVVybDtcbiAgdGhpcy5fbWlkZGxld2FyZSA9IFtdO1xuICB0aGlzLl91c2VNaWRkbGV3YXJlID0gW107XG4gIHRoaXMuX2NvbnRyb2xsZXJzID0gW107XG59XG5BcGkucHJvdG90eXBlLnVzZU1pZGRsZXdhcmUgPSBmdW5jdGlvbihuYW1lLCBoYW5kbGVyLCBpbmRleCkge1xuICB0aGlzLl91c2VNaWRkbGV3YXJlLnB1c2gobmV3IE1pZGRsZXdhcmUobmFtZSwgaGFuZGxlcikpO1xufTtcbkFwaS5wcm90b3R5cGUuYWRkTWlkZGxld2FyZSA9IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIpIHtcbiAgdGhpcy5fbWlkZGxld2FyZS5wdXNoKG5ldyBNaWRkbGV3YXJlKG5hbWUsIGhhbmRsZXIpKTtcbn07XG5BcGkucHJvdG90eXBlLmFkZENvbnRyb2xsZXIgPSBmdW5jdGlvbihuYW1lLCBiYXNlVXJsLCBjb2RlKSB7XG5cbiAgaWYgKCFuYW1lIHx8IHRoaXMuZmluZENvbnRyb2xsZXIobmFtZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQ29udHJvbGxlciBOYW1lJyk7XG4gIH1cblxuICB2YXIgY29udHJvbGxlciA9IG5ldyBDb250cm9sbGVyKG5hbWUsIGJhc2VVcmwsIGNvZGUgPyBjb2RlLnRvU3RyaW5nKCkgOiAnJyk7XG4gIHRoaXMuX2NvbnRyb2xsZXJzLnB1c2goY29udHJvbGxlcik7XG4gIHJldHVybiBjb250cm9sbGVyO1xufTtcbkFwaS5wcm90b3R5cGUuZmluZENvbnRyb2xsZXIgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiB0aGlzLl9jb250cm9sbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICByZXR1cm4gaXRlbS5uYW1lID09PSBuYW1lO1xuICB9KTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhBcGkucHJvdG90eXBlLCB7XG4gIHJvdXRlczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcm91dGVzID0gW107XG4gICAgICB0aGlzLl9jb250cm9sbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocm91dGVzLCBjb250cm9sbGVyLl9yb3V0ZXMpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbiAgfVxufSk7XG5cblxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV4cHJlc3NqcyBleGFtcGxlLi4uLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG52YXIgYXBpID0gbmV3IEFwaSgnL2FwaScpO1xuXG5hcGkudXNlTWlkZGxld2FyZSgnY29va2llLXBhcnNlcicsIGZ1bmN0aW9uKHJlcywgcmVxLCBuZXh0KSB7XG4gIC8vIERvIHNvbWV0aGluZyB1c2VmdWwuXG4gIC8vIE1heWJlIG11dGF0ZSByZXEgb3IgcmVzIHN0YXRlLlxuICAvLyBUaGVuIGNhbGwgbmV4dCgpLlxuICBuZXh0KCk7XG59KTtcblxuYXBpLnVzZU1pZGRsZXdhcmUoJ2JvZHktcGFyc2VyJywgZnVuY3Rpb24ocmVzLCByZXEsIG5leHQpIHtcbiAgLy8gRG8gc29tZXRoaW5nIHVzZWZ1bC5cbiAgLy8gTWF5YmUgbXV0YXRlIHJlcSBvciByZXMgc3RhdGUuXG4gIC8vIFRoZW4gY2FsbCBuZXh0KCkuXG4gIG5leHQoKTtcbn0pO1xuXG52YXIgYXV0aE1pZGRsZXdhcmUgPSBhcGkuYWRkTWlkZGxld2FyZSgnYXV0aCcsIGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG4gIGlmICghcmVxLnF1ZXJ5LmF1dGhtZSkge1xuICAgIHJlcy5zZXRTdGF0dXMoNDAzKTtcbiAgICBuZXh0KG5ldyBFcnJvcignVW5hdXRob3JpemVkJykpO1xuICB9IGVsc2Uge1xuICAgIG5leHQoKTtcbiAgfVxufSk7XG5cbnZhciBpbmRleENvbnRyb2xsZXIgPSBhcGkuYWRkQ29udHJvbGxlcignaW5kZXgnLCAnLycsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cbiAgdmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG4gIC8vLi4uXG4gIC8vLi4uXG4gIC8vLi4uXG5cbn0pO1xuXG5pbmRleENvbnRyb2xsZXIuYWRkUm91dGUoJ0dFVCcsICcvcGluZycsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gIHJlcy5zZW5kKCdwb25nJyk7XG59KTtcblxudmFyIHVzZXJDb250cm9sbGVyID0gYXBpLmFkZENvbnRyb2xsZXIoJ3VzZXInLCAnL3VzZXInLCBmdW5jdGlvbihyZXEsIHJlcykge1xuXG4gIHZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuICAvLy4uLlxuICAvLy4uLlxuICAvLy4uLlxuXG59KTtcblxuXG52YXIgbG9hZFVzZXJNaWRkbGV3YXJlID0gdXNlckNvbnRyb2xsZXIuYWRkTWlkZGxld2FyZSgnbG9hZC11c2VyJywgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgcmVxLnVzZXIgPSB7XG4gICAgaWQ6IDEsXG4gICAgbmFtZTogJ2JvYidcbiAgfTtcbiAgbmV4dCgpO1xufSk7XG52YXIgZ2V0VXNlckFjdGlvbiA9IHVzZXJDb250cm9sbGVyLmFkZEFjdGlvbignZ2V0VXNlcicsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG4gIGNvbnNvbGUubG9nKHJlcS51c2VyKTtcbiAgcmVzLnNlbmQocmVxLnVzZXIpO1xufSk7XG5cbnVzZXJDb250cm9sbGVyLmFkZFJvdXRlKCdBTEwnLCAnL3VzZXIvKicsIGxvYWRVc2VyTWlkZGxld2FyZSk7XG51c2VyQ29udHJvbGxlci5hZGRSb3V0ZSgnR0VUJywgJy91c2VyLzppZCcsIGdldFVzZXJBY3Rpb24pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiIsImV4cG9ydHMucm5kc3RyID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiAoK25ldyBEYXRlKCkpLnRvU3RyaW5nKDM2KTtcbn07XG5cbmV4cG9ydHMuZ2V0dWlkID0gZnVuY3Rpb24oKSB7XG4gIC8vcmV0dXJuICgnJyArIE1hdGgucmFuZG9tKCkpLnJlcGxhY2UoL1xcRC9nLCAnJyk7XG4gIHJldHVybiBNYXRoLnJvdW5kKChNYXRoLnJhbmRvbSgpICogMWU3KSkudG9TdHJpbmcoKTtcbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIikpIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwicSs2NGZ3XCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiXX0=
