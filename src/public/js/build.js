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

    $state.go('api.controller', {
      controllerId: api.controller.id
    });

  }
]);

function Route(controller, id, verb, url) {
  this.controller = controller;
  this.id = id;
  this.verb = verb;
  this.url = url;
}
Route.prototype.verbs = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
Object.defineProperties(Route.prototype, {
  description: {
    get: function() {
      return this.verb.toUpperCase() + ' ' + this.url;
    }
  }
});

function Controller(controller, id, name, baseUrl, code) {
  this.controller = controller;
  this.id = id;
  this.name = name;
  this.baseUrl = baseUrl;
  this.code = code;
  this.routes = [];
  this.controllers = [];
  this.middleware = [];
}
Controller.prototype.addRoute = function(verb, url) {
  // var handlers = Array.prototype.slice.call(arguments).splice(2);
  // var routePipeline = new RoutePipeline(handlers);
  var route = new Route(this, utils.getuid(), verb || 'GET', url || this.basePath);
  this.routes.push(route);
  return route;
};
Controller.prototype.removeRoute = function(route) {
  var index = this.routes.indexOf(route);
  if (~index) {
    this.routes.splice(index, 1);
  }
};
Controller.prototype.addController = function(name, baseUrl, code) {
  var controller = new Controller(this, utils.getuid(), name, baseUrl, code ? code.toString() : '');
  this.controllers.push(controller);
  return controller;
};
Controller.prototype.removeController = function(controller) {
  var index = this.controllers.indexOf(controller);
  if (~index) {
    this.controllers.splice(index, 1);
  }
};
Controller.prototype.addMiddleware = function(id, name, baseUrl, code) {
  // var middleware = new Middleware(name, handler);
  // this._middleware.push(middleware);
  // return middleware;
};
Object.defineProperties(Controller.prototype, {
  allControllers: {
    get: function() {
      var controllers = [].concat(this);
      this.controllers.forEach(function(controller) {
        Array.prototype.push.apply(controllers, controller.allControllers);
      });
      return controllers;
    }
  },
  ascendents: {
    get: function() {
      var ascendents = [], c = this;

      while (c.controller) {
        ascendents.unshift(c.controller);
        c = c.controller;
      }

      return ascendents;
    }
  },
  basePath: {
    get: function() {
      var paths = [];

      function check(c) {
        if (c) {
          paths.push(c.baseUrl || '');
          check(c.controller);
        }
        return c ? c.baseUrl : null;
      }
      check(this);

      paths.reverse();

      return path.join.apply(path, paths);
    }
  }
});
Object.defineProperties(Controller.prototype, {
  allRoutes: {
    get: function() {
      var routes = [].concat(this.routes);
      this.controllers.forEach(function(controller) {
        Array.prototype.push.apply(routes, controller.allRoutes);
      });
      return routes;
    }
  }
});

function Api(id, name, controller) {
  this.id = id;
  this.name = name;
  this.controller = controller;
  this.middleware = [];
}
Api.prototype.findController = function(id) {
  return this.controllers.find(function(controller) {
    return controller.id === id;
  });
};
Api.prototype.findRoute = function(id) {
  return this.routes.find(function(route) {
    return route.id === id;
  });
};
Object.defineProperties(Api.prototype, {
  controllers: {
    get: function() {
      return this.controller.allControllers;
    }
  }
});
Object.defineProperties(Api.prototype, {
  routes: {
    get: function() {
      return this.controller.allRoutes;
    }
  }
});

var homeCtrl = new Controller(null, utils.getuid(), 'Home');
var api = new Api(utils.getuid(), 'test', homeCtrl);

homeCtrl.addRoute('GET', '/');
homeCtrl.addRoute('GET', '/about-us');
homeCtrl.addRoute('GET', '/contact-us');
homeCtrl.addRoute('POST', '/contact-us');

var userController = homeCtrl.addController('User', '/user', " \
var express = require('express');\n \
var http = require('http');\n \
var path = require('path');\n \
var favicon = require('static-favicon');\n \
var httpLogger = require('morgan');\n \
\n \
function hello() {}");

userController.addRoute('GET', '/user/:id');
userController.addRoute('ALL', '/user/:id/*');
userController.addRoute('POST', '/user');
userController.addRoute('PUT', '/user/:id');


var userPhotosCtrl = userController.addController('User Photos', '/:id/photos');
userPhotosCtrl.addRoute('GET', '/user/:id/photos');
userPhotosCtrl.addRoute('POST', '/user/:id/photos');
userPhotosCtrl.addRoute('PUT', '/user/:id/photos/:id');


var orderController = homeCtrl.addController('Order', '/order');
orderController.addRoute('GET', '/order/:id');
orderController.addRoute('ALL', '/order/:id/*');
orderController.addRoute('POST', '/order');
orderController.addRoute('PUT', '/order/:id');

window.api = api;

},{"../../../../shared/utils":76,"path":78}],48:[function(require,module,exports){
app.controller('ApiControllerCtrl', ['$scope', '$state', '$stateParams',
  function($scope, $state, $stateParams) {

    var controller = $scope.api.findController($stateParams.controllerId);

    $scope.controller = controller;

    $scope.addController = function() {
      var newController = controller.addController(controller.name + ' Child Controller');

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
            name: controller.routes[j].description
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
      .state('api.controller', {
        url: '/:controllerId',
        controller: 'ApiControllerCtrl',
        templateUrl: '/html/api/controller.html'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvZGVidWcuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9sYXlvdXQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL29yZGVyL2Nyb3NzQ291bnQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9pbml0TGF5ZXJHcmFwaHMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9pbml0T3JkZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9vcmRlci9zb3J0TGF5ZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9wb3NpdGlvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3JhbmsuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2FjeWNsaWMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2NvbnN0cmFpbnRzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9mZWFzaWJsZVRyZWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi9yYW5rL2luaXRSYW5rLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9saWIvcmFuay9yYW5rVXRpbC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3Jhbmsvc2ltcGxleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbGliL3V0aWwuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL2xpYi92ZXJzaW9uLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2NwLWRhdGEvbGliL1ByaW9yaXR5UXVldWUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9jcC1kYXRhL2xpYi9TZXQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9jcC1kYXRhL2xpYi91dGlsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvY3AtZGF0YS9saWIvdmVyc2lvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL0Jhc2VHcmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9DRGlncmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9DR3JhcGguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvRGlncmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9HcmFwaC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvY29tcG9uZW50cy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvZGlqa3N0cmEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL2RpamtzdHJhQWxsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9maW5kQ3ljbGVzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9mbG95ZFdhcnNoYWxsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL2FsZy9pc0FjeWNsaWMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3Bvc3RvcmRlci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvcHJlb3JkZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3ByaW0uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvYWxnL3Rhcmphbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9hbGcvdG9wc29ydC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9jb21wb3VuZGlmeS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9jb252ZXJ0ZXIvanNvbi5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi9maWx0ZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvbm9kZV9tb2R1bGVzL2RhZ3JlL25vZGVfbW9kdWxlcy9ncmFwaGxpYi9saWIvZ3JhcGgtY29udmVydGVycy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9ub2RlX21vZHVsZXMvZGFncmUvbm9kZV9tb2R1bGVzL2dyYXBobGliL2xpYi91dGlsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL25vZGVfbW9kdWxlcy9kYWdyZS9ub2RlX21vZHVsZXMvZ3JhcGhsaWIvbGliL3ZlcnNpb24uanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9hcGkvY29udHJvbGxlcnMvYXBpLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvYXBpL2NvbnRyb2xsZXJzL2NvbnRyb2xsZXIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2FwaS9jb250cm9sbGVycy9yb3V0ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2NvbnRyb2xsZXJzL2FsZXJ0LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvYXBwLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvY29uZmlybS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2NvbnRyb2xsZXJzL2RiLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMva2V5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvY29udHJvbGxlcnMvbW9kZWwuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9jb250cm9sbGVycy9wcm9tcHQuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9jb250cm9sbGVycy9zY2hlbWEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9kaXJlY3RpdmVzL2JlaGF2ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2RpcmVjdGl2ZXMvZGItZGlhZ3JhbS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2RpcmVjdGl2ZXMvZm9jdXMuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9kaXJlY3RpdmVzL25lZ2F0ZS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL2luZGV4LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL2Jhc2UuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2RlbHMvZGIuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2RlbHMvZGVmLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL2tleS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL21vZGVscy9rZXlzLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvbW9kZWxzL21zZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL21vZGVscy9zY2hlbWEuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3B1YmxpYy9qcy9tb2R1bGVzL2FwcC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL3NlcnZpY2VzL2RpYWxvZy5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvcHVibGljL2pzL3NoaW1zL2FycmF5LmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvdnNkL3NyYy9wdWJsaWMvanMvdmVuZG9yL2JlaGF2ZS9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3ZzZC9zcmMvc2hhcmVkL2FwaS9hcGkuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC92c2Qvc3JjL3NoYXJlZC91dGlscy5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3BhdGgtYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDektBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDem5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qXG5Db3B5cmlnaHQgKGMpIDIwMTItMjAxMyBDaHJpcyBQZXR0aXR0XG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbm9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbmluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbnRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbmNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuXG5USEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG5JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbkZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbk9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cblRIRSBTT0ZUV0FSRS5cbiovXG5leHBvcnRzLkRpZ3JhcGggPSByZXF1aXJlKFwiZ3JhcGhsaWJcIikuRGlncmFwaDtcbmV4cG9ydHMuR3JhcGggPSByZXF1aXJlKFwiZ3JhcGhsaWJcIikuR3JhcGg7XG5leHBvcnRzLmxheW91dCA9IHJlcXVpcmUoXCIuL2xpYi9sYXlvdXRcIik7XG5leHBvcnRzLnZlcnNpb24gPSByZXF1aXJlKFwiLi9saWIvdmVyc2lvblwiKTtcbmV4cG9ydHMuZGVidWcgPSByZXF1aXJlKFwiLi9saWIvZGVidWdcIik7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qKlxuICogUmVuZGVycyBhIGdyYXBoIGluIGEgc3RyaW5naWZpZWQgRE9UIGZvcm1hdCB0aGF0IGluZGljYXRlcyB0aGUgb3JkZXJpbmcgb2ZcbiAqIG5vZGVzIGJ5IGxheWVyLiBDaXJjbGVzIHJlcHJlc2VudCBub3JtYWwgbm9kZXMuIERpYW1vbnMgcmVwcmVzZW50IGR1bW15XG4gKiBub2Rlcy4gV2hpbGUgd2UgdHJ5IHRvIHB1dCBub2RlcyBpbiBjbHVzdGVycywgaXQgYXBwZWFycyB0aGF0IGdyYXBodml6XG4gKiBkb2VzIG5vdCByZXNwZWN0IHRoaXMgYmVjYXVzZSB3ZSdyZSBsYXRlciB1c2luZyBzdWJncmFwaHMgZm9yIG9yZGVyaW5nIG5vZGVzXG4gKiBpbiBlYWNoIGxheWVyLlxuICovXG5leHBvcnRzLmRvdE9yZGVyaW5nID0gZnVuY3Rpb24oZykge1xuICB2YXIgb3JkZXJpbmcgPSB1dGlsLm9yZGVyaW5nKGcuZmlsdGVyTm9kZXModXRpbC5maWx0ZXJOb25TdWJncmFwaHMoZykpKTtcbiAgdmFyIHJlc3VsdCA9ICdkaWdyYXBoIHsnO1xuXG4gIGZ1bmN0aW9uIGRmcyh1KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gZy5jaGlsZHJlbih1KTtcbiAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgKz0gJ3N1YmdyYXBoIGNsdXN0ZXJfJyArIHUgKyAnIHsnO1xuICAgICAgcmVzdWx0ICs9ICdsYWJlbD1cIicgKyB1ICsgJ1wiOyc7XG4gICAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgZGZzKHYpO1xuICAgICAgfSk7XG4gICAgICByZXN1bHQgKz0gJ30nO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgKz0gdTtcbiAgICAgIGlmIChnLm5vZGUodSkuZHVtbXkpIHtcbiAgICAgICAgcmVzdWx0ICs9ICcgW3NoYXBlPWRpYW1vbmRdJztcbiAgICAgIH1cbiAgICAgIHJlc3VsdCArPSAnOyc7XG4gICAgfVxuICB9XG5cbiAgZy5jaGlsZHJlbihudWxsKS5mb3JFYWNoKGRmcyk7XG5cbiAgb3JkZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgIHJlc3VsdCArPSAnc3ViZ3JhcGggeyByYW5rPXNhbWU7IGVkZ2UgW3N0eWxlPVwiaW52aXNcIl07JztcbiAgICByZXN1bHQgKz0gbGF5ZXIuam9pbignLT4nKTtcbiAgICByZXN1bHQgKz0gJ30nO1xuICB9KTtcblxuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYpIHtcbiAgICByZXN1bHQgKz0gdSArICctPicgKyB2ICsgJzsnO1xuICB9KTtcblxuICByZXN1bHQgKz0gJ30nO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpLFxuICAgIHJhbmsgPSByZXF1aXJlKCcuL3JhbmsnKSxcbiAgICBvcmRlciA9IHJlcXVpcmUoJy4vb3JkZXInKSxcbiAgICBDR3JhcGggPSByZXF1aXJlKCdncmFwaGxpYicpLkNHcmFwaCxcbiAgICBDRGlncmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuQ0RpZ3JhcGg7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEV4dGVybmFsIGNvbmZpZ3VyYXRpb25cbiAgdmFyIGNvbmZpZyA9IHtcbiAgICAvLyBIb3cgbXVjaCBkZWJ1ZyBpbmZvcm1hdGlvbiB0byBpbmNsdWRlP1xuICAgIGRlYnVnTGV2ZWw6IDAsXG4gICAgLy8gTWF4IG51bWJlciBvZiBzd2VlcHMgdG8gcGVyZm9ybSBpbiBvcmRlciBwaGFzZVxuICAgIG9yZGVyTWF4U3dlZXBzOiBvcmRlci5ERUZBVUxUX01BWF9TV0VFUFMsXG4gICAgLy8gVXNlIG5ldHdvcmsgc2ltcGxleCBhbGdvcml0aG0gaW4gcmFua2luZ1xuICAgIHJhbmtTaW1wbGV4OiBmYWxzZSxcbiAgICAvLyBSYW5rIGRpcmVjdGlvbi4gVmFsaWQgdmFsdWVzIGFyZSAoVEIsIExSKVxuICAgIHJhbmtEaXI6ICdUQidcbiAgfTtcblxuICAvLyBQaGFzZSBmdW5jdGlvbnNcbiAgdmFyIHBvc2l0aW9uID0gcmVxdWlyZSgnLi9wb3NpdGlvbicpKCk7XG5cbiAgLy8gVGhpcyBsYXlvdXQgb2JqZWN0XG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5vcmRlckl0ZXJzID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ29yZGVyTWF4U3dlZXBzJyk7XG5cbiAgc2VsZi5yYW5rU2ltcGxleCA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICdyYW5rU2ltcGxleCcpO1xuXG4gIHNlbGYubm9kZVNlcCA9IGRlbGVnYXRlUHJvcGVydHkocG9zaXRpb24ubm9kZVNlcCk7XG4gIHNlbGYuZWRnZVNlcCA9IGRlbGVnYXRlUHJvcGVydHkocG9zaXRpb24uZWRnZVNlcCk7XG4gIHNlbGYudW5pdmVyc2FsU2VwID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi51bml2ZXJzYWxTZXApO1xuICBzZWxmLnJhbmtTZXAgPSBkZWxlZ2F0ZVByb3BlcnR5KHBvc2l0aW9uLnJhbmtTZXApO1xuICBzZWxmLnJhbmtEaXIgPSB1dGlsLnByb3BlcnR5QWNjZXNzb3Ioc2VsZiwgY29uZmlnLCAncmFua0RpcicpO1xuICBzZWxmLmRlYnVnQWxpZ25tZW50ID0gZGVsZWdhdGVQcm9wZXJ0eShwb3NpdGlvbi5kZWJ1Z0FsaWdubWVudCk7XG5cbiAgc2VsZi5kZWJ1Z0xldmVsID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ2RlYnVnTGV2ZWwnLCBmdW5jdGlvbih4KSB7XG4gICAgdXRpbC5sb2cubGV2ZWwgPSB4O1xuICAgIHBvc2l0aW9uLmRlYnVnTGV2ZWwoeCk7XG4gIH0pO1xuXG4gIHNlbGYucnVuID0gdXRpbC50aW1lKCdUb3RhbCBsYXlvdXQnLCBydW4pO1xuXG4gIHNlbGYuX25vcm1hbGl6ZSA9IG5vcm1hbGl6ZTtcblxuICByZXR1cm4gc2VsZjtcblxuICAvKlxuICAgKiBDb25zdHJ1Y3RzIGFuIGFkamFjZW5jeSBncmFwaCB1c2luZyB0aGUgbm9kZXMgYW5kIGVkZ2VzIHNwZWNpZmllZCB0aHJvdWdoXG4gICAqIGNvbmZpZy4gRm9yIGVhY2ggbm9kZSBhbmQgZWRnZSB3ZSBhZGQgYSBwcm9wZXJ0eSBgZGFncmVgIHRoYXQgY29udGFpbnMgYW5cbiAgICogb2JqZWN0IHRoYXQgd2lsbCBob2xkIGludGVybWVkaWF0ZSBhbmQgZmluYWwgbGF5b3V0IGluZm9ybWF0aW9uLiBTb21lIG9mXG4gICAqIHRoZSBjb250ZW50cyBpbmNsdWRlOlxuICAgKlxuICAgKiAgMSkgQSBnZW5lcmF0ZWQgSUQgdGhhdCB1bmlxdWVseSBpZGVudGlmaWVzIHRoZSBvYmplY3QuXG4gICAqICAyKSBEaW1lbnNpb24gaW5mb3JtYXRpb24gZm9yIG5vZGVzIChjb3BpZWQgZnJvbSB0aGUgc291cmNlIG5vZGUpLlxuICAgKiAgMykgT3B0aW9uYWwgZGltZW5zaW9uIGluZm9ybWF0aW9uIGZvciBlZGdlcy5cbiAgICpcbiAgICogQWZ0ZXIgdGhlIGFkamFjZW5jeSBncmFwaCBpcyBjb25zdHJ1Y3RlZCB0aGUgY29kZSBubyBsb25nZXIgbmVlZHMgdG8gdXNlXG4gICAqIHRoZSBvcmlnaW5hbCBub2RlcyBhbmQgZWRnZXMgcGFzc2VkIGluIHZpYSBjb25maWcuXG4gICAqL1xuICBmdW5jdGlvbiBpbml0TGF5b3V0R3JhcGgoaW5wdXRHcmFwaCkge1xuICAgIHZhciBnID0gbmV3IENEaWdyYXBoKCk7XG5cbiAgICBpbnB1dEdyYXBoLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgdmFsdWUgPSB7fTtcbiAgICAgIGcuYWRkTm9kZSh1LCB7XG4gICAgICAgIHdpZHRoOiB2YWx1ZS53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiB2YWx1ZS5oZWlnaHRcbiAgICAgIH0pO1xuICAgICAgaWYgKHZhbHVlLmhhc093blByb3BlcnR5KCdyYW5rJykpIHtcbiAgICAgICAgZy5ub2RlKHUpLnByZWZSYW5rID0gdmFsdWUucmFuaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFNldCB1cCBzdWJncmFwaHNcbiAgICBpZiAoaW5wdXRHcmFwaC5wYXJlbnQpIHtcbiAgICAgIGlucHV0R3JhcGgubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgICAgZy5wYXJlbnQodSwgaW5wdXRHcmFwaC5wYXJlbnQodSkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaW5wdXRHcmFwaC5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHZhbHVlID0ge307XG4gICAgICB2YXIgbmV3VmFsdWUgPSB7XG4gICAgICAgIGU6IGUsXG4gICAgICAgIG1pbkxlbjogdmFsdWUubWluTGVuIHx8IDEsXG4gICAgICAgIHdpZHRoOiB2YWx1ZS53aWR0aCB8fCAwLFxuICAgICAgICBoZWlnaHQ6IHZhbHVlLmhlaWdodCB8fCAwLFxuICAgICAgICBwb2ludHM6IFtdXG4gICAgICB9O1xuXG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgbmV3VmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLy8gSW5pdGlhbCBncmFwaCBhdHRyaWJ1dGVzXG4gICAgdmFyIGdyYXBoVmFsdWUgPSBpbnB1dEdyYXBoLmdyYXBoKCkgfHwge307XG4gICAgZy5ncmFwaCh7XG4gICAgICByYW5rRGlyOiBncmFwaFZhbHVlLnJhbmtEaXIgfHwgY29uZmlnLnJhbmtEaXIsXG4gICAgICBvcmRlclJlc3RhcnRzOiBncmFwaFZhbHVlLm9yZGVyUmVzdGFydHNcbiAgICB9KTtcblxuICAgIHJldHVybiBnO1xuICB9XG5cbiAgZnVuY3Rpb24gcnVuKGlucHV0R3JhcGgpIHtcbiAgICB2YXIgcmFua1NlcCA9IHNlbGYucmFua1NlcCgpO1xuICAgIHZhciBnO1xuICAgIHRyeSB7XG4gICAgICAvLyBCdWlsZCBpbnRlcm5hbCBncmFwaFxuICAgICAgZyA9IHV0aWwudGltZSgnaW5pdExheW91dEdyYXBoJywgaW5pdExheW91dEdyYXBoKShpbnB1dEdyYXBoKTtcblxuICAgICAgaWYgKGcub3JkZXIoKSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZztcbiAgICAgIH1cblxuICAgICAgLy8gTWFrZSBzcGFjZSBmb3IgZWRnZSBsYWJlbHNcbiAgICAgIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgcywgdCwgYSkge1xuICAgICAgICBhLm1pbkxlbiAqPSAyO1xuICAgICAgfSk7XG4gICAgICBzZWxmLnJhbmtTZXAocmFua1NlcCAvIDIpO1xuXG4gICAgICAvLyBEZXRlcm1pbmUgdGhlIHJhbmsgZm9yIGVhY2ggbm9kZS4gTm9kZXMgd2l0aCBhIGxvd2VyIHJhbmsgd2lsbCBhcHBlYXJcbiAgICAgIC8vIGFib3ZlIG5vZGVzIG9mIGhpZ2hlciByYW5rLlxuICAgICAgdXRpbC50aW1lKCdyYW5rLnJ1bicsIHJhbmsucnVuKShnLCBjb25maWcucmFua1NpbXBsZXgpO1xuXG4gICAgICAvLyBOb3JtYWxpemUgdGhlIGdyYXBoIGJ5IGVuc3VyaW5nIHRoYXQgZXZlcnkgZWRnZSBpcyBwcm9wZXIgKGVhY2ggZWRnZSBoYXNcbiAgICAgIC8vIGEgbGVuZ3RoIG9mIDEpLiBXZSBhY2hpZXZlIHRoaXMgYnkgYWRkaW5nIGR1bW15IG5vZGVzIHRvIGxvbmcgZWRnZXMsXG4gICAgICAvLyB0aHVzIHNob3J0ZW5pbmcgdGhlbS5cbiAgICAgIHV0aWwudGltZSgnbm9ybWFsaXplJywgbm9ybWFsaXplKShnKTtcblxuICAgICAgLy8gT3JkZXIgdGhlIG5vZGVzIHNvIHRoYXQgZWRnZSBjcm9zc2luZ3MgYXJlIG1pbmltaXplZC5cbiAgICAgIHV0aWwudGltZSgnb3JkZXInLCBvcmRlcikoZywgY29uZmlnLm9yZGVyTWF4U3dlZXBzKTtcblxuICAgICAgLy8gRmluZCB0aGUgeCBhbmQgeSBjb29yZGluYXRlcyBmb3IgZXZlcnkgbm9kZSBpbiB0aGUgZ3JhcGguXG4gICAgICB1dGlsLnRpbWUoJ3Bvc2l0aW9uJywgcG9zaXRpb24ucnVuKShnKTtcblxuICAgICAgLy8gRGUtbm9ybWFsaXplIHRoZSBncmFwaCBieSByZW1vdmluZyBkdW1teSBub2RlcyBhbmQgYXVnbWVudGluZyB0aGVcbiAgICAgIC8vIG9yaWdpbmFsIGxvbmcgZWRnZXMgd2l0aCBjb29yZGluYXRlIGluZm9ybWF0aW9uLlxuICAgICAgdXRpbC50aW1lKCd1bmRvTm9ybWFsaXplJywgdW5kb05vcm1hbGl6ZSkoZyk7XG5cbiAgICAgIC8vIFJldmVyc2VzIHBvaW50cyBmb3IgZWRnZXMgdGhhdCBhcmUgaW4gYSByZXZlcnNlZCBzdGF0ZS5cbiAgICAgIHV0aWwudGltZSgnZml4dXBFZGdlUG9pbnRzJywgZml4dXBFZGdlUG9pbnRzKShnKTtcblxuICAgICAgLy8gUmVzdG9yZSBkZWxldGUgZWRnZXMgYW5kIHJldmVyc2UgZWRnZXMgdGhhdCB3ZXJlIHJldmVyc2VkIGluIHRoZSByYW5rXG4gICAgICAvLyBwaGFzZS5cbiAgICAgIHV0aWwudGltZSgncmFuay5yZXN0b3JlRWRnZXMnLCByYW5rLnJlc3RvcmVFZGdlcykoZyk7XG5cbiAgICAgIC8vIENvbnN0cnVjdCBmaW5hbCByZXN1bHQgZ3JhcGggYW5kIHJldHVybiBpdFxuICAgICAgcmV0dXJuIHV0aWwudGltZSgnY3JlYXRlRmluYWxHcmFwaCcsIGNyZWF0ZUZpbmFsR3JhcGgpKGcsIGlucHV0R3JhcGguaXNEaXJlY3RlZCgpKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2VsZi5yYW5rU2VwKHJhbmtTZXApO1xuICAgIH1cbiAgfVxuXG4gIC8qXG4gICAqIFRoaXMgZnVuY3Rpb24gaXMgcmVzcG9uc2libGUgZm9yICdub3JtYWxpemluZycgdGhlIGdyYXBoLiBUaGUgcHJvY2VzcyBvZlxuICAgKiBub3JtYWxpemF0aW9uIGVuc3VyZXMgdGhhdCBubyBlZGdlIGluIHRoZSBncmFwaCBoYXMgc3BhbnMgbW9yZSB0aGFuIG9uZVxuICAgKiByYW5rLiBUbyBkbyB0aGlzIGl0IGluc2VydHMgZHVtbXkgbm9kZXMgYXMgbmVlZGVkIGFuZCBsaW5rcyB0aGVtIGJ5IGFkZGluZ1xuICAgKiBkdW1teSBlZGdlcy4gVGhpcyBmdW5jdGlvbiBrZWVwcyBlbm91Z2ggaW5mb3JtYXRpb24gaW4gdGhlIGR1bW15IG5vZGVzIGFuZFxuICAgKiBlZGdlcyB0byBlbnN1cmUgdGhhdCB0aGUgb3JpZ2luYWwgZ3JhcGggY2FuIGJlIHJlY29uc3RydWN0ZWQgbGF0ZXIuXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGFzc3VtZXMgdGhhdCB0aGUgaW5wdXQgZ3JhcGggaXMgY3ljbGUgZnJlZS5cbiAgICovXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZShnKSB7XG4gICAgdmFyIGR1bW15Q291bnQgPSAwO1xuICAgIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgcywgdCwgYSkge1xuICAgICAgdmFyIHNvdXJjZVJhbmsgPSBnLm5vZGUocykucmFuaztcbiAgICAgIHZhciB0YXJnZXRSYW5rID0gZy5ub2RlKHQpLnJhbms7XG4gICAgICBpZiAoc291cmNlUmFuayArIDEgPCB0YXJnZXRSYW5rKSB7XG4gICAgICAgIGZvciAodmFyIHUgPSBzLCByYW5rID0gc291cmNlUmFuayArIDEsIGkgPSAwOyByYW5rIDwgdGFyZ2V0UmFuazsgKytyYW5rLCArK2kpIHtcbiAgICAgICAgICB2YXIgdiA9ICdfRCcgKyAoKytkdW1teUNvdW50KTtcbiAgICAgICAgICB2YXIgbm9kZSA9IHtcbiAgICAgICAgICAgIHdpZHRoOiBhLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0OiBhLmhlaWdodCxcbiAgICAgICAgICAgIGVkZ2U6IHsgaWQ6IGUsIHNvdXJjZTogcywgdGFyZ2V0OiB0LCBhdHRyczogYSB9LFxuICAgICAgICAgICAgcmFuazogcmFuayxcbiAgICAgICAgICAgIGR1bW15OiB0cnVlXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIElmIHRoaXMgbm9kZSByZXByZXNlbnRzIGEgYmVuZCB0aGVuIHdlIHdpbGwgdXNlIGl0IGFzIGEgY29udHJvbFxuICAgICAgICAgIC8vIHBvaW50LiBGb3IgZWRnZXMgd2l0aCAyIHNlZ21lbnRzIHRoaXMgd2lsbCBiZSB0aGUgY2VudGVyIGR1bW15XG4gICAgICAgICAgLy8gbm9kZS4gRm9yIGVkZ2VzIHdpdGggbW9yZSB0aGFuIHR3byBzZWdtZW50cywgdGhpcyB3aWxsIGJlIHRoZVxuICAgICAgICAgIC8vIGZpcnN0IGFuZCBsYXN0IGR1bW15IG5vZGUuXG4gICAgICAgICAgaWYgKGkgPT09IDApIG5vZGUuaW5kZXggPSAwO1xuICAgICAgICAgIGVsc2UgaWYgKHJhbmsgKyAxID09PSB0YXJnZXRSYW5rKSBub2RlLmluZGV4ID0gMTtcblxuICAgICAgICAgIGcuYWRkTm9kZSh2LCBub2RlKTtcbiAgICAgICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwge30pO1xuICAgICAgICAgIHUgPSB2O1xuICAgICAgICB9XG4gICAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB0LCB7fSk7XG4gICAgICAgIGcuZGVsRWRnZShlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qXG4gICAqIFJlY29uc3RydWN0cyB0aGUgZ3JhcGggYXMgaXQgd2FzIGJlZm9yZSBub3JtYWxpemF0aW9uLiBUaGUgcG9zaXRpb25zIG9mXG4gICAqIGR1bW15IG5vZGVzIGFyZSB1c2VkIHRvIGJ1aWxkIGFuIGFycmF5IG9mIHBvaW50cyBmb3IgdGhlIG9yaWdpbmFsICdsb25nJ1xuICAgKiBlZGdlLiBEdW1teSBub2RlcyBhbmQgZWRnZXMgYXJlIHJlbW92ZWQuXG4gICAqL1xuICBmdW5jdGlvbiB1bmRvTm9ybWFsaXplKGcpIHtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIGEpIHtcbiAgICAgIGlmIChhLmR1bW15KSB7XG4gICAgICAgIGlmICgnaW5kZXgnIGluIGEpIHtcbiAgICAgICAgICB2YXIgZWRnZSA9IGEuZWRnZTtcbiAgICAgICAgICBpZiAoIWcuaGFzRWRnZShlZGdlLmlkKSkge1xuICAgICAgICAgICAgZy5hZGRFZGdlKGVkZ2UuaWQsIGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCwgZWRnZS5hdHRycyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBwb2ludHMgPSBnLmVkZ2UoZWRnZS5pZCkucG9pbnRzO1xuICAgICAgICAgIHBvaW50c1thLmluZGV4XSA9IHsgeDogYS54LCB5OiBhLnksIHVsOiBhLnVsLCB1cjogYS51ciwgZGw6IGEuZGwsIGRyOiBhLmRyIH07XG4gICAgICAgIH1cbiAgICAgICAgZy5kZWxOb2RlKHUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogRm9yIGVhY2ggZWRnZSB0aGF0IHdhcyByZXZlcnNlZCBkdXJpbmcgdGhlIGBhY3ljbGljYCBzdGVwLCByZXZlcnNlIGl0c1xuICAgKiBhcnJheSBvZiBwb2ludHMuXG4gICAqL1xuICBmdW5jdGlvbiBmaXh1cEVkZ2VQb2ludHMoZykge1xuICAgIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgcywgdCwgYSkgeyBpZiAoYS5yZXZlcnNlZCkgYS5wb2ludHMucmV2ZXJzZSgpOyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUZpbmFsR3JhcGgoZywgaXNEaXJlY3RlZCkge1xuICAgIHZhciBvdXQgPSBpc0RpcmVjdGVkID8gbmV3IENEaWdyYXBoKCkgOiBuZXcgQ0dyYXBoKCk7XG4gICAgb3V0LmdyYXBoKGcuZ3JhcGgoKSk7XG4gICAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkgeyBvdXQuYWRkTm9kZSh1LCB2YWx1ZSk7IH0pO1xuICAgIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkgeyBvdXQucGFyZW50KHUsIGcucGFyZW50KHUpKTsgfSk7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgb3V0LmFkZEVkZ2UodmFsdWUuZSwgdSwgdiwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLy8gQXR0YWNoIGJvdW5kaW5nIGJveCBpbmZvcm1hdGlvblxuICAgIHZhciBtYXhYID0gMCwgbWF4WSA9IDA7XG4gICAgZy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgICAgaWYgKCFnLmNoaWxkcmVuKHUpLmxlbmd0aCkge1xuICAgICAgICBtYXhYID0gTWF0aC5tYXgobWF4WCwgdmFsdWUueCArIHZhbHVlLndpZHRoIC8gMik7XG4gICAgICAgIG1heFkgPSBNYXRoLm1heChtYXhZLCB2YWx1ZS55ICsgdmFsdWUuaGVpZ2h0IC8gMik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgICAgdmFyIG1heFhQb2ludHMgPSBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZS5wb2ludHMubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAueDsgfSkpO1xuICAgICAgdmFyIG1heFlQb2ludHMgPSBNYXRoLm1heC5hcHBseShNYXRoLCB2YWx1ZS5wb2ludHMubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAueTsgfSkpO1xuICAgICAgbWF4WCA9IE1hdGgubWF4KG1heFgsIG1heFhQb2ludHMgKyB2YWx1ZS53aWR0aCAvIDIpO1xuICAgICAgbWF4WSA9IE1hdGgubWF4KG1heFksIG1heFlQb2ludHMgKyB2YWx1ZS5oZWlnaHQgLyAyKTtcbiAgICB9KTtcbiAgICBvdXQuZ3JhcGgoKS53aWR0aCA9IG1heFg7XG4gICAgb3V0LmdyYXBoKCkuaGVpZ2h0ID0gbWF4WTtcblxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICAvKlxuICAgKiBHaXZlbiBhIGZ1bmN0aW9uLCBhIG5ldyBmdW5jdGlvbiBpcyByZXR1cm5lZCB0aGF0IGludm9rZXMgdGhlIGdpdmVuXG4gICAqIGZ1bmN0aW9uLiBUaGUgcmV0dXJuIHZhbHVlIGZyb20gdGhlIGZ1bmN0aW9uIGlzIGFsd2F5cyB0aGUgYHNlbGZgIG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIGRlbGVnYXRlUHJvcGVydHkoZikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGYoKTtcbiAgICAgIGYuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH1cbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgICBjcm9zc0NvdW50ID0gcmVxdWlyZSgnLi9vcmRlci9jcm9zc0NvdW50JyksXG4gICAgaW5pdExheWVyR3JhcGhzID0gcmVxdWlyZSgnLi9vcmRlci9pbml0TGF5ZXJHcmFwaHMnKSxcbiAgICBpbml0T3JkZXIgPSByZXF1aXJlKCcuL29yZGVyL2luaXRPcmRlcicpLFxuICAgIHNvcnRMYXllciA9IHJlcXVpcmUoJy4vb3JkZXIvc29ydExheWVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gb3JkZXI7XG5cbi8vIFRoZSBtYXhpbXVtIG51bWJlciBvZiBzd2VlcHMgdG8gcGVyZm9ybSBiZWZvcmUgZmluaXNoaW5nIHRoZSBvcmRlciBwaGFzZS5cbnZhciBERUZBVUxUX01BWF9TV0VFUFMgPSAyNDtcbm9yZGVyLkRFRkFVTFRfTUFYX1NXRUVQUyA9IERFRkFVTFRfTUFYX1NXRUVQUztcblxuLypcbiAqIFJ1bnMgdGhlIG9yZGVyIHBoYXNlIHdpdGggdGhlIHNwZWNpZmllZCBgZ3JhcGgsIGBtYXhTd2VlcHNgLCBhbmRcbiAqIGBkZWJ1Z0xldmVsYC4gSWYgYG1heFN3ZWVwc2AgaXMgbm90IHNwZWNpZmllZCB3ZSB1c2UgYERFRkFVTFRfTUFYX1NXRUVQU2AuXG4gKiBJZiBgZGVidWdMZXZlbGAgaXMgbm90IHNldCB3ZSBhc3N1bWUgMC5cbiAqL1xuZnVuY3Rpb24gb3JkZXIoZywgbWF4U3dlZXBzKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgIG1heFN3ZWVwcyA9IERFRkFVTFRfTUFYX1NXRUVQUztcbiAgfVxuXG4gIHZhciByZXN0YXJ0cyA9IGcuZ3JhcGgoKS5vcmRlclJlc3RhcnRzIHx8IDA7XG5cbiAgdmFyIGxheWVyR3JhcGhzID0gaW5pdExheWVyR3JhcGhzKGcpO1xuICAvLyBUT0RPOiByZW1vdmUgdGhpcyB3aGVuIHdlIGFkZCBiYWNrIHN1cHBvcnQgZm9yIG9yZGVyaW5nIGNsdXN0ZXJzXG4gIGxheWVyR3JhcGhzLmZvckVhY2goZnVuY3Rpb24obGcpIHtcbiAgICBsZyA9IGxnLmZpbHRlck5vZGVzKGZ1bmN0aW9uKHUpIHsgcmV0dXJuICFnLmNoaWxkcmVuKHUpLmxlbmd0aDsgfSk7XG4gIH0pO1xuXG4gIHZhciBpdGVycyA9IDAsXG4gICAgICBjdXJyZW50QmVzdENDLFxuICAgICAgYWxsVGltZUJlc3RDQyA9IE51bWJlci5NQVhfVkFMVUUsXG4gICAgICBhbGxUaW1lQmVzdCA9IHt9O1xuXG4gIGZ1bmN0aW9uIHNhdmVBbGxUaW1lQmVzdCgpIHtcbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IGFsbFRpbWVCZXN0W3VdID0gdmFsdWUub3JkZXI7IH0pO1xuICB9XG5cbiAgZm9yICh2YXIgaiA9IDA7IGogPCBOdW1iZXIocmVzdGFydHMpICsgMSAmJiBhbGxUaW1lQmVzdENDICE9PSAwOyArK2opIHtcbiAgICBjdXJyZW50QmVzdENDID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgICBpbml0T3JkZXIoZywgcmVzdGFydHMgPiAwKTtcblxuICAgIHV0aWwubG9nKDIsICdPcmRlciBwaGFzZSBzdGFydCBjcm9zcyBjb3VudDogJyArIGcuZ3JhcGgoKS5vcmRlckluaXRDQyk7XG5cbiAgICB2YXIgaSwgbGFzdEJlc3QsIGNjO1xuICAgIGZvciAoaSA9IDAsIGxhc3RCZXN0ID0gMDsgbGFzdEJlc3QgPCA0ICYmIGkgPCBtYXhTd2VlcHMgJiYgY3VycmVudEJlc3RDQyA+IDA7ICsraSwgKytsYXN0QmVzdCwgKytpdGVycykge1xuICAgICAgc3dlZXAoZywgbGF5ZXJHcmFwaHMsIGkpO1xuICAgICAgY2MgPSBjcm9zc0NvdW50KGcpO1xuICAgICAgaWYgKGNjIDwgY3VycmVudEJlc3RDQykge1xuICAgICAgICBsYXN0QmVzdCA9IDA7XG4gICAgICAgIGN1cnJlbnRCZXN0Q0MgPSBjYztcbiAgICAgICAgaWYgKGNjIDwgYWxsVGltZUJlc3RDQykge1xuICAgICAgICAgIHNhdmVBbGxUaW1lQmVzdCgpO1xuICAgICAgICAgIGFsbFRpbWVCZXN0Q0MgPSBjYztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdXRpbC5sb2coMywgJ09yZGVyIHBoYXNlIHN0YXJ0ICcgKyBqICsgJyBpdGVyICcgKyBpICsgJyBjcm9zcyBjb3VudDogJyArIGNjKTtcbiAgICB9XG4gIH1cblxuICBPYmplY3Qua2V5cyhhbGxUaW1lQmVzdCkuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgaWYgKCFnLmNoaWxkcmVuIHx8ICFnLmNoaWxkcmVuKHUpLmxlbmd0aCkge1xuICAgICAgZy5ub2RlKHUpLm9yZGVyID0gYWxsVGltZUJlc3RbdV07XG4gICAgfVxuICB9KTtcbiAgZy5ncmFwaCgpLm9yZGVyQ0MgPSBhbGxUaW1lQmVzdENDO1xuXG4gIHV0aWwubG9nKDIsICdPcmRlciBpdGVyYXRpb25zOiAnICsgaXRlcnMpO1xuICB1dGlsLmxvZygyLCAnT3JkZXIgcGhhc2UgYmVzdCBjcm9zcyBjb3VudDogJyArIGcuZ3JhcGgoKS5vcmRlckNDKTtcbn1cblxuZnVuY3Rpb24gcHJlZGVjZXNzb3JXZWlnaHRzKGcsIG5vZGVzKSB7XG4gIHZhciB3ZWlnaHRzID0ge307XG4gIG5vZGVzLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIHdlaWdodHNbdV0gPSBnLmluRWRnZXModSkubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBnLm5vZGUoZy5zb3VyY2UoZSkpLm9yZGVyO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHdlaWdodHM7XG59XG5cbmZ1bmN0aW9uIHN1Y2Nlc3NvcldlaWdodHMoZywgbm9kZXMpIHtcbiAgdmFyIHdlaWdodHMgPSB7fTtcbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgd2VpZ2h0c1t1XSA9IGcub3V0RWRnZXModSkubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBnLm5vZGUoZy50YXJnZXQoZSkpLm9yZGVyO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHdlaWdodHM7XG59XG5cbmZ1bmN0aW9uIHN3ZWVwKGcsIGxheWVyR3JhcGhzLCBpdGVyKSB7XG4gIGlmIChpdGVyICUgMiA9PT0gMCkge1xuICAgIHN3ZWVwRG93bihnLCBsYXllckdyYXBocywgaXRlcik7XG4gIH0gZWxzZSB7XG4gICAgc3dlZXBVcChnLCBsYXllckdyYXBocywgaXRlcik7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3dlZXBEb3duKGcsIGxheWVyR3JhcGhzKSB7XG4gIHZhciBjZztcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBsYXllckdyYXBocy5sZW5ndGg7ICsraSkge1xuICAgIGNnID0gc29ydExheWVyKGxheWVyR3JhcGhzW2ldLCBjZywgcHJlZGVjZXNzb3JXZWlnaHRzKGcsIGxheWVyR3JhcGhzW2ldLm5vZGVzKCkpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzd2VlcFVwKGcsIGxheWVyR3JhcGhzKSB7XG4gIHZhciBjZztcbiAgZm9yICh2YXIgaSA9IGxheWVyR3JhcGhzLmxlbmd0aCAtIDI7IGkgPj0gMDsgLS1pKSB7XG4gICAgc29ydExheWVyKGxheWVyR3JhcGhzW2ldLCBjZywgc3VjY2Vzc29yV2VpZ2h0cyhnLCBsYXllckdyYXBoc1tpXS5ub2RlcygpKSk7XG4gIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3Jvc3NDb3VudDtcblxuLypcbiAqIFJldHVybnMgdGhlIGNyb3NzIGNvdW50IGZvciB0aGUgZ2l2ZW4gZ3JhcGguXG4gKi9cbmZ1bmN0aW9uIGNyb3NzQ291bnQoZykge1xuICB2YXIgY2MgPSAwO1xuICB2YXIgb3JkZXJpbmcgPSB1dGlsLm9yZGVyaW5nKGcpO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IG9yZGVyaW5nLmxlbmd0aDsgKytpKSB7XG4gICAgY2MgKz0gdHdvTGF5ZXJDcm9zc0NvdW50KGcsIG9yZGVyaW5nW2ktMV0sIG9yZGVyaW5nW2ldKTtcbiAgfVxuICByZXR1cm4gY2M7XG59XG5cbi8qXG4gKiBUaGlzIGZ1bmN0aW9uIHNlYXJjaGVzIHRocm91Z2ggYSByYW5rZWQgYW5kIG9yZGVyZWQgZ3JhcGggYW5kIGNvdW50cyB0aGVcbiAqIG51bWJlciBvZiBlZGdlcyB0aGF0IGNyb3NzLiBUaGlzIGFsZ29yaXRobSBpcyBkZXJpdmVkIGZyb206XG4gKlxuICogICAgVy4gQmFydGggZXQgYWwuLCBCaWxheWVyIENyb3NzIENvdW50aW5nLCBKR0FBLCA4KDIpIDE3OeKAkzE5NCAoMjAwNClcbiAqL1xuZnVuY3Rpb24gdHdvTGF5ZXJDcm9zc0NvdW50KGcsIGxheWVyMSwgbGF5ZXIyKSB7XG4gIHZhciBpbmRpY2VzID0gW107XG4gIGxheWVyMS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICB2YXIgbm9kZUluZGljZXMgPSBbXTtcbiAgICBnLm91dEVkZ2VzKHUpLmZvckVhY2goZnVuY3Rpb24oZSkgeyBub2RlSW5kaWNlcy5wdXNoKGcubm9kZShnLnRhcmdldChlKSkub3JkZXIpOyB9KTtcbiAgICBub2RlSW5kaWNlcy5zb3J0KGZ1bmN0aW9uKHgsIHkpIHsgcmV0dXJuIHggLSB5OyB9KTtcbiAgICBpbmRpY2VzID0gaW5kaWNlcy5jb25jYXQobm9kZUluZGljZXMpO1xuICB9KTtcblxuICB2YXIgZmlyc3RJbmRleCA9IDE7XG4gIHdoaWxlIChmaXJzdEluZGV4IDwgbGF5ZXIyLmxlbmd0aCkgZmlyc3RJbmRleCA8PD0gMTtcblxuICB2YXIgdHJlZVNpemUgPSAyICogZmlyc3RJbmRleCAtIDE7XG4gIGZpcnN0SW5kZXggLT0gMTtcblxuICB2YXIgdHJlZSA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWVTaXplOyArK2kpIHsgdHJlZVtpXSA9IDA7IH1cblxuICB2YXIgY2MgPSAwO1xuICBpbmRpY2VzLmZvckVhY2goZnVuY3Rpb24oaSkge1xuICAgIHZhciB0cmVlSW5kZXggPSBpICsgZmlyc3RJbmRleDtcbiAgICArK3RyZWVbdHJlZUluZGV4XTtcbiAgICB3aGlsZSAodHJlZUluZGV4ID4gMCkge1xuICAgICAgaWYgKHRyZWVJbmRleCAlIDIpIHtcbiAgICAgICAgY2MgKz0gdHJlZVt0cmVlSW5kZXggKyAxXTtcbiAgICAgIH1cbiAgICAgIHRyZWVJbmRleCA9ICh0cmVlSW5kZXggLSAxKSA+PiAxO1xuICAgICAgKyt0cmVlW3RyZWVJbmRleF07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gY2M7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBub2Rlc0Zyb21MaXN0ID0gcmVxdWlyZSgnZ3JhcGhsaWInKS5maWx0ZXIubm9kZXNGcm9tTGlzdCxcbiAgICAvKiBqc2hpbnQgLVcwNzkgKi9cbiAgICBTZXQgPSByZXF1aXJlKCdjcC1kYXRhJykuU2V0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXRMYXllckdyYXBocztcblxuLypcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYSBjb21wb3VuZCBsYXllcmVkIGdyYXBoLCBnLCBhbmQgcHJvZHVjZXMgYW4gYXJyYXkgb2ZcbiAqIGxheWVyIGdyYXBocy4gRWFjaCBlbnRyeSBpbiB0aGUgYXJyYXkgcmVwcmVzZW50cyBhIHN1YmdyYXBoIG9mIG5vZGVzXG4gKiByZWxldmFudCBmb3IgcGVyZm9ybWluZyBjcm9zc2luZyByZWR1Y3Rpb24gb24gdGhhdCBsYXllci5cbiAqL1xuZnVuY3Rpb24gaW5pdExheWVyR3JhcGhzKGcpIHtcbiAgdmFyIHJhbmtzID0gW107XG5cbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICBpZiAodSA9PT0gbnVsbCkge1xuICAgICAgZy5jaGlsZHJlbih1KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHsgZGZzKHYpOyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWUgPSBnLm5vZGUodSk7XG4gICAgdmFsdWUubWluUmFuayA9ICgncmFuaycgaW4gdmFsdWUpID8gdmFsdWUucmFuayA6IE51bWJlci5NQVhfVkFMVUU7XG4gICAgdmFsdWUubWF4UmFuayA9ICgncmFuaycgaW4gdmFsdWUpID8gdmFsdWUucmFuayA6IE51bWJlci5NSU5fVkFMVUU7XG4gICAgdmFyIHVSYW5rcyA9IG5ldyBTZXQoKTtcbiAgICBnLmNoaWxkcmVuKHUpLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgdmFyIHJzID0gZGZzKHYpO1xuICAgICAgdVJhbmtzID0gU2V0LnVuaW9uKFt1UmFua3MsIHJzXSk7XG4gICAgICB2YWx1ZS5taW5SYW5rID0gTWF0aC5taW4odmFsdWUubWluUmFuaywgZy5ub2RlKHYpLm1pblJhbmspO1xuICAgICAgdmFsdWUubWF4UmFuayA9IE1hdGgubWF4KHZhbHVlLm1heFJhbmssIGcubm9kZSh2KS5tYXhSYW5rKTtcbiAgICB9KTtcblxuICAgIGlmICgncmFuaycgaW4gdmFsdWUpIHVSYW5rcy5hZGQodmFsdWUucmFuayk7XG5cbiAgICB1UmFua3Mua2V5cygpLmZvckVhY2goZnVuY3Rpb24ocikge1xuICAgICAgaWYgKCEociBpbiByYW5rcykpIHJhbmtzW3JdID0gW107XG4gICAgICByYW5rc1tyXS5wdXNoKHUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHVSYW5rcztcbiAgfVxuICBkZnMobnVsbCk7XG5cbiAgdmFyIGxheWVyR3JhcGhzID0gW107XG4gIHJhbmtzLmZvckVhY2goZnVuY3Rpb24odXMsIHJhbmspIHtcbiAgICBsYXllckdyYXBoc1tyYW5rXSA9IGcuZmlsdGVyTm9kZXMobm9kZXNGcm9tTGlzdCh1cykpO1xuICB9KTtcblxuICByZXR1cm4gbGF5ZXJHcmFwaHM7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcm9zc0NvdW50ID0gcmVxdWlyZSgnLi9jcm9zc0NvdW50JyksXG4gICAgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbml0T3JkZXI7XG5cbi8qXG4gKiBHaXZlbiBhIGdyYXBoIHdpdGggYSBzZXQgb2YgbGF5ZXJlZCBub2RlcyAoaS5lLiBub2RlcyB0aGF0IGhhdmUgYSBgcmFua2BcbiAqIGF0dHJpYnV0ZSkgdGhpcyBmdW5jdGlvbiBhdHRhY2hlcyBhbiBgb3JkZXJgIGF0dHJpYnV0ZSB0aGF0IHVuaXF1ZWx5XG4gKiBhcnJhbmdlcyBlYWNoIG5vZGUgb2YgZWFjaCByYW5rLiBJZiBubyBjb25zdHJhaW50IGdyYXBoIGlzIHByb3ZpZGVkIHRoZVxuICogb3JkZXIgb2YgdGhlIG5vZGVzIGluIGVhY2ggcmFuayBpcyBlbnRpcmVseSBhcmJpdHJhcnkuXG4gKi9cbmZ1bmN0aW9uIGluaXRPcmRlcihnLCByYW5kb20pIHtcbiAgdmFyIGxheWVycyA9IFtdO1xuXG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB2YXIgbGF5ZXIgPSBsYXllcnNbdmFsdWUucmFua107XG4gICAgaWYgKGcuY2hpbGRyZW4gJiYgZy5jaGlsZHJlbih1KS5sZW5ndGggPiAwKSByZXR1cm47XG4gICAgaWYgKCFsYXllcikge1xuICAgICAgbGF5ZXIgPSBsYXllcnNbdmFsdWUucmFua10gPSBbXTtcbiAgICB9XG4gICAgbGF5ZXIucHVzaCh1KTtcbiAgfSk7XG5cbiAgbGF5ZXJzLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICBpZiAocmFuZG9tKSB7XG4gICAgICB1dGlsLnNodWZmbGUobGF5ZXIpO1xuICAgIH1cbiAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICAgIGcubm9kZSh1KS5vcmRlciA9IGk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIHZhciBjYyA9IGNyb3NzQ291bnQoZyk7XG4gIGcuZ3JhcGgoKS5vcmRlckluaXRDQyA9IGNjO1xuICBnLmdyYXBoKCkub3JkZXJDQyA9IE51bWJlci5NQVhfVkFMVUU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpLFxuICAgIERpZ3JhcGggPSByZXF1aXJlKCdncmFwaGxpYicpLkRpZ3JhcGgsXG4gICAgdG9wc29ydCA9IHJlcXVpcmUoJ2dyYXBobGliJykuYWxnLnRvcHNvcnQsXG4gICAgbm9kZXNGcm9tTGlzdCA9IHJlcXVpcmUoJ2dyYXBobGliJykuZmlsdGVyLm5vZGVzRnJvbUxpc3Q7XG5cbm1vZHVsZS5leHBvcnRzID0gc29ydExheWVyO1xuXG5mdW5jdGlvbiBzb3J0TGF5ZXIoZywgY2csIHdlaWdodHMpIHtcbiAgd2VpZ2h0cyA9IGFkanVzdFdlaWdodHMoZywgd2VpZ2h0cyk7XG4gIHZhciByZXN1bHQgPSBzb3J0TGF5ZXJTdWJncmFwaChnLCBudWxsLCBjZywgd2VpZ2h0cyk7XG5cbiAgcmVzdWx0Lmxpc3QuZm9yRWFjaChmdW5jdGlvbih1LCBpKSB7XG4gICAgZy5ub2RlKHUpLm9yZGVyID0gaTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQuY29uc3RyYWludEdyYXBoO1xufVxuXG5mdW5jdGlvbiBzb3J0TGF5ZXJTdWJncmFwaChnLCBzZywgY2csIHdlaWdodHMpIHtcbiAgY2cgPSBjZyA/IGNnLmZpbHRlck5vZGVzKG5vZGVzRnJvbUxpc3QoZy5jaGlsZHJlbihzZykpKSA6IG5ldyBEaWdyYXBoKCk7XG5cbiAgdmFyIG5vZGVEYXRhID0ge307XG4gIGcuY2hpbGRyZW4oc2cpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIGlmIChnLmNoaWxkcmVuKHUpLmxlbmd0aCkge1xuICAgICAgbm9kZURhdGFbdV0gPSBzb3J0TGF5ZXJTdWJncmFwaChnLCB1LCBjZywgd2VpZ2h0cyk7XG4gICAgICBub2RlRGF0YVt1XS5maXJzdFNHID0gdTtcbiAgICAgIG5vZGVEYXRhW3VdLmxhc3RTRyA9IHU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB3cyA9IHdlaWdodHNbdV07XG4gICAgICBub2RlRGF0YVt1XSA9IHtcbiAgICAgICAgZGVncmVlOiB3cy5sZW5ndGgsXG4gICAgICAgIGJhcnljZW50ZXI6IHV0aWwuc3VtKHdzKSAvIHdzLmxlbmd0aCxcbiAgICAgICAgb3JkZXI6IGcubm9kZSh1KS5vcmRlcixcbiAgICAgICAgb3JkZXJDb3VudDogMSxcbiAgICAgICAgbGlzdDogW3VdXG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG5cbiAgcmVzb2x2ZVZpb2xhdGVkQ29uc3RyYWludHMoZywgY2csIG5vZGVEYXRhKTtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG5vZGVEYXRhKTtcbiAga2V5cy5zb3J0KGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gbm9kZURhdGFbeF0uYmFyeWNlbnRlciAtIG5vZGVEYXRhW3ldLmJhcnljZW50ZXIgfHxcbiAgICAgICAgICAgbm9kZURhdGFbeF0ub3JkZXIgLSBub2RlRGF0YVt5XS5vcmRlcjtcbiAgfSk7XG5cbiAgdmFyIHJlc3VsdCA9ICBrZXlzLm1hcChmdW5jdGlvbih1KSB7IHJldHVybiBub2RlRGF0YVt1XTsgfSlcbiAgICAgICAgICAgICAgICAgICAgLnJlZHVjZShmdW5jdGlvbihsaHMsIHJocykgeyByZXR1cm4gbWVyZ2VOb2RlRGF0YShnLCBsaHMsIHJocyk7IH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBtZXJnZU5vZGVEYXRhKGcsIGxocywgcmhzKSB7XG4gIHZhciBjZyA9IG1lcmdlRGlncmFwaHMobGhzLmNvbnN0cmFpbnRHcmFwaCwgcmhzLmNvbnN0cmFpbnRHcmFwaCk7XG5cbiAgaWYgKGxocy5sYXN0U0cgIT09IHVuZGVmaW5lZCAmJiByaHMuZmlyc3RTRyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGNnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNnID0gbmV3IERpZ3JhcGgoKTtcbiAgICB9XG4gICAgaWYgKCFjZy5oYXNOb2RlKGxocy5sYXN0U0cpKSB7IGNnLmFkZE5vZGUobGhzLmxhc3RTRyk7IH1cbiAgICBjZy5hZGROb2RlKHJocy5maXJzdFNHKTtcbiAgICBjZy5hZGRFZGdlKG51bGwsIGxocy5sYXN0U0csIHJocy5maXJzdFNHKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZGVncmVlOiBsaHMuZGVncmVlICsgcmhzLmRlZ3JlZSxcbiAgICBiYXJ5Y2VudGVyOiAobGhzLmJhcnljZW50ZXIgKiBsaHMuZGVncmVlICsgcmhzLmJhcnljZW50ZXIgKiByaHMuZGVncmVlKSAvXG4gICAgICAgICAgICAgICAgKGxocy5kZWdyZWUgKyByaHMuZGVncmVlKSxcbiAgICBvcmRlcjogKGxocy5vcmRlciAqIGxocy5vcmRlckNvdW50ICsgcmhzLm9yZGVyICogcmhzLm9yZGVyQ291bnQpIC9cbiAgICAgICAgICAgKGxocy5vcmRlckNvdW50ICsgcmhzLm9yZGVyQ291bnQpLFxuICAgIG9yZGVyQ291bnQ6IGxocy5vcmRlckNvdW50ICsgcmhzLm9yZGVyQ291bnQsXG4gICAgbGlzdDogbGhzLmxpc3QuY29uY2F0KHJocy5saXN0KSxcbiAgICBmaXJzdFNHOiBsaHMuZmlyc3RTRyAhPT0gdW5kZWZpbmVkID8gbGhzLmZpcnN0U0cgOiByaHMuZmlyc3RTRyxcbiAgICBsYXN0U0c6IHJocy5sYXN0U0cgIT09IHVuZGVmaW5lZCA/IHJocy5sYXN0U0cgOiBsaHMubGFzdFNHLFxuICAgIGNvbnN0cmFpbnRHcmFwaDogY2dcbiAgfTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VEaWdyYXBocyhsaHMsIHJocykge1xuICBpZiAobGhzID09PSB1bmRlZmluZWQpIHJldHVybiByaHM7XG4gIGlmIChyaHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGxocztcblxuICBsaHMgPSBsaHMuY29weSgpO1xuICByaHMubm9kZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHsgbGhzLmFkZE5vZGUodSk7IH0pO1xuICByaHMuZWRnZXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIHUsIHYpIHsgbGhzLmFkZEVkZ2UobnVsbCwgdSwgdik7IH0pO1xuICByZXR1cm4gbGhzO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlVmlvbGF0ZWRDb25zdHJhaW50cyhnLCBjZywgbm9kZURhdGEpIHtcbiAgLy8gUmVtb3ZlcyBub2RlcyBgdWAgYW5kIGB2YCBmcm9tIGBjZ2AgYW5kIG1ha2VzIGFueSBlZGdlcyBpbmNpZGVudCBvbiB0aGVtXG4gIC8vIGluY2lkZW50IG9uIGB3YCBpbnN0ZWFkLlxuICBmdW5jdGlvbiBjb2xsYXBzZU5vZGVzKHUsIHYsIHcpIHtcbiAgICAvLyBUT0RPIG9yaWdpbmFsIHBhcGVyIHJlbW92ZXMgc2VsZiBsb29wcywgYnV0IGl0IGlzIG5vdCBvYnZpb3VzIHdoZW4gdGhpcyB3b3VsZCBoYXBwZW5cbiAgICBjZy5pbkVkZ2VzKHUpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgY2cuZGVsRWRnZShlKTtcbiAgICAgIGNnLmFkZEVkZ2UobnVsbCwgY2cuc291cmNlKGUpLCB3KTtcbiAgICB9KTtcblxuICAgIGNnLm91dEVkZ2VzKHYpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgY2cuZGVsRWRnZShlKTtcbiAgICAgIGNnLmFkZEVkZ2UobnVsbCwgdywgY2cudGFyZ2V0KGUpKTtcbiAgICB9KTtcblxuICAgIGNnLmRlbE5vZGUodSk7XG4gICAgY2cuZGVsTm9kZSh2KTtcbiAgfVxuXG4gIHZhciB2aW9sYXRlZDtcbiAgd2hpbGUgKCh2aW9sYXRlZCA9IGZpbmRWaW9sYXRlZENvbnN0cmFpbnQoY2csIG5vZGVEYXRhKSkgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBzb3VyY2UgPSBjZy5zb3VyY2UodmlvbGF0ZWQpLFxuICAgICAgICB0YXJnZXQgPSBjZy50YXJnZXQodmlvbGF0ZWQpO1xuXG4gICAgdmFyIHY7XG4gICAgd2hpbGUgKCh2ID0gY2cuYWRkTm9kZShudWxsKSkgJiYgZy5oYXNOb2RlKHYpKSB7XG4gICAgICBjZy5kZWxOb2RlKHYpO1xuICAgIH1cblxuICAgIC8vIENvbGxhcHNlIGJhcnljZW50ZXIgYW5kIGxpc3RcbiAgICBub2RlRGF0YVt2XSA9IG1lcmdlTm9kZURhdGEoZywgbm9kZURhdGFbc291cmNlXSwgbm9kZURhdGFbdGFyZ2V0XSk7XG4gICAgZGVsZXRlIG5vZGVEYXRhW3NvdXJjZV07XG4gICAgZGVsZXRlIG5vZGVEYXRhW3RhcmdldF07XG5cbiAgICBjb2xsYXBzZU5vZGVzKHNvdXJjZSwgdGFyZ2V0LCB2KTtcbiAgICBpZiAoY2cuaW5jaWRlbnRFZGdlcyh2KS5sZW5ndGggPT09IDApIHsgY2cuZGVsTm9kZSh2KTsgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRWaW9sYXRlZENvbnN0cmFpbnQoY2csIG5vZGVEYXRhKSB7XG4gIHZhciB1cyA9IHRvcHNvcnQoY2cpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHVzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIHUgPSB1c1tpXTtcbiAgICB2YXIgaW5FZGdlcyA9IGNnLmluRWRnZXModSk7XG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBpbkVkZ2VzLmxlbmd0aDsgKytqKSB7XG4gICAgICB2YXIgZSA9IGluRWRnZXNbal07XG4gICAgICBpZiAobm9kZURhdGFbY2cuc291cmNlKGUpXS5iYXJ5Y2VudGVyID49IG5vZGVEYXRhW3VdLmJhcnljZW50ZXIpIHtcbiAgICAgICAgcmV0dXJuIGU7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIEFkanVzdCB3ZWlnaHRzIHNvIHRoYXQgdGhleSBmYWxsIGluIHRoZSByYW5nZSBvZiAwLi58TnwtMS4gSWYgYSBub2RlIGhhcyBub1xuLy8gd2VpZ2h0IGFzc2lnbmVkIHRoZW4gc2V0IGl0cyBhZGp1c3RlZCB3ZWlnaHQgdG8gaXRzIGN1cnJlbnQgcG9zaXRpb24uIFRoaXNcbi8vIGFsbG93cyB1cyB0byBiZXR0ZXIgcmV0YWluIHRoZSBvcmlnaWluYWwgcG9zaXRpb24gb2Ygbm9kZXMgd2l0aG91dCBuZWlnaGJvcnMuXG5mdW5jdGlvbiBhZGp1c3RXZWlnaHRzKGcsIHdlaWdodHMpIHtcbiAgdmFyIG1pblcgPSBOdW1iZXIuTUFYX1ZBTFVFLFxuICAgICAgbWF4VyA9IDAsXG4gICAgICBhZGp1c3RlZCA9IHt9O1xuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAoZy5jaGlsZHJlbih1KS5sZW5ndGgpIHJldHVybjtcblxuICAgIHZhciB3cyA9IHdlaWdodHNbdV07XG4gICAgaWYgKHdzLmxlbmd0aCkge1xuICAgICAgbWluVyA9IE1hdGgubWluKG1pblcsIHV0aWwubWluKHdzKSk7XG4gICAgICBtYXhXID0gTWF0aC5tYXgobWF4VywgdXRpbC5tYXgod3MpKTtcbiAgICB9XG4gIH0pO1xuXG4gIHZhciByYW5nZVcgPSAobWF4VyAtIG1pblcpO1xuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAoZy5jaGlsZHJlbih1KS5sZW5ndGgpIHJldHVybjtcblxuICAgIHZhciB3cyA9IHdlaWdodHNbdV07XG4gICAgaWYgKCF3cy5sZW5ndGgpIHtcbiAgICAgIGFkanVzdGVkW3VdID0gW2cubm9kZSh1KS5vcmRlcl07XG4gICAgfSBlbHNlIHtcbiAgICAgIGFkanVzdGVkW3VdID0gd3MubWFwKGZ1bmN0aW9uKHcpIHtcbiAgICAgICAgaWYgKHJhbmdlVykge1xuICAgICAgICAgIHJldHVybiAodyAtIG1pblcpICogKGcub3JkZXIoKSAtIDEpIC8gcmFuZ2VXO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBnLm9yZGVyKCkgLSAxIC8gMjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gYWRqdXN0ZWQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbi8qXG4gKiBUaGUgYWxnb3JpdGhtcyBoZXJlIGFyZSBiYXNlZCBvbiBCcmFuZGVzIGFuZCBLw7ZwZiwgXCJGYXN0IGFuZCBTaW1wbGVcbiAqIEhvcml6b250YWwgQ29vcmRpbmF0ZSBBc3NpZ25tZW50XCIuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIC8vIEV4dGVybmFsIGNvbmZpZ3VyYXRpb25cbiAgdmFyIGNvbmZpZyA9IHtcbiAgICBub2RlU2VwOiA1MCxcbiAgICBlZGdlU2VwOiAxMCxcbiAgICB1bml2ZXJzYWxTZXA6IG51bGwsXG4gICAgcmFua1NlcDogMzBcbiAgfTtcblxuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYubm9kZVNlcCA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICdub2RlU2VwJyk7XG4gIHNlbGYuZWRnZVNlcCA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICdlZGdlU2VwJyk7XG4gIC8vIElmIG5vdCBudWxsIHRoaXMgc2VwYXJhdGlvbiB2YWx1ZSBpcyB1c2VkIGZvciBhbGwgbm9kZXMgYW5kIGVkZ2VzXG4gIC8vIHJlZ2FyZGxlc3Mgb2YgdGhlaXIgd2lkdGhzLiBgbm9kZVNlcGAgYW5kIGBlZGdlU2VwYCBhcmUgaWdub3JlZCB3aXRoIHRoaXNcbiAgLy8gb3B0aW9uLlxuICBzZWxmLnVuaXZlcnNhbFNlcCA9IHV0aWwucHJvcGVydHlBY2Nlc3NvcihzZWxmLCBjb25maWcsICd1bml2ZXJzYWxTZXAnKTtcbiAgc2VsZi5yYW5rU2VwID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ3JhbmtTZXAnKTtcbiAgc2VsZi5kZWJ1Z0xldmVsID0gdXRpbC5wcm9wZXJ0eUFjY2Vzc29yKHNlbGYsIGNvbmZpZywgJ2RlYnVnTGV2ZWwnKTtcblxuICBzZWxmLnJ1biA9IHJ1bjtcblxuICByZXR1cm4gc2VsZjtcblxuICBmdW5jdGlvbiBydW4oZykge1xuICAgIGcgPSBnLmZpbHRlck5vZGVzKHV0aWwuZmlsdGVyTm9uU3ViZ3JhcGhzKGcpKTtcblxuICAgIHZhciBsYXllcmluZyA9IHV0aWwub3JkZXJpbmcoZyk7XG5cbiAgICB2YXIgY29uZmxpY3RzID0gZmluZENvbmZsaWN0cyhnLCBsYXllcmluZyk7XG5cbiAgICB2YXIgeHNzID0ge307XG4gICAgWyd1JywgJ2QnXS5mb3JFYWNoKGZ1bmN0aW9uKHZlcnREaXIpIHtcbiAgICAgIGlmICh2ZXJ0RGlyID09PSAnZCcpIGxheWVyaW5nLnJldmVyc2UoKTtcblxuICAgICAgWydsJywgJ3InXS5mb3JFYWNoKGZ1bmN0aW9uKGhvcml6RGlyKSB7XG4gICAgICAgIGlmIChob3JpekRpciA9PT0gJ3InKSByZXZlcnNlSW5uZXJPcmRlcihsYXllcmluZyk7XG5cbiAgICAgICAgdmFyIGRpciA9IHZlcnREaXIgKyBob3JpekRpcjtcbiAgICAgICAgdmFyIGFsaWduID0gdmVydGljYWxBbGlnbm1lbnQoZywgbGF5ZXJpbmcsIGNvbmZsaWN0cywgdmVydERpciA9PT0gJ3UnID8gJ3ByZWRlY2Vzc29ycycgOiAnc3VjY2Vzc29ycycpO1xuICAgICAgICB4c3NbZGlyXT0gaG9yaXpvbnRhbENvbXBhY3Rpb24oZywgbGF5ZXJpbmcsIGFsaWduLnBvcywgYWxpZ24ucm9vdCwgYWxpZ24uYWxpZ24pO1xuXG4gICAgICAgIGlmIChjb25maWcuZGVidWdMZXZlbCA+PSAzKVxuICAgICAgICAgIGRlYnVnUG9zaXRpb25pbmcodmVydERpciArIGhvcml6RGlyLCBnLCBsYXllcmluZywgeHNzW2Rpcl0pO1xuXG4gICAgICAgIGlmIChob3JpekRpciA9PT0gJ3InKSBmbGlwSG9yaXpvbnRhbGx5KHhzc1tkaXJdKTtcblxuICAgICAgICBpZiAoaG9yaXpEaXIgPT09ICdyJykgcmV2ZXJzZUlubmVyT3JkZXIobGF5ZXJpbmcpO1xuICAgICAgfSk7XG5cbiAgICAgIGlmICh2ZXJ0RGlyID09PSAnZCcpIGxheWVyaW5nLnJldmVyc2UoKTtcbiAgICB9KTtcblxuICAgIGJhbGFuY2UoZywgbGF5ZXJpbmcsIHhzcyk7XG5cbiAgICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHZhciB4cyA9IFtdO1xuICAgICAgZm9yICh2YXIgYWxpZ25tZW50IGluIHhzcykge1xuICAgICAgICB2YXIgYWxpZ25tZW50WCA9IHhzc1thbGlnbm1lbnRdW3ZdO1xuICAgICAgICBwb3NYRGVidWcoYWxpZ25tZW50LCBnLCB2LCBhbGlnbm1lbnRYKTtcbiAgICAgICAgeHMucHVzaChhbGlnbm1lbnRYKTtcbiAgICAgIH1cbiAgICAgIHhzLnNvcnQoZnVuY3Rpb24oeCwgeSkgeyByZXR1cm4geCAtIHk7IH0pO1xuICAgICAgcG9zWChnLCB2LCAoeHNbMV0gKyB4c1syXSkgLyAyKTtcbiAgICB9KTtcblxuICAgIC8vIEFsaWduIHkgY29vcmRpbmF0ZXMgd2l0aCByYW5rc1xuICAgIHZhciB5ID0gMCwgcmV2ZXJzZVkgPSBnLmdyYXBoKCkucmFua0RpciA9PT0gJ0JUJyB8fCBnLmdyYXBoKCkucmFua0RpciA9PT0gJ1JMJztcbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICB2YXIgbWF4SGVpZ2h0ID0gdXRpbC5tYXgobGF5ZXIubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGhlaWdodChnLCB1KTsgfSkpO1xuICAgICAgeSArPSBtYXhIZWlnaHQgLyAyO1xuICAgICAgbGF5ZXIuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICAgIHBvc1koZywgdSwgcmV2ZXJzZVkgPyAteSA6IHkpO1xuICAgICAgfSk7XG4gICAgICB5ICs9IG1heEhlaWdodCAvIDIgKyBjb25maWcucmFua1NlcDtcbiAgICB9KTtcblxuICAgIC8vIFRyYW5zbGF0ZSBsYXlvdXQgc28gdGhhdCB0b3AgbGVmdCBjb3JuZXIgb2YgYm91bmRpbmcgcmVjdGFuZ2xlIGhhc1xuICAgIC8vIGNvb3JkaW5hdGUgKDAsIDApLlxuICAgIHZhciBtaW5YID0gdXRpbC5taW4oZy5ub2RlcygpLm1hcChmdW5jdGlvbih1KSB7IHJldHVybiBwb3NYKGcsIHUpIC0gd2lkdGgoZywgdSkgLyAyOyB9KSk7XG4gICAgdmFyIG1pblkgPSB1dGlsLm1pbihnLm5vZGVzKCkubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIHBvc1koZywgdSkgLSBoZWlnaHQoZywgdSkgLyAyOyB9KSk7XG4gICAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7XG4gICAgICBwb3NYKGcsIHUsIHBvc1goZywgdSkgLSBtaW5YKTtcbiAgICAgIHBvc1koZywgdSwgcG9zWShnLCB1KSAtIG1pblkpO1xuICAgIH0pO1xuICB9XG5cbiAgLypcbiAgICogR2VuZXJhdGUgYW4gSUQgdGhhdCBjYW4gYmUgdXNlZCB0byByZXByZXNlbnQgYW55IHVuZGlyZWN0ZWQgZWRnZSB0aGF0IGlzXG4gICAqIGluY2lkZW50IG9uIGB1YCBhbmQgYHZgLlxuICAgKi9cbiAgZnVuY3Rpb24gdW5kaXJFZGdlSWQodSwgdikge1xuICAgIHJldHVybiB1IDwgdlxuICAgICAgPyB1LnRvU3RyaW5nKCkubGVuZ3RoICsgJzonICsgdSArICctJyArIHZcbiAgICAgIDogdi50b1N0cmluZygpLmxlbmd0aCArICc6JyArIHYgKyAnLScgKyB1O1xuICB9XG5cbiAgZnVuY3Rpb24gZmluZENvbmZsaWN0cyhnLCBsYXllcmluZykge1xuICAgIHZhciBjb25mbGljdHMgPSB7fSwgLy8gU2V0IG9mIGNvbmZsaWN0aW5nIGVkZ2UgaWRzXG4gICAgICAgIHBvcyA9IHt9LCAgICAgICAvLyBQb3NpdGlvbiBvZiBub2RlIGluIGl0cyBsYXllclxuICAgICAgICBwcmV2TGF5ZXIsXG4gICAgICAgIGN1cnJMYXllcixcbiAgICAgICAgazAsICAgICAvLyBQb3NpdGlvbiBvZiB0aGUgbGFzdCBpbm5lciBzZWdtZW50IGluIHRoZSBwcmV2aW91cyBsYXllclxuICAgICAgICBsLCAgICAgIC8vIEN1cnJlbnQgcG9zaXRpb24gaW4gdGhlIGN1cnJlbnQgbGF5ZXIgKGZvciBpdGVyYXRpb24gdXAgdG8gYGwxYClcbiAgICAgICAgazE7ICAgICAvLyBQb3NpdGlvbiBvZiB0aGUgbmV4dCBpbm5lciBzZWdtZW50IGluIHRoZSBwcmV2aW91cyBsYXllciBvclxuICAgICAgICAgICAgICAgIC8vIHRoZSBwb3NpdGlvbiBvZiB0aGUgbGFzdCBlbGVtZW50IGluIHRoZSBwcmV2aW91cyBsYXllclxuXG4gICAgaWYgKGxheWVyaW5nLmxlbmd0aCA8PSAyKSByZXR1cm4gY29uZmxpY3RzO1xuXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29uZmxpY3RzKHYpIHtcbiAgICAgIHZhciBrID0gcG9zW3ZdO1xuICAgICAgaWYgKGsgPCBrMCB8fCBrID4gazEpIHtcbiAgICAgICAgY29uZmxpY3RzW3VuZGlyRWRnZUlkKGN1cnJMYXllcltsXSwgdildID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsYXllcmluZ1sxXS5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHsgcG9zW3VdID0gaTsgfSk7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBsYXllcmluZy5sZW5ndGggLSAxOyArK2kpIHtcbiAgICAgIHByZXZMYXllciA9IGxheWVyaW5nW2ldO1xuICAgICAgY3VyckxheWVyID0gbGF5ZXJpbmdbaSsxXTtcbiAgICAgIGswID0gMDtcbiAgICAgIGwgPSAwO1xuXG4gICAgICAvLyBTY2FuIGN1cnJlbnQgbGF5ZXIgZm9yIG5leHQgbm9kZSB0aGF0IGlzIGluY2lkZW50IHRvIGFuIGlubmVyIHNlZ2VtZW50XG4gICAgICAvLyBiZXR3ZWVuIGxheWVyaW5nW2krMV0gYW5kIGxheWVyaW5nW2ldLlxuICAgICAgZm9yICh2YXIgbDEgPSAwOyBsMSA8IGN1cnJMYXllci5sZW5ndGg7ICsrbDEpIHtcbiAgICAgICAgdmFyIHUgPSBjdXJyTGF5ZXJbbDFdOyAvLyBOZXh0IGlubmVyIHNlZ21lbnQgaW4gdGhlIGN1cnJlbnQgbGF5ZXIgb3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsYXN0IG5vZGUgaW4gdGhlIGN1cnJlbnQgbGF5ZXJcbiAgICAgICAgcG9zW3VdID0gbDE7XG4gICAgICAgIGsxID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIGlmIChnLm5vZGUodSkuZHVtbXkpIHtcbiAgICAgICAgICB2YXIgdVByZWQgPSBnLnByZWRlY2Vzc29ycyh1KVswXTtcbiAgICAgICAgICAvLyBOb3RlOiBJbiB0aGUgY2FzZSBvZiBzZWxmIGxvb3BzIGFuZCBzaWRld2F5cyBlZGdlcyBpdCBpcyBwb3NzaWJsZVxuICAgICAgICAgIC8vIGZvciBhIGR1bW15IG5vdCB0byBoYXZlIGEgcHJlZGVjZXNzb3IuXG4gICAgICAgICAgaWYgKHVQcmVkICE9PSB1bmRlZmluZWQgJiYgZy5ub2RlKHVQcmVkKS5kdW1teSlcbiAgICAgICAgICAgIGsxID0gcG9zW3VQcmVkXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoazEgPT09IHVuZGVmaW5lZCAmJiBsMSA9PT0gY3VyckxheWVyLmxlbmd0aCAtIDEpXG4gICAgICAgICAgazEgPSBwcmV2TGF5ZXIubGVuZ3RoIC0gMTtcblxuICAgICAgICBpZiAoazEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGZvciAoOyBsIDw9IGwxOyArK2wpIHtcbiAgICAgICAgICAgIGcucHJlZGVjZXNzb3JzKGN1cnJMYXllcltsXSkuZm9yRWFjaCh1cGRhdGVDb25mbGljdHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBrMCA9IGsxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNvbmZsaWN0cztcbiAgfVxuXG4gIGZ1bmN0aW9uIHZlcnRpY2FsQWxpZ25tZW50KGcsIGxheWVyaW5nLCBjb25mbGljdHMsIHJlbGF0aW9uc2hpcCkge1xuICAgIHZhciBwb3MgPSB7fSwgICAvLyBQb3NpdGlvbiBmb3IgYSBub2RlIGluIGl0cyBsYXllclxuICAgICAgICByb290ID0ge30sICAvLyBSb290IG9mIHRoZSBibG9jayB0aGF0IHRoZSBub2RlIHBhcnRpY2lwYXRlcyBpblxuICAgICAgICBhbGlnbiA9IHt9OyAvLyBQb2ludHMgdG8gdGhlIG5leHQgbm9kZSBpbiB0aGUgYmxvY2sgb3IsIGlmIHRoZSBsYXN0XG4gICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgaW4gdGhlIGJsb2NrLCBwb2ludHMgdG8gdGhlIGZpcnN0IGJsb2NrJ3Mgcm9vdFxuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIuZm9yRWFjaChmdW5jdGlvbih1LCBpKSB7XG4gICAgICAgIHJvb3RbdV0gPSB1O1xuICAgICAgICBhbGlnblt1XSA9IHU7XG4gICAgICAgIHBvc1t1XSA9IGk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIHZhciBwcmV2SWR4ID0gLTE7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdmFyIHJlbGF0ZWQgPSBnW3JlbGF0aW9uc2hpcF0odiksIC8vIEFkamFjZW50IG5vZGVzIGZyb20gdGhlIHByZXZpb3VzIGxheWVyXG4gICAgICAgICAgICBtaWQ7ICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgbWlkIHBvaW50IGluIHRoZSByZWxhdGVkIGFycmF5XG5cbiAgICAgICAgaWYgKHJlbGF0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgIHJlbGF0ZWQuc29ydChmdW5jdGlvbih4LCB5KSB7IHJldHVybiBwb3NbeF0gLSBwb3NbeV07IH0pO1xuICAgICAgICAgIG1pZCA9IChyZWxhdGVkLmxlbmd0aCAtIDEpIC8gMjtcbiAgICAgICAgICByZWxhdGVkLnNsaWNlKE1hdGguZmxvb3IobWlkKSwgTWF0aC5jZWlsKG1pZCkgKyAxKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgICAgICAgIGlmIChhbGlnblt2XSA9PT0gdikge1xuICAgICAgICAgICAgICBpZiAoIWNvbmZsaWN0c1t1bmRpckVkZ2VJZCh1LCB2KV0gJiYgcHJldklkeCA8IHBvc1t1XSkge1xuICAgICAgICAgICAgICAgIGFsaWduW3VdID0gdjtcbiAgICAgICAgICAgICAgICBhbGlnblt2XSA9IHJvb3Rbdl0gPSByb290W3VdO1xuICAgICAgICAgICAgICAgIHByZXZJZHggPSBwb3NbdV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4geyBwb3M6IHBvcywgcm9vdDogcm9vdCwgYWxpZ246IGFsaWduIH07XG4gIH1cblxuICAvLyBUaGlzIGZ1bmN0aW9uIGRldmlhdGVzIGZyb20gdGhlIHN0YW5kYXJkIEJLIGFsZ29yaXRobSBpbiB0d28gd2F5cy4gRmlyc3RcbiAgLy8gaXQgdGFrZXMgaW50byBhY2NvdW50IHRoZSBzaXplIG9mIHRoZSBub2Rlcy4gU2Vjb25kIGl0IGluY2x1ZGVzIGEgZml4IHRvXG4gIC8vIHRoZSBvcmlnaW5hbCBhbGdvcml0aG0gdGhhdCBpcyBkZXNjcmliZWQgaW4gQ2Fyc3RlbnMsIFwiTm9kZSBhbmQgTGFiZWxcbiAgLy8gUGxhY2VtZW50IGluIGEgTGF5ZXJlZCBMYXlvdXQgQWxnb3JpdGhtXCIuXG4gIGZ1bmN0aW9uIGhvcml6b250YWxDb21wYWN0aW9uKGcsIGxheWVyaW5nLCBwb3MsIHJvb3QsIGFsaWduKSB7XG4gICAgdmFyIHNpbmsgPSB7fSwgICAgICAgLy8gTWFwcGluZyBvZiBub2RlIGlkIC0+IHNpbmsgbm9kZSBpZCBmb3IgY2xhc3NcbiAgICAgICAgbWF5YmVTaGlmdCA9IHt9LCAvLyBNYXBwaW5nIG9mIHNpbmsgbm9kZSBpZCAtPiB7IGNsYXNzIG5vZGUgaWQsIG1pbiBzaGlmdCB9XG4gICAgICAgIHNoaWZ0ID0ge30sICAgICAgLy8gTWFwcGluZyBvZiBzaW5rIG5vZGUgaWQgLT4gc2hpZnRcbiAgICAgICAgcHJlZCA9IHt9LCAgICAgICAvLyBNYXBwaW5nIG9mIG5vZGUgaWQgLT4gcHJlZGVjZXNzb3Igbm9kZSAob3IgbnVsbClcbiAgICAgICAgeHMgPSB7fTsgICAgICAgICAvLyBDYWxjdWxhdGVkIFggcG9zaXRpb25zXG5cbiAgICBsYXllcmluZy5mb3JFYWNoKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICBsYXllci5mb3JFYWNoKGZ1bmN0aW9uKHUsIGkpIHtcbiAgICAgICAgc2lua1t1XSA9IHU7XG4gICAgICAgIG1heWJlU2hpZnRbdV0gPSB7fTtcbiAgICAgICAgaWYgKGkgPiAwKVxuICAgICAgICAgIHByZWRbdV0gPSBsYXllcltpIC0gMV07XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVNoaWZ0KHRvU2hpZnQsIG5laWdoYm9yLCBkZWx0YSkge1xuICAgICAgaWYgKCEobmVpZ2hib3IgaW4gbWF5YmVTaGlmdFt0b1NoaWZ0XSkpIHtcbiAgICAgICAgbWF5YmVTaGlmdFt0b1NoaWZ0XVtuZWlnaGJvcl0gPSBkZWx0YTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heWJlU2hpZnRbdG9TaGlmdF1bbmVpZ2hib3JdID0gTWF0aC5taW4obWF5YmVTaGlmdFt0b1NoaWZ0XVtuZWlnaGJvcl0sIGRlbHRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwbGFjZUJsb2NrKHYpIHtcbiAgICAgIGlmICghKHYgaW4geHMpKSB7XG4gICAgICAgIHhzW3ZdID0gMDtcbiAgICAgICAgdmFyIHcgPSB2O1xuICAgICAgICBkbyB7XG4gICAgICAgICAgaWYgKHBvc1t3XSA+IDApIHtcbiAgICAgICAgICAgIHZhciB1ID0gcm9vdFtwcmVkW3ddXTtcbiAgICAgICAgICAgIHBsYWNlQmxvY2sodSk7XG4gICAgICAgICAgICBpZiAoc2lua1t2XSA9PT0gdikge1xuICAgICAgICAgICAgICBzaW5rW3ZdID0gc2lua1t1XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkZWx0YSA9IHNlcChnLCBwcmVkW3ddKSArIHNlcChnLCB3KTtcbiAgICAgICAgICAgIGlmIChzaW5rW3ZdICE9PSBzaW5rW3VdKSB7XG4gICAgICAgICAgICAgIHVwZGF0ZVNoaWZ0KHNpbmtbdV0sIHNpbmtbdl0sIHhzW3ZdIC0geHNbdV0gLSBkZWx0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB4c1t2XSA9IE1hdGgubWF4KHhzW3ZdLCB4c1t1XSArIGRlbHRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdyA9IGFsaWduW3ddO1xuICAgICAgICB9IHdoaWxlICh3ICE9PSB2KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSb290IGNvb3JkaW5hdGVzIHJlbGF0aXZlIHRvIHNpbmtcbiAgICB1dGlsLnZhbHVlcyhyb290KS5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgIHBsYWNlQmxvY2sodik7XG4gICAgfSk7XG5cbiAgICAvLyBBYnNvbHV0ZSBjb29yZGluYXRlc1xuICAgIC8vIFRoZXJlIGlzIGFuIGFzc3VtcHRpb24gaGVyZSB0aGF0IHdlJ3ZlIHJlc29sdmVkIHNoaWZ0cyBmb3IgYW55IGNsYXNzZXNcbiAgICAvLyB0aGF0IGJlZ2luIGF0IGFuIGVhcmxpZXIgbGF5ZXIuIFdlIGd1YXJhbnRlZSB0aGlzIGJ5IHZpc2l0aW5nIGxheWVycyBpblxuICAgIC8vIG9yZGVyLlxuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIGxheWVyLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgICAgICB4c1t2XSA9IHhzW3Jvb3Rbdl1dO1xuICAgICAgICBpZiAodiA9PT0gcm9vdFt2XSAmJiB2ID09PSBzaW5rW3ZdKSB7XG4gICAgICAgICAgdmFyIG1pblNoaWZ0ID0gMDtcbiAgICAgICAgICBpZiAodiBpbiBtYXliZVNoaWZ0ICYmIE9iamVjdC5rZXlzKG1heWJlU2hpZnRbdl0pLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1pblNoaWZ0ID0gdXRpbC5taW4oT2JqZWN0LmtleXMobWF5YmVTaGlmdFt2XSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24odSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbWF5YmVTaGlmdFt2XVt1XSArICh1IGluIHNoaWZ0ID8gc2hpZnRbdV0gOiAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNoaWZ0W3ZdID0gbWluU2hpZnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsYXllcikge1xuICAgICAgbGF5ZXIuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICAgIHhzW3ZdICs9IHNoaWZ0W3Npbmtbcm9vdFt2XV1dIHx8IDA7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiB4cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRNaW5Db29yZChnLCBsYXllcmluZywgeHMpIHtcbiAgICByZXR1cm4gdXRpbC5taW4obGF5ZXJpbmcubWFwKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICB2YXIgdSA9IGxheWVyWzBdO1xuICAgICAgcmV0dXJuIHhzW3VdO1xuICAgIH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbmRNYXhDb29yZChnLCBsYXllcmluZywgeHMpIHtcbiAgICByZXR1cm4gdXRpbC5tYXgobGF5ZXJpbmcubWFwKGZ1bmN0aW9uKGxheWVyKSB7XG4gICAgICB2YXIgdSA9IGxheWVyW2xheWVyLmxlbmd0aCAtIDFdO1xuICAgICAgcmV0dXJuIHhzW3VdO1xuICAgIH0pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJhbGFuY2UoZywgbGF5ZXJpbmcsIHhzcykge1xuICAgIHZhciBtaW4gPSB7fSwgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWluIGNvb3JkaW5hdGUgZm9yIHRoZSBhbGlnbm1lbnRcbiAgICAgICAgbWF4ID0ge30sICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1heCBjb29yZGluYXRlIGZvciB0aGUgYWxnaW5tZW50XG4gICAgICAgIHNtYWxsZXN0QWxpZ25tZW50LFxuICAgICAgICBzaGlmdCA9IHt9OyAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQW1vdW50IHRvIHNoaWZ0IGEgZ2l2ZW4gYWxpZ25tZW50XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVBbGlnbm1lbnQodikge1xuICAgICAgeHNzW2FsaWdubWVudF1bdl0gKz0gc2hpZnRbYWxpZ25tZW50XTtcbiAgICB9XG5cbiAgICB2YXIgc21hbGxlc3QgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgZm9yICh2YXIgYWxpZ25tZW50IGluIHhzcykge1xuICAgICAgdmFyIHhzID0geHNzW2FsaWdubWVudF07XG4gICAgICBtaW5bYWxpZ25tZW50XSA9IGZpbmRNaW5Db29yZChnLCBsYXllcmluZywgeHMpO1xuICAgICAgbWF4W2FsaWdubWVudF0gPSBmaW5kTWF4Q29vcmQoZywgbGF5ZXJpbmcsIHhzKTtcbiAgICAgIHZhciB3ID0gbWF4W2FsaWdubWVudF0gLSBtaW5bYWxpZ25tZW50XTtcbiAgICAgIGlmICh3IDwgc21hbGxlc3QpIHtcbiAgICAgICAgc21hbGxlc3QgPSB3O1xuICAgICAgICBzbWFsbGVzdEFsaWdubWVudCA9IGFsaWdubWVudDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEZXRlcm1pbmUgaG93IG11Y2ggdG8gYWRqdXN0IHBvc2l0aW9uaW5nIGZvciBlYWNoIGFsaWdubWVudFxuICAgIFsndScsICdkJ10uZm9yRWFjaChmdW5jdGlvbih2ZXJ0RGlyKSB7XG4gICAgICBbJ2wnLCAnciddLmZvckVhY2goZnVuY3Rpb24oaG9yaXpEaXIpIHtcbiAgICAgICAgdmFyIGFsaWdubWVudCA9IHZlcnREaXIgKyBob3JpekRpcjtcbiAgICAgICAgc2hpZnRbYWxpZ25tZW50XSA9IGhvcml6RGlyID09PSAnbCdcbiAgICAgICAgICAgID8gbWluW3NtYWxsZXN0QWxpZ25tZW50XSAtIG1pblthbGlnbm1lbnRdXG4gICAgICAgICAgICA6IG1heFtzbWFsbGVzdEFsaWdubWVudF0gLSBtYXhbYWxpZ25tZW50XTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gRmluZCBhdmVyYWdlIG9mIG1lZGlhbnMgZm9yIHhzcyBhcnJheVxuICAgIGZvciAoYWxpZ25tZW50IGluIHhzcykge1xuICAgICAgZy5lYWNoTm9kZSh1cGRhdGVBbGlnbm1lbnQpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZsaXBIb3Jpem9udGFsbHkoeHMpIHtcbiAgICBmb3IgKHZhciB1IGluIHhzKSB7XG4gICAgICB4c1t1XSA9IC14c1t1XTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXZlcnNlSW5uZXJPcmRlcihsYXllcmluZykge1xuICAgIGxheWVyaW5nLmZvckVhY2goZnVuY3Rpb24obGF5ZXIpIHtcbiAgICAgIGxheWVyLnJldmVyc2UoKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdpZHRoKGcsIHUpIHtcbiAgICBzd2l0Y2ggKGcuZ3JhcGgoKS5yYW5rRGlyKSB7XG4gICAgICBjYXNlICdMUic6IHJldHVybiBnLm5vZGUodSkuaGVpZ2h0O1xuICAgICAgY2FzZSAnUkwnOiByZXR1cm4gZy5ub2RlKHUpLmhlaWdodDtcbiAgICAgIGRlZmF1bHQ6ICAgcmV0dXJuIGcubm9kZSh1KS53aWR0aDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoZWlnaHQoZywgdSkge1xuICAgIHN3aXRjaChnLmdyYXBoKCkucmFua0Rpcikge1xuICAgICAgY2FzZSAnTFInOiByZXR1cm4gZy5ub2RlKHUpLndpZHRoO1xuICAgICAgY2FzZSAnUkwnOiByZXR1cm4gZy5ub2RlKHUpLndpZHRoO1xuICAgICAgZGVmYXVsdDogICByZXR1cm4gZy5ub2RlKHUpLmhlaWdodDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXAoZywgdSkge1xuICAgIGlmIChjb25maWcudW5pdmVyc2FsU2VwICE9PSBudWxsKSB7XG4gICAgICByZXR1cm4gY29uZmlnLnVuaXZlcnNhbFNlcDtcbiAgICB9XG4gICAgdmFyIHcgPSB3aWR0aChnLCB1KTtcbiAgICB2YXIgcyA9IGcubm9kZSh1KS5kdW1teSA/IGNvbmZpZy5lZGdlU2VwIDogY29uZmlnLm5vZGVTZXA7XG4gICAgcmV0dXJuICh3ICsgcykgLyAyO1xuICB9XG5cbiAgZnVuY3Rpb24gcG9zWChnLCB1LCB4KSB7XG4gICAgaWYgKGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnTFInIHx8IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnUkwnKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuIGcubm9kZSh1KS55O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZy5ub2RlKHUpLnkgPSB4O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuIGcubm9kZSh1KS54O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZy5ub2RlKHUpLnggPSB4O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBvc1hEZWJ1ZyhuYW1lLCBnLCB1LCB4KSB7XG4gICAgaWYgKGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnTFInIHx8IGcuZ3JhcGgoKS5yYW5rRGlyID09PSAnUkwnKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgcmV0dXJuIGcubm9kZSh1KVtuYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGcubm9kZSh1KVtuYW1lXSA9IHg7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpW25hbWVdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZy5ub2RlKHUpW25hbWVdID0geDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwb3NZKGcsIHUsIHkpIHtcbiAgICBpZiAoZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdMUicgfHwgZy5ncmFwaCgpLnJhbmtEaXIgPT09ICdSTCcpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLng7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueCA9IHk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICByZXR1cm4gZy5ub2RlKHUpLnk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBnLm5vZGUodSkueSA9IHk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZGVidWdQb3NpdGlvbmluZyhhbGlnbiwgZywgbGF5ZXJpbmcsIHhzKSB7XG4gICAgbGF5ZXJpbmcuZm9yRWFjaChmdW5jdGlvbihsLCBsaSkge1xuICAgICAgdmFyIHUsIHhVO1xuICAgICAgbC5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdmFyIHhWID0geHNbdl07XG4gICAgICAgIGlmICh1KSB7XG4gICAgICAgICAgdmFyIHMgPSBzZXAoZywgdSkgKyBzZXAoZywgdik7XG4gICAgICAgICAgaWYgKHhWIC0geFUgPCBzKVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1Bvc2l0aW9uIHBoYXNlOiBzZXAgdmlvbGF0aW9uLiBBbGlnbjogJyArIGFsaWduICsgJy4gTGF5ZXI6ICcgKyBsaSArICcuICcgK1xuICAgICAgICAgICAgICAnVTogJyArIHUgKyAnIFY6ICcgKyB2ICsgJy4gQWN0dWFsIHNlcDogJyArICh4ViAtIHhVKSArICcgRXhwZWN0ZWQgc2VwOiAnICsgcyk7XG4gICAgICAgIH1cbiAgICAgICAgdSA9IHY7XG4gICAgICAgIHhVID0geFY7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKSxcbiAgICBhY3ljbGljID0gcmVxdWlyZSgnLi9yYW5rL2FjeWNsaWMnKSxcbiAgICBpbml0UmFuayA9IHJlcXVpcmUoJy4vcmFuay9pbml0UmFuaycpLFxuICAgIGZlYXNpYmxlVHJlZSA9IHJlcXVpcmUoJy4vcmFuay9mZWFzaWJsZVRyZWUnKSxcbiAgICBjb25zdHJhaW50cyA9IHJlcXVpcmUoJy4vcmFuay9jb25zdHJhaW50cycpLFxuICAgIHNpbXBsZXggPSByZXF1aXJlKCcuL3Jhbmsvc2ltcGxleCcpLFxuICAgIGNvbXBvbmVudHMgPSByZXF1aXJlKCdncmFwaGxpYicpLmFsZy5jb21wb25lbnRzLFxuICAgIGZpbHRlciA9IHJlcXVpcmUoJ2dyYXBobGliJykuZmlsdGVyO1xuXG5leHBvcnRzLnJ1biA9IHJ1bjtcbmV4cG9ydHMucmVzdG9yZUVkZ2VzID0gcmVzdG9yZUVkZ2VzO1xuXG4vKlxuICogSGV1cmlzdGljIGZ1bmN0aW9uIHRoYXQgYXNzaWducyBhIHJhbmsgdG8gZWFjaCBub2RlIG9mIHRoZSBpbnB1dCBncmFwaCB3aXRoXG4gKiB0aGUgaW50ZW50IG9mIG1pbmltaXppbmcgZWRnZSBsZW5ndGhzLCB3aGlsZSByZXNwZWN0aW5nIHRoZSBgbWluTGVuYFxuICogYXR0cmlidXRlIG9mIGluY2lkZW50IGVkZ2VzLlxuICpcbiAqIFByZXJlcXVpc2l0ZXM6XG4gKlxuICogICogRWFjaCBlZGdlIGluIHRoZSBpbnB1dCBncmFwaCBtdXN0IGhhdmUgYW4gYXNzaWduZWQgJ21pbkxlbicgYXR0cmlidXRlXG4gKi9cbmZ1bmN0aW9uIHJ1bihnLCB1c2VTaW1wbGV4KSB7XG4gIGV4cGFuZFNlbGZMb29wcyhnKTtcblxuICAvLyBJZiB0aGVyZSBhcmUgcmFuayBjb25zdHJhaW50cyBvbiBub2RlcywgdGhlbiBidWlsZCBhIG5ldyBncmFwaCB0aGF0XG4gIC8vIGVuY29kZXMgdGhlIGNvbnN0cmFpbnRzLlxuICB1dGlsLnRpbWUoJ2NvbnN0cmFpbnRzLmFwcGx5JywgY29uc3RyYWludHMuYXBwbHkpKGcpO1xuXG4gIGV4cGFuZFNpZGV3YXlzRWRnZXMoZyk7XG5cbiAgLy8gUmV2ZXJzZSBlZGdlcyB0byBnZXQgYW4gYWN5Y2xpYyBncmFwaCwgd2Uga2VlcCB0aGUgZ3JhcGggaW4gYW4gYWN5Y2xpY1xuICAvLyBzdGF0ZSB1bnRpbCB0aGUgdmVyeSBlbmQuXG4gIHV0aWwudGltZSgnYWN5Y2xpYycsIGFjeWNsaWMpKGcpO1xuXG4gIC8vIENvbnZlcnQgdGhlIGdyYXBoIGludG8gYSBmbGF0IGdyYXBoIGZvciByYW5raW5nXG4gIHZhciBmbGF0R3JhcGggPSBnLmZpbHRlck5vZGVzKHV0aWwuZmlsdGVyTm9uU3ViZ3JhcGhzKGcpKTtcblxuICAvLyBBc3NpZ24gYW4gaW5pdGlhbCByYW5raW5nIHVzaW5nIERGUy5cbiAgaW5pdFJhbmsoZmxhdEdyYXBoKTtcblxuICAvLyBGb3IgZWFjaCBjb21wb25lbnQgaW1wcm92ZSB0aGUgYXNzaWduZWQgcmFua3MuXG4gIGNvbXBvbmVudHMoZmxhdEdyYXBoKS5mb3JFYWNoKGZ1bmN0aW9uKGNtcHQpIHtcbiAgICB2YXIgc3ViZ3JhcGggPSBmbGF0R3JhcGguZmlsdGVyTm9kZXMoZmlsdGVyLm5vZGVzRnJvbUxpc3QoY21wdCkpO1xuICAgIHJhbmtDb21wb25lbnQoc3ViZ3JhcGgsIHVzZVNpbXBsZXgpO1xuICB9KTtcblxuICAvLyBSZWxheCBvcmlnaW5hbCBjb25zdHJhaW50c1xuICB1dGlsLnRpbWUoJ2NvbnN0cmFpbnRzLnJlbGF4JywgY29uc3RyYWludHMucmVsYXgoZykpO1xuXG4gIC8vIFdoZW4gaGFuZGxpbmcgbm9kZXMgd2l0aCBjb25zdHJhaW5lZCByYW5rcyBpdCBpcyBwb3NzaWJsZSB0byBlbmQgdXAgd2l0aFxuICAvLyBlZGdlcyB0aGF0IHBvaW50IHRvIHByZXZpb3VzIHJhbmtzLiBNb3N0IG9mIHRoZSBzdWJzZXF1ZW50IGFsZ29yaXRobXMgYXNzdW1lXG4gIC8vIHRoYXQgZWRnZXMgYXJlIHBvaW50aW5nIHRvIHN1Y2Nlc3NpdmUgcmFua3Mgb25seS4gSGVyZSB3ZSByZXZlcnNlIGFueSBcImJhY2tcbiAgLy8gZWRnZXNcIiBhbmQgbWFyayB0aGVtIGFzIHN1Y2guIFRoZSBhY3ljbGljIGFsZ29yaXRobSB3aWxsIHJldmVyc2UgdGhlbSBhcyBhXG4gIC8vIHBvc3QgcHJvY2Vzc2luZyBzdGVwLlxuICB1dGlsLnRpbWUoJ3Jlb3JpZW50RWRnZXMnLCByZW9yaWVudEVkZ2VzKShnKTtcbn1cblxuZnVuY3Rpb24gcmVzdG9yZUVkZ2VzKGcpIHtcbiAgYWN5Y2xpYy51bmRvKGcpO1xufVxuXG4vKlxuICogRXhwYW5kIHNlbGYgbG9vcHMgaW50byB0aHJlZSBkdW1teSBub2Rlcy4gT25lIHdpbGwgc2l0IGFib3ZlIHRoZSBpbmNpZGVudFxuICogbm9kZSwgb25lIHdpbGwgYmUgYXQgdGhlIHNhbWUgbGV2ZWwsIGFuZCBvbmUgYmVsb3cuIFRoZSByZXN1bHQgbG9va3MgbGlrZTpcbiAqXG4gKiAgICAgICAgIC8tLTwtLXgtLS0+LS1cXFxuICogICAgIG5vZGUgICAgICAgICAgICAgIHlcbiAqICAgICAgICAgXFwtLTwtLXotLS0+LS0vXG4gKlxuICogRHVtbXkgbm9kZXMgeCwgeSwgeiBnaXZlIHVzIHRoZSBzaGFwZSBvZiBhIGxvb3AgYW5kIG5vZGUgeSBpcyB3aGVyZSB3ZSBwbGFjZVxuICogdGhlIGxhYmVsLlxuICpcbiAqIFRPRE86IGNvbnNvbGlkYXRlIGtub3dsZWRnZSBvZiBkdW1teSBub2RlIGNvbnN0cnVjdGlvbi5cbiAqIFRPRE86IHN1cHBvcnQgbWluTGVuID0gMlxuICovXG5mdW5jdGlvbiBleHBhbmRTZWxmTG9vcHMoZykge1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIGEpIHtcbiAgICBpZiAodSA9PT0gdikge1xuICAgICAgdmFyIHggPSBhZGREdW1teU5vZGUoZywgZSwgdSwgdiwgYSwgMCwgZmFsc2UpLFxuICAgICAgICAgIHkgPSBhZGREdW1teU5vZGUoZywgZSwgdSwgdiwgYSwgMSwgdHJ1ZSksXG4gICAgICAgICAgeiA9IGFkZER1bW15Tm9kZShnLCBlLCB1LCB2LCBhLCAyLCBmYWxzZSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgeCwgdSwge21pbkxlbjogMSwgc2VsZkxvb3A6IHRydWV9KTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB4LCB5LCB7bWluTGVuOiAxLCBzZWxmTG9vcDogdHJ1ZX0pO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHosIHttaW5MZW46IDEsIHNlbGZMb29wOiB0cnVlfSk7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgeSwgeiwge21pbkxlbjogMSwgc2VsZkxvb3A6IHRydWV9KTtcbiAgICAgIGcuZGVsRWRnZShlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBleHBhbmRTaWRld2F5c0VkZ2VzKGcpIHtcbiAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCBhKSB7XG4gICAgaWYgKHUgPT09IHYpIHtcbiAgICAgIHZhciBvcmlnRWRnZSA9IGEub3JpZ2luYWxFZGdlLFxuICAgICAgICAgIGR1bW15ID0gYWRkRHVtbXlOb2RlKGcsIG9yaWdFZGdlLmUsIG9yaWdFZGdlLnUsIG9yaWdFZGdlLnYsIG9yaWdFZGdlLnZhbHVlLCAwLCB0cnVlKTtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCBkdW1teSwge21pbkxlbjogMX0pO1xuICAgICAgZy5hZGRFZGdlKG51bGwsIGR1bW15LCB2LCB7bWluTGVuOiAxfSk7XG4gICAgICBnLmRlbEVkZ2UoZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkRHVtbXlOb2RlKGcsIGUsIHUsIHYsIGEsIGluZGV4LCBpc0xhYmVsKSB7XG4gIHJldHVybiBnLmFkZE5vZGUobnVsbCwge1xuICAgIHdpZHRoOiBpc0xhYmVsID8gYS53aWR0aCA6IDAsXG4gICAgaGVpZ2h0OiBpc0xhYmVsID8gYS5oZWlnaHQgOiAwLFxuICAgIGVkZ2U6IHsgaWQ6IGUsIHNvdXJjZTogdSwgdGFyZ2V0OiB2LCBhdHRyczogYSB9LFxuICAgIGR1bW15OiB0cnVlLFxuICAgIGluZGV4OiBpbmRleFxuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVvcmllbnRFZGdlcyhnKSB7XG4gIGcuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBpZiAoZy5ub2RlKHUpLnJhbmsgPiBnLm5vZGUodikucmFuaykge1xuICAgICAgZy5kZWxFZGdlKGUpO1xuICAgICAgdmFsdWUucmV2ZXJzZWQgPSB0cnVlO1xuICAgICAgZy5hZGRFZGdlKGUsIHYsIHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByYW5rQ29tcG9uZW50KHN1YmdyYXBoLCB1c2VTaW1wbGV4KSB7XG4gIHZhciBzcGFubmluZ1RyZWUgPSBmZWFzaWJsZVRyZWUoc3ViZ3JhcGgpO1xuXG4gIGlmICh1c2VTaW1wbGV4KSB7XG4gICAgdXRpbC5sb2coMSwgJ1VzaW5nIG5ldHdvcmsgc2ltcGxleCBmb3IgcmFua2luZycpO1xuICAgIHNpbXBsZXgoc3ViZ3JhcGgsIHNwYW5uaW5nVHJlZSk7XG4gIH1cbiAgbm9ybWFsaXplKHN1YmdyYXBoKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplKGcpIHtcbiAgdmFyIG0gPSB1dGlsLm1pbihnLm5vZGVzKCkubWFwKGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcubm9kZSh1KS5yYW5rOyB9KSk7XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgbm9kZSkgeyBub2RlLnJhbmsgLT0gbTsgfSk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFjeWNsaWM7XG5tb2R1bGUuZXhwb3J0cy51bmRvID0gdW5kbztcblxuLypcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYSBkaXJlY3RlZCBncmFwaCB0aGF0IG1heSBoYXZlIGN5Y2xlcyBhbmQgcmV2ZXJzZXMgZWRnZXNcbiAqIGFzIGFwcHJvcHJpYXRlIHRvIGJyZWFrIHRoZXNlIGN5Y2xlcy4gRWFjaCByZXZlcnNlZCBlZGdlIGlzIGFzc2lnbmVkIGFcbiAqIGByZXZlcnNlZGAgYXR0cmlidXRlIHdpdGggdGhlIHZhbHVlIGB0cnVlYC5cbiAqXG4gKiBUaGVyZSBzaG91bGQgYmUgbm8gc2VsZiBsb29wcyBpbiB0aGUgZ3JhcGguXG4gKi9cbmZ1bmN0aW9uIGFjeWNsaWMoZykge1xuICB2YXIgb25TdGFjayA9IHt9LFxuICAgICAgdmlzaXRlZCA9IHt9LFxuICAgICAgcmV2ZXJzZUNvdW50ID0gMDtcbiAgXG4gIGZ1bmN0aW9uIGRmcyh1KSB7XG4gICAgaWYgKHUgaW4gdmlzaXRlZCkgcmV0dXJuO1xuICAgIHZpc2l0ZWRbdV0gPSBvblN0YWNrW3VdID0gdHJ1ZTtcbiAgICBnLm91dEVkZ2VzKHUpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIHQgPSBnLnRhcmdldChlKSxcbiAgICAgICAgICB2YWx1ZTtcblxuICAgICAgaWYgKHUgPT09IHQpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignV2FybmluZzogZm91bmQgc2VsZiBsb29wIFwiJyArIGUgKyAnXCIgZm9yIG5vZGUgXCInICsgdSArICdcIicpO1xuICAgICAgfSBlbHNlIGlmICh0IGluIG9uU3RhY2spIHtcbiAgICAgICAgdmFsdWUgPSBnLmVkZ2UoZSk7XG4gICAgICAgIGcuZGVsRWRnZShlKTtcbiAgICAgICAgdmFsdWUucmV2ZXJzZWQgPSB0cnVlO1xuICAgICAgICArK3JldmVyc2VDb3VudDtcbiAgICAgICAgZy5hZGRFZGdlKGUsIHQsIHUsIHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRmcyh0KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGRlbGV0ZSBvblN0YWNrW3VdO1xuICB9XG5cbiAgZy5lYWNoTm9kZShmdW5jdGlvbih1KSB7IGRmcyh1KTsgfSk7XG5cbiAgdXRpbC5sb2coMiwgJ0FjeWNsaWMgUGhhc2U6IHJldmVyc2VkICcgKyByZXZlcnNlQ291bnQgKyAnIGVkZ2UocyknKTtcblxuICByZXR1cm4gcmV2ZXJzZUNvdW50O1xufVxuXG4vKlxuICogR2l2ZW4gYSBncmFwaCB0aGF0IGhhcyBoYWQgdGhlIGFjeWNsaWMgb3BlcmF0aW9uIGFwcGxpZWQsIHRoaXMgZnVuY3Rpb25cbiAqIHVuZG9lcyB0aGF0IG9wZXJhdGlvbi4gTW9yZSBzcGVjaWZpY2FsbHksIGFueSBlZGdlIHdpdGggdGhlIGByZXZlcnNlZGBcbiAqIGF0dHJpYnV0ZSBpcyBhZ2FpbiByZXZlcnNlZCB0byByZXN0b3JlIHRoZSBvcmlnaW5hbCBkaXJlY3Rpb24gb2YgdGhlIGVkZ2UuXG4gKi9cbmZ1bmN0aW9uIHVuZG8oZykge1xuICBnLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHMsIHQsIGEpIHtcbiAgICBpZiAoYS5yZXZlcnNlZCkge1xuICAgICAgZGVsZXRlIGEucmV2ZXJzZWQ7XG4gICAgICBnLmRlbEVkZ2UoZSk7XG4gICAgICBnLmFkZEVkZ2UoZSwgdCwgcywgYSk7XG4gICAgfVxuICB9KTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5hcHBseSA9IGZ1bmN0aW9uKGcpIHtcbiAgZnVuY3Rpb24gZGZzKHNnKSB7XG4gICAgdmFyIHJhbmtTZXRzID0ge307XG4gICAgZy5jaGlsZHJlbihzZykuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICBpZiAoZy5jaGlsZHJlbih1KS5sZW5ndGgpIHtcbiAgICAgICAgZGZzKHUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHZhciB2YWx1ZSA9IGcubm9kZSh1KSxcbiAgICAgICAgICBwcmVmUmFuayA9IHZhbHVlLnByZWZSYW5rO1xuICAgICAgaWYgKHByZWZSYW5rICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFjaGVja1N1cHBvcnRlZFByZWZSYW5rKHByZWZSYW5rKSkgeyByZXR1cm47IH1cblxuICAgICAgICBpZiAoIShwcmVmUmFuayBpbiByYW5rU2V0cykpIHtcbiAgICAgICAgICByYW5rU2V0cy5wcmVmUmFuayA9IFt1XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByYW5rU2V0cy5wcmVmUmFuay5wdXNoKHUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld1UgPSByYW5rU2V0c1twcmVmUmFua107XG4gICAgICAgIGlmIChuZXdVID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBuZXdVID0gcmFua1NldHNbcHJlZlJhbmtdID0gZy5hZGROb2RlKG51bGwsIHsgb3JpZ2luYWxOb2RlczogW10gfSk7XG4gICAgICAgICAgZy5wYXJlbnQobmV3VSwgc2cpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVkaXJlY3RJbkVkZ2VzKGcsIHUsIG5ld1UsIHByZWZSYW5rID09PSAnbWluJyk7XG4gICAgICAgIHJlZGlyZWN0T3V0RWRnZXMoZywgdSwgbmV3VSwgcHJlZlJhbmsgPT09ICdtYXgnKTtcblxuICAgICAgICAvLyBTYXZlIG9yaWdpbmFsIG5vZGUgYW5kIHJlbW92ZSBpdCBmcm9tIHJlZHVjZWQgZ3JhcGhcbiAgICAgICAgZy5ub2RlKG5ld1UpLm9yaWdpbmFsTm9kZXMucHVzaCh7IHU6IHUsIHZhbHVlOiB2YWx1ZSwgcGFyZW50OiBzZyB9KTtcbiAgICAgICAgZy5kZWxOb2RlKHUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYWRkTGlnaHRFZGdlc0Zyb21NaW5Ob2RlKGcsIHNnLCByYW5rU2V0cy5taW4pO1xuICAgIGFkZExpZ2h0RWRnZXNUb01heE5vZGUoZywgc2csIHJhbmtTZXRzLm1heCk7XG4gIH1cblxuICBkZnMobnVsbCk7XG59O1xuXG5mdW5jdGlvbiBjaGVja1N1cHBvcnRlZFByZWZSYW5rKHByZWZSYW5rKSB7XG4gIGlmIChwcmVmUmFuayAhPT0gJ21pbicgJiYgcHJlZlJhbmsgIT09ICdtYXgnICYmIHByZWZSYW5rLmluZGV4T2YoJ3NhbWVfJykgIT09IDApIHtcbiAgICBjb25zb2xlLmVycm9yKCdVbnN1cHBvcnRlZCByYW5rIHR5cGU6ICcgKyBwcmVmUmFuayk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiByZWRpcmVjdEluRWRnZXMoZywgdSwgbmV3VSwgcmV2ZXJzZSkge1xuICBnLmluRWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgdmFyIG9yaWdWYWx1ZSA9IGcuZWRnZShlKSxcbiAgICAgICAgdmFsdWU7XG4gICAgaWYgKG9yaWdWYWx1ZS5vcmlnaW5hbEVkZ2UpIHtcbiAgICAgIHZhbHVlID0gb3JpZ1ZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSA9ICB7XG4gICAgICAgIG9yaWdpbmFsRWRnZTogeyBlOiBlLCB1OiBnLnNvdXJjZShlKSwgdjogZy50YXJnZXQoZSksIHZhbHVlOiBvcmlnVmFsdWUgfSxcbiAgICAgICAgbWluTGVuOiBnLmVkZ2UoZSkubWluTGVuXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERvIG5vdCByZXZlcnNlIGVkZ2VzIGZvciBzZWxmLWxvb3BzLlxuICAgIGlmIChvcmlnVmFsdWUuc2VsZkxvb3ApIHtcbiAgICAgIHJldmVyc2UgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgLy8gRW5zdXJlIHRoYXQgYWxsIGVkZ2VzIHRvIG1pbiBhcmUgcmV2ZXJzZWRcbiAgICAgIGcuYWRkRWRnZShudWxsLCBuZXdVLCBnLnNvdXJjZShlKSwgdmFsdWUpO1xuICAgICAgdmFsdWUucmV2ZXJzZWQgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgZy5zb3VyY2UoZSksIG5ld1UsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZWRpcmVjdE91dEVkZ2VzKGcsIHUsIG5ld1UsIHJldmVyc2UpIHtcbiAgZy5vdXRFZGdlcyh1KS5mb3JFYWNoKGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgb3JpZ1ZhbHVlID0gZy5lZGdlKGUpLFxuICAgICAgICB2YWx1ZTtcbiAgICBpZiAob3JpZ1ZhbHVlLm9yaWdpbmFsRWRnZSkge1xuICAgICAgdmFsdWUgPSBvcmlnVmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlID0gIHtcbiAgICAgICAgb3JpZ2luYWxFZGdlOiB7IGU6IGUsIHU6IGcuc291cmNlKGUpLCB2OiBnLnRhcmdldChlKSwgdmFsdWU6IG9yaWdWYWx1ZSB9LFxuICAgICAgICBtaW5MZW46IGcuZWRnZShlKS5taW5MZW5cbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRG8gbm90IHJldmVyc2UgZWRnZXMgZm9yIHNlbGYtbG9vcHMuXG4gICAgaWYgKG9yaWdWYWx1ZS5zZWxmTG9vcCkge1xuICAgICAgcmV2ZXJzZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAvLyBFbnN1cmUgdGhhdCBhbGwgZWRnZXMgZnJvbSBtYXggYXJlIHJldmVyc2VkXG4gICAgICBnLmFkZEVkZ2UobnVsbCwgZy50YXJnZXQoZSksIG5ld1UsIHZhbHVlKTtcbiAgICAgIHZhbHVlLnJldmVyc2VkID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIG5ld1UsIGcudGFyZ2V0KGUpLCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gYWRkTGlnaHRFZGdlc0Zyb21NaW5Ob2RlKGcsIHNnLCBtaW5Ob2RlKSB7XG4gIGlmIChtaW5Ob2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICBnLmNoaWxkcmVuKHNnKS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgIC8vIFRoZSBkdW1teSBjaGVjayBlbnN1cmVzIHdlIGRvbid0IGFkZCBhbiBlZGdlIGlmIHRoZSBub2RlIGlzIGludm9sdmVkXG4gICAgICAvLyBpbiBhIHNlbGYgbG9vcCBvciBzaWRld2F5cyBlZGdlLlxuICAgICAgaWYgKHUgIT09IG1pbk5vZGUgJiYgIWcub3V0RWRnZXMobWluTm9kZSwgdSkubGVuZ3RoICYmICFnLm5vZGUodSkuZHVtbXkpIHtcbiAgICAgICAgZy5hZGRFZGdlKG51bGwsIG1pbk5vZGUsIHUsIHsgbWluTGVuOiAwIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFkZExpZ2h0RWRnZXNUb01heE5vZGUoZywgc2csIG1heE5vZGUpIHtcbiAgaWYgKG1heE5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgIGcuY2hpbGRyZW4oc2cpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgLy8gVGhlIGR1bW15IGNoZWNrIGVuc3VyZXMgd2UgZG9uJ3QgYWRkIGFuIGVkZ2UgaWYgdGhlIG5vZGUgaXMgaW52b2x2ZWRcbiAgICAgIC8vIGluIGEgc2VsZiBsb29wIG9yIHNpZGV3YXlzIGVkZ2UuXG4gICAgICBpZiAodSAhPT0gbWF4Tm9kZSAmJiAhZy5vdXRFZGdlcyh1LCBtYXhOb2RlKS5sZW5ndGggJiYgIWcubm9kZSh1KS5kdW1teSkge1xuICAgICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgbWF4Tm9kZSwgeyBtaW5MZW46IDAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn1cblxuLypcbiAqIFRoaXMgZnVuY3Rpb24gXCJyZWxheGVzXCIgdGhlIGNvbnN0cmFpbnRzIGFwcGxpZWQgcHJldmlvdXNseSBieSB0aGUgXCJhcHBseVwiXG4gKiBmdW5jdGlvbi4gSXQgZXhwYW5kcyBhbnkgbm9kZXMgdGhhdCB3ZXJlIGNvbGxhcHNlZCBhbmQgYXNzaWducyB0aGUgcmFuayBvZlxuICogdGhlIGNvbGxhcHNlZCBub2RlIHRvIGVhY2ggb2YgdGhlIGV4cGFuZGVkIG5vZGVzLiBJdCBhbHNvIHJlc3RvcmVzIHRoZVxuICogb3JpZ2luYWwgZWRnZXMgYW5kIHJlbW92ZXMgYW55IGR1bW15IGVkZ2VzIHBvaW50aW5nIGF0IHRoZSBjb2xsYXBzZWQgbm9kZXMuXG4gKlxuICogTm90ZSB0aGF0IHRoZSBwcm9jZXNzIG9mIHJlbW92aW5nIGNvbGxhcHNlZCBub2RlcyBhbHNvIHJlbW92ZXMgZHVtbXkgZWRnZXNcbiAqIGF1dG9tYXRpY2FsbHkuXG4gKi9cbmV4cG9ydHMucmVsYXggPSBmdW5jdGlvbihnKSB7XG4gIC8vIFNhdmUgb3JpZ2luYWwgZWRnZXNcbiAgdmFyIG9yaWdpbmFsRWRnZXMgPSBbXTtcbiAgZy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIHZhciBvcmlnaW5hbEVkZ2UgPSB2YWx1ZS5vcmlnaW5hbEVkZ2U7XG4gICAgaWYgKG9yaWdpbmFsRWRnZSkge1xuICAgICAgb3JpZ2luYWxFZGdlcy5wdXNoKG9yaWdpbmFsRWRnZSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBFeHBhbmQgY29sbGFwc2VkIG5vZGVzXG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB2YXIgb3JpZ2luYWxOb2RlcyA9IHZhbHVlLm9yaWdpbmFsTm9kZXM7XG4gICAgaWYgKG9yaWdpbmFsTm9kZXMpIHtcbiAgICAgIG9yaWdpbmFsTm9kZXMuZm9yRWFjaChmdW5jdGlvbihvcmlnaW5hbE5vZGUpIHtcbiAgICAgICAgb3JpZ2luYWxOb2RlLnZhbHVlLnJhbmsgPSB2YWx1ZS5yYW5rO1xuICAgICAgICBnLmFkZE5vZGUob3JpZ2luYWxOb2RlLnUsIG9yaWdpbmFsTm9kZS52YWx1ZSk7XG4gICAgICAgIGcucGFyZW50KG9yaWdpbmFsTm9kZS51LCBvcmlnaW5hbE5vZGUucGFyZW50KTtcbiAgICAgIH0pO1xuICAgICAgZy5kZWxOb2RlKHUpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUmVzdG9yZSBvcmlnaW5hbCBlZGdlc1xuICBvcmlnaW5hbEVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSkge1xuICAgIGcuYWRkRWRnZShlZGdlLmUsIGVkZ2UudSwgZWRnZS52LCBlZGdlLnZhbHVlKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKCdjcC1kYXRhJykuU2V0LFxuLyoganNoaW50ICtXMDc5ICovXG4gICAgRGlncmFwaCA9IHJlcXVpcmUoJ2dyYXBobGliJykuRGlncmFwaCxcbiAgICB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZlYXNpYmxlVHJlZTtcblxuLypcbiAqIEdpdmVuIGFuIGFjeWNsaWMgZ3JhcGggd2l0aCBlYWNoIG5vZGUgYXNzaWduZWQgYSBgcmFua2AgYXR0cmlidXRlLCB0aGlzXG4gKiBmdW5jdGlvbiBjb25zdHJ1Y3RzIGFuZCByZXR1cm5zIGEgc3Bhbm5pbmcgdHJlZS4gVGhpcyBmdW5jdGlvbiBtYXkgcmVkdWNlXG4gKiB0aGUgbGVuZ3RoIG9mIHNvbWUgZWRnZXMgZnJvbSB0aGUgaW5pdGlhbCByYW5rIGFzc2lnbm1lbnQgd2hpbGUgbWFpbnRhaW5pbmdcbiAqIHRoZSBgbWluTGVuYCBzcGVjaWZpZWQgYnkgZWFjaCBlZGdlLlxuICpcbiAqIFByZXJlcXVpc2l0ZXM6XG4gKlxuICogKiBUaGUgaW5wdXQgZ3JhcGggaXMgYWN5Y2xpY1xuICogKiBFYWNoIG5vZGUgaW4gdGhlIGlucHV0IGdyYXBoIGhhcyBhbiBhc3NpZ25lZCBgcmFua2AgYXR0cmlidXRlXG4gKiAqIEVhY2ggZWRnZSBpbiB0aGUgaW5wdXQgZ3JhcGggaGFzIGFuIGFzc2lnbmVkIGBtaW5MZW5gIGF0dHJpYnV0ZVxuICpcbiAqIE91dHB1dHM6XG4gKlxuICogQSBmZWFzaWJsZSBzcGFubmluZyB0cmVlIGZvciB0aGUgaW5wdXQgZ3JhcGggKGkuZS4gYSBzcGFubmluZyB0cmVlIHRoYXRcbiAqIHJlc3BlY3RzIGVhY2ggZ3JhcGggZWRnZSdzIGBtaW5MZW5gIGF0dHJpYnV0ZSkgcmVwcmVzZW50ZWQgYXMgYSBEaWdyYXBoIHdpdGhcbiAqIGEgYHJvb3RgIGF0dHJpYnV0ZSBvbiBncmFwaC5cbiAqXG4gKiBOb2RlcyBoYXZlIHRoZSBzYW1lIGlkIGFuZCB2YWx1ZSBhcyB0aGF0IGluIHRoZSBpbnB1dCBncmFwaC5cbiAqXG4gKiBFZGdlcyBpbiB0aGUgdHJlZSBoYXZlIGFyYml0cmFyaWx5IGFzc2lnbmVkIGlkcy4gVGhlIGF0dHJpYnV0ZXMgZm9yIGVkZ2VzXG4gKiBpbmNsdWRlIGByZXZlcnNlZGAuIGByZXZlcnNlZGAgaW5kaWNhdGVzIHRoYXQgdGhlIGVkZ2UgaXMgYVxuICogYmFjayBlZGdlIGluIHRoZSBpbnB1dCBncmFwaC5cbiAqL1xuZnVuY3Rpb24gZmVhc2libGVUcmVlKGcpIHtcbiAgdmFyIHJlbWFpbmluZyA9IG5ldyBTZXQoZy5ub2RlcygpKSxcbiAgICAgIHRyZWUgPSBuZXcgRGlncmFwaCgpO1xuXG4gIGlmIChyZW1haW5pbmcuc2l6ZSgpID09PSAxKSB7XG4gICAgdmFyIHJvb3QgPSBnLm5vZGVzKClbMF07XG4gICAgdHJlZS5hZGROb2RlKHJvb3QsIHt9KTtcbiAgICB0cmVlLmdyYXBoKHsgcm9vdDogcm9vdCB9KTtcbiAgICByZXR1cm4gdHJlZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFRpZ2h0RWRnZXModikge1xuICAgIHZhciBjb250aW51ZVRvU2NhbiA9IHRydWU7XG4gICAgZy5wcmVkZWNlc3NvcnModikuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICBpZiAocmVtYWluaW5nLmhhcyh1KSAmJiAhc2xhY2soZywgdSwgdikpIHtcbiAgICAgICAgaWYgKHJlbWFpbmluZy5oYXModikpIHtcbiAgICAgICAgICB0cmVlLmFkZE5vZGUodiwge30pO1xuICAgICAgICAgIHJlbWFpbmluZy5yZW1vdmUodik7XG4gICAgICAgICAgdHJlZS5ncmFwaCh7IHJvb3Q6IHYgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmVlLmFkZE5vZGUodSwge30pO1xuICAgICAgICB0cmVlLmFkZEVkZ2UobnVsbCwgdSwgdiwgeyByZXZlcnNlZDogdHJ1ZSB9KTtcbiAgICAgICAgcmVtYWluaW5nLnJlbW92ZSh1KTtcbiAgICAgICAgYWRkVGlnaHRFZGdlcyh1KTtcbiAgICAgICAgY29udGludWVUb1NjYW4gPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGcuc3VjY2Vzc29ycyh2KS5mb3JFYWNoKGZ1bmN0aW9uKHcpICB7XG4gICAgICBpZiAocmVtYWluaW5nLmhhcyh3KSAmJiAhc2xhY2soZywgdiwgdykpIHtcbiAgICAgICAgaWYgKHJlbWFpbmluZy5oYXModikpIHtcbiAgICAgICAgICB0cmVlLmFkZE5vZGUodiwge30pO1xuICAgICAgICAgIHJlbWFpbmluZy5yZW1vdmUodik7XG4gICAgICAgICAgdHJlZS5ncmFwaCh7IHJvb3Q6IHYgfSk7XG4gICAgICAgIH1cblxuICAgICAgICB0cmVlLmFkZE5vZGUodywge30pO1xuICAgICAgICB0cmVlLmFkZEVkZ2UobnVsbCwgdiwgdywge30pO1xuICAgICAgICByZW1haW5pbmcucmVtb3ZlKHcpO1xuICAgICAgICBhZGRUaWdodEVkZ2VzKHcpO1xuICAgICAgICBjb250aW51ZVRvU2NhbiA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBjb250aW51ZVRvU2NhbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRpZ2h0RWRnZSgpIHtcbiAgICB2YXIgbWluU2xhY2sgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIHJlbWFpbmluZy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICBnLnByZWRlY2Vzc29ycyh2KS5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICAgICAgaWYgKCFyZW1haW5pbmcuaGFzKHUpKSB7XG4gICAgICAgICAgdmFyIGVkZ2VTbGFjayA9IHNsYWNrKGcsIHUsIHYpO1xuICAgICAgICAgIGlmIChNYXRoLmFicyhlZGdlU2xhY2spIDwgTWF0aC5hYnMobWluU2xhY2spKSB7XG4gICAgICAgICAgICBtaW5TbGFjayA9IC1lZGdlU2xhY2s7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZy5zdWNjZXNzb3JzKHYpLmZvckVhY2goZnVuY3Rpb24odykge1xuICAgICAgICBpZiAoIXJlbWFpbmluZy5oYXModykpIHtcbiAgICAgICAgICB2YXIgZWRnZVNsYWNrID0gc2xhY2soZywgdiwgdyk7XG4gICAgICAgICAgaWYgKE1hdGguYWJzKGVkZ2VTbGFjaykgPCBNYXRoLmFicyhtaW5TbGFjaykpIHtcbiAgICAgICAgICAgIG1pblNsYWNrID0gZWRnZVNsYWNrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICB0cmVlLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHsgZy5ub2RlKHUpLnJhbmsgLT0gbWluU2xhY2s7IH0pO1xuICB9XG5cbiAgd2hpbGUgKHJlbWFpbmluZy5zaXplKCkpIHtcbiAgICB2YXIgbm9kZXNUb1NlYXJjaCA9ICF0cmVlLm9yZGVyKCkgPyByZW1haW5pbmcua2V5cygpIDogdHJlZS5ub2RlcygpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpbCA9IG5vZGVzVG9TZWFyY2gubGVuZ3RoO1xuICAgICAgICAgaSA8IGlsICYmIGFkZFRpZ2h0RWRnZXMobm9kZXNUb1NlYXJjaFtpXSk7XG4gICAgICAgICArK2kpO1xuICAgIGlmIChyZW1haW5pbmcuc2l6ZSgpKSB7XG4gICAgICBjcmVhdGVUaWdodEVkZ2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJlZTtcbn1cblxuZnVuY3Rpb24gc2xhY2soZywgdSwgdikge1xuICB2YXIgcmFua0RpZmYgPSBnLm5vZGUodikucmFuayAtIGcubm9kZSh1KS5yYW5rO1xuICB2YXIgbWF4TWluTGVuID0gdXRpbC5tYXgoZy5vdXRFZGdlcyh1LCB2KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24oZSkgeyByZXR1cm4gZy5lZGdlKGUpLm1pbkxlbjsgfSkpO1xuICByZXR1cm4gcmFua0RpZmYgLSBtYXhNaW5MZW47XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpLFxuICAgIHRvcHNvcnQgPSByZXF1aXJlKCdncmFwaGxpYicpLmFsZy50b3Bzb3J0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGluaXRSYW5rO1xuXG4vKlxuICogQXNzaWducyBhIGByYW5rYCBhdHRyaWJ1dGUgdG8gZWFjaCBub2RlIGluIHRoZSBpbnB1dCBncmFwaCBhbmQgZW5zdXJlcyB0aGF0XG4gKiB0aGlzIHJhbmsgcmVzcGVjdHMgdGhlIGBtaW5MZW5gIGF0dHJpYnV0ZSBvZiBpbmNpZGVudCBlZGdlcy5cbiAqXG4gKiBQcmVyZXF1aXNpdGVzOlxuICpcbiAqICAqIFRoZSBpbnB1dCBncmFwaCBtdXN0IGJlIGFjeWNsaWNcbiAqICAqIEVhY2ggZWRnZSBpbiB0aGUgaW5wdXQgZ3JhcGggbXVzdCBoYXZlIGFuIGFzc2lnbmVkICdtaW5MZW4nIGF0dHJpYnV0ZVxuICovXG5mdW5jdGlvbiBpbml0UmFuayhnKSB7XG4gIHZhciBzb3J0ZWQgPSB0b3Bzb3J0KGcpO1xuXG4gIHNvcnRlZC5mb3JFYWNoKGZ1bmN0aW9uKHUpIHtcbiAgICB2YXIgaW5FZGdlcyA9IGcuaW5FZGdlcyh1KTtcbiAgICBpZiAoaW5FZGdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGcubm9kZSh1KS5yYW5rID0gMDtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbWluTGVucyA9IGluRWRnZXMubWFwKGZ1bmN0aW9uKGUpIHtcbiAgICAgIHJldHVybiBnLm5vZGUoZy5zb3VyY2UoZSkpLnJhbmsgKyBnLmVkZ2UoZSkubWluTGVuO1xuICAgIH0pO1xuICAgIGcubm9kZSh1KS5yYW5rID0gdXRpbC5tYXgobWluTGVucyk7XG4gIH0pO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc2xhY2s6IHNsYWNrXG59O1xuXG4vKlxuICogQSBoZWxwZXIgdG8gY2FsY3VsYXRlIHRoZSBzbGFjayBiZXR3ZWVuIHR3byBub2RlcyAoYHVgIGFuZCBgdmApIGdpdmVuIGFcbiAqIGBtaW5MZW5gIGNvbnN0cmFpbnQuIFRoZSBzbGFjayByZXByZXNlbnRzIGhvdyBtdWNoIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIGB1YFxuICogYW5kIGB2YCBjb3VsZCBzaHJpbmsgd2hpbGUgbWFpbnRhaW5pbmcgdGhlIGBtaW5MZW5gIGNvbnN0cmFpbnQuIElmIHRoZSB2YWx1ZVxuICogaXMgbmVnYXRpdmUgdGhlbiB0aGUgY29uc3RyYWludCBpcyBjdXJyZW50bHkgdmlvbGF0ZWQuXG4gKlxuICBUaGlzIGZ1bmN0aW9uIHJlcXVpcmVzIHRoYXQgYHVgIGFuZCBgdmAgYXJlIGluIGBncmFwaGAgYW5kIHRoZXkgYm90aCBoYXZlIGFcbiAgYHJhbmtgIGF0dHJpYnV0ZS5cbiAqL1xuZnVuY3Rpb24gc2xhY2soZ3JhcGgsIHUsIHYsIG1pbkxlbikge1xuICByZXR1cm4gTWF0aC5hYnMoZ3JhcGgubm9kZSh1KS5yYW5rIC0gZ3JhcGgubm9kZSh2KS5yYW5rKSAtIG1pbkxlbjtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyksXG4gICAgcmFua1V0aWwgPSByZXF1aXJlKCcuL3JhbmtVdGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxleDtcblxuZnVuY3Rpb24gc2ltcGxleChncmFwaCwgc3Bhbm5pbmdUcmVlKSB7XG4gIC8vIFRoZSBuZXR3b3JrIHNpbXBsZXggYWxnb3JpdGhtIHJlcGVhdGVkbHkgcmVwbGFjZXMgZWRnZXMgb2ZcbiAgLy8gdGhlIHNwYW5uaW5nIHRyZWUgd2l0aCBuZWdhdGl2ZSBjdXQgdmFsdWVzIHVudGlsIG5vIHN1Y2hcbiAgLy8gZWRnZSBleGlzdHMuXG4gIGluaXRDdXRWYWx1ZXMoZ3JhcGgsIHNwYW5uaW5nVHJlZSk7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIGUgPSBsZWF2ZUVkZ2Uoc3Bhbm5pbmdUcmVlKTtcbiAgICBpZiAoZSA9PT0gbnVsbCkgYnJlYWs7XG4gICAgdmFyIGYgPSBlbnRlckVkZ2UoZ3JhcGgsIHNwYW5uaW5nVHJlZSwgZSk7XG4gICAgZXhjaGFuZ2UoZ3JhcGgsIHNwYW5uaW5nVHJlZSwgZSwgZik7XG4gIH1cbn1cblxuLypcbiAqIFNldCB0aGUgY3V0IHZhbHVlcyBvZiBlZGdlcyBpbiB0aGUgc3Bhbm5pbmcgdHJlZSBieSBhIGRlcHRoLWZpcnN0XG4gKiBwb3N0b3JkZXIgdHJhdmVyc2FsLiAgVGhlIGN1dCB2YWx1ZSBjb3JyZXNwb25kcyB0byB0aGUgY29zdCwgaW5cbiAqIHRlcm1zIG9mIGEgcmFua2luZydzIGVkZ2UgbGVuZ3RoIHN1bSwgb2YgbGVuZ3RoZW5pbmcgYW4gZWRnZS5cbiAqIE5lZ2F0aXZlIGN1dCB2YWx1ZXMgdHlwaWNhbGx5IGluZGljYXRlIGVkZ2VzIHRoYXQgd291bGQgeWllbGQgYVxuICogc21hbGxlciBlZGdlIGxlbmd0aCBzdW0gaWYgdGhleSB3ZXJlIGxlbmd0aGVuZWQuXG4gKi9cbmZ1bmN0aW9uIGluaXRDdXRWYWx1ZXMoZ3JhcGgsIHNwYW5uaW5nVHJlZSkge1xuICBjb21wdXRlTG93TGltKHNwYW5uaW5nVHJlZSk7XG5cbiAgc3Bhbm5pbmdUcmVlLmVhY2hFZGdlKGZ1bmN0aW9uKGlkLCB1LCB2LCB0cmVlVmFsdWUpIHtcbiAgICB0cmVlVmFsdWUuY3V0VmFsdWUgPSAwO1xuICB9KTtcblxuICAvLyBQcm9wYWdhdGUgY3V0IHZhbHVlcyB1cCB0aGUgdHJlZS5cbiAgZnVuY3Rpb24gZGZzKG4pIHtcbiAgICB2YXIgY2hpbGRyZW4gPSBzcGFubmluZ1RyZWUuc3VjY2Vzc29ycyhuKTtcbiAgICBmb3IgKHZhciBjIGluIGNoaWxkcmVuKSB7XG4gICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltjXTtcbiAgICAgIGRmcyhjaGlsZCk7XG4gICAgfVxuICAgIGlmIChuICE9PSBzcGFubmluZ1RyZWUuZ3JhcGgoKS5yb290KSB7XG4gICAgICBzZXRDdXRWYWx1ZShncmFwaCwgc3Bhbm5pbmdUcmVlLCBuKTtcbiAgICB9XG4gIH1cbiAgZGZzKHNwYW5uaW5nVHJlZS5ncmFwaCgpLnJvb3QpO1xufVxuXG4vKlxuICogUGVyZm9ybSBhIERGUyBwb3N0b3JkZXIgdHJhdmVyc2FsLCBsYWJlbGluZyBlYWNoIG5vZGUgdiB3aXRoXG4gKiBpdHMgdHJhdmVyc2FsIG9yZGVyICdsaW0odiknIGFuZCB0aGUgbWluaW11bSB0cmF2ZXJzYWwgbnVtYmVyXG4gKiBvZiBhbnkgb2YgaXRzIGRlc2NlbmRhbnRzICdsb3codiknLiAgVGhpcyBwcm92aWRlcyBhbiBlZmZpY2llbnRcbiAqIHdheSB0byB0ZXN0IHdoZXRoZXIgdSBpcyBhbiBhbmNlc3RvciBvZiB2IHNpbmNlXG4gKiBsb3codSkgPD0gbGltKHYpIDw9IGxpbSh1KSBpZiBhbmQgb25seSBpZiB1IGlzIGFuIGFuY2VzdG9yLlxuICovXG5mdW5jdGlvbiBjb21wdXRlTG93TGltKHRyZWUpIHtcbiAgdmFyIHBvc3RPcmRlck51bSA9IDA7XG4gIFxuICBmdW5jdGlvbiBkZnMobikge1xuICAgIHZhciBjaGlsZHJlbiA9IHRyZWUuc3VjY2Vzc29ycyhuKTtcbiAgICB2YXIgbG93ID0gcG9zdE9yZGVyTnVtO1xuICAgIGZvciAodmFyIGMgaW4gY2hpbGRyZW4pIHtcbiAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2NdO1xuICAgICAgZGZzKGNoaWxkKTtcbiAgICAgIGxvdyA9IE1hdGgubWluKGxvdywgdHJlZS5ub2RlKGNoaWxkKS5sb3cpO1xuICAgIH1cbiAgICB0cmVlLm5vZGUobikubG93ID0gbG93O1xuICAgIHRyZWUubm9kZShuKS5saW0gPSBwb3N0T3JkZXJOdW0rKztcbiAgfVxuXG4gIGRmcyh0cmVlLmdyYXBoKCkucm9vdCk7XG59XG5cbi8qXG4gKiBUbyBjb21wdXRlIHRoZSBjdXQgdmFsdWUgb2YgdGhlIGVkZ2UgcGFyZW50IC0+IGNoaWxkLCB3ZSBjb25zaWRlclxuICogaXQgYW5kIGFueSBvdGhlciBncmFwaCBlZGdlcyB0byBvciBmcm9tIHRoZSBjaGlsZC5cbiAqICAgICAgICAgIHBhcmVudFxuICogICAgICAgICAgICAgfFxuICogICAgICAgICAgIGNoaWxkXG4gKiAgICAgICAgICAvICAgICAgXFxcbiAqICAgICAgICAgdSAgICAgICAgdlxuICovXG5mdW5jdGlvbiBzZXRDdXRWYWx1ZShncmFwaCwgdHJlZSwgY2hpbGQpIHtcbiAgdmFyIHBhcmVudEVkZ2UgPSB0cmVlLmluRWRnZXMoY2hpbGQpWzBdO1xuXG4gIC8vIExpc3Qgb2YgY2hpbGQncyBjaGlsZHJlbiBpbiB0aGUgc3Bhbm5pbmcgdHJlZS5cbiAgdmFyIGdyYW5kY2hpbGRyZW4gPSBbXTtcbiAgdmFyIGdyYW5kY2hpbGRFZGdlcyA9IHRyZWUub3V0RWRnZXMoY2hpbGQpO1xuICBmb3IgKHZhciBnY2UgaW4gZ3JhbmRjaGlsZEVkZ2VzKSB7XG4gICAgZ3JhbmRjaGlsZHJlbi5wdXNoKHRyZWUudGFyZ2V0KGdyYW5kY2hpbGRFZGdlc1tnY2VdKSk7XG4gIH1cblxuICB2YXIgY3V0VmFsdWUgPSAwO1xuXG4gIC8vIFRPRE86IFJlcGxhY2UgdW5pdCBpbmNyZW1lbnQvZGVjcmVtZW50IHdpdGggZWRnZSB3ZWlnaHRzLlxuICB2YXIgRSA9IDA7ICAgIC8vIEVkZ2VzIGZyb20gY2hpbGQgdG8gZ3JhbmRjaGlsZCdzIHN1YnRyZWUuXG4gIHZhciBGID0gMDsgICAgLy8gRWRnZXMgdG8gY2hpbGQgZnJvbSBncmFuZGNoaWxkJ3Mgc3VidHJlZS5cbiAgdmFyIEcgPSAwOyAgICAvLyBFZGdlcyBmcm9tIGNoaWxkIHRvIG5vZGVzIG91dHNpZGUgb2YgY2hpbGQncyBzdWJ0cmVlLlxuICB2YXIgSCA9IDA7ICAgIC8vIEVkZ2VzIGZyb20gbm9kZXMgb3V0c2lkZSBvZiBjaGlsZCdzIHN1YnRyZWUgdG8gY2hpbGQuXG5cbiAgLy8gQ29uc2lkZXIgYWxsIGdyYXBoIGVkZ2VzIGZyb20gY2hpbGQuXG4gIHZhciBvdXRFZGdlcyA9IGdyYXBoLm91dEVkZ2VzKGNoaWxkKTtcbiAgdmFyIGdjO1xuICBmb3IgKHZhciBvZSBpbiBvdXRFZGdlcykge1xuICAgIHZhciBzdWNjID0gZ3JhcGgudGFyZ2V0KG91dEVkZ2VzW29lXSk7XG4gICAgZm9yIChnYyBpbiBncmFuZGNoaWxkcmVuKSB7XG4gICAgICBpZiAoaW5TdWJ0cmVlKHRyZWUsIHN1Y2MsIGdyYW5kY2hpbGRyZW5bZ2NdKSkge1xuICAgICAgICBFKys7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaW5TdWJ0cmVlKHRyZWUsIHN1Y2MsIGNoaWxkKSkge1xuICAgICAgRysrO1xuICAgIH1cbiAgfVxuXG4gIC8vIENvbnNpZGVyIGFsbCBncmFwaCBlZGdlcyB0byBjaGlsZC5cbiAgdmFyIGluRWRnZXMgPSBncmFwaC5pbkVkZ2VzKGNoaWxkKTtcbiAgZm9yICh2YXIgaWUgaW4gaW5FZGdlcykge1xuICAgIHZhciBwcmVkID0gZ3JhcGguc291cmNlKGluRWRnZXNbaWVdKTtcbiAgICBmb3IgKGdjIGluIGdyYW5kY2hpbGRyZW4pIHtcbiAgICAgIGlmIChpblN1YnRyZWUodHJlZSwgcHJlZCwgZ3JhbmRjaGlsZHJlbltnY10pKSB7XG4gICAgICAgIEYrKztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFpblN1YnRyZWUodHJlZSwgcHJlZCwgY2hpbGQpKSB7XG4gICAgICBIKys7XG4gICAgfVxuICB9XG5cbiAgLy8gQ29udHJpYnV0aW9ucyBkZXBlbmQgb24gdGhlIGFsaWdubWVudCBvZiB0aGUgcGFyZW50IC0+IGNoaWxkIGVkZ2VcbiAgLy8gYW5kIHRoZSBjaGlsZCAtPiB1IG9yIHYgZWRnZXMuXG4gIHZhciBncmFuZGNoaWxkQ3V0U3VtID0gMDtcbiAgZm9yIChnYyBpbiBncmFuZGNoaWxkcmVuKSB7XG4gICAgdmFyIGN2ID0gdHJlZS5lZGdlKGdyYW5kY2hpbGRFZGdlc1tnY10pLmN1dFZhbHVlO1xuICAgIGlmICghdHJlZS5lZGdlKGdyYW5kY2hpbGRFZGdlc1tnY10pLnJldmVyc2VkKSB7XG4gICAgICBncmFuZGNoaWxkQ3V0U3VtICs9IGN2O1xuICAgIH0gZWxzZSB7XG4gICAgICBncmFuZGNoaWxkQ3V0U3VtIC09IGN2O1xuICAgIH1cbiAgfVxuXG4gIGlmICghdHJlZS5lZGdlKHBhcmVudEVkZ2UpLnJldmVyc2VkKSB7XG4gICAgY3V0VmFsdWUgKz0gZ3JhbmRjaGlsZEN1dFN1bSAtIEUgKyBGIC0gRyArIEg7XG4gIH0gZWxzZSB7XG4gICAgY3V0VmFsdWUgLT0gZ3JhbmRjaGlsZEN1dFN1bSAtIEUgKyBGIC0gRyArIEg7XG4gIH1cblxuICB0cmVlLmVkZ2UocGFyZW50RWRnZSkuY3V0VmFsdWUgPSBjdXRWYWx1ZTtcbn1cblxuLypcbiAqIFJldHVybiB3aGV0aGVyIG4gaXMgYSBub2RlIGluIHRoZSBzdWJ0cmVlIHdpdGggdGhlIGdpdmVuXG4gKiByb290LlxuICovXG5mdW5jdGlvbiBpblN1YnRyZWUodHJlZSwgbiwgcm9vdCkge1xuICByZXR1cm4gKHRyZWUubm9kZShyb290KS5sb3cgPD0gdHJlZS5ub2RlKG4pLmxpbSAmJlxuICAgICAgICAgIHRyZWUubm9kZShuKS5saW0gPD0gdHJlZS5ub2RlKHJvb3QpLmxpbSk7XG59XG5cbi8qXG4gKiBSZXR1cm4gYW4gZWRnZSBmcm9tIHRoZSB0cmVlIHdpdGggYSBuZWdhdGl2ZSBjdXQgdmFsdWUsIG9yIG51bGwgaWYgdGhlcmVcbiAqIGlzIG5vbmUuXG4gKi9cbmZ1bmN0aW9uIGxlYXZlRWRnZSh0cmVlKSB7XG4gIHZhciBlZGdlcyA9IHRyZWUuZWRnZXMoKTtcbiAgZm9yICh2YXIgbiBpbiBlZGdlcykge1xuICAgIHZhciBlID0gZWRnZXNbbl07XG4gICAgdmFyIHRyZWVWYWx1ZSA9IHRyZWUuZWRnZShlKTtcbiAgICBpZiAodHJlZVZhbHVlLmN1dFZhbHVlIDwgMCkge1xuICAgICAgcmV0dXJuIGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKlxuICogVGhlIGVkZ2UgZSBzaG91bGQgYmUgYW4gZWRnZSBpbiB0aGUgdHJlZSwgd2l0aCBhbiB1bmRlcmx5aW5nIGVkZ2VcbiAqIGluIHRoZSBncmFwaCwgd2l0aCBhIG5lZ2F0aXZlIGN1dCB2YWx1ZS4gIE9mIHRoZSB0d28gbm9kZXMgaW5jaWRlbnRcbiAqIG9uIHRoZSBlZGdlLCB0YWtlIHRoZSBsb3dlciBvbmUuICBlbnRlckVkZ2UgcmV0dXJucyBhbiBlZGdlIHdpdGhcbiAqIG1pbmltdW0gc2xhY2sgZ29pbmcgZnJvbSBvdXRzaWRlIG9mIHRoYXQgbm9kZSdzIHN1YnRyZWUgdG8gaW5zaWRlXG4gKiBvZiB0aGF0IG5vZGUncyBzdWJ0cmVlLlxuICovXG5mdW5jdGlvbiBlbnRlckVkZ2UoZ3JhcGgsIHRyZWUsIGUpIHtcbiAgdmFyIHNvdXJjZSA9IHRyZWUuc291cmNlKGUpO1xuICB2YXIgdGFyZ2V0ID0gdHJlZS50YXJnZXQoZSk7XG4gIHZhciBsb3dlciA9IHRyZWUubm9kZSh0YXJnZXQpLmxpbSA8IHRyZWUubm9kZShzb3VyY2UpLmxpbSA/IHRhcmdldCA6IHNvdXJjZTtcblxuICAvLyBJcyB0aGUgdHJlZSBlZGdlIGFsaWduZWQgd2l0aCB0aGUgZ3JhcGggZWRnZT9cbiAgdmFyIGFsaWduZWQgPSAhdHJlZS5lZGdlKGUpLnJldmVyc2VkO1xuXG4gIHZhciBtaW5TbGFjayA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgdmFyIG1pblNsYWNrRWRnZTtcbiAgaWYgKGFsaWduZWQpIHtcbiAgICBncmFwaC5lYWNoRWRnZShmdW5jdGlvbihpZCwgdSwgdiwgdmFsdWUpIHtcbiAgICAgIGlmIChpZCAhPT0gZSAmJiBpblN1YnRyZWUodHJlZSwgdSwgbG93ZXIpICYmICFpblN1YnRyZWUodHJlZSwgdiwgbG93ZXIpKSB7XG4gICAgICAgIHZhciBzbGFjayA9IHJhbmtVdGlsLnNsYWNrKGdyYXBoLCB1LCB2LCB2YWx1ZS5taW5MZW4pO1xuICAgICAgICBpZiAoc2xhY2sgPCBtaW5TbGFjaykge1xuICAgICAgICAgIG1pblNsYWNrID0gc2xhY2s7XG4gICAgICAgICAgbWluU2xhY2tFZGdlID0gaWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBncmFwaC5lYWNoRWRnZShmdW5jdGlvbihpZCwgdSwgdiwgdmFsdWUpIHtcbiAgICAgIGlmIChpZCAhPT0gZSAmJiAhaW5TdWJ0cmVlKHRyZWUsIHUsIGxvd2VyKSAmJiBpblN1YnRyZWUodHJlZSwgdiwgbG93ZXIpKSB7XG4gICAgICAgIHZhciBzbGFjayA9IHJhbmtVdGlsLnNsYWNrKGdyYXBoLCB1LCB2LCB2YWx1ZS5taW5MZW4pO1xuICAgICAgICBpZiAoc2xhY2sgPCBtaW5TbGFjaykge1xuICAgICAgICAgIG1pblNsYWNrID0gc2xhY2s7XG4gICAgICAgICAgbWluU2xhY2tFZGdlID0gaWQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGlmIChtaW5TbGFja0VkZ2UgPT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBvdXRzaWRlID0gW107XG4gICAgdmFyIGluc2lkZSA9IFtdO1xuICAgIGdyYXBoLmVhY2hOb2RlKGZ1bmN0aW9uKGlkKSB7XG4gICAgICBpZiAoIWluU3VidHJlZSh0cmVlLCBpZCwgbG93ZXIpKSB7XG4gICAgICAgIG91dHNpZGUucHVzaChpZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbnNpZGUucHVzaChpZCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBlZGdlIGZvdW5kIGZyb20gb3V0c2lkZSBvZiB0cmVlIHRvIGluc2lkZScpO1xuICB9XG5cbiAgcmV0dXJuIG1pblNsYWNrRWRnZTtcbn1cblxuLypcbiAqIFJlcGxhY2UgZWRnZSBlIHdpdGggZWRnZSBmIGluIHRoZSB0cmVlLCByZWNhbGN1bGF0aW5nIHRoZSB0cmVlIHJvb3QsXG4gKiB0aGUgbm9kZXMnIGxvdyBhbmQgbGltIHByb3BlcnRpZXMgYW5kIHRoZSBlZGdlcycgY3V0IHZhbHVlcy5cbiAqL1xuZnVuY3Rpb24gZXhjaGFuZ2UoZ3JhcGgsIHRyZWUsIGUsIGYpIHtcbiAgdHJlZS5kZWxFZGdlKGUpO1xuICB2YXIgc291cmNlID0gZ3JhcGguc291cmNlKGYpO1xuICB2YXIgdGFyZ2V0ID0gZ3JhcGgudGFyZ2V0KGYpO1xuXG4gIC8vIFJlZGlyZWN0IGVkZ2VzIHNvIHRoYXQgdGFyZ2V0IGlzIHRoZSByb290IG9mIGl0cyBzdWJ0cmVlLlxuICBmdW5jdGlvbiByZWRpcmVjdCh2KSB7XG4gICAgdmFyIGVkZ2VzID0gdHJlZS5pbkVkZ2VzKHYpO1xuICAgIGZvciAodmFyIGkgaW4gZWRnZXMpIHtcbiAgICAgIHZhciBlID0gZWRnZXNbaV07XG4gICAgICB2YXIgdSA9IHRyZWUuc291cmNlKGUpO1xuICAgICAgdmFyIHZhbHVlID0gdHJlZS5lZGdlKGUpO1xuICAgICAgcmVkaXJlY3QodSk7XG4gICAgICB0cmVlLmRlbEVkZ2UoZSk7XG4gICAgICB2YWx1ZS5yZXZlcnNlZCA9ICF2YWx1ZS5yZXZlcnNlZDtcbiAgICAgIHRyZWUuYWRkRWRnZShlLCB2LCB1LCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgcmVkaXJlY3QodGFyZ2V0KTtcblxuICB2YXIgcm9vdCA9IHNvdXJjZTtcbiAgdmFyIGVkZ2VzID0gdHJlZS5pbkVkZ2VzKHJvb3QpO1xuICB3aGlsZSAoZWRnZXMubGVuZ3RoID4gMCkge1xuICAgIHJvb3QgPSB0cmVlLnNvdXJjZShlZGdlc1swXSk7XG4gICAgZWRnZXMgPSB0cmVlLmluRWRnZXMocm9vdCk7XG4gIH1cblxuICB0cmVlLmdyYXBoKCkucm9vdCA9IHJvb3Q7XG5cbiAgdHJlZS5hZGRFZGdlKG51bGwsIHNvdXJjZSwgdGFyZ2V0LCB7Y3V0VmFsdWU6IDB9KTtcblxuICBpbml0Q3V0VmFsdWVzKGdyYXBoLCB0cmVlKTtcblxuICBhZGp1c3RSYW5rcyhncmFwaCwgdHJlZSk7XG59XG5cbi8qXG4gKiBSZXNldCB0aGUgcmFua3Mgb2YgYWxsIG5vZGVzIGJhc2VkIG9uIHRoZSBjdXJyZW50IHNwYW5uaW5nIHRyZWUuXG4gKiBUaGUgcmFuayBvZiB0aGUgdHJlZSdzIHJvb3QgcmVtYWlucyB1bmNoYW5nZWQsIHdoaWxlIGFsbCBvdGhlclxuICogbm9kZXMgYXJlIHNldCB0byB0aGUgc3VtIG9mIG1pbmltdW0gbGVuZ3RoIGNvbnN0cmFpbnRzIGFsb25nXG4gKiB0aGUgcGF0aCBmcm9tIHRoZSByb290LlxuICovXG5mdW5jdGlvbiBhZGp1c3RSYW5rcyhncmFwaCwgdHJlZSkge1xuICBmdW5jdGlvbiBkZnMocCkge1xuICAgIHZhciBjaGlsZHJlbiA9IHRyZWUuc3VjY2Vzc29ycyhwKTtcbiAgICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtcbiAgICAgIHZhciBtaW5MZW4gPSBtaW5pbXVtTGVuZ3RoKGdyYXBoLCBwLCBjKTtcbiAgICAgIGdyYXBoLm5vZGUoYykucmFuayA9IGdyYXBoLm5vZGUocCkucmFuayArIG1pbkxlbjtcbiAgICAgIGRmcyhjKTtcbiAgICB9KTtcbiAgfVxuXG4gIGRmcyh0cmVlLmdyYXBoKCkucm9vdCk7XG59XG5cbi8qXG4gKiBJZiB1IGFuZCB2IGFyZSBjb25uZWN0ZWQgYnkgc29tZSBlZGdlcyBpbiB0aGUgZ3JhcGgsIHJldHVybiB0aGVcbiAqIG1pbmltdW0gbGVuZ3RoIG9mIHRob3NlIGVkZ2VzLCBhcyBhIHBvc2l0aXZlIG51bWJlciBpZiB2IHN1Y2NlZWRzXG4gKiB1IGFuZCBhcyBhIG5lZ2F0aXZlIG51bWJlciBpZiB2IHByZWNlZGVzIHUuXG4gKi9cbmZ1bmN0aW9uIG1pbmltdW1MZW5ndGgoZ3JhcGgsIHUsIHYpIHtcbiAgdmFyIG91dEVkZ2VzID0gZ3JhcGgub3V0RWRnZXModSwgdik7XG4gIGlmIChvdXRFZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHV0aWwubWF4KG91dEVkZ2VzLm1hcChmdW5jdGlvbihlKSB7XG4gICAgICByZXR1cm4gZ3JhcGguZWRnZShlKS5taW5MZW47XG4gICAgfSkpO1xuICB9XG5cbiAgdmFyIGluRWRnZXMgPSBncmFwaC5pbkVkZ2VzKHUsIHYpO1xuICBpZiAoaW5FZGdlcy5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIC11dGlsLm1heChpbkVkZ2VzLm1hcChmdW5jdGlvbihlKSB7XG4gICAgICByZXR1cm4gZ3JhcGguZWRnZShlKS5taW5MZW47XG4gICAgfSkpO1xuICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qXG4gKiBSZXR1cm5zIHRoZSBzbWFsbGVzdCB2YWx1ZSBpbiB0aGUgYXJyYXkuXG4gKi9cbmV4cG9ydHMubWluID0gZnVuY3Rpb24odmFsdWVzKSB7XG4gIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCB2YWx1ZXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgdGhlIGxhcmdlc3QgdmFsdWUgaW4gdGhlIGFycmF5LlxuICovXG5leHBvcnRzLm1heCA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgdmFsdWVzKTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGB0cnVlYCBvbmx5IGlmIGBmKHgpYCBpcyBgdHJ1ZWAgZm9yIGFsbCBgeGAgaW4gYHhzYC4gT3RoZXJ3aXNlXG4gKiByZXR1cm5zIGBmYWxzZWAuIFRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gaW1tZWRpYXRlbHkgaWYgaXQgZmluZHMgYVxuICogY2FzZSB3aGVyZSBgZih4KWAgZG9lcyBub3QgaG9sZC5cbiAqL1xuZXhwb3J0cy5hbGwgPSBmdW5jdGlvbih4cywgZikge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKCFmKHhzW2ldKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qXG4gKiBBY2N1bXVsYXRlcyB0aGUgc3VtIG9mIGVsZW1lbnRzIGluIHRoZSBnaXZlbiBhcnJheSB1c2luZyB0aGUgYCtgIG9wZXJhdG9yLlxuICovXG5leHBvcnRzLnN1bSA9IGZ1bmN0aW9uKHZhbHVlcykge1xuICByZXR1cm4gdmFsdWVzLnJlZHVjZShmdW5jdGlvbihhY2MsIHgpIHsgcmV0dXJuIGFjYyArIHg7IH0sIDApO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHZhbHVlcyBpbiB0aGUgZ2l2ZW4gb2JqZWN0LlxuICovXG5leHBvcnRzLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqKS5tYXAoZnVuY3Rpb24oaykgeyByZXR1cm4gb2JqW2tdOyB9KTtcbn07XG5cbmV4cG9ydHMuc2h1ZmZsZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gIGZvciAodmFyIGkgPSBhcnJheS5sZW5ndGggLSAxOyBpID4gMDsgLS1pKSB7XG4gICAgdmFyIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcbiAgICB2YXIgYWogPSBhcnJheVtqXTtcbiAgICBhcnJheVtqXSA9IGFycmF5W2ldO1xuICAgIGFycmF5W2ldID0gYWo7XG4gIH1cbn07XG5cbmV4cG9ydHMucHJvcGVydHlBY2Nlc3NvciA9IGZ1bmN0aW9uKHNlbGYsIGNvbmZpZywgZmllbGQsIHNldEhvb2spIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBjb25maWdbZmllbGRdO1xuICAgIGNvbmZpZ1tmaWVsZF0gPSB4O1xuICAgIGlmIChzZXRIb29rKSBzZXRIb29rKHgpO1xuICAgIHJldHVybiBzZWxmO1xuICB9O1xufTtcblxuLypcbiAqIEdpdmVuIGEgbGF5ZXJlZCwgZGlyZWN0ZWQgZ3JhcGggd2l0aCBgcmFua2AgYW5kIGBvcmRlcmAgbm9kZSBhdHRyaWJ1dGVzLFxuICogdGhpcyBmdW5jdGlvbiByZXR1cm5zIGFuIGFycmF5IG9mIG9yZGVyZWQgcmFua3MuIEVhY2ggcmFuayBjb250YWlucyBhbiBhcnJheVxuICogb2YgdGhlIGlkcyBvZiB0aGUgbm9kZXMgaW4gdGhhdCByYW5rIGluIHRoZSBvcmRlciBzcGVjaWZpZWQgYnkgdGhlIGBvcmRlcmBcbiAqIGF0dHJpYnV0ZS5cbiAqL1xuZXhwb3J0cy5vcmRlcmluZyA9IGZ1bmN0aW9uKGcpIHtcbiAgdmFyIG9yZGVyaW5nID0gW107XG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSwgdmFsdWUpIHtcbiAgICB2YXIgcmFuayA9IG9yZGVyaW5nW3ZhbHVlLnJhbmtdIHx8IChvcmRlcmluZ1t2YWx1ZS5yYW5rXSA9IFtdKTtcbiAgICByYW5rW3ZhbHVlLm9yZGVyXSA9IHU7XG4gIH0pO1xuICByZXR1cm4gb3JkZXJpbmc7XG59O1xuXG4vKlxuICogQSBmaWx0ZXIgdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGBmaWx0ZXJOb2Rlc2AgdG8gZ2V0IGEgZ3JhcGggdGhhdCBvbmx5XG4gKiBpbmNsdWRlcyBub2RlcyB0aGF0IGRvIG5vdCBjb250YWluIG90aGVycyBub2Rlcy5cbiAqL1xuZXhwb3J0cy5maWx0ZXJOb25TdWJncmFwaHMgPSBmdW5jdGlvbihnKSB7XG4gIHJldHVybiBmdW5jdGlvbih1KSB7XG4gICAgcmV0dXJuIGcuY2hpbGRyZW4odSkubGVuZ3RoID09PSAwO1xuICB9O1xufTtcblxuLypcbiAqIFJldHVybnMgYSBuZXcgZnVuY3Rpb24gdGhhdCB3cmFwcyBgZnVuY2Agd2l0aCBhIHRpbWVyLiBUaGUgd3JhcHBlciBsb2dzIHRoZVxuICogdGltZSBpdCB0YWtlcyB0byBleGVjdXRlIHRoZSBmdW5jdGlvbi5cbiAqXG4gKiBUaGUgdGltZXIgd2lsbCBiZSBlbmFibGVkIHByb3ZpZGVkIGBsb2cubGV2ZWwgPj0gMWAuXG4gKi9cbmZ1bmN0aW9uIHRpbWUobmFtZSwgZnVuYykge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0YXJ0ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGxvZygxLCBuYW1lICsgJyB0aW1lOiAnICsgKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gc3RhcnQpICsgJ21zJyk7XG4gICAgfVxuICB9O1xufVxudGltZS5lbmFibGVkID0gZmFsc2U7XG5cbmV4cG9ydHMudGltZSA9IHRpbWU7XG5cbi8qXG4gKiBBIGdsb2JhbCBsb2dnZXIgd2l0aCB0aGUgc3BlY2lmaWNhdGlvbiBgbG9nKGxldmVsLCBtZXNzYWdlLCAuLi4pYCB0aGF0XG4gKiB3aWxsIGxvZyBhIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgYGxvZy5sZXZlbCA+PSBsZXZlbGAuXG4gKi9cbmZ1bmN0aW9uIGxvZyhsZXZlbCkge1xuICBpZiAobG9nLmxldmVsID49IGxldmVsKSB7XG4gICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH1cbn1cbmxvZy5sZXZlbCA9IDA7XG5cbmV4cG9ydHMubG9nID0gbG9nO1xuIiwibW9kdWxlLmV4cG9ydHMgPSAnMC40LjYnO1xuIiwiZXhwb3J0cy5TZXQgPSByZXF1aXJlKCcuL2xpYi9TZXQnKTtcbmV4cG9ydHMuUHJpb3JpdHlRdWV1ZSA9IHJlcXVpcmUoJy4vbGliL1ByaW9yaXR5UXVldWUnKTtcbmV4cG9ydHMudmVyc2lvbiA9IHJlcXVpcmUoJy4vbGliL3ZlcnNpb24nKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gUHJpb3JpdHlRdWV1ZTtcblxuLyoqXG4gKiBBIG1pbi1wcmlvcml0eSBxdWV1ZSBkYXRhIHN0cnVjdHVyZS4gVGhpcyBhbGdvcml0aG0gaXMgZGVyaXZlZCBmcm9tIENvcm1lbixcbiAqIGV0IGFsLiwgXCJJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtc1wiLiBUaGUgYmFzaWMgaWRlYSBvZiBhIG1pbi1wcmlvcml0eVxuICogcXVldWUgaXMgdGhhdCB5b3UgY2FuIGVmZmljaWVudGx5IChpbiBPKDEpIHRpbWUpIGdldCB0aGUgc21hbGxlc3Qga2V5IGluXG4gKiB0aGUgcXVldWUuIEFkZGluZyBhbmQgcmVtb3ZpbmcgZWxlbWVudHMgdGFrZXMgTyhsb2cgbikgdGltZS4gQSBrZXkgY2FuXG4gKiBoYXZlIGl0cyBwcmlvcml0eSBkZWNyZWFzZWQgaW4gTyhsb2cgbikgdGltZS5cbiAqL1xuZnVuY3Rpb24gUHJpb3JpdHlRdWV1ZSgpIHtcbiAgdGhpcy5fYXJyID0gW107XG4gIHRoaXMuX2tleUluZGljZXMgPSB7fTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gdGhlIHF1ZXVlLiBUYWtlcyBgTygxKWAgdGltZS5cbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fYXJyLmxlbmd0aDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUga2V5cyB0aGF0IGFyZSBpbiB0aGUgcXVldWUuIFRha2VzIGBPKG4pYCB0aW1lLlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9hcnIubWFwKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHgua2V5OyB9KTtcbn07XG5cbi8qKlxuICogUmV0dXJucyBgdHJ1ZWAgaWYgKiprZXkqKiBpcyBpbiB0aGUgcXVldWUgYW5kIGBmYWxzZWAgaWYgbm90LlxuICovXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5oYXMgPSBmdW5jdGlvbihrZXkpIHtcbiAgcmV0dXJuIGtleSBpbiB0aGlzLl9rZXlJbmRpY2VzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBwcmlvcml0eSBmb3IgKiprZXkqKi4gSWYgKiprZXkqKiBpcyBub3QgcHJlc2VudCBpbiB0aGUgcXVldWVcbiAqIHRoZW4gdGhpcyBmdW5jdGlvbiByZXR1cm5zIGB1bmRlZmluZWRgLiBUYWtlcyBgTygxKWAgdGltZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0ga2V5XG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLnByaW9yaXR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gIHZhciBpbmRleCA9IHRoaXMuX2tleUluZGljZXNba2V5XTtcbiAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdGhpcy5fYXJyW2luZGV4XS5wcmlvcml0eTtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBrZXkgZm9yIHRoZSBtaW5pbXVtIGVsZW1lbnQgaW4gdGhpcyBxdWV1ZS4gSWYgdGhlIHF1ZXVlIGlzXG4gKiBlbXB0eSB0aGlzIGZ1bmN0aW9uIHRocm93cyBhbiBFcnJvci4gVGFrZXMgYE8oMSlgIHRpbWUuXG4gKi9cblByaW9yaXR5UXVldWUucHJvdG90eXBlLm1pbiA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zaXplKCkgPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJRdWV1ZSB1bmRlcmZsb3dcIik7XG4gIH1cbiAgcmV0dXJuIHRoaXMuX2FyclswXS5rZXk7XG59O1xuXG4vKipcbiAqIEluc2VydHMgYSBuZXcga2V5IGludG8gdGhlIHByaW9yaXR5IHF1ZXVlLiBJZiB0aGUga2V5IGFscmVhZHkgZXhpc3RzIGluXG4gKiB0aGUgcXVldWUgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGBmYWxzZWA7IG90aGVyd2lzZSBpdCB3aWxsIHJldHVybiBgdHJ1ZWAuXG4gKiBUYWtlcyBgTyhuKWAgdGltZS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0ga2V5IHRoZSBrZXkgdG8gYWRkXG4gKiBAcGFyYW0ge051bWJlcn0gcHJpb3JpdHkgdGhlIGluaXRpYWwgcHJpb3JpdHkgZm9yIHRoZSBrZXlcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oa2V5LCBwcmlvcml0eSkge1xuICB2YXIga2V5SW5kaWNlcyA9IHRoaXMuX2tleUluZGljZXM7XG4gIGlmICghKGtleSBpbiBrZXlJbmRpY2VzKSkge1xuICAgIHZhciBhcnIgPSB0aGlzLl9hcnI7XG4gICAgdmFyIGluZGV4ID0gYXJyLmxlbmd0aDtcbiAgICBrZXlJbmRpY2VzW2tleV0gPSBpbmRleDtcbiAgICBhcnIucHVzaCh7a2V5OiBrZXksIHByaW9yaXR5OiBwcmlvcml0eX0pO1xuICAgIHRoaXMuX2RlY3JlYXNlKGluZGV4KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW5kIHJldHVybnMgdGhlIHNtYWxsZXN0IGtleSBpbiB0aGUgcXVldWUuIFRha2VzIGBPKGxvZyBuKWAgdGltZS5cbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUucmVtb3ZlTWluID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3N3YXAoMCwgdGhpcy5fYXJyLmxlbmd0aCAtIDEpO1xuICB2YXIgbWluID0gdGhpcy5fYXJyLnBvcCgpO1xuICBkZWxldGUgdGhpcy5fa2V5SW5kaWNlc1ttaW4ua2V5XTtcbiAgdGhpcy5faGVhcGlmeSgwKTtcbiAgcmV0dXJuIG1pbi5rZXk7XG59O1xuXG4vKipcbiAqIERlY3JlYXNlcyB0aGUgcHJpb3JpdHkgZm9yICoqa2V5KiogdG8gKipwcmlvcml0eSoqLiBJZiB0aGUgbmV3IHByaW9yaXR5IGlzXG4gKiBncmVhdGVyIHRoYW4gdGhlIHByZXZpb3VzIHByaW9yaXR5LCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGtleSB0aGUga2V5IGZvciB3aGljaCB0byByYWlzZSBwcmlvcml0eVxuICogQHBhcmFtIHtOdW1iZXJ9IHByaW9yaXR5IHRoZSBuZXcgcHJpb3JpdHkgZm9yIHRoZSBrZXlcbiAqL1xuUHJpb3JpdHlRdWV1ZS5wcm90b3R5cGUuZGVjcmVhc2UgPSBmdW5jdGlvbihrZXksIHByaW9yaXR5KSB7XG4gIHZhciBpbmRleCA9IHRoaXMuX2tleUluZGljZXNba2V5XTtcbiAgaWYgKHByaW9yaXR5ID4gdGhpcy5fYXJyW2luZGV4XS5wcmlvcml0eSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5ldyBwcmlvcml0eSBpcyBncmVhdGVyIHRoYW4gY3VycmVudCBwcmlvcml0eS4gXCIgK1xuICAgICAgICBcIktleTogXCIgKyBrZXkgKyBcIiBPbGQ6IFwiICsgdGhpcy5fYXJyW2luZGV4XS5wcmlvcml0eSArIFwiIE5ldzogXCIgKyBwcmlvcml0eSk7XG4gIH1cbiAgdGhpcy5fYXJyW2luZGV4XS5wcmlvcml0eSA9IHByaW9yaXR5O1xuICB0aGlzLl9kZWNyZWFzZShpbmRleCk7XG59O1xuXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5faGVhcGlmeSA9IGZ1bmN0aW9uKGkpIHtcbiAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgdmFyIGwgPSAyICogaSxcbiAgICAgIHIgPSBsICsgMSxcbiAgICAgIGxhcmdlc3QgPSBpO1xuICBpZiAobCA8IGFyci5sZW5ndGgpIHtcbiAgICBsYXJnZXN0ID0gYXJyW2xdLnByaW9yaXR5IDwgYXJyW2xhcmdlc3RdLnByaW9yaXR5ID8gbCA6IGxhcmdlc3Q7XG4gICAgaWYgKHIgPCBhcnIubGVuZ3RoKSB7XG4gICAgICBsYXJnZXN0ID0gYXJyW3JdLnByaW9yaXR5IDwgYXJyW2xhcmdlc3RdLnByaW9yaXR5ID8gciA6IGxhcmdlc3Q7XG4gICAgfVxuICAgIGlmIChsYXJnZXN0ICE9PSBpKSB7XG4gICAgICB0aGlzLl9zd2FwKGksIGxhcmdlc3QpO1xuICAgICAgdGhpcy5faGVhcGlmeShsYXJnZXN0KTtcbiAgICB9XG4gIH1cbn07XG5cblByaW9yaXR5UXVldWUucHJvdG90eXBlLl9kZWNyZWFzZSA9IGZ1bmN0aW9uKGluZGV4KSB7XG4gIHZhciBhcnIgPSB0aGlzLl9hcnI7XG4gIHZhciBwcmlvcml0eSA9IGFycltpbmRleF0ucHJpb3JpdHk7XG4gIHZhciBwYXJlbnQ7XG4gIHdoaWxlIChpbmRleCAhPT0gMCkge1xuICAgIHBhcmVudCA9IGluZGV4ID4+IDE7XG4gICAgaWYgKGFycltwYXJlbnRdLnByaW9yaXR5IDwgcHJpb3JpdHkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLl9zd2FwKGluZGV4LCBwYXJlbnQpO1xuICAgIGluZGV4ID0gcGFyZW50O1xuICB9XG59O1xuXG5Qcmlvcml0eVF1ZXVlLnByb3RvdHlwZS5fc3dhcCA9IGZ1bmN0aW9uKGksIGopIHtcbiAgdmFyIGFyciA9IHRoaXMuX2FycjtcbiAgdmFyIGtleUluZGljZXMgPSB0aGlzLl9rZXlJbmRpY2VzO1xuICB2YXIgb3JpZ0FyckkgPSBhcnJbaV07XG4gIHZhciBvcmlnQXJySiA9IGFycltqXTtcbiAgYXJyW2ldID0gb3JpZ0Fycko7XG4gIGFycltqXSA9IG9yaWdBcnJJO1xuICBrZXlJbmRpY2VzW29yaWdBcnJKLmtleV0gPSBpO1xuICBrZXlJbmRpY2VzW29yaWdBcnJJLmtleV0gPSBqO1xufTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gU2V0O1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYSBuZXcgU2V0IHdpdGggYW4gb3B0aW9uYWwgc2V0IG9mIGBpbml0aWFsS2V5c2AuXG4gKlxuICogSXQgaXMgaW1wb3J0YW50IHRvIG5vdGUgdGhhdCBrZXlzIGFyZSBjb2VyY2VkIHRvIFN0cmluZyBmb3IgbW9zdCBwdXJwb3Nlc1xuICogd2l0aCB0aGlzIG9iamVjdCwgc2ltaWxhciB0byB0aGUgYmVoYXZpb3Igb2YgSmF2YVNjcmlwdCdzIE9iamVjdC4gRm9yXG4gKiBleGFtcGxlLCB0aGUgZm9sbG93aW5nIHdpbGwgYWRkIG9ubHkgb25lIGtleTpcbiAqXG4gKiAgICAgdmFyIHMgPSBuZXcgU2V0KCk7XG4gKiAgICAgcy5hZGQoMSk7XG4gKiAgICAgcy5hZGQoXCIxXCIpO1xuICpcbiAqIEhvd2V2ZXIsIHRoZSB0eXBlIG9mIHRoZSBrZXkgaXMgcHJlc2VydmVkIGludGVybmFsbHkgc28gdGhhdCBga2V5c2AgcmV0dXJuc1xuICogdGhlIG9yaWdpbmFsIGtleSBzZXQgdW5jb2VyY2VkLiBGb3IgdGhlIGFib3ZlIGV4YW1wbGUsIGBrZXlzYCB3b3VsZCByZXR1cm5cbiAqIGBbMV1gLlxuICovXG5mdW5jdGlvbiBTZXQoaW5pdGlhbEtleXMpIHtcbiAgdGhpcy5fc2l6ZSA9IDA7XG4gIHRoaXMuX2tleXMgPSB7fTtcblxuICBpZiAoaW5pdGlhbEtleXMpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaWwgPSBpbml0aWFsS2V5cy5sZW5ndGg7IGkgPCBpbDsgKytpKSB7XG4gICAgICB0aGlzLmFkZChpbml0aWFsS2V5c1tpXSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogUmV0dXJucyBhIG5ldyBTZXQgdGhhdCByZXByZXNlbnRzIHRoZSBzZXQgaW50ZXJzZWN0aW9uIG9mIHRoZSBhcnJheSBvZiBnaXZlblxuICogc2V0cy5cbiAqL1xuU2V0LmludGVyc2VjdCA9IGZ1bmN0aW9uKHNldHMpIHtcbiAgaWYgKHNldHMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBTZXQoKTtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBuZXcgU2V0KCF1dGlsLmlzQXJyYXkoc2V0c1swXSkgPyBzZXRzWzBdLmtleXMoKSA6IHNldHNbMF0pO1xuICBmb3IgKHZhciBpID0gMSwgaWwgPSBzZXRzLmxlbmd0aDsgaSA8IGlsOyArK2kpIHtcbiAgICB2YXIgcmVzdWx0S2V5cyA9IHJlc3VsdC5rZXlzKCksXG4gICAgICAgIG90aGVyID0gIXV0aWwuaXNBcnJheShzZXRzW2ldKSA/IHNldHNbaV0gOiBuZXcgU2V0KHNldHNbaV0pO1xuICAgIGZvciAodmFyIGogPSAwLCBqbCA9IHJlc3VsdEtleXMubGVuZ3RoOyBqIDwgamw7ICsraikge1xuICAgICAgdmFyIGtleSA9IHJlc3VsdEtleXNbal07XG4gICAgICBpZiAoIW90aGVyLmhhcyhrZXkpKSB7XG4gICAgICAgIHJlc3VsdC5yZW1vdmUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbmV3IFNldCB0aGF0IHJlcHJlc2VudHMgdGhlIHNldCB1bmlvbiBvZiB0aGUgYXJyYXkgb2YgZ2l2ZW4gc2V0cy5cbiAqL1xuU2V0LnVuaW9uID0gZnVuY3Rpb24oc2V0cykge1xuICB2YXIgdG90YWxFbGVtcyA9IHV0aWwucmVkdWNlKHNldHMsIGZ1bmN0aW9uKGxocywgcmhzKSB7XG4gICAgcmV0dXJuIGxocyArIChyaHMuc2l6ZSA/IHJocy5zaXplKCkgOiByaHMubGVuZ3RoKTtcbiAgfSwgMCk7XG4gIHZhciBhcnIgPSBuZXcgQXJyYXkodG90YWxFbGVtcyk7XG5cbiAgdmFyIGsgPSAwO1xuICBmb3IgKHZhciBpID0gMCwgaWwgPSBzZXRzLmxlbmd0aDsgaSA8IGlsOyArK2kpIHtcbiAgICB2YXIgY3VyID0gc2V0c1tpXSxcbiAgICAgICAga2V5cyA9ICF1dGlsLmlzQXJyYXkoY3VyKSA/IGN1ci5rZXlzKCkgOiBjdXI7XG4gICAgZm9yICh2YXIgaiA9IDAsIGpsID0ga2V5cy5sZW5ndGg7IGogPCBqbDsgKytqKSB7XG4gICAgICBhcnJbaysrXSA9IGtleXNbal07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5ldyBTZXQoYXJyKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgc2l6ZSBvZiB0aGlzIHNldCBpbiBgTygxKWAgdGltZS5cbiAqL1xuU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9zaXplO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBrZXlzIGluIHRoaXMgc2V0LiBUYWtlcyBgTyhuKWAgdGltZS5cbiAqL1xuU2V0LnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB2YWx1ZXModGhpcy5fa2V5cyk7XG59O1xuXG4vKipcbiAqIFRlc3RzIGlmIGEga2V5IGlzIHByZXNlbnQgaW4gdGhpcyBTZXQuIFJldHVybnMgYHRydWVgIGlmIGl0IGlzIGFuZCBgZmFsc2VgXG4gKiBpZiBub3QuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGtleSkge1xuICByZXR1cm4ga2V5IGluIHRoaXMuX2tleXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcga2V5IHRvIHRoaXMgU2V0IGlmIGl0IGlzIG5vdCBhbHJlYWR5IHByZXNlbnQuIFJldHVybnMgYHRydWVgIGlmXG4gKiB0aGUga2V5IHdhcyBhZGRlZCBhbmQgYGZhbHNlYCBpZiBpdCB3YXMgYWxyZWFkeSBwcmVzZW50LiBUYWtlcyBgTygxKWAgdGltZS5cbiAqL1xuU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbihrZXkpIHtcbiAgaWYgKCEoa2V5IGluIHRoaXMuX2tleXMpKSB7XG4gICAgdGhpcy5fa2V5c1trZXldID0ga2V5O1xuICAgICsrdGhpcy5fc2l6ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBrZXkgZnJvbSB0aGlzIFNldC4gSWYgdGhlIGtleSB3YXMgcmVtb3ZlZCB0aGlzIGZ1bmN0aW9uIHJldHVybnNcbiAqIGB0cnVlYC4gSWYgbm90LCBpdCByZXR1cm5zIGBmYWxzZWAuIFRha2VzIGBPKDEpYCB0aW1lLlxuICovXG5TZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKGtleSkge1xuICBpZiAoa2V5IGluIHRoaXMuX2tleXMpIHtcbiAgICBkZWxldGUgdGhpcy5fa2V5c1trZXldO1xuICAgIC0tdGhpcy5fc2l6ZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBhbGwgdmFsdWVzIGZvciBwcm9wZXJ0aWVzIG9mICoqbyoqLlxuICovXG5mdW5jdGlvbiB2YWx1ZXMobykge1xuICB2YXIga3MgPSBPYmplY3Qua2V5cyhvKSxcbiAgICAgIGxlbiA9IGtzLmxlbmd0aCxcbiAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW4pLFxuICAgICAgaTtcbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gb1trc1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbiIsIi8qXG4gKiBUaGlzIHBvbHlmaWxsIGNvbWVzIGZyb21cbiAqIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0FycmF5L2lzQXJyYXlcbiAqL1xuaWYoIUFycmF5LmlzQXJyYXkpIHtcbiAgZXhwb3J0cy5pc0FycmF5ID0gZnVuY3Rpb24gKHZBcmcpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZBcmcpID09PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xufSBlbHNlIHtcbiAgZXhwb3J0cy5pc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbn1cblxuLypcbiAqIFNsaWdodGx5IGFkYXB0ZWQgcG9seWZpbGwgZnJvbVxuICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvQXJyYXkvUmVkdWNlXG4gKi9cbmlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgQXJyYXkucHJvdG90eXBlLnJlZHVjZSkge1xuICBleHBvcnRzLnJlZHVjZSA9IGZ1bmN0aW9uKGFycmF5LCBjYWxsYmFjaywgb3B0X2luaXRpYWxWYWx1ZSkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBpZiAobnVsbCA9PT0gYXJyYXkgfHwgJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiBhcnJheSkge1xuICAgICAgLy8gQXQgdGhlIG1vbWVudCBhbGwgbW9kZXJuIGJyb3dzZXJzLCB0aGF0IHN1cHBvcnQgc3RyaWN0IG1vZGUsIGhhdmVcbiAgICAgIC8vIG5hdGl2ZSBpbXBsZW1lbnRhdGlvbiBvZiBBcnJheS5wcm90b3R5cGUucmVkdWNlLiBGb3IgaW5zdGFuY2UsIElFOFxuICAgICAgLy8gZG9lcyBub3Qgc3VwcG9ydCBzdHJpY3QgbW9kZSwgc28gdGhpcyBjaGVjayBpcyBhY3R1YWxseSB1c2VsZXNzLlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAnQXJyYXkucHJvdG90eXBlLnJlZHVjZSBjYWxsZWQgb24gbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBjYWxsYmFjaykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihjYWxsYmFjayArICcgaXMgbm90IGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGluZGV4LCB2YWx1ZSxcbiAgICAgICAgbGVuZ3RoID0gYXJyYXkubGVuZ3RoID4+PiAwLFxuICAgICAgICBpc1ZhbHVlU2V0ID0gZmFsc2U7XG4gICAgaWYgKDEgPCBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICB2YWx1ZSA9IG9wdF9pbml0aWFsVmFsdWU7XG4gICAgICBpc1ZhbHVlU2V0ID0gdHJ1ZTtcbiAgICB9XG4gICAgZm9yIChpbmRleCA9IDA7IGxlbmd0aCA+IGluZGV4OyArK2luZGV4KSB7XG4gICAgICBpZiAoYXJyYXkuaGFzT3duUHJvcGVydHkoaW5kZXgpKSB7XG4gICAgICAgIGlmIChpc1ZhbHVlU2V0KSB7XG4gICAgICAgICAgdmFsdWUgPSBjYWxsYmFjayh2YWx1ZSwgYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gYXJyYXlbaW5kZXhdO1xuICAgICAgICAgIGlzVmFsdWVTZXQgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghaXNWYWx1ZVNldCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZScpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG59IGVsc2Uge1xuICBleHBvcnRzLnJlZHVjZSA9IGZ1bmN0aW9uKGFycmF5LCBjYWxsYmFjaywgb3B0X2luaXRpYWxWYWx1ZSkge1xuICAgIHJldHVybiBhcnJheS5yZWR1Y2UoY2FsbGJhY2ssIG9wdF9pbml0aWFsVmFsdWUpO1xuICB9O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSAnMS4xLjMnO1xuIiwiZXhwb3J0cy5HcmFwaCA9IHJlcXVpcmUoXCIuL2xpYi9HcmFwaFwiKTtcbmV4cG9ydHMuRGlncmFwaCA9IHJlcXVpcmUoXCIuL2xpYi9EaWdyYXBoXCIpO1xuZXhwb3J0cy5DR3JhcGggPSByZXF1aXJlKFwiLi9saWIvQ0dyYXBoXCIpO1xuZXhwb3J0cy5DRGlncmFwaCA9IHJlcXVpcmUoXCIuL2xpYi9DRGlncmFwaFwiKTtcbnJlcXVpcmUoXCIuL2xpYi9ncmFwaC1jb252ZXJ0ZXJzXCIpO1xuXG5leHBvcnRzLmFsZyA9IHtcbiAgaXNBY3ljbGljOiByZXF1aXJlKFwiLi9saWIvYWxnL2lzQWN5Y2xpY1wiKSxcbiAgY29tcG9uZW50czogcmVxdWlyZShcIi4vbGliL2FsZy9jb21wb25lbnRzXCIpLFxuICBkaWprc3RyYTogcmVxdWlyZShcIi4vbGliL2FsZy9kaWprc3RyYVwiKSxcbiAgZGlqa3N0cmFBbGw6IHJlcXVpcmUoXCIuL2xpYi9hbGcvZGlqa3N0cmFBbGxcIiksXG4gIGZpbmRDeWNsZXM6IHJlcXVpcmUoXCIuL2xpYi9hbGcvZmluZEN5Y2xlc1wiKSxcbiAgZmxveWRXYXJzaGFsbDogcmVxdWlyZShcIi4vbGliL2FsZy9mbG95ZFdhcnNoYWxsXCIpLFxuICBwb3N0b3JkZXI6IHJlcXVpcmUoXCIuL2xpYi9hbGcvcG9zdG9yZGVyXCIpLFxuICBwcmVvcmRlcjogcmVxdWlyZShcIi4vbGliL2FsZy9wcmVvcmRlclwiKSxcbiAgcHJpbTogcmVxdWlyZShcIi4vbGliL2FsZy9wcmltXCIpLFxuICB0YXJqYW46IHJlcXVpcmUoXCIuL2xpYi9hbGcvdGFyamFuXCIpLFxuICB0b3Bzb3J0OiByZXF1aXJlKFwiLi9saWIvYWxnL3RvcHNvcnRcIilcbn07XG5cbmV4cG9ydHMuY29udmVydGVyID0ge1xuICBqc29uOiByZXF1aXJlKFwiLi9saWIvY29udmVydGVyL2pzb24uanNcIilcbn07XG5cbnZhciBmaWx0ZXIgPSByZXF1aXJlKFwiLi9saWIvZmlsdGVyXCIpO1xuZXhwb3J0cy5maWx0ZXIgPSB7XG4gIGFsbDogZmlsdGVyLmFsbCxcbiAgbm9kZXNGcm9tTGlzdDogZmlsdGVyLm5vZGVzRnJvbUxpc3Rcbn07XG5cbmV4cG9ydHMudmVyc2lvbiA9IHJlcXVpcmUoXCIuL2xpYi92ZXJzaW9uXCIpO1xuIiwiLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZUdyYXBoO1xuXG5mdW5jdGlvbiBCYXNlR3JhcGgoKSB7XG4gIC8vIFRoZSB2YWx1ZSBhc3NpZ25lZCB0byB0aGUgZ3JhcGggaXRzZWxmLlxuICB0aGlzLl92YWx1ZSA9IHVuZGVmaW5lZDtcblxuICAvLyBNYXAgb2Ygbm9kZSBpZCAtPiB7IGlkLCB2YWx1ZSB9XG4gIHRoaXMuX25vZGVzID0ge307XG5cbiAgLy8gTWFwIG9mIGVkZ2UgaWQgLT4geyBpZCwgdSwgdiwgdmFsdWUgfVxuICB0aGlzLl9lZGdlcyA9IHt9O1xuXG4gIC8vIFVzZWQgdG8gZ2VuZXJhdGUgYSB1bmlxdWUgaWQgaW4gdGhlIGdyYXBoXG4gIHRoaXMuX25leHRJZCA9IDA7XG59XG5cbi8vIE51bWJlciBvZiBub2Rlc1xuQmFzZUdyYXBoLnByb3RvdHlwZS5vcmRlciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fbm9kZXMpLmxlbmd0aDtcbn07XG5cbi8vIE51bWJlciBvZiBlZGdlc1xuQmFzZUdyYXBoLnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLl9lZGdlcykubGVuZ3RoO1xufTtcblxuLy8gQWNjZXNzb3IgZm9yIGdyYXBoIGxldmVsIHZhbHVlXG5CYXNlR3JhcGgucHJvdG90eXBlLmdyYXBoID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gIH1cbiAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuaGFzTm9kZSA9IGZ1bmN0aW9uKHUpIHtcbiAgcmV0dXJuIHUgaW4gdGhpcy5fbm9kZXM7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLm5vZGUgPSBmdW5jdGlvbih1LCB2YWx1ZSkge1xuICB2YXIgbm9kZSA9IHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG5vZGUudmFsdWU7XG4gIH1cbiAgbm9kZS52YWx1ZSA9IHZhbHVlO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5ub2RlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbm9kZXMgPSBbXTtcbiAgdGhpcy5lYWNoTm9kZShmdW5jdGlvbihpZCkgeyBub2Rlcy5wdXNoKGlkKTsgfSk7XG4gIHJldHVybiBub2Rlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuZWFjaE5vZGUgPSBmdW5jdGlvbihmdW5jKSB7XG4gIGZvciAodmFyIGsgaW4gdGhpcy5fbm9kZXMpIHtcbiAgICB2YXIgbm9kZSA9IHRoaXMuX25vZGVzW2tdO1xuICAgIGZ1bmMobm9kZS5pZCwgbm9kZS52YWx1ZSk7XG4gIH1cbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuaGFzRWRnZSA9IGZ1bmN0aW9uKGUpIHtcbiAgcmV0dXJuIGUgaW4gdGhpcy5fZWRnZXM7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmVkZ2UgPSBmdW5jdGlvbihlLCB2YWx1ZSkge1xuICB2YXIgZWRnZSA9IHRoaXMuX3N0cmljdEdldEVkZ2UoZSk7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGVkZ2UudmFsdWU7XG4gIH1cbiAgZWRnZS52YWx1ZSA9IHZhbHVlO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5lZGdlcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZXMgPSBbXTtcbiAgdGhpcy5lYWNoRWRnZShmdW5jdGlvbihpZCkgeyBlcy5wdXNoKGlkKTsgfSk7XG4gIHJldHVybiBlcztcbn07XG5cbkJhc2VHcmFwaC5wcm90b3R5cGUuZWFjaEVkZ2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gIGZvciAodmFyIGsgaW4gdGhpcy5fZWRnZXMpIHtcbiAgICB2YXIgZWRnZSA9IHRoaXMuX2VkZ2VzW2tdO1xuICAgIGZ1bmMoZWRnZS5pZCwgZWRnZS51LCBlZGdlLnYsIGVkZ2UudmFsdWUpO1xuICB9XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmluY2lkZW50Tm9kZXMgPSBmdW5jdGlvbihlKSB7XG4gIHZhciBlZGdlID0gdGhpcy5fc3RyaWN0R2V0RWRnZShlKTtcbiAgcmV0dXJuIFtlZGdlLnUsIGVkZ2Uudl07XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLmFkZE5vZGUgPSBmdW5jdGlvbih1LCB2YWx1ZSkge1xuICBpZiAodSA9PT0gdW5kZWZpbmVkIHx8IHUgPT09IG51bGwpIHtcbiAgICBkbyB7XG4gICAgICB1ID0gXCJfXCIgKyAoKyt0aGlzLl9uZXh0SWQpO1xuICAgIH0gd2hpbGUgKHRoaXMuaGFzTm9kZSh1KSk7XG4gIH0gZWxzZSBpZiAodGhpcy5oYXNOb2RlKHUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiR3JhcGggYWxyZWFkeSBoYXMgbm9kZSAnXCIgKyB1ICsgXCInXCIpO1xuICB9XG4gIHRoaXMuX25vZGVzW3VdID0geyBpZDogdSwgdmFsdWU6IHZhbHVlIH07XG4gIHJldHVybiB1O1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5kZWxOb2RlID0gZnVuY3Rpb24odSkge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICB0aGlzLmluY2lkZW50RWRnZXModSkuZm9yRWFjaChmdW5jdGlvbihlKSB7IHRoaXMuZGVsRWRnZShlKTsgfSwgdGhpcyk7XG4gIGRlbGV0ZSB0aGlzLl9ub2Rlc1t1XTtcbn07XG5cbi8vIGluTWFwIGFuZCBvdXRNYXAgYXJlIG9wcG9zaXRlIHNpZGVzIG9mIGFuIGluY2lkZW5jZSBtYXAuIEZvciBleGFtcGxlLCBmb3Jcbi8vIEdyYXBoIHRoZXNlIHdvdWxkIGJvdGggY29tZSBmcm9tIHRoZSBfaW5jaWRlbnRFZGdlcyBtYXAsIHdoaWxlIGZvciBEaWdyYXBoXG4vLyB0aGV5IHdvdWxkIGNvbWUgZnJvbSBfaW5FZGdlcyBhbmQgX291dEVkZ2VzLlxuQmFzZUdyYXBoLnByb3RvdHlwZS5fYWRkRWRnZSA9IGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlLCBpbk1hcCwgb3V0TWFwKSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUodik7XG5cbiAgaWYgKGUgPT09IHVuZGVmaW5lZCB8fCBlID09PSBudWxsKSB7XG4gICAgZG8ge1xuICAgICAgZSA9IFwiX1wiICsgKCsrdGhpcy5fbmV4dElkKTtcbiAgICB9IHdoaWxlICh0aGlzLmhhc0VkZ2UoZSkpO1xuICB9XG4gIGVsc2UgaWYgKHRoaXMuaGFzRWRnZShlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkdyYXBoIGFscmVhZHkgaGFzIGVkZ2UgJ1wiICsgZSArIFwiJ1wiKTtcbiAgfVxuXG4gIHRoaXMuX2VkZ2VzW2VdID0geyBpZDogZSwgdTogdSwgdjogdiwgdmFsdWU6IHZhbHVlIH07XG4gIGFkZEVkZ2VUb01hcChpbk1hcFt2XSwgdSwgZSk7XG4gIGFkZEVkZ2VUb01hcChvdXRNYXBbdV0sIHYsIGUpO1xuXG4gIHJldHVybiBlO1xufTtcblxuLy8gU2VlIG5vdGUgZm9yIF9hZGRFZGdlIHJlZ2FyZGluZyBpbk1hcCBhbmQgb3V0TWFwLlxuQmFzZUdyYXBoLnByb3RvdHlwZS5fZGVsRWRnZSA9IGZ1bmN0aW9uKGUsIGluTWFwLCBvdXRNYXApIHtcbiAgdmFyIGVkZ2UgPSB0aGlzLl9zdHJpY3RHZXRFZGdlKGUpO1xuICBkZWxFZGdlRnJvbU1hcChpbk1hcFtlZGdlLnZdLCBlZGdlLnUsIGUpO1xuICBkZWxFZGdlRnJvbU1hcChvdXRNYXBbZWRnZS51XSwgZWRnZS52LCBlKTtcbiAgZGVsZXRlIHRoaXMuX2VkZ2VzW2VdO1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBjb3B5ID0gbmV3IHRoaXMuY29uc3RydWN0b3IoKTtcbiAgY29weS5ncmFwaCh0aGlzLmdyYXBoKCkpO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IGNvcHkuYWRkTm9kZSh1LCB2YWx1ZSk7IH0pO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7IGNvcHkuYWRkRWRnZShlLCB1LCB2LCB2YWx1ZSk7IH0pO1xuICBjb3B5Ll9uZXh0SWQgPSB0aGlzLl9uZXh0SWQ7XG4gIHJldHVybiBjb3B5O1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5maWx0ZXJOb2RlcyA9IGZ1bmN0aW9uKGZpbHRlcikge1xuICB2YXIgY29weSA9IG5ldyB0aGlzLmNvbnN0cnVjdG9yKCk7XG4gIGNvcHkuZ3JhcGgodGhpcy5ncmFwaCgpKTtcbiAgdGhpcy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIGlmIChmaWx0ZXIodSkpIHtcbiAgICAgIGNvcHkuYWRkTm9kZSh1LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgdGhpcy5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGlmIChjb3B5Lmhhc05vZGUodSkgJiYgY29weS5oYXNOb2RlKHYpKSB7XG4gICAgICBjb3B5LmFkZEVkZ2UoZSwgdSwgdiwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBjb3B5O1xufTtcblxuQmFzZUdyYXBoLnByb3RvdHlwZS5fc3RyaWN0R2V0Tm9kZSA9IGZ1bmN0aW9uKHUpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLl9ub2Rlc1t1XTtcbiAgaWYgKG5vZGUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk5vZGUgJ1wiICsgdSArIFwiJyBpcyBub3QgaW4gZ3JhcGhcIik7XG4gIH1cbiAgcmV0dXJuIG5vZGU7XG59O1xuXG5CYXNlR3JhcGgucHJvdG90eXBlLl9zdHJpY3RHZXRFZGdlID0gZnVuY3Rpb24oZSkge1xuICB2YXIgZWRnZSA9IHRoaXMuX2VkZ2VzW2VdO1xuICBpZiAoZWRnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRWRnZSAnXCIgKyBlICsgXCInIGlzIG5vdCBpbiBncmFwaFwiKTtcbiAgfVxuICByZXR1cm4gZWRnZTtcbn07XG5cbmZ1bmN0aW9uIGFkZEVkZ2VUb01hcChtYXAsIHYsIGUpIHtcbiAgKG1hcFt2XSB8fCAobWFwW3ZdID0gbmV3IFNldCgpKSkuYWRkKGUpO1xufVxuXG5mdW5jdGlvbiBkZWxFZGdlRnJvbU1hcChtYXAsIHYsIGUpIHtcbiAgdmFyIHZFbnRyeSA9IG1hcFt2XTtcbiAgdkVudHJ5LnJlbW92ZShlKTtcbiAgaWYgKHZFbnRyeS5zaXplKCkgPT09IDApIHtcbiAgICBkZWxldGUgbWFwW3ZdO1xuICB9XG59XG5cbiIsInZhciBEaWdyYXBoID0gcmVxdWlyZShcIi4vRGlncmFwaFwiKSxcbiAgICBjb21wb3VuZGlmeSA9IHJlcXVpcmUoXCIuL2NvbXBvdW5kaWZ5XCIpO1xuXG52YXIgQ0RpZ3JhcGggPSBjb21wb3VuZGlmeShEaWdyYXBoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDRGlncmFwaDtcblxuQ0RpZ3JhcGguZnJvbURpZ3JhcGggPSBmdW5jdGlvbihzcmMpIHtcbiAgdmFyIGcgPSBuZXcgQ0RpZ3JhcGgoKSxcbiAgICAgIGdyYXBoVmFsdWUgPSBzcmMuZ3JhcGgoKTtcblxuICBpZiAoZ3JhcGhWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZy5ncmFwaChncmFwaFZhbHVlKTtcbiAgfVxuXG4gIHNyYy5lYWNoTm9kZShmdW5jdGlvbih1LCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBnLmFkZE5vZGUodSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGcuYWRkTm9kZSh1LCB2YWx1ZSk7XG4gICAgfVxuICB9KTtcbiAgc3JjLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkRWRnZShudWxsLCB1LCB2KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZztcbn07XG5cbkNEaWdyYXBoLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJDRGlncmFwaCBcIiArIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xufTtcbiIsInZhciBHcmFwaCA9IHJlcXVpcmUoXCIuL0dyYXBoXCIpLFxuICAgIGNvbXBvdW5kaWZ5ID0gcmVxdWlyZShcIi4vY29tcG91bmRpZnlcIik7XG5cbnZhciBDR3JhcGggPSBjb21wb3VuZGlmeShHcmFwaCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ0dyYXBoO1xuXG5DR3JhcGguZnJvbUdyYXBoID0gZnVuY3Rpb24oc3JjKSB7XG4gIHZhciBnID0gbmV3IENHcmFwaCgpLFxuICAgICAgZ3JhcGhWYWx1ZSA9IHNyYy5ncmFwaCgpO1xuXG4gIGlmIChncmFwaFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICBnLmdyYXBoKGdyYXBoVmFsdWUpO1xuICB9XG5cbiAgc3JjLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGcuYWRkTm9kZSh1KTtcbiAgICB9IGVsc2Uge1xuICAgICAgZy5hZGROb2RlKHUsIHZhbHVlKTtcbiAgICB9XG4gIH0pO1xuICBzcmMuZWFjaEVkZ2UoZnVuY3Rpb24oZSwgdSwgdiwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZy5hZGRFZGdlKG51bGwsIHUsIHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBnLmFkZEVkZ2UobnVsbCwgdSwgdiwgdmFsdWUpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBnO1xufTtcblxuQ0dyYXBoLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJDR3JhcGggXCIgKyBKU09OLnN0cmluZ2lmeSh0aGlzLCBudWxsLCAyKTtcbn07XG4iLCIvKlxuICogVGhpcyBmaWxlIGlzIG9yZ2FuaXplZCB3aXRoIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogRXhwb3J0c1xuICogR3JhcGggY29uc3RydWN0b3JzXG4gKiBHcmFwaCBxdWVyaWVzIChlLmcuIG5vZGVzKCksIGVkZ2VzKClcbiAqIEdyYXBoIG11dGF0b3JzXG4gKiBIZWxwZXIgZnVuY3Rpb25zXG4gKi9cblxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpLFxuICAgIEJhc2VHcmFwaCA9IHJlcXVpcmUoXCIuL0Jhc2VHcmFwaFwiKSxcbi8qIGpzaGludCAtVzA3OSAqL1xuICAgIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpZ3JhcGg7XG5cbi8qXG4gKiBDb25zdHJ1Y3RvciB0byBjcmVhdGUgYSBuZXcgZGlyZWN0ZWQgbXVsdGktZ3JhcGguXG4gKi9cbmZ1bmN0aW9uIERpZ3JhcGgoKSB7XG4gIEJhc2VHcmFwaC5jYWxsKHRoaXMpO1xuXG4gIC8qISBNYXAgb2Ygc291cmNlSWQgLT4ge3RhcmdldElkIC0+IFNldCBvZiBlZGdlIGlkc30gKi9cbiAgdGhpcy5faW5FZGdlcyA9IHt9O1xuXG4gIC8qISBNYXAgb2YgdGFyZ2V0SWQgLT4ge3NvdXJjZUlkIC0+IFNldCBvZiBlZGdlIGlkc30gKi9cbiAgdGhpcy5fb3V0RWRnZXMgPSB7fTtcbn1cblxuRGlncmFwaC5wcm90b3R5cGUgPSBuZXcgQmFzZUdyYXBoKCk7XG5EaWdyYXBoLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERpZ3JhcGg7XG5cbi8qXG4gKiBBbHdheXMgcmV0dXJucyBgdHJ1ZWAuXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmlzRGlyZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgc3VjY2Vzc29ycyBvZiB0aGUgbm9kZSB3aXRoIHRoZSBpZCBgdWAuIFRoYXQgaXMsIGFsbCBub2Rlc1xuICogdGhhdCBoYXZlIHRoZSBub2RlIGB1YCBhcyB0aGVpciBzb3VyY2UgYXJlIHJldHVybmVkLlxuICogXG4gKiBJZiBubyBub2RlIGB1YCBleGlzdHMgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5zdWNjZXNzb3JzID0gZnVuY3Rpb24odSkge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5fb3V0RWRnZXNbdV0pXG4gICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uKHYpIHsgcmV0dXJuIHRoaXMuX25vZGVzW3ZdLmlkOyB9LCB0aGlzKTtcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFsbCBwcmVkZWNlc3NvcnMgb2YgdGhlIG5vZGUgd2l0aCB0aGUgaWQgYHVgLiBUaGF0IGlzLCBhbGwgbm9kZXNcbiAqIHRoYXQgaGF2ZSB0aGUgbm9kZSBgdWAgYXMgdGhlaXIgdGFyZ2V0IGFyZSByZXR1cm5lZC5cbiAqIFxuICogSWYgbm8gbm9kZSBgdWAgZXhpc3RzIGluIHRoZSBncmFwaCB0aGlzIGZ1bmN0aW9uIHRocm93cyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUucHJlZGVjZXNzb3JzID0gZnVuY3Rpb24odSkge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5faW5FZGdlc1t1XSlcbiAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gdGhpcy5fbm9kZXNbdl0uaWQ7IH0sIHRoaXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYWxsIG5vZGVzIHRoYXQgYXJlIGFkamFjZW50IHRvIHRoZSBub2RlIHdpdGggdGhlIGlkIGB1YC4gSW4gb3RoZXJcbiAqIHdvcmRzLCB0aGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIHNldCBvZiBhbGwgc3VjY2Vzc29ycyBhbmQgcHJlZGVjZXNzb3JzIG9mXG4gKiBub2RlIGB1YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUubmVpZ2hib3JzID0gZnVuY3Rpb24odSkge1xuICByZXR1cm4gU2V0LnVuaW9uKFt0aGlzLnN1Y2Nlc3NvcnModSksIHRoaXMucHJlZGVjZXNzb3JzKHUpXSkua2V5cygpO1xufTtcblxuLypcbiAqIFJldHVybnMgYWxsIG5vZGVzIGluIHRoZSBncmFwaCB0aGF0IGhhdmUgbm8gaW4tZWRnZXMuXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnNvdXJjZXMgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5fZmlsdGVyTm9kZXMoZnVuY3Rpb24odSkge1xuICAgIC8vIFRoaXMgY291bGQgaGF2ZSBiZXR0ZXIgc3BhY2UgY2hhcmFjdGVyaXN0aWNzIGlmIHdlIGhhZCBhbiBpbkRlZ3JlZSBmdW5jdGlvbi5cbiAgICByZXR1cm4gc2VsZi5pbkVkZ2VzKHUpLmxlbmd0aCA9PT0gMDtcbiAgfSk7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSBubyBvdXQtZWRnZXMuXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLnNpbmtzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIHRoaXMuX2ZpbHRlck5vZGVzKGZ1bmN0aW9uKHUpIHtcbiAgICAvLyBUaGlzIGNvdWxkIGhhdmUgYmV0dGVyIHNwYWNlIGNoYXJhY3RlcmlzdGljcyBpZiB3ZSBoYXZlIGFuIG91dERlZ3JlZSBmdW5jdGlvbi5cbiAgICByZXR1cm4gc2VsZi5vdXRFZGdlcyh1KS5sZW5ndGggPT09IDA7XG4gIH0pO1xufTtcblxuLypcbiAqIFJldHVybnMgdGhlIHNvdXJjZSBub2RlIGluY2lkZW50IG9uIHRoZSBlZGdlIGlkZW50aWZpZWQgYnkgdGhlIGlkIGBlYC4gSWYgbm9cbiAqIHN1Y2ggZWRnZSBleGlzdHMgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBlIGFuIGVkZ2UgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuc291cmNlID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4gdGhpcy5fc3RyaWN0R2V0RWRnZShlKS51O1xufTtcblxuLypcbiAqIFJldHVybnMgdGhlIHRhcmdldCBub2RlIGluY2lkZW50IG9uIHRoZSBlZGdlIGlkZW50aWZpZWQgYnkgdGhlIGlkIGBlYC4gSWYgbm9cbiAqIHN1Y2ggZWRnZSBleGlzdHMgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBlIGFuIGVkZ2UgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUudGFyZ2V0ID0gZnVuY3Rpb24oZSkge1xuICByZXR1cm4gdGhpcy5fc3RyaWN0R2V0RWRnZShlKS52O1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgaGF2ZSB0aGUgbm9kZVxuICogYHRhcmdldGAgYXMgdGhlaXIgdGFyZ2V0LiBJZiB0aGUgbm9kZSBgdGFyZ2V0YCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoaXNcbiAqIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBPcHRpb25hbGx5IGEgYHNvdXJjZWAgbm9kZSBjYW4gYWxzbyBiZSBzcGVjaWZpZWQuIFRoaXMgY2F1c2VzIHRoZSByZXN1bHRzXG4gKiB0byBiZSBmaWx0ZXJlZCBzdWNoIHRoYXQgb25seSBlZGdlcyBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIGFyZSBpbmNsdWRlZC5cbiAqIElmIHRoZSBub2RlIGBzb3VyY2VgIGlzIHNwZWNpZmllZCBidXQgaXMgbm90IGluIHRoZSBncmFwaCB0aGVuIHRoaXMgZnVuY3Rpb25cbiAqIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0IHRoZSB0YXJnZXQgbm9kZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IFtzb3VyY2VdIGFuIG9wdGlvbmFsIHNvdXJjZSBub2RlIGlkXG4gKi9cbkRpZ3JhcGgucHJvdG90eXBlLmluRWRnZXMgPSBmdW5jdGlvbih0YXJnZXQsIHNvdXJjZSkge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHRhcmdldCk7XG4gIHZhciByZXN1bHRzID0gU2V0LnVuaW9uKHV0aWwudmFsdWVzKHRoaXMuX2luRWRnZXNbdGFyZ2V0XSkpLmtleXMoKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgdGhpcy5fc3RyaWN0R2V0Tm9kZShzb3VyY2UpO1xuICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbihlKSB7IHJldHVybiB0aGlzLnNvdXJjZShlKSA9PT0gc291cmNlOyB9LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGlkcyBmb3IgYWxsIGVkZ2VzIGluIHRoZSBncmFwaCB0aGF0IGhhdmUgdGhlIG5vZGVcbiAqIGBzb3VyY2VgIGFzIHRoZWlyIHNvdXJjZS4gSWYgdGhlIG5vZGUgYHNvdXJjZWAgaXMgbm90IGluIHRoZSBncmFwaCB0aGlzXG4gKiBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogT3B0aW9uYWxseSBhIGB0YXJnZXRgIG5vZGUgbWF5IGFsc28gYmUgc3BlY2lmaWVkLiBUaGlzIGNhdXNlcyB0aGUgcmVzdWx0c1xuICogdG8gYmUgZmlsdGVyZWQgc3VjaCB0aGF0IG9ubHkgZWRnZXMgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YCBhcmUgaW5jbHVkZWQuXG4gKiBJZiB0aGUgbm9kZSBgdGFyZ2V0YCBpcyBzcGVjaWZpZWQgYnV0IGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhlbiB0aGlzIGZ1bmN0aW9uXG4gKiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSB0aGUgc291cmNlIG5vZGUgaWRcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdGFyZ2V0XSBhbiBvcHRpb25hbCB0YXJnZXQgbm9kZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5vdXRFZGdlcyA9IGZ1bmN0aW9uKHNvdXJjZSwgdGFyZ2V0KSB7XG4gIHRoaXMuX3N0cmljdEdldE5vZGUoc291cmNlKTtcbiAgdmFyIHJlc3VsdHMgPSBTZXQudW5pb24odXRpbC52YWx1ZXModGhpcy5fb3V0RWRnZXNbc291cmNlXSkpLmtleXMoKTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh0YXJnZXQpO1xuICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbihlKSB7IHJldHVybiB0aGlzLnRhcmdldChlKSA9PT0gdGFyZ2V0OyB9LCB0aGlzKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn07XG5cbi8qXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGlkcyBmb3IgYWxsIGVkZ2VzIGluIHRoZSBncmFwaCB0aGF0IGhhdmUgdGhlIGB1YCBhc1xuICogdGhlaXIgc291cmNlIG9yIHRoZWlyIHRhcmdldC4gSWYgdGhlIG5vZGUgYHVgIGlzIG5vdCBpbiB0aGUgZ3JhcGggdGhpc1xuICogZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIE9wdGlvbmFsbHkgYSBgdmAgbm9kZSBtYXkgYWxzbyBiZSBzcGVjaWZpZWQuIFRoaXMgY2F1c2VzIHRoZSByZXN1bHRzIHRvIGJlXG4gKiBmaWx0ZXJlZCBzdWNoIHRoYXQgb25seSBlZGdlcyBiZXR3ZWVuIGB1YCBhbmQgYHZgIC0gaW4gZWl0aGVyIGRpcmVjdGlvbiAtXG4gKiBhcmUgaW5jbHVkZWQuIElGIHRoZSBub2RlIGB2YCBpcyBzcGVjaWZpZWQgYnV0IG5vdCBpbiB0aGUgZ3JhcGggdGhlbiB0aGlzXG4gKiBmdW5jdGlvbiByYWlzZXMgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgdGhlIG5vZGUgZm9yIHdoaWNoIHRvIGZpbmQgaW5jaWRlbnQgZWRnZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSBbdl0gb3B0aW9uIG5vZGUgdGhhdCBtdXN0IGJlIGFkamFjZW50IHRvIGB1YFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5pbmNpZGVudEVkZ2VzID0gZnVuY3Rpb24odSwgdikge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICByZXR1cm4gU2V0LnVuaW9uKFt0aGlzLm91dEVkZ2VzKHUsIHYpLCB0aGlzLm91dEVkZ2VzKHYsIHUpXSkua2V5cygpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBTZXQudW5pb24oW3RoaXMuaW5FZGdlcyh1KSwgdGhpcy5vdXRFZGdlcyh1KV0pLmtleXMoKTtcbiAgfVxufTtcblxuLypcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBncmFwaC5cbiAqL1xuRGlncmFwaC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFwiRGlncmFwaCBcIiArIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xufTtcblxuLypcbiAqIEFkZHMgYSBuZXcgbm9kZSB3aXRoIHRoZSBpZCBgdWAgdG8gdGhlIGdyYXBoIGFuZCBhc3NpZ25zIGl0IHRoZSB2YWx1ZVxuICogYHZhbHVlYC4gSWYgYSBub2RlIHdpdGggdGhlIGlkIGlzIGFscmVhZHkgYSBwYXJ0IG9mIHRoZSBncmFwaCB0aGlzIGZ1bmN0aW9uXG4gKiB0aHJvd3MgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHUgYSBub2RlIGlkXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBhbiBvcHRpb25hbCB2YWx1ZSB0byBhdHRhY2ggdG8gdGhlIG5vZGVcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIHUgPSBCYXNlR3JhcGgucHJvdG90eXBlLmFkZE5vZGUuY2FsbCh0aGlzLCB1LCB2YWx1ZSk7XG4gIHRoaXMuX2luRWRnZXNbdV0gPSB7fTtcbiAgdGhpcy5fb3V0RWRnZXNbdV0gPSB7fTtcbiAgcmV0dXJuIHU7XG59O1xuXG4vKlxuICogUmVtb3ZlcyBhIG5vZGUgZnJvbSB0aGUgZ3JhcGggdGhhdCBoYXMgdGhlIGlkIGB1YC4gQW55IGVkZ2VzIGluY2lkZW50IG9uIHRoZVxuICogbm9kZSBhcmUgYWxzbyByZW1vdmVkLiBJZiB0aGUgZ3JhcGggZG9lcyBub3QgY29udGFpbiBhIG5vZGUgd2l0aCB0aGUgaWQgdGhpc1xuICogZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuZGVsTm9kZSA9IGZ1bmN0aW9uKHUpIHtcbiAgQmFzZUdyYXBoLnByb3RvdHlwZS5kZWxOb2RlLmNhbGwodGhpcywgdSk7XG4gIGRlbGV0ZSB0aGlzLl9pbkVkZ2VzW3VdO1xuICBkZWxldGUgdGhpcy5fb3V0RWRnZXNbdV07XG59O1xuXG4vKlxuICogQWRkcyBhIG5ldyBlZGdlIHRvIHRoZSBncmFwaCB3aXRoIHRoZSBpZCBgZWAgZnJvbSBhIG5vZGUgd2l0aCB0aGUgaWQgYHNvdXJjZWBcbiAqIHRvIGEgbm9kZSB3aXRoIGFuIGlkIGB0YXJnZXRgIGFuZCBhc3NpZ25zIGl0IHRoZSB2YWx1ZSBgdmFsdWVgLiBUaGlzIGdyYXBoXG4gKiBhbGxvd3MgbW9yZSB0aGFuIG9uZSBlZGdlIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGAgYXMgbG9uZyBhcyB0aGUgaWQgYGVgXG4gKiBpcyB1bmlxdWUgaW4gdGhlIHNldCBvZiBlZGdlcy4gSWYgYGVgIGlzIGBudWxsYCB0aGUgZ3JhcGggd2lsbCBhc3NpZ24gYVxuICogdW5pcXVlIGlkZW50aWZpZXIgdG8gdGhlIGVkZ2UuXG4gKlxuICogSWYgYHNvdXJjZWAgb3IgYHRhcmdldGAgYXJlIG5vdCBwcmVzZW50IGluIHRoZSBncmFwaCB0aGlzIGZ1bmN0aW9uIHdpbGxcbiAqIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBbZV0gYW4gZWRnZSBpZFxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSB0aGUgc291cmNlIG5vZGUgaWRcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YXJnZXQgdGhlIHRhcmdldCBub2RlIGlkXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBhbiBvcHRpb25hbCB2YWx1ZSB0byBhdHRhY2ggdG8gdGhlIGVkZ2VcbiAqL1xuRGlncmFwaC5wcm90b3R5cGUuYWRkRWRnZSA9IGZ1bmN0aW9uKGUsIHNvdXJjZSwgdGFyZ2V0LCB2YWx1ZSkge1xuICByZXR1cm4gQmFzZUdyYXBoLnByb3RvdHlwZS5fYWRkRWRnZS5jYWxsKHRoaXMsIGUsIHNvdXJjZSwgdGFyZ2V0LCB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9pbkVkZ2VzLCB0aGlzLl9vdXRFZGdlcyk7XG59O1xuXG4vKlxuICogUmVtb3ZlcyBhbiBlZGdlIGluIHRoZSBncmFwaCB3aXRoIHRoZSBpZCBgZWAuIElmIG5vIGVkZ2UgaW4gdGhlIGdyYXBoIGhhc1xuICogdGhlIGlkIGBlYCB0aGlzIGZ1bmN0aW9uIHdpbGwgdGhyb3cgYW4gRXJyb3IuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGUgYW4gZWRnZSBpZFxuICovXG5EaWdyYXBoLnByb3RvdHlwZS5kZWxFZGdlID0gZnVuY3Rpb24oZSkge1xuICBCYXNlR3JhcGgucHJvdG90eXBlLl9kZWxFZGdlLmNhbGwodGhpcywgZSwgdGhpcy5faW5FZGdlcywgdGhpcy5fb3V0RWRnZXMpO1xufTtcblxuLy8gVW5saWtlIEJhc2VHcmFwaC5maWx0ZXJOb2RlcywgdGhpcyBoZWxwZXIganVzdCByZXR1cm5zIG5vZGVzIHRoYXRcbi8vIHNhdGlzZnkgYSBwcmVkaWNhdGUuXG5EaWdyYXBoLnByb3RvdHlwZS5fZmlsdGVyTm9kZXMgPSBmdW5jdGlvbihwcmVkKSB7XG4gIHZhciBmaWx0ZXJlZCA9IFtdO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAocHJlZCh1KSkge1xuICAgICAgZmlsdGVyZWQucHVzaCh1KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmlsdGVyZWQ7XG59O1xuXG4iLCIvKlxuICogVGhpcyBmaWxlIGlzIG9yZ2FuaXplZCB3aXRoIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogRXhwb3J0c1xuICogR3JhcGggY29uc3RydWN0b3JzXG4gKiBHcmFwaCBxdWVyaWVzIChlLmcuIG5vZGVzKCksIGVkZ2VzKClcbiAqIEdyYXBoIG11dGF0b3JzXG4gKiBIZWxwZXIgZnVuY3Rpb25zXG4gKi9cblxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsXCIpLFxuICAgIEJhc2VHcmFwaCA9IHJlcXVpcmUoXCIuL0Jhc2VHcmFwaFwiKSxcbi8qIGpzaGludCAtVzA3OSAqL1xuICAgIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyYXBoO1xuXG4vKlxuICogQ29uc3RydWN0b3IgdG8gY3JlYXRlIGEgbmV3IHVuZGlyZWN0ZWQgbXVsdGktZ3JhcGguXG4gKi9cbmZ1bmN0aW9uIEdyYXBoKCkge1xuICBCYXNlR3JhcGguY2FsbCh0aGlzKTtcblxuICAvKiEgTWFwIG9mIG5vZGVJZCAtPiB7IG90aGVyTm9kZUlkIC0+IFNldCBvZiBlZGdlIGlkcyB9ICovXG4gIHRoaXMuX2luY2lkZW50RWRnZXMgPSB7fTtcbn1cblxuR3JhcGgucHJvdG90eXBlID0gbmV3IEJhc2VHcmFwaCgpO1xuR3JhcGgucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gR3JhcGg7XG5cbi8qXG4gKiBBbHdheXMgcmV0dXJucyBgZmFsc2VgLlxuICovXG5HcmFwaC5wcm90b3R5cGUuaXNEaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKlxuICogUmV0dXJucyBhbGwgbm9kZXMgdGhhdCBhcmUgYWRqYWNlbnQgdG8gdGhlIG5vZGUgd2l0aCB0aGUgaWQgYHVgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IGEgbm9kZSBpZFxuICovXG5HcmFwaC5wcm90b3R5cGUubmVpZ2hib3JzID0gZnVuY3Rpb24odSkge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5faW5jaWRlbnRFZGdlc1t1XSlcbiAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gdGhpcy5fbm9kZXNbdl0uaWQ7IH0sIHRoaXMpO1xufTtcblxuLypcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgaWRzIGZvciBhbGwgZWRnZXMgaW4gdGhlIGdyYXBoIHRoYXQgYXJlIGluY2lkZW50IG9uIGB1YC5cbiAqIElmIHRoZSBub2RlIGB1YCBpcyBub3QgaW4gdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb24gcmFpc2VzIGFuIEVycm9yLlxuICpcbiAqIE9wdGlvbmFsbHkgYSBgdmAgbm9kZSBtYXkgYWxzbyBiZSBzcGVjaWZpZWQuIFRoaXMgY2F1c2VzIHRoZSByZXN1bHRzIHRvIGJlXG4gKiBmaWx0ZXJlZCBzdWNoIHRoYXQgb25seSBlZGdlcyBiZXR3ZWVuIGB1YCBhbmQgYHZgIGFyZSBpbmNsdWRlZC4gSWYgdGhlIG5vZGVcbiAqIGB2YCBpcyBzcGVjaWZpZWQgYnV0IG5vdCBpbiB0aGUgZ3JhcGggdGhlbiB0aGlzIGZ1bmN0aW9uIHJhaXNlcyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSB0aGUgbm9kZSBmb3Igd2hpY2ggdG8gZmluZCBpbmNpZGVudCBlZGdlc1xuICogQHBhcmFtIHtTdHJpbmd9IFt2XSBvcHRpb24gbm9kZSB0aGF0IG11c3QgYmUgYWRqYWNlbnQgdG8gYHVgXG4gKi9cbkdyYXBoLnByb3RvdHlwZS5pbmNpZGVudEVkZ2VzID0gZnVuY3Rpb24odSwgdikge1xuICB0aGlzLl9zdHJpY3RHZXROb2RlKHUpO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICB0aGlzLl9zdHJpY3RHZXROb2RlKHYpO1xuICAgIHJldHVybiB2IGluIHRoaXMuX2luY2lkZW50RWRnZXNbdV0gPyB0aGlzLl9pbmNpZGVudEVkZ2VzW3VdW3ZdLmtleXMoKSA6IFtdO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBTZXQudW5pb24odXRpbC52YWx1ZXModGhpcy5faW5jaWRlbnRFZGdlc1t1XSkpLmtleXMoKTtcbiAgfVxufTtcblxuLypcbiAqIFJldHVybnMgYSBzdHJpbmcgcmVwcmVzZW50YXRpb24gb2YgdGhpcyBncmFwaC5cbiAqL1xuR3JhcGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBcIkdyYXBoIFwiICsgSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG59O1xuXG4vKlxuICogQWRkcyBhIG5ldyBub2RlIHdpdGggdGhlIGlkIGB1YCB0byB0aGUgZ3JhcGggYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlXG4gKiBgdmFsdWVgLiBJZiBhIG5vZGUgd2l0aCB0aGUgaWQgaXMgYWxyZWFkeSBhIHBhcnQgb2YgdGhlIGdyYXBoIHRoaXMgZnVuY3Rpb25cbiAqIHRocm93cyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBbdmFsdWVdIGFuIG9wdGlvbmFsIHZhbHVlIHRvIGF0dGFjaCB0byB0aGUgbm9kZVxuICovXG5HcmFwaC5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gIHUgPSBCYXNlR3JhcGgucHJvdG90eXBlLmFkZE5vZGUuY2FsbCh0aGlzLCB1LCB2YWx1ZSk7XG4gIHRoaXMuX2luY2lkZW50RWRnZXNbdV0gPSB7fTtcbiAgcmV0dXJuIHU7XG59O1xuXG4vKlxuICogUmVtb3ZlcyBhIG5vZGUgZnJvbSB0aGUgZ3JhcGggdGhhdCBoYXMgdGhlIGlkIGB1YC4gQW55IGVkZ2VzIGluY2lkZW50IG9uIHRoZVxuICogbm9kZSBhcmUgYWxzbyByZW1vdmVkLiBJZiB0aGUgZ3JhcGggZG9lcyBub3QgY29udGFpbiBhIG5vZGUgd2l0aCB0aGUgaWQgdGhpc1xuICogZnVuY3Rpb24gd2lsbCB0aHJvdyBhbiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdSBhIG5vZGUgaWRcbiAqL1xuR3JhcGgucHJvdG90eXBlLmRlbE5vZGUgPSBmdW5jdGlvbih1KSB7XG4gIEJhc2VHcmFwaC5wcm90b3R5cGUuZGVsTm9kZS5jYWxsKHRoaXMsIHUpO1xuICBkZWxldGUgdGhpcy5faW5jaWRlbnRFZGdlc1t1XTtcbn07XG5cbi8qXG4gKiBBZGRzIGEgbmV3IGVkZ2UgdG8gdGhlIGdyYXBoIHdpdGggdGhlIGlkIGBlYCBiZXR3ZWVuIGEgbm9kZSB3aXRoIHRoZSBpZCBgdWBcbiAqIGFuZCBhIG5vZGUgd2l0aCBhbiBpZCBgdmAgYW5kIGFzc2lnbnMgaXQgdGhlIHZhbHVlIGB2YWx1ZWAuIFRoaXMgZ3JhcGhcbiAqIGFsbG93cyBtb3JlIHRoYW4gb25lIGVkZ2UgYmV0d2VlbiBgdWAgYW5kIGB2YCBhcyBsb25nIGFzIHRoZSBpZCBgZWBcbiAqIGlzIHVuaXF1ZSBpbiB0aGUgc2V0IG9mIGVkZ2VzLiBJZiBgZWAgaXMgYG51bGxgIHRoZSBncmFwaCB3aWxsIGFzc2lnbiBhXG4gKiB1bmlxdWUgaWRlbnRpZmllciB0byB0aGUgZWRnZS5cbiAqXG4gKiBJZiBgdWAgb3IgYHZgIGFyZSBub3QgcHJlc2VudCBpbiB0aGUgZ3JhcGggdGhpcyBmdW5jdGlvbiB3aWxsIHRocm93IGFuXG4gKiBFcnJvci5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gW2VdIGFuIGVkZ2UgaWRcbiAqIEBwYXJhbSB7U3RyaW5nfSB1IHRoZSBub2RlIGlkIG9mIG9uZSBvZiB0aGUgYWRqYWNlbnQgbm9kZXNcbiAqIEBwYXJhbSB7U3RyaW5nfSB2IHRoZSBub2RlIGlkIG9mIHRoZSBvdGhlciBhZGphY2VudCBub2RlXG4gKiBAcGFyYW0ge09iamVjdH0gW3ZhbHVlXSBhbiBvcHRpb25hbCB2YWx1ZSB0byBhdHRhY2ggdG8gdGhlIGVkZ2VcbiAqL1xuR3JhcGgucHJvdG90eXBlLmFkZEVkZ2UgPSBmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICByZXR1cm4gQmFzZUdyYXBoLnByb3RvdHlwZS5fYWRkRWRnZS5jYWxsKHRoaXMsIGUsIHUsIHYsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX2luY2lkZW50RWRnZXMsIHRoaXMuX2luY2lkZW50RWRnZXMpO1xufTtcblxuLypcbiAqIFJlbW92ZXMgYW4gZWRnZSBpbiB0aGUgZ3JhcGggd2l0aCB0aGUgaWQgYGVgLiBJZiBubyBlZGdlIGluIHRoZSBncmFwaCBoYXNcbiAqIHRoZSBpZCBgZWAgdGhpcyBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBlIGFuIGVkZ2UgaWRcbiAqL1xuR3JhcGgucHJvdG90eXBlLmRlbEVkZ2UgPSBmdW5jdGlvbihlKSB7XG4gIEJhc2VHcmFwaC5wcm90b3R5cGUuX2RlbEVkZ2UuY2FsbCh0aGlzLCBlLCB0aGlzLl9pbmNpZGVudEVkZ2VzLCB0aGlzLl9pbmNpZGVudEVkZ2VzKTtcbn07XG5cbiIsIi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvbmVudHM7XG5cbi8qKlxuICogRmluZHMgYWxsIFtjb25uZWN0ZWQgY29tcG9uZW50c11bXSBpbiBhIGdyYXBoIGFuZCByZXR1cm5zIGFuIGFycmF5IG9mIHRoZXNlXG4gKiBjb21wb25lbnRzLiBFYWNoIGNvbXBvbmVudCBpcyBpdHNlbGYgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgaWRzIG9mIG5vZGVzXG4gKiBpbiB0aGUgY29tcG9uZW50LlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyB3aXRoIHVuZGlyZWN0ZWQgR3JhcGhzLlxuICpcbiAqIFtjb25uZWN0ZWQgY29tcG9uZW50c106IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ29ubmVjdGVkX2NvbXBvbmVudF8oZ3JhcGhfdGhlb3J5KVxuICpcbiAqIEBwYXJhbSB7R3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3IgY29tcG9uZW50c1xuICovXG5mdW5jdGlvbiBjb21wb25lbnRzKGcpIHtcbiAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgdmFyIHZpc2l0ZWQgPSBuZXcgU2V0KCk7XG5cbiAgZnVuY3Rpb24gZGZzKHYsIGNvbXBvbmVudCkge1xuICAgIGlmICghdmlzaXRlZC5oYXModikpIHtcbiAgICAgIHZpc2l0ZWQuYWRkKHYpO1xuICAgICAgY29tcG9uZW50LnB1c2godik7XG4gICAgICBnLm5laWdoYm9ycyh2KS5mb3JFYWNoKGZ1bmN0aW9uKHcpIHtcbiAgICAgICAgZGZzKHcsIGNvbXBvbmVudCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnLm5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgdmFyIGNvbXBvbmVudCA9IFtdO1xuICAgIGRmcyh2LCBjb21wb25lbnQpO1xuICAgIGlmIChjb21wb25lbnQubGVuZ3RoID4gMCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGNvbXBvbmVudCk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsInZhciBQcmlvcml0eVF1ZXVlID0gcmVxdWlyZShcImNwLWRhdGFcIikuUHJpb3JpdHlRdWV1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBkaWprc3RyYTtcblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIFtEaWprc3RyYSdzIGFsZ29yaXRobV1bXSB3aGljaCBmaW5kc1xuICogdGhlIHNob3J0ZXN0IHBhdGggZnJvbSAqKnNvdXJjZSoqIHRvIGFsbCBvdGhlciBub2RlcyBpbiAqKmcqKi4gVGhpc1xuICogZnVuY3Rpb24gcmV0dXJucyBhIG1hcCBvZiBgdSAtPiB7IGRpc3RhbmNlLCBwcmVkZWNlc3NvciB9YC4gVGhlIGRpc3RhbmNlXG4gKiBwcm9wZXJ0eSBob2xkcyB0aGUgc3VtIG9mIHRoZSB3ZWlnaHRzIGZyb20gKipzb3VyY2UqKiB0byBgdWAgYWxvbmcgdGhlXG4gKiBzaG9ydGVzdCBwYXRoIG9yIGBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFlgIGlmIHRoZXJlIGlzIG5vIHBhdGggZnJvbVxuICogKipzb3VyY2UqKi4gVGhlIHByZWRlY2Vzc29yIHByb3BlcnR5IGNhbiBiZSB1c2VkIHRvIHdhbGsgdGhlIGluZGl2aWR1YWxcbiAqIGVsZW1lbnRzIG9mIHRoZSBwYXRoIGZyb20gKipzb3VyY2UqKiB0byAqKnUqKiBpbiByZXZlcnNlIG9yZGVyLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYHdlaWdodEZ1bmMoZSlgIHdoaWNoIHJldHVybnMgdGhlXG4gKiB3ZWlnaHQgb2YgdGhlIGVkZ2UgYGVgLiBJZiBubyB3ZWlnaHRGdW5jIGlzIHN1cHBsaWVkIHRoZW4gZWFjaCBlZGdlIGlzXG4gKiBhc3N1bWVkIHRvIGhhdmUgYSB3ZWlnaHQgb2YgMS4gVGhpcyBmdW5jdGlvbiB0aHJvd3MgYW4gRXJyb3IgaWYgYW55IG9mXG4gKiB0aGUgdHJhdmVyc2VkIGVkZ2VzIGhhdmUgYSBuZWdhdGl2ZSBlZGdlIHdlaWdodC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGBpbmNpZGVudEZ1bmModSlgIHdoaWNoIHJldHVybnMgdGhlIGlkcyBvZlxuICogYWxsIGVkZ2VzIGluY2lkZW50IHRvIHRoZSBub2RlIGB1YCBmb3IgdGhlIHB1cnBvc2VzIG9mIHNob3J0ZXN0IHBhdGhcbiAqIHRyYXZlcnNhbC4gQnkgZGVmYXVsdCB0aGlzIGZ1bmN0aW9uIHVzZXMgdGhlIGBnLm91dEVkZ2VzYCBmb3IgRGlncmFwaHMgYW5kXG4gKiBgZy5pbmNpZGVudEVkZ2VzYCBmb3IgR3JhcGhzLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYE8oKHxFfCArIHxWfCkgKiBsb2cgfFZ8KWAgdGltZS5cbiAqXG4gKiBbRGlqa3N0cmEncyBhbGdvcml0aG1dOiBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RpamtzdHJhJTI3c19hbGdvcml0aG1cbiAqXG4gKiBAcGFyYW0ge0dyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHNob3J0ZXN0IHBhdGhzIGZyb20gKipzb3VyY2UqKlxuICogQHBhcmFtIHtPYmplY3R9IHNvdXJjZSB0aGUgc291cmNlIGZyb20gd2hpY2ggdG8gc3RhcnQgdGhlIHNlYXJjaFxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3dlaWdodEZ1bmNdIG9wdGlvbmFsIHdlaWdodCBmdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2luY2lkZW50RnVuY10gb3B0aW9uYWwgaW5jaWRlbnQgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGlqa3N0cmEoZywgc291cmNlLCB3ZWlnaHRGdW5jLCBpbmNpZGVudEZ1bmMpIHtcbiAgdmFyIHJlc3VsdHMgPSB7fSxcbiAgICAgIHBxID0gbmV3IFByaW9yaXR5UXVldWUoKTtcblxuICBmdW5jdGlvbiB1cGRhdGVOZWlnaGJvcnMoZSkge1xuICAgIHZhciBpbmNpZGVudE5vZGVzID0gZy5pbmNpZGVudE5vZGVzKGUpLFxuICAgICAgICB2ID0gaW5jaWRlbnROb2Rlc1swXSAhPT0gdSA/IGluY2lkZW50Tm9kZXNbMF0gOiBpbmNpZGVudE5vZGVzWzFdLFxuICAgICAgICB2RW50cnkgPSByZXN1bHRzW3ZdLFxuICAgICAgICB3ZWlnaHQgPSB3ZWlnaHRGdW5jKGUpLFxuICAgICAgICBkaXN0YW5jZSA9IHVFbnRyeS5kaXN0YW5jZSArIHdlaWdodDtcblxuICAgIGlmICh3ZWlnaHQgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkaWprc3RyYSBkb2VzIG5vdCBhbGxvdyBuZWdhdGl2ZSBlZGdlIHdlaWdodHMuIEJhZCBlZGdlOiBcIiArIGUgKyBcIiBXZWlnaHQ6IFwiICsgd2VpZ2h0KTtcbiAgICB9XG5cbiAgICBpZiAoZGlzdGFuY2UgPCB2RW50cnkuZGlzdGFuY2UpIHtcbiAgICAgIHZFbnRyeS5kaXN0YW5jZSA9IGRpc3RhbmNlO1xuICAgICAgdkVudHJ5LnByZWRlY2Vzc29yID0gdTtcbiAgICAgIHBxLmRlY3JlYXNlKHYsIGRpc3RhbmNlKTtcbiAgICB9XG4gIH1cblxuICB3ZWlnaHRGdW5jID0gd2VpZ2h0RnVuYyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIDE7IH07XG4gIGluY2lkZW50RnVuYyA9IGluY2lkZW50RnVuYyB8fCAoZy5pc0RpcmVjdGVkKClcbiAgICAgID8gZnVuY3Rpb24odSkgeyByZXR1cm4gZy5vdXRFZGdlcyh1KTsgfVxuICAgICAgOiBmdW5jdGlvbih1KSB7IHJldHVybiBnLmluY2lkZW50RWRnZXModSk7IH0pO1xuXG4gIGcuZWFjaE5vZGUoZnVuY3Rpb24odSkge1xuICAgIHZhciBkaXN0YW5jZSA9IHUgPT09IHNvdXJjZSA/IDAgOiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgcmVzdWx0c1t1XSA9IHsgZGlzdGFuY2U6IGRpc3RhbmNlIH07XG4gICAgcHEuYWRkKHUsIGRpc3RhbmNlKTtcbiAgfSk7XG5cbiAgdmFyIHUsIHVFbnRyeTtcbiAgd2hpbGUgKHBxLnNpemUoKSA+IDApIHtcbiAgICB1ID0gcHEucmVtb3ZlTWluKCk7XG4gICAgdUVudHJ5ID0gcmVzdWx0c1t1XTtcbiAgICBpZiAodUVudHJ5LmRpc3RhbmNlID09PSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGluY2lkZW50RnVuYyh1KS5mb3JFYWNoKHVwZGF0ZU5laWdoYm9ycyk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0cztcbn1cbiIsInZhciBkaWprc3RyYSA9IHJlcXVpcmUoXCIuL2RpamtzdHJhXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRpamtzdHJhQWxsO1xuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gZmluZHMgdGhlIHNob3J0ZXN0IHBhdGggZnJvbSBlYWNoIG5vZGUgdG8gZXZlcnkgb3RoZXJcbiAqIHJlYWNoYWJsZSBub2RlIGluIHRoZSBncmFwaC4gSXQgaXMgc2ltaWxhciB0byBbYWxnLmRpamtzdHJhXVtdLCBidXRcbiAqIGluc3RlYWQgb2YgcmV0dXJuaW5nIGEgc2luZ2xlLXNvdXJjZSBhcnJheSwgaXQgcmV0dXJucyBhIG1hcHBpbmcgb2ZcbiAqIG9mIGBzb3VyY2UgLT4gYWxnLmRpamtzdGEoZywgc291cmNlLCB3ZWlnaHRGdW5jLCBpbmNpZGVudEZ1bmMpYC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGFuIG9wdGlvbmFsIGB3ZWlnaHRGdW5jKGUpYCB3aGljaCByZXR1cm5zIHRoZVxuICogd2VpZ2h0IG9mIHRoZSBlZGdlIGBlYC4gSWYgbm8gd2VpZ2h0RnVuYyBpcyBzdXBwbGllZCB0aGVuIGVhY2ggZWRnZSBpc1xuICogYXNzdW1lZCB0byBoYXZlIGEgd2VpZ2h0IG9mIDEuIFRoaXMgZnVuY3Rpb24gdGhyb3dzIGFuIEVycm9yIGlmIGFueSBvZlxuICogdGhlIHRyYXZlcnNlZCBlZGdlcyBoYXZlIGEgbmVnYXRpdmUgZWRnZSB3ZWlnaHQuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgaW5jaWRlbnRGdW5jKHUpYCB3aGljaCByZXR1cm5zIHRoZSBpZHMgb2ZcbiAqIGFsbCBlZGdlcyBpbmNpZGVudCB0byB0aGUgbm9kZSBgdWAgZm9yIHRoZSBwdXJwb3NlcyBvZiBzaG9ydGVzdCBwYXRoXG4gKiB0cmF2ZXJzYWwuIEJ5IGRlZmF1bHQgdGhpcyBmdW5jdGlvbiB1c2VzIHRoZSBgb3V0RWRnZXNgIGZ1bmN0aW9uIG9uIHRoZVxuICogc3VwcGxpZWQgZ3JhcGguXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBgTyh8VnwgKiAofEV8ICsgfFZ8KSAqIGxvZyB8VnwpYCB0aW1lLlxuICpcbiAqIFthbGcuZGlqa3N0cmFdOiBkaWprc3RyYS5qcy5odG1sI2RpamtzdHJhXG4gKlxuICogQHBhcmFtIHtHcmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBzaG9ydGVzdCBwYXRocyBmcm9tICoqc291cmNlKipcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFt3ZWlnaHRGdW5jXSBvcHRpb25hbCB3ZWlnaHQgZnVuY3Rpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtpbmNpZGVudEZ1bmNdIG9wdGlvbmFsIGluY2lkZW50IGZ1bmN0aW9uXG4gKi9cbmZ1bmN0aW9uIGRpamtzdHJhQWxsKGcsIHdlaWdodEZ1bmMsIGluY2lkZW50RnVuYykge1xuICB2YXIgcmVzdWx0cyA9IHt9O1xuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICByZXN1bHRzW3VdID0gZGlqa3N0cmEoZywgdSwgd2VpZ2h0RnVuYywgaW5jaWRlbnRGdW5jKTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwidmFyIHRhcmphbiA9IHJlcXVpcmUoXCIuL3RhcmphblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmaW5kQ3ljbGVzO1xuXG4vKlxuICogR2l2ZW4gYSBEaWdyYXBoICoqZyoqIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBhbGwgbm9kZXMgdGhhdCBhcmUgcGFydCBvZiBhXG4gKiBjeWNsZS4gU2luY2UgdGhlcmUgbWF5IGJlIG1vcmUgdGhhbiBvbmUgY3ljbGUgaW4gYSBncmFwaCB0aGlzIGZ1bmN0aW9uXG4gKiByZXR1cm5zIGFuIGFycmF5IG9mIHRoZXNlIGN5Y2xlcywgd2hlcmUgZWFjaCBjeWNsZSBpcyBpdHNlbGYgcmVwcmVzZW50ZWRcbiAqIGJ5IGFuIGFycmF5IG9mIGlkcyBmb3IgZWFjaCBub2RlIGludm9sdmVkIGluIHRoYXQgY3ljbGUuXG4gKlxuICogW2FsZy5pc0FjeWNsaWNdW10gaXMgbW9yZSBlZmZpY2llbnQgaWYgeW91IG9ubHkgbmVlZCB0byBkZXRlcm1pbmUgd2hldGhlclxuICogYSBncmFwaCBoYXMgYSBjeWNsZSBvciBub3QuXG4gKlxuICogW2FsZy5pc0FjeWNsaWNdOiBpc0FjeWNsaWMuanMuaHRtbCNpc0FjeWNsaWNcbiAqXG4gKiBAcGFyYW0ge0RpZ3JhcGh9IGcgdGhlIGdyYXBoIHRvIHNlYXJjaCBmb3IgY3ljbGVzLlxuICovXG5mdW5jdGlvbiBmaW5kQ3ljbGVzKGcpIHtcbiAgcmV0dXJuIHRhcmphbihnKS5maWx0ZXIoZnVuY3Rpb24oY21wdCkgeyByZXR1cm4gY21wdC5sZW5ndGggPiAxOyB9KTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZmxveWRXYXJzaGFsbDtcblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBbRmxveWQtV2Fyc2hhbGwgYWxnb3JpdGhtXVtdLFxuICogd2hpY2ggZmluZHMgdGhlIHNob3J0ZXN0IHBhdGggZnJvbSBlYWNoIG5vZGUgdG8gZXZlcnkgb3RoZXIgcmVhY2hhYmxlIG5vZGVcbiAqIGluIHRoZSBncmFwaC4gSXQgaXMgc2ltaWxhciB0byBbYWxnLmRpamtzdHJhQWxsXVtdLCBidXQgaXQgaGFuZGxlcyBuZWdhdGl2ZVxuICogZWRnZSB3ZWlnaHRzIGFuZCBpcyBtb3JlIGVmZmljaWVudCBmb3Igc29tZSB0eXBlcyBvZiBncmFwaHMuIFRoaXMgZnVuY3Rpb25cbiAqIHJldHVybnMgYSBtYXAgb2YgYHNvdXJjZSAtPiB7IHRhcmdldCAtPiB7IGRpc3RhbmNlLCBwcmVkZWNlc3NvciB9YC4gVGhlXG4gKiBkaXN0YW5jZSBwcm9wZXJ0eSBob2xkcyB0aGUgc3VtIG9mIHRoZSB3ZWlnaHRzIGZyb20gYHNvdXJjZWAgdG8gYHRhcmdldGBcbiAqIGFsb25nIHRoZSBzaG9ydGVzdCBwYXRoIG9mIGBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFlgIGlmIHRoZXJlIGlzIG5vIHBhdGhcbiAqIGZyb20gYHNvdXJjZWAuIFRoZSBwcmVkZWNlc3NvciBwcm9wZXJ0eSBjYW4gYmUgdXNlZCB0byB3YWxrIHRoZSBpbmRpdmlkdWFsXG4gKiBlbGVtZW50cyBvZiB0aGUgcGF0aCBmcm9tIGBzb3VyY2VgIHRvIGB0YXJnZXRgIGluIHJldmVyc2Ugb3JkZXIuXG4gKlxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBvcHRpb25hbCBgd2VpZ2h0RnVuYyhlKWAgd2hpY2ggcmV0dXJucyB0aGVcbiAqIHdlaWdodCBvZiB0aGUgZWRnZSBgZWAuIElmIG5vIHdlaWdodEZ1bmMgaXMgc3VwcGxpZWQgdGhlbiBlYWNoIGVkZ2UgaXNcbiAqIGFzc3VtZWQgdG8gaGF2ZSBhIHdlaWdodCBvZiAxLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYW4gb3B0aW9uYWwgYGluY2lkZW50RnVuYyh1KWAgd2hpY2ggcmV0dXJucyB0aGUgaWRzIG9mXG4gKiBhbGwgZWRnZXMgaW5jaWRlbnQgdG8gdGhlIG5vZGUgYHVgIGZvciB0aGUgcHVycG9zZXMgb2Ygc2hvcnRlc3QgcGF0aFxuICogdHJhdmVyc2FsLiBCeSBkZWZhdWx0IHRoaXMgZnVuY3Rpb24gdXNlcyB0aGUgYG91dEVkZ2VzYCBmdW5jdGlvbiBvbiB0aGVcbiAqIHN1cHBsaWVkIGdyYXBoLlxuICpcbiAqIFRoaXMgYWxnb3JpdGhtIHRha2VzIE8ofFZ8XjMpIHRpbWUuXG4gKlxuICogW0Zsb3lkLVdhcnNoYWxsIGFsZ29yaXRobV06IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zsb3lkLVdhcnNoYWxsX2FsZ29yaXRobVxuICogW2FsZy5kaWprc3RyYUFsbF06IGRpamtzdHJhQWxsLmpzLmh0bWwjZGlqa3N0cmFBbGxcbiAqXG4gKiBAcGFyYW0ge0dyYXBofSBnIHRoZSBncmFwaCB0byBzZWFyY2ggZm9yIHNob3J0ZXN0IHBhdGhzIGZyb20gKipzb3VyY2UqKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3dlaWdodEZ1bmNdIG9wdGlvbmFsIHdlaWdodCBmdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gW2luY2lkZW50RnVuY10gb3B0aW9uYWwgaW5jaWRlbnQgZnVuY3Rpb25cbiAqL1xuZnVuY3Rpb24gZmxveWRXYXJzaGFsbChnLCB3ZWlnaHRGdW5jLCBpbmNpZGVudEZ1bmMpIHtcbiAgdmFyIHJlc3VsdHMgPSB7fSxcbiAgICAgIG5vZGVzID0gZy5ub2RlcygpO1xuXG4gIHdlaWdodEZ1bmMgPSB3ZWlnaHRGdW5jIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gMTsgfTtcbiAgaW5jaWRlbnRGdW5jID0gaW5jaWRlbnRGdW5jIHx8IChnLmlzRGlyZWN0ZWQoKVxuICAgICAgPyBmdW5jdGlvbih1KSB7IHJldHVybiBnLm91dEVkZ2VzKHUpOyB9XG4gICAgICA6IGZ1bmN0aW9uKHUpIHsgcmV0dXJuIGcuaW5jaWRlbnRFZGdlcyh1KTsgfSk7XG5cbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgcmVzdWx0c1t1XSA9IHt9O1xuICAgIHJlc3VsdHNbdV1bdV0gPSB7IGRpc3RhbmNlOiAwIH07XG4gICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICBpZiAodSAhPT0gdikge1xuICAgICAgICByZXN1bHRzW3VdW3ZdID0geyBkaXN0YW5jZTogTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZIH07XG4gICAgICB9XG4gICAgfSk7XG4gICAgaW5jaWRlbnRGdW5jKHUpLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIGluY2lkZW50Tm9kZXMgPSBnLmluY2lkZW50Tm9kZXMoZSksXG4gICAgICAgICAgdiA9IGluY2lkZW50Tm9kZXNbMF0gIT09IHUgPyBpbmNpZGVudE5vZGVzWzBdIDogaW5jaWRlbnROb2Rlc1sxXSxcbiAgICAgICAgICBkID0gd2VpZ2h0RnVuYyhlKTtcbiAgICAgIGlmIChkIDwgcmVzdWx0c1t1XVt2XS5kaXN0YW5jZSkge1xuICAgICAgICByZXN1bHRzW3VdW3ZdID0geyBkaXN0YW5jZTogZCwgcHJlZGVjZXNzb3I6IHUgfTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgdmFyIHJvd0sgPSByZXN1bHRzW2tdO1xuICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oaSkge1xuICAgICAgdmFyIHJvd0kgPSByZXN1bHRzW2ldO1xuICAgICAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihqKSB7XG4gICAgICAgIHZhciBpayA9IHJvd0lba107XG4gICAgICAgIHZhciBraiA9IHJvd0tbal07XG4gICAgICAgIHZhciBpaiA9IHJvd0lbal07XG4gICAgICAgIHZhciBhbHREaXN0YW5jZSA9IGlrLmRpc3RhbmNlICsga2ouZGlzdGFuY2U7XG4gICAgICAgIGlmIChhbHREaXN0YW5jZSA8IGlqLmRpc3RhbmNlKSB7XG4gICAgICAgICAgaWouZGlzdGFuY2UgPSBhbHREaXN0YW5jZTtcbiAgICAgICAgICBpai5wcmVkZWNlc3NvciA9IGtqLnByZWRlY2Vzc29yO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIHJlc3VsdHM7XG59XG4iLCJ2YXIgdG9wc29ydCA9IHJlcXVpcmUoXCIuL3RvcHNvcnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gaXNBY3ljbGljO1xuXG4vKlxuICogR2l2ZW4gYSBEaWdyYXBoICoqZyoqIHRoaXMgZnVuY3Rpb24gcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGdyYXBoIGhhcyBub1xuICogY3ljbGVzIGFuZCByZXR1cm5zIGBmYWxzZWAgaWYgaXQgZG9lcy4gVGhpcyBhbGdvcml0aG0gcmV0dXJucyBhcyBzb29uIGFzIGl0XG4gKiBkZXRlY3RzIHRoZSBmaXJzdCBjeWNsZS5cbiAqXG4gKiBVc2UgW2FsZy5maW5kQ3ljbGVzXVtdIGlmIHlvdSBuZWVkIHRoZSBhY3R1YWwgbGlzdCBvZiBjeWNsZXMgaW4gYSBncmFwaC5cbiAqXG4gKiBbYWxnLmZpbmRDeWNsZXNdOiBmaW5kQ3ljbGVzLmpzLmh0bWwjZmluZEN5Y2xlc1xuICpcbiAqIEBwYXJhbSB7RGlncmFwaH0gZyB0aGUgZ3JhcGggdG8gdGVzdCBmb3IgY3ljbGVzXG4gKi9cbmZ1bmN0aW9uIGlzQWN5Y2xpYyhnKSB7XG4gIHRyeSB7XG4gICAgdG9wc29ydChnKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmIChlIGluc3RhbmNlb2YgdG9wc29ydC5DeWNsZUV4Y2VwdGlvbikgcmV0dXJuIGZhbHNlO1xuICAgIHRocm93IGU7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG4iLCIvKiBqc2hpbnQgLVcwNzkgKi9cbnZhciBTZXQgPSByZXF1aXJlKFwiY3AtZGF0YVwiKS5TZXQ7XG4vKiBqc2hpbnQgK1cwNzkgKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwb3N0b3JkZXI7XG5cbi8vIFBvc3RvcmRlciB0cmF2ZXJzYWwgb2YgZywgY2FsbGluZyBmIGZvciBlYWNoIHZpc2l0ZWQgbm9kZS4gQXNzdW1lcyB0aGUgZ3JhcGhcbi8vIGlzIGEgdHJlZS5cbmZ1bmN0aW9uIHBvc3RvcmRlcihnLCByb290LCBmKSB7XG4gIHZhciB2aXNpdGVkID0gbmV3IFNldCgpO1xuICBpZiAoZy5pc0RpcmVjdGVkKCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGZ1bmN0aW9uIG9ubHkgd29ya3MgZm9yIHVuZGlyZWN0ZWQgZ3JhcGhzXCIpO1xuICB9XG4gIGZ1bmN0aW9uIGRmcyh1LCBwcmV2KSB7XG4gICAgaWYgKHZpc2l0ZWQuaGFzKHUpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgaW5wdXQgZ3JhcGggaXMgbm90IGEgdHJlZTogXCIgKyBnKTtcbiAgICB9XG4gICAgdmlzaXRlZC5hZGQodSk7XG4gICAgZy5uZWlnaGJvcnModSkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICBpZiAodiAhPT0gcHJldikgZGZzKHYsIHUpO1xuICAgIH0pO1xuICAgIGYodSk7XG4gIH1cbiAgZGZzKHJvb3QpO1xufVxuIiwiLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbm1vZHVsZS5leHBvcnRzID0gcHJlb3JkZXI7XG5cbi8vIFByZW9yZGVyIHRyYXZlcnNhbCBvZiBnLCBjYWxsaW5nIGYgZm9yIGVhY2ggdmlzaXRlZCBub2RlLiBBc3N1bWVzIHRoZSBncmFwaFxuLy8gaXMgYSB0cmVlLlxuZnVuY3Rpb24gcHJlb3JkZXIoZywgcm9vdCwgZikge1xuICB2YXIgdmlzaXRlZCA9IG5ldyBTZXQoKTtcbiAgaWYgKGcuaXNEaXJlY3RlZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBmdW5jdGlvbiBvbmx5IHdvcmtzIGZvciB1bmRpcmVjdGVkIGdyYXBoc1wiKTtcbiAgfVxuICBmdW5jdGlvbiBkZnModSwgcHJldikge1xuICAgIGlmICh2aXNpdGVkLmhhcyh1KSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGlucHV0IGdyYXBoIGlzIG5vdCBhIHRyZWU6IFwiICsgZyk7XG4gICAgfVxuICAgIHZpc2l0ZWQuYWRkKHUpO1xuICAgIGYodSk7XG4gICAgZy5uZWlnaGJvcnModSkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICBpZiAodiAhPT0gcHJldikgZGZzKHYsIHUpO1xuICAgIH0pO1xuICB9XG4gIGRmcyhyb290KTtcbn1cbiIsInZhciBHcmFwaCA9IHJlcXVpcmUoXCIuLi9HcmFwaFwiKSxcbiAgICBQcmlvcml0eVF1ZXVlID0gcmVxdWlyZShcImNwLWRhdGFcIikuUHJpb3JpdHlRdWV1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBwcmltO1xuXG4vKipcbiAqIFtQcmltJ3MgYWxnb3JpdGhtXVtdIHRha2VzIGEgY29ubmVjdGVkIHVuZGlyZWN0ZWQgZ3JhcGggYW5kIGdlbmVyYXRlcyBhXG4gKiBbbWluaW11bSBzcGFubmluZyB0cmVlXVtdLiBUaGlzIGZ1bmN0aW9uIHJldHVybnMgdGhlIG1pbmltdW0gc3Bhbm5pbmdcbiAqIHRyZWUgYXMgYW4gdW5kaXJlY3RlZCBncmFwaC4gVGhpcyBhbGdvcml0aG0gaXMgZGVyaXZlZCBmcm9tIHRoZSBkZXNjcmlwdGlvblxuICogaW4gXCJJbnRyb2R1Y3Rpb24gdG8gQWxnb3JpdGhtc1wiLCBUaGlyZCBFZGl0aW9uLCBDb3JtZW4sIGV0IGFsLiwgUGcgNjM0LlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gdGFrZXMgYSBgd2VpZ2h0RnVuYyhlKWAgd2hpY2ggcmV0dXJucyB0aGUgd2VpZ2h0IG9mIHRoZSBlZGdlXG4gKiBgZWAuIEl0IHRocm93cyBhbiBFcnJvciBpZiB0aGUgZ3JhcGggaXMgbm90IGNvbm5lY3RlZC5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIHRha2VzIGBPKHxFfCBsb2cgfFZ8KWAgdGltZS5cbiAqXG4gKiBbUHJpbSdzIGFsZ29yaXRobV06IGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1ByaW0nc19hbGdvcml0aG1cbiAqIFttaW5pbXVtIHNwYW5uaW5nIHRyZWVdOiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9NaW5pbXVtX3NwYW5uaW5nX3RyZWVcbiAqXG4gKiBAcGFyYW0ge0dyYXBofSBnIHRoZSBncmFwaCB1c2VkIHRvIGdlbmVyYXRlIHRoZSBtaW5pbXVtIHNwYW5uaW5nIHRyZWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHdlaWdodEZ1bmMgdGhlIHdlaWdodCBmdW5jdGlvbiB0byB1c2VcbiAqL1xuZnVuY3Rpb24gcHJpbShnLCB3ZWlnaHRGdW5jKSB7XG4gIHZhciByZXN1bHQgPSBuZXcgR3JhcGgoKSxcbiAgICAgIHBhcmVudHMgPSB7fSxcbiAgICAgIHBxID0gbmV3IFByaW9yaXR5UXVldWUoKSxcbiAgICAgIHU7XG5cbiAgZnVuY3Rpb24gdXBkYXRlTmVpZ2hib3JzKGUpIHtcbiAgICB2YXIgaW5jaWRlbnROb2RlcyA9IGcuaW5jaWRlbnROb2RlcyhlKSxcbiAgICAgICAgdiA9IGluY2lkZW50Tm9kZXNbMF0gIT09IHUgPyBpbmNpZGVudE5vZGVzWzBdIDogaW5jaWRlbnROb2Rlc1sxXSxcbiAgICAgICAgcHJpID0gcHEucHJpb3JpdHkodik7XG4gICAgaWYgKHByaSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgZWRnZVdlaWdodCA9IHdlaWdodEZ1bmMoZSk7XG4gICAgICBpZiAoZWRnZVdlaWdodCA8IHByaSkge1xuICAgICAgICBwYXJlbnRzW3ZdID0gdTtcbiAgICAgICAgcHEuZGVjcmVhc2UodiwgZWRnZVdlaWdodCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGcub3JkZXIoKSA9PT0gMCkge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBnLmVhY2hOb2RlKGZ1bmN0aW9uKHUpIHtcbiAgICBwcS5hZGQodSwgTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZKTtcbiAgICByZXN1bHQuYWRkTm9kZSh1KTtcbiAgfSk7XG5cbiAgLy8gU3RhcnQgZnJvbSBhbiBhcmJpdHJhcnkgbm9kZVxuICBwcS5kZWNyZWFzZShnLm5vZGVzKClbMF0sIDApO1xuXG4gIHZhciBpbml0ID0gZmFsc2U7XG4gIHdoaWxlIChwcS5zaXplKCkgPiAwKSB7XG4gICAgdSA9IHBxLnJlbW92ZU1pbigpO1xuICAgIGlmICh1IGluIHBhcmVudHMpIHtcbiAgICAgIHJlc3VsdC5hZGRFZGdlKG51bGwsIHUsIHBhcmVudHNbdV0pO1xuICAgIH0gZWxzZSBpZiAoaW5pdCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5wdXQgZ3JhcGggaXMgbm90IGNvbm5lY3RlZDogXCIgKyBnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5pdCA9IHRydWU7XG4gICAgfVxuXG4gICAgZy5pbmNpZGVudEVkZ2VzKHUpLmZvckVhY2godXBkYXRlTmVpZ2hib3JzKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRhcmphbjtcblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIGlzIGFuIGltcGxlbWVudGF0aW9uIG9mIFtUYXJqYW4ncyBhbGdvcml0aG1dW10gd2hpY2ggZmluZHNcbiAqIGFsbCBbc3Ryb25nbHkgY29ubmVjdGVkIGNvbXBvbmVudHNdW10gaW4gdGhlIGRpcmVjdGVkIGdyYXBoICoqZyoqLiBFYWNoXG4gKiBzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50IGlzIGNvbXBvc2VkIG9mIG5vZGVzIHRoYXQgY2FuIHJlYWNoIGFsbCBvdGhlclxuICogbm9kZXMgaW4gdGhlIGNvbXBvbmVudCB2aWEgZGlyZWN0ZWQgZWRnZXMuIEEgc3Ryb25nbHkgY29ubmVjdGVkIGNvbXBvbmVudFxuICogY2FuIGNvbnNpc3Qgb2YgYSBzaW5nbGUgbm9kZSBpZiB0aGF0IG5vZGUgY2Fubm90IGJvdGggcmVhY2ggYW5kIGJlIHJlYWNoZWRcbiAqIGJ5IGFueSBvdGhlciBzcGVjaWZpYyBub2RlIGluIHRoZSBncmFwaC4gQ29tcG9uZW50cyBvZiBtb3JlIHRoYW4gb25lIG5vZGVcbiAqIGFyZSBndWFyYW50ZWVkIHRvIGhhdmUgYXQgbGVhc3Qgb25lIGN5Y2xlLlxuICpcbiAqIFRoaXMgZnVuY3Rpb24gcmV0dXJucyBhbiBhcnJheSBvZiBjb21wb25lbnRzLiBFYWNoIGNvbXBvbmVudCBpcyBpdHNlbGYgYW5cbiAqIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIGlkcyBvZiBhbGwgbm9kZXMgaW4gdGhlIGNvbXBvbmVudC5cbiAqXG4gKiBbVGFyamFuJ3MgYWxnb3JpdGhtXTogaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9UYXJqYW4nc19zdHJvbmdseV9jb25uZWN0ZWRfY29tcG9uZW50c19hbGdvcml0aG1cbiAqIFtzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50c106IGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvU3Ryb25nbHlfY29ubmVjdGVkX2NvbXBvbmVudFxuICpcbiAqIEBwYXJhbSB7RGlncmFwaH0gZyB0aGUgZ3JhcGggdG8gc2VhcmNoIGZvciBzdHJvbmdseSBjb25uZWN0ZWQgY29tcG9uZW50c1xuICovXG5mdW5jdGlvbiB0YXJqYW4oZykge1xuICBpZiAoIWcuaXNEaXJlY3RlZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwidGFyamFuIGNhbiBvbmx5IGJlIGFwcGxpZWQgdG8gYSBkaXJlY3RlZCBncmFwaC4gQmFkIGlucHV0OiBcIiArIGcpO1xuICB9XG5cbiAgdmFyIGluZGV4ID0gMCxcbiAgICAgIHN0YWNrID0gW10sXG4gICAgICB2aXNpdGVkID0ge30sIC8vIG5vZGUgaWQgLT4geyBvblN0YWNrLCBsb3dsaW5rLCBpbmRleCB9XG4gICAgICByZXN1bHRzID0gW107XG5cbiAgZnVuY3Rpb24gZGZzKHUpIHtcbiAgICB2YXIgZW50cnkgPSB2aXNpdGVkW3VdID0ge1xuICAgICAgb25TdGFjazogdHJ1ZSxcbiAgICAgIGxvd2xpbms6IGluZGV4LFxuICAgICAgaW5kZXg6IGluZGV4KytcbiAgICB9O1xuICAgIHN0YWNrLnB1c2godSk7XG5cbiAgICBnLnN1Y2Nlc3NvcnModSkuZm9yRWFjaChmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoISh2IGluIHZpc2l0ZWQpKSB7XG4gICAgICAgIGRmcyh2KTtcbiAgICAgICAgZW50cnkubG93bGluayA9IE1hdGgubWluKGVudHJ5Lmxvd2xpbmssIHZpc2l0ZWRbdl0ubG93bGluayk7XG4gICAgICB9IGVsc2UgaWYgKHZpc2l0ZWRbdl0ub25TdGFjaykge1xuICAgICAgICBlbnRyeS5sb3dsaW5rID0gTWF0aC5taW4oZW50cnkubG93bGluaywgdmlzaXRlZFt2XS5pbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoZW50cnkubG93bGluayA9PT0gZW50cnkuaW5kZXgpIHtcbiAgICAgIHZhciBjbXB0ID0gW10sXG4gICAgICAgICAgdjtcbiAgICAgIGRvIHtcbiAgICAgICAgdiA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2aXNpdGVkW3ZdLm9uU3RhY2sgPSBmYWxzZTtcbiAgICAgICAgY21wdC5wdXNoKHYpO1xuICAgICAgfSB3aGlsZSAodSAhPT0gdik7XG4gICAgICByZXN1bHRzLnB1c2goY21wdCk7XG4gICAgfVxuICB9XG5cbiAgZy5ub2RlcygpLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgIGlmICghKHUgaW4gdmlzaXRlZCkpIHtcbiAgICAgIGRmcyh1KTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRzO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB0b3Bzb3J0O1xudG9wc29ydC5DeWNsZUV4Y2VwdGlvbiA9IEN5Y2xlRXhjZXB0aW9uO1xuXG4vKlxuICogR2l2ZW4gYSBncmFwaCAqKmcqKiwgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGFuIG9yZGVyZWQgbGlzdCBvZiBub2RlcyBzdWNoXG4gKiB0aGF0IGZvciBlYWNoIGVkZ2UgYHUgLT4gdmAsIGB1YCBhcHBlYXJzIGJlZm9yZSBgdmAgaW4gdGhlIGxpc3QuIElmIHRoZVxuICogZ3JhcGggaGFzIGEgY3ljbGUgaXQgaXMgaW1wb3NzaWJsZSB0byBnZW5lcmF0ZSBzdWNoIGEgbGlzdCBhbmRcbiAqICoqQ3ljbGVFeGNlcHRpb24qKiBpcyB0aHJvd24uXG4gKlxuICogU2VlIFt0b3BvbG9naWNhbCBzb3J0aW5nXShodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9Ub3BvbG9naWNhbF9zb3J0aW5nKVxuICogZm9yIG1vcmUgZGV0YWlscyBhYm91dCBob3cgdGhpcyBhbGdvcml0aG0gd29ya3MuXG4gKlxuICogQHBhcmFtIHtEaWdyYXBofSBnIHRoZSBncmFwaCB0byBzb3J0XG4gKi9cbmZ1bmN0aW9uIHRvcHNvcnQoZykge1xuICBpZiAoIWcuaXNEaXJlY3RlZCgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwidG9wc29ydCBjYW4gb25seSBiZSBhcHBsaWVkIHRvIGEgZGlyZWN0ZWQgZ3JhcGguIEJhZCBpbnB1dDogXCIgKyBnKTtcbiAgfVxuXG4gIHZhciB2aXNpdGVkID0ge307XG4gIHZhciBzdGFjayA9IHt9O1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuXG4gIGZ1bmN0aW9uIHZpc2l0KG5vZGUpIHtcbiAgICBpZiAobm9kZSBpbiBzdGFjaykge1xuICAgICAgdGhyb3cgbmV3IEN5Y2xlRXhjZXB0aW9uKCk7XG4gICAgfVxuXG4gICAgaWYgKCEobm9kZSBpbiB2aXNpdGVkKSkge1xuICAgICAgc3RhY2tbbm9kZV0gPSB0cnVlO1xuICAgICAgdmlzaXRlZFtub2RlXSA9IHRydWU7XG4gICAgICBnLnByZWRlY2Vzc29ycyhub2RlKS5mb3JFYWNoKGZ1bmN0aW9uKHByZWQpIHtcbiAgICAgICAgdmlzaXQocHJlZCk7XG4gICAgICB9KTtcbiAgICAgIGRlbGV0ZSBzdGFja1tub2RlXTtcbiAgICAgIHJlc3VsdHMucHVzaChub2RlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgc2lua3MgPSBnLnNpbmtzKCk7XG4gIGlmIChnLm9yZGVyKCkgIT09IDAgJiYgc2lua3MubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEN5Y2xlRXhjZXB0aW9uKCk7XG4gIH1cblxuICBnLnNpbmtzKCkuZm9yRWFjaChmdW5jdGlvbihzaW5rKSB7XG4gICAgdmlzaXQoc2luayk7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBDeWNsZUV4Y2VwdGlvbigpIHt9XG5cbkN5Y2xlRXhjZXB0aW9uLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gXCJHcmFwaCBoYXMgYXQgbGVhc3Qgb25lIGN5Y2xlXCI7XG59O1xuIiwiLy8gVGhpcyBmaWxlIHByb3ZpZGVzIGEgaGVscGVyIGZ1bmN0aW9uIHRoYXQgbWl4ZXMtaW4gRG90IGJlaGF2aW9yIHRvIGFuXG4vLyBleGlzdGluZyBncmFwaCBwcm90b3R5cGUuXG5cbi8qIGpzaGludCAtVzA3OSAqL1xudmFyIFNldCA9IHJlcXVpcmUoXCJjcC1kYXRhXCIpLlNldDtcbi8qIGpzaGludCArVzA3OSAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBvdW5kaWZ5O1xuXG4vLyBFeHRlbmRzIHRoZSBnaXZlbiBTdXBlckNvbnN0cnVjdG9yIHdpdGggdGhlIGFiaWxpdHkgZm9yIG5vZGVzIHRvIGNvbnRhaW5cbi8vIG90aGVyIG5vZGVzLiBBIHNwZWNpYWwgbm9kZSBpZCBgbnVsbGAgaXMgdXNlZCB0byBpbmRpY2F0ZSB0aGUgcm9vdCBncmFwaC5cbmZ1bmN0aW9uIGNvbXBvdW5kaWZ5KFN1cGVyQ29uc3RydWN0b3IpIHtcbiAgZnVuY3Rpb24gQ29uc3RydWN0b3IoKSB7XG4gICAgU3VwZXJDb25zdHJ1Y3Rvci5jYWxsKHRoaXMpO1xuXG4gICAgLy8gTWFwIG9mIG9iamVjdCBpZCAtPiBwYXJlbnQgaWQgKG9yIG51bGwgZm9yIHJvb3QgZ3JhcGgpXG4gICAgdGhpcy5fcGFyZW50cyA9IHt9O1xuXG4gICAgLy8gTWFwIG9mIGlkIChvciBudWxsKSAtPiBjaGlsZHJlbiBzZXRcbiAgICB0aGlzLl9jaGlsZHJlbiA9IHt9O1xuICAgIHRoaXMuX2NoaWxkcmVuW251bGxdID0gbmV3IFNldCgpO1xuICB9XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlID0gbmV3IFN1cGVyQ29uc3RydWN0b3IoKTtcbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29uc3RydWN0b3I7XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLnBhcmVudCA9IGZ1bmN0aW9uKHUsIHBhcmVudCkge1xuICAgIHRoaXMuX3N0cmljdEdldE5vZGUodSk7XG5cbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiB0aGlzLl9wYXJlbnRzW3VdO1xuICAgIH1cblxuICAgIGlmICh1ID09PSBwYXJlbnQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtYWtlIFwiICsgdSArIFwiIGEgcGFyZW50IG9mIGl0c2VsZlwiKTtcbiAgICB9XG4gICAgaWYgKHBhcmVudCAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5fc3RyaWN0R2V0Tm9kZShwYXJlbnQpO1xuICAgIH1cblxuICAgIHRoaXMuX2NoaWxkcmVuW3RoaXMuX3BhcmVudHNbdV1dLnJlbW92ZSh1KTtcbiAgICB0aGlzLl9wYXJlbnRzW3VdID0gcGFyZW50O1xuICAgIHRoaXMuX2NoaWxkcmVuW3BhcmVudF0uYWRkKHUpO1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5jaGlsZHJlbiA9IGZ1bmN0aW9uKHUpIHtcbiAgICBpZiAodSAhPT0gbnVsbCkge1xuICAgICAgdGhpcy5fc3RyaWN0R2V0Tm9kZSh1KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2NoaWxkcmVuW3VdLmtleXMoKTtcbiAgfTtcblxuICBDb25zdHJ1Y3Rvci5wcm90b3R5cGUuYWRkTm9kZSA9IGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgdSA9IFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmFkZE5vZGUuY2FsbCh0aGlzLCB1LCB2YWx1ZSk7XG4gICAgdGhpcy5fcGFyZW50c1t1XSA9IG51bGw7XG4gICAgdGhpcy5fY2hpbGRyZW5bdV0gPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5fY2hpbGRyZW5bbnVsbF0uYWRkKHUpO1xuICAgIHJldHVybiB1O1xuICB9O1xuXG4gIENvbnN0cnVjdG9yLnByb3RvdHlwZS5kZWxOb2RlID0gZnVuY3Rpb24odSkge1xuICAgIC8vIFByb21vdGUgYWxsIGNoaWxkcmVuIHRvIHRoZSBwYXJlbnQgb2YgdGhlIHN1YmdyYXBoXG4gICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50KHUpO1xuICAgIHRoaXMuX2NoaWxkcmVuW3VdLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICB0aGlzLnBhcmVudChjaGlsZCwgcGFyZW50KTtcbiAgICB9LCB0aGlzKTtcblxuICAgIHRoaXMuX2NoaWxkcmVuW3BhcmVudF0ucmVtb3ZlKHUpO1xuICAgIGRlbGV0ZSB0aGlzLl9wYXJlbnRzW3VdO1xuICAgIGRlbGV0ZSB0aGlzLl9jaGlsZHJlblt1XTtcblxuICAgIHJldHVybiBTdXBlckNvbnN0cnVjdG9yLnByb3RvdHlwZS5kZWxOb2RlLmNhbGwodGhpcywgdSk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY29weSA9IFN1cGVyQ29uc3RydWN0b3IucHJvdG90eXBlLmNvcHkuY2FsbCh0aGlzKTtcbiAgICB0aGlzLm5vZGVzKCkuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgICBjb3B5LnBhcmVudCh1LCB0aGlzLnBhcmVudCh1KSk7XG4gICAgfSwgdGhpcyk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgQ29uc3RydWN0b3IucHJvdG90eXBlLmZpbHRlck5vZGVzID0gZnVuY3Rpb24oZmlsdGVyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBjb3B5ID0gU3VwZXJDb25zdHJ1Y3Rvci5wcm90b3R5cGUuZmlsdGVyTm9kZXMuY2FsbCh0aGlzLCBmaWx0ZXIpO1xuXG4gICAgdmFyIHBhcmVudHMgPSB7fTtcbiAgICBmdW5jdGlvbiBmaW5kUGFyZW50KHUpIHtcbiAgICAgIHZhciBwYXJlbnQgPSBzZWxmLnBhcmVudCh1KTtcbiAgICAgIGlmIChwYXJlbnQgPT09IG51bGwgfHwgY29weS5oYXNOb2RlKHBhcmVudCkpIHtcbiAgICAgICAgcGFyZW50c1t1XSA9IHBhcmVudDtcbiAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgIH0gZWxzZSBpZiAocGFyZW50IGluIHBhcmVudHMpIHtcbiAgICAgICAgcmV0dXJuIHBhcmVudHNbcGFyZW50XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmaW5kUGFyZW50KHBhcmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29weS5lYWNoTm9kZShmdW5jdGlvbih1KSB7IGNvcHkucGFyZW50KHUsIGZpbmRQYXJlbnQodSkpOyB9KTtcblxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIHJldHVybiBDb25zdHJ1Y3Rvcjtcbn1cbiIsInZhciBHcmFwaCA9IHJlcXVpcmUoXCIuLi9HcmFwaFwiKSxcbiAgICBEaWdyYXBoID0gcmVxdWlyZShcIi4uL0RpZ3JhcGhcIiksXG4gICAgQ0dyYXBoID0gcmVxdWlyZShcIi4uL0NHcmFwaFwiKSxcbiAgICBDRGlncmFwaCA9IHJlcXVpcmUoXCIuLi9DRGlncmFwaFwiKTtcblxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbihub2RlcywgZWRnZXMsIEN0b3IpIHtcbiAgQ3RvciA9IEN0b3IgfHwgRGlncmFwaDtcblxuICBpZiAodHlwZU9mKG5vZGVzKSAhPT0gXCJBcnJheVwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibm9kZXMgaXMgbm90IGFuIEFycmF5XCIpO1xuICB9XG5cbiAgaWYgKHR5cGVPZihlZGdlcykgIT09IFwiQXJyYXlcIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImVkZ2VzIGlzIG5vdCBhbiBBcnJheVwiKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgQ3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgIHN3aXRjaChDdG9yKSB7XG4gICAgICBjYXNlIFwiZ3JhcGhcIjogQ3RvciA9IEdyYXBoOyBicmVhaztcbiAgICAgIGNhc2UgXCJkaWdyYXBoXCI6IEN0b3IgPSBEaWdyYXBoOyBicmVhaztcbiAgICAgIGNhc2UgXCJjZ3JhcGhcIjogQ3RvciA9IENHcmFwaDsgYnJlYWs7XG4gICAgICBjYXNlIFwiY2RpZ3JhcGhcIjogQ3RvciA9IENEaWdyYXBoOyBicmVhaztcbiAgICAgIGRlZmF1bHQ6IHRocm93IG5ldyBFcnJvcihcIlVucmVjb2duaXplZCBncmFwaCB0eXBlOiBcIiArIEN0b3IpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBncmFwaCA9IG5ldyBDdG9yKCk7XG5cbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbih1KSB7XG4gICAgZ3JhcGguYWRkTm9kZSh1LmlkLCB1LnZhbHVlKTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIGdyYXBoIGlzIGNvbXBvdW5kLCBzZXQgdXAgY2hpbGRyZW4uLi5cbiAgaWYgKGdyYXBoLnBhcmVudCkge1xuICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24odSkge1xuICAgICAgaWYgKHUuY2hpbGRyZW4pIHtcbiAgICAgICAgdS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICBncmFwaC5wYXJlbnQodiwgdS5pZCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlKSB7XG4gICAgZ3JhcGguYWRkRWRnZShlLmlkLCBlLnUsIGUudiwgZS52YWx1ZSk7XG4gIH0pO1xuXG4gIHJldHVybiBncmFwaDtcbn07XG5cbmV4cG9ydHMuZW5jb2RlID0gZnVuY3Rpb24oZ3JhcGgpIHtcbiAgdmFyIG5vZGVzID0gW107XG4gIHZhciBlZGdlcyA9IFtdO1xuXG4gIGdyYXBoLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG4gICAgdmFyIG5vZGUgPSB7aWQ6IHUsIHZhbHVlOiB2YWx1ZX07XG4gICAgaWYgKGdyYXBoLmNoaWxkcmVuKSB7XG4gICAgICB2YXIgY2hpbGRyZW4gPSBncmFwaC5jaGlsZHJlbih1KTtcbiAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgbm9kZS5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgfVxuICAgIH1cbiAgICBub2Rlcy5wdXNoKG5vZGUpO1xuICB9KTtcblxuICBncmFwaC5lYWNoRWRnZShmdW5jdGlvbihlLCB1LCB2LCB2YWx1ZSkge1xuICAgIGVkZ2VzLnB1c2goe2lkOiBlLCB1OiB1LCB2OiB2LCB2YWx1ZTogdmFsdWV9KTtcbiAgfSk7XG5cbiAgdmFyIHR5cGU7XG4gIGlmIChncmFwaCBpbnN0YW5jZW9mIENEaWdyYXBoKSB7XG4gICAgdHlwZSA9IFwiY2RpZ3JhcGhcIjtcbiAgfSBlbHNlIGlmIChncmFwaCBpbnN0YW5jZW9mIENHcmFwaCkge1xuICAgIHR5cGUgPSBcImNncmFwaFwiO1xuICB9IGVsc2UgaWYgKGdyYXBoIGluc3RhbmNlb2YgRGlncmFwaCkge1xuICAgIHR5cGUgPSBcImRpZ3JhcGhcIjtcbiAgfSBlbHNlIGlmIChncmFwaCBpbnN0YW5jZW9mIEdyYXBoKSB7XG4gICAgdHlwZSA9IFwiZ3JhcGhcIjtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZG4ndCBkZXRlcm1pbmUgdHlwZSBvZiBncmFwaDogXCIgKyBncmFwaCk7XG4gIH1cblxuICByZXR1cm4geyBub2Rlczogbm9kZXMsIGVkZ2VzOiBlZGdlcywgdHlwZTogdHlwZSB9O1xufTtcblxuZnVuY3Rpb24gdHlwZU9mKG9iaikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikuc2xpY2UoOCwgLTEpO1xufVxuIiwiLyoganNoaW50IC1XMDc5ICovXG52YXIgU2V0ID0gcmVxdWlyZShcImNwLWRhdGFcIikuU2V0O1xuLyoganNoaW50ICtXMDc5ICovXG5cbmV4cG9ydHMuYWxsID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH07XG59O1xuXG5leHBvcnRzLm5vZGVzRnJvbUxpc3QgPSBmdW5jdGlvbihub2Rlcykge1xuICB2YXIgc2V0ID0gbmV3IFNldChub2Rlcyk7XG4gIHJldHVybiBmdW5jdGlvbih1KSB7XG4gICAgcmV0dXJuIHNldC5oYXModSk7XG4gIH07XG59O1xuIiwidmFyIEdyYXBoID0gcmVxdWlyZShcIi4vR3JhcGhcIiksXG4gICAgRGlncmFwaCA9IHJlcXVpcmUoXCIuL0RpZ3JhcGhcIik7XG5cbi8vIFNpZGUtZWZmZWN0IGJhc2VkIGNoYW5nZXMgYXJlIGxvdXN5LCBidXQgbm9kZSBkb2Vzbid0IHNlZW0gdG8gcmVzb2x2ZSB0aGVcbi8vIHJlcXVpcmVzIGN5Y2xlLlxuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgZGlyZWN0ZWQgZ3JhcGggdXNpbmcgdGhlIG5vZGVzIGFuZCBlZGdlcyBmcm9tIHRoaXMgZ3JhcGguIFRoZVxuICogbmV3IGdyYXBoIHdpbGwgaGF2ZSB0aGUgc2FtZSBub2RlcywgYnV0IHdpbGwgaGF2ZSB0d2ljZSB0aGUgbnVtYmVyIG9mIGVkZ2VzOlxuICogZWFjaCBlZGdlIGlzIHNwbGl0IGludG8gdHdvIGVkZ2VzIHdpdGggb3Bwb3NpdGUgZGlyZWN0aW9ucy4gRWRnZSBpZHMsXG4gKiBjb25zZXF1ZW50bHksIGFyZSBub3QgcHJlc2VydmVkIGJ5IHRoaXMgdHJhbnNmb3JtYXRpb24uXG4gKi9cbkdyYXBoLnByb3RvdHlwZS50b0RpZ3JhcGggPVxuR3JhcGgucHJvdG90eXBlLmFzRGlyZWN0ZWQgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGcgPSBuZXcgRGlncmFwaCgpO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IGcuYWRkTm9kZSh1LCB2YWx1ZSk7IH0pO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgZy5hZGRFZGdlKG51bGwsIHUsIHYsIHZhbHVlKTtcbiAgICBnLmFkZEVkZ2UobnVsbCwgdiwgdSwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGc7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBuZXcgdW5kaXJlY3RlZCBncmFwaCB1c2luZyB0aGUgbm9kZXMgYW5kIGVkZ2VzIGZyb20gdGhpcyBncmFwaC5cbiAqIFRoZSBuZXcgZ3JhcGggd2lsbCBoYXZlIHRoZSBzYW1lIG5vZGVzLCBidXQgdGhlIGVkZ2VzIHdpbGwgYmUgbWFkZVxuICogdW5kaXJlY3RlZC4gRWRnZSBpZHMgYXJlIHByZXNlcnZlZCBpbiB0aGlzIHRyYW5zZm9ybWF0aW9uLlxuICovXG5EaWdyYXBoLnByb3RvdHlwZS50b0dyYXBoID1cbkRpZ3JhcGgucHJvdG90eXBlLmFzVW5kaXJlY3RlZCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZyA9IG5ldyBHcmFwaCgpO1xuICB0aGlzLmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7IGcuYWRkTm9kZSh1LCB2YWx1ZSk7IH0pO1xuICB0aGlzLmVhY2hFZGdlKGZ1bmN0aW9uKGUsIHUsIHYsIHZhbHVlKSB7XG4gICAgZy5hZGRFZGdlKGUsIHUsIHYsIHZhbHVlKTtcbiAgfSk7XG4gIHJldHVybiBnO1xufTtcbiIsIi8vIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIHZhbHVlcyBmb3IgcHJvcGVydGllcyBvZiAqKm8qKi5cbmV4cG9ydHMudmFsdWVzID0gZnVuY3Rpb24obykge1xuICB2YXIga3MgPSBPYmplY3Qua2V5cyhvKSxcbiAgICAgIGxlbiA9IGtzLmxlbmd0aCxcbiAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShsZW4pLFxuICAgICAgaTtcbiAgZm9yIChpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgcmVzdWx0W2ldID0gb1trc1tpXV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9ICcwLjcuNCc7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG5hcHAuY29udHJvbGxlcignQXBpQ3RybCcsIFsnJHNjb3BlJywgJyRzdGF0ZScsICdkaWFsb2cnLCAnYXBpUHJvbWlzZScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkZGlhbG9nLCBhcGlQcm9taXNlKSB7XG5cbiAgICAkc2NvcGUuYXBpID0gYXBpOyAvL1Byb21pc2U7XG5cbiAgICAkc2NvcGUuY29udHJvbGxlclRhYkluZGV4ID0gMDtcblxuICAgICRzY29wZS5kZWxldGVDb250cm9sbGVyID0gZnVuY3Rpb24oY29udHJvbGxlcikge1xuXG4gICAgICAkZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgICB0aXRsZTogJ0RlbGV0ZSBDb250cm9sbGVyJyxcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgY29udHJvbGxlciBbJyArIGNvbnRyb2xsZXIubmFtZSArICddPydcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSBjb250cm9sbGVyLmNvbnRyb2xsZXI7XG4gICAgICAgIHBhcmVudC5yZW1vdmVDb250cm9sbGVyKGNvbnRyb2xsZXIpO1xuICAgICAgICAvLyBnbyB0byBwYXJlbnQgY29udHJvbGxlclxuICAgICAgICAkc3RhdGUuZ28oJ2FwaS5jb250cm9sbGVyJywge1xuICAgICAgICAgIGNvbnRyb2xsZXJJZDogcGFyZW50LmlkXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgICRzY29wZS5kZWxldGVSb3V0ZSA9IGZ1bmN0aW9uKHJvdXRlKSB7XG5cbiAgICAgICRkaWFsb2cuY29uZmlybSh7XG4gICAgICAgIHRpdGxlOiAnRGVsZXRlIFJvdXRlJyxcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUgcm91dGUgWycgKyByb3V0ZS5kZXNjcmlwdGlvbiArICddPydcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJvdXRlLmNvbnRyb2xsZXIucmVtb3ZlUm91dGUocm91dGUpO1xuICAgICAgICAvLyBnbyB0byBwYXJlbnQgY29udHJvbGxlclxuICAgICAgICAkc3RhdGUuZ28oJ2FwaS5jb250cm9sbGVyJywge1xuICAgICAgICAgIGNvbnRyb2xsZXJJZDogcm91dGUuY29udHJvbGxlci5pZFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc3RhdGUuZ28oJ2FwaS5jb250cm9sbGVyJywge1xuICAgICAgY29udHJvbGxlcklkOiBhcGkuY29udHJvbGxlci5pZFxuICAgIH0pO1xuXG4gIH1cbl0pO1xuXG5mdW5jdGlvbiBSb3V0ZShjb250cm9sbGVyLCBpZCwgdmVyYiwgdXJsKSB7XG4gIHRoaXMuY29udHJvbGxlciA9IGNvbnRyb2xsZXI7XG4gIHRoaXMuaWQgPSBpZDtcbiAgdGhpcy52ZXJiID0gdmVyYjtcbiAgdGhpcy51cmwgPSB1cmw7XG59XG5Sb3V0ZS5wcm90b3R5cGUudmVyYnMgPSBbJ0FMTCcsICdHRVQnLCAnUE9TVCcsICdQVVQnLCAnREVMRVRFJ107XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhSb3V0ZS5wcm90b3R5cGUsIHtcbiAgZGVzY3JpcHRpb246IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudmVyYi50b1VwcGVyQ2FzZSgpICsgJyAnICsgdGhpcy51cmw7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ29udHJvbGxlcihjb250cm9sbGVyLCBpZCwgbmFtZSwgYmFzZVVybCwgY29kZSkge1xuICB0aGlzLmNvbnRyb2xsZXIgPSBjb250cm9sbGVyO1xuICB0aGlzLmlkID0gaWQ7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMuYmFzZVVybCA9IGJhc2VVcmw7XG4gIHRoaXMuY29kZSA9IGNvZGU7XG4gIHRoaXMucm91dGVzID0gW107XG4gIHRoaXMuY29udHJvbGxlcnMgPSBbXTtcbiAgdGhpcy5taWRkbGV3YXJlID0gW107XG59XG5Db250cm9sbGVyLnByb3RvdHlwZS5hZGRSb3V0ZSA9IGZ1bmN0aW9uKHZlcmIsIHVybCkge1xuICAvLyB2YXIgaGFuZGxlcnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLnNwbGljZSgyKTtcbiAgLy8gdmFyIHJvdXRlUGlwZWxpbmUgPSBuZXcgUm91dGVQaXBlbGluZShoYW5kbGVycyk7XG4gIHZhciByb3V0ZSA9IG5ldyBSb3V0ZSh0aGlzLCB1dGlscy5nZXR1aWQoKSwgdmVyYiB8fCAnR0VUJywgdXJsIHx8IHRoaXMuYmFzZVBhdGgpO1xuICB0aGlzLnJvdXRlcy5wdXNoKHJvdXRlKTtcbiAgcmV0dXJuIHJvdXRlO1xufTtcbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlbW92ZVJvdXRlID0gZnVuY3Rpb24ocm91dGUpIHtcbiAgdmFyIGluZGV4ID0gdGhpcy5yb3V0ZXMuaW5kZXhPZihyb3V0ZSk7XG4gIGlmICh+aW5kZXgpIHtcbiAgICB0aGlzLnJvdXRlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICB9XG59O1xuQ29udHJvbGxlci5wcm90b3R5cGUuYWRkQ29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUsIGJhc2VVcmwsIGNvZGUpIHtcbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgQ29udHJvbGxlcih0aGlzLCB1dGlscy5nZXR1aWQoKSwgbmFtZSwgYmFzZVVybCwgY29kZSA/IGNvZGUudG9TdHJpbmcoKSA6ICcnKTtcbiAgdGhpcy5jb250cm9sbGVycy5wdXNoKGNvbnRyb2xsZXIpO1xuICByZXR1cm4gY29udHJvbGxlcjtcbn07XG5Db250cm9sbGVyLnByb3RvdHlwZS5yZW1vdmVDb250cm9sbGVyID0gZnVuY3Rpb24oY29udHJvbGxlcikge1xuICB2YXIgaW5kZXggPSB0aGlzLmNvbnRyb2xsZXJzLmluZGV4T2YoY29udHJvbGxlcik7XG4gIGlmICh+aW5kZXgpIHtcbiAgICB0aGlzLmNvbnRyb2xsZXJzLnNwbGljZShpbmRleCwgMSk7XG4gIH1cbn07XG5Db250cm9sbGVyLnByb3RvdHlwZS5hZGRNaWRkbGV3YXJlID0gZnVuY3Rpb24oaWQsIG5hbWUsIGJhc2VVcmwsIGNvZGUpIHtcbiAgLy8gdmFyIG1pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZShuYW1lLCBoYW5kbGVyKTtcbiAgLy8gdGhpcy5fbWlkZGxld2FyZS5wdXNoKG1pZGRsZXdhcmUpO1xuICAvLyByZXR1cm4gbWlkZGxld2FyZTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhDb250cm9sbGVyLnByb3RvdHlwZSwge1xuICBhbGxDb250cm9sbGVyczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgY29udHJvbGxlcnMgPSBbXS5jb25jYXQodGhpcyk7XG4gICAgICB0aGlzLmNvbnRyb2xsZXJzLmZvckVhY2goZnVuY3Rpb24oY29udHJvbGxlcikge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShjb250cm9sbGVycywgY29udHJvbGxlci5hbGxDb250cm9sbGVycyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBjb250cm9sbGVycztcbiAgICB9XG4gIH0sXG4gIGFzY2VuZGVudHM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFzY2VuZGVudHMgPSBbXSwgYyA9IHRoaXM7XG5cbiAgICAgIHdoaWxlIChjLmNvbnRyb2xsZXIpIHtcbiAgICAgICAgYXNjZW5kZW50cy51bnNoaWZ0KGMuY29udHJvbGxlcik7XG4gICAgICAgIGMgPSBjLmNvbnRyb2xsZXI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhc2NlbmRlbnRzO1xuICAgIH1cbiAgfSxcbiAgYmFzZVBhdGg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBhdGhzID0gW107XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrKGMpIHtcbiAgICAgICAgaWYgKGMpIHtcbiAgICAgICAgICBwYXRocy5wdXNoKGMuYmFzZVVybCB8fCAnJyk7XG4gICAgICAgICAgY2hlY2soYy5jb250cm9sbGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYyA/IGMuYmFzZVVybCA6IG51bGw7XG4gICAgICB9XG4gICAgICBjaGVjayh0aGlzKTtcblxuICAgICAgcGF0aHMucmV2ZXJzZSgpO1xuXG4gICAgICByZXR1cm4gcGF0aC5qb2luLmFwcGx5KHBhdGgsIHBhdGhzKTtcbiAgICB9XG4gIH1cbn0pO1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ29udHJvbGxlci5wcm90b3R5cGUsIHtcbiAgYWxsUm91dGVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByb3V0ZXMgPSBbXS5jb25jYXQodGhpcy5yb3V0ZXMpO1xuICAgICAgdGhpcy5jb250cm9sbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNvbnRyb2xsZXIpIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkocm91dGVzLCBjb250cm9sbGVyLmFsbFJvdXRlcyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gQXBpKGlkLCBuYW1lLCBjb250cm9sbGVyKSB7XG4gIHRoaXMuaWQgPSBpZDtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgdGhpcy5taWRkbGV3YXJlID0gW107XG59XG5BcGkucHJvdG90eXBlLmZpbmRDb250cm9sbGVyID0gZnVuY3Rpb24oaWQpIHtcbiAgcmV0dXJuIHRoaXMuY29udHJvbGxlcnMuZmluZChmdW5jdGlvbihjb250cm9sbGVyKSB7XG4gICAgcmV0dXJuIGNvbnRyb2xsZXIuaWQgPT09IGlkO1xuICB9KTtcbn07XG5BcGkucHJvdG90eXBlLmZpbmRSb3V0ZSA9IGZ1bmN0aW9uKGlkKSB7XG4gIHJldHVybiB0aGlzLnJvdXRlcy5maW5kKGZ1bmN0aW9uKHJvdXRlKSB7XG4gICAgcmV0dXJuIHJvdXRlLmlkID09PSBpZDtcbiAgfSk7XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQXBpLnByb3RvdHlwZSwge1xuICBjb250cm9sbGVyczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb250cm9sbGVyLmFsbENvbnRyb2xsZXJzO1xuICAgIH1cbiAgfVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhBcGkucHJvdG90eXBlLCB7XG4gIHJvdXRlczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb250cm9sbGVyLmFsbFJvdXRlcztcbiAgICB9XG4gIH1cbn0pO1xuXG52YXIgaG9tZUN0cmwgPSBuZXcgQ29udHJvbGxlcihudWxsLCB1dGlscy5nZXR1aWQoKSwgJ0hvbWUnKTtcbnZhciBhcGkgPSBuZXcgQXBpKHV0aWxzLmdldHVpZCgpLCAndGVzdCcsIGhvbWVDdHJsKTtcblxuaG9tZUN0cmwuYWRkUm91dGUoJ0dFVCcsICcvJyk7XG5ob21lQ3RybC5hZGRSb3V0ZSgnR0VUJywgJy9hYm91dC11cycpO1xuaG9tZUN0cmwuYWRkUm91dGUoJ0dFVCcsICcvY29udGFjdC11cycpO1xuaG9tZUN0cmwuYWRkUm91dGUoJ1BPU1QnLCAnL2NvbnRhY3QtdXMnKTtcblxudmFyIHVzZXJDb250cm9sbGVyID0gaG9tZUN0cmwuYWRkQ29udHJvbGxlcignVXNlcicsICcvdXNlcicsIFwiIFxcXG52YXIgZXhwcmVzcyA9IHJlcXVpcmUoJ2V4cHJlc3MnKTtcXG4gXFxcbnZhciBodHRwID0gcmVxdWlyZSgnaHR0cCcpO1xcbiBcXFxudmFyIHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XFxuIFxcXG52YXIgZmF2aWNvbiA9IHJlcXVpcmUoJ3N0YXRpYy1mYXZpY29uJyk7XFxuIFxcXG52YXIgaHR0cExvZ2dlciA9IHJlcXVpcmUoJ21vcmdhbicpO1xcbiBcXFxuXFxuIFxcXG5mdW5jdGlvbiBoZWxsbygpIHt9XCIpO1xuXG51c2VyQ29udHJvbGxlci5hZGRSb3V0ZSgnR0VUJywgJy91c2VyLzppZCcpO1xudXNlckNvbnRyb2xsZXIuYWRkUm91dGUoJ0FMTCcsICcvdXNlci86aWQvKicpO1xudXNlckNvbnRyb2xsZXIuYWRkUm91dGUoJ1BPU1QnLCAnL3VzZXInKTtcbnVzZXJDb250cm9sbGVyLmFkZFJvdXRlKCdQVVQnLCAnL3VzZXIvOmlkJyk7XG5cblxudmFyIHVzZXJQaG90b3NDdHJsID0gdXNlckNvbnRyb2xsZXIuYWRkQ29udHJvbGxlcignVXNlciBQaG90b3MnLCAnLzppZC9waG90b3MnKTtcbnVzZXJQaG90b3NDdHJsLmFkZFJvdXRlKCdHRVQnLCAnL3VzZXIvOmlkL3Bob3RvcycpO1xudXNlclBob3Rvc0N0cmwuYWRkUm91dGUoJ1BPU1QnLCAnL3VzZXIvOmlkL3Bob3RvcycpO1xudXNlclBob3Rvc0N0cmwuYWRkUm91dGUoJ1BVVCcsICcvdXNlci86aWQvcGhvdG9zLzppZCcpO1xuXG5cbnZhciBvcmRlckNvbnRyb2xsZXIgPSBob21lQ3RybC5hZGRDb250cm9sbGVyKCdPcmRlcicsICcvb3JkZXInKTtcbm9yZGVyQ29udHJvbGxlci5hZGRSb3V0ZSgnR0VUJywgJy9vcmRlci86aWQnKTtcbm9yZGVyQ29udHJvbGxlci5hZGRSb3V0ZSgnQUxMJywgJy9vcmRlci86aWQvKicpO1xub3JkZXJDb250cm9sbGVyLmFkZFJvdXRlKCdQT1NUJywgJy9vcmRlcicpO1xub3JkZXJDb250cm9sbGVyLmFkZFJvdXRlKCdQVVQnLCAnL29yZGVyLzppZCcpO1xuXG53aW5kb3cuYXBpID0gYXBpO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0FwaUNvbnRyb2xsZXJDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlJywgJyRzdGF0ZVBhcmFtcycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlLCAkc3RhdGVQYXJhbXMpIHtcblxuICAgIHZhciBjb250cm9sbGVyID0gJHNjb3BlLmFwaS5maW5kQ29udHJvbGxlcigkc3RhdGVQYXJhbXMuY29udHJvbGxlcklkKTtcblxuICAgICRzY29wZS5jb250cm9sbGVyID0gY29udHJvbGxlcjtcblxuICAgICRzY29wZS5hZGRDb250cm9sbGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbmV3Q29udHJvbGxlciA9IGNvbnRyb2xsZXIuYWRkQ29udHJvbGxlcihjb250cm9sbGVyLm5hbWUgKyAnIENoaWxkIENvbnRyb2xsZXInKTtcblxuICAgICAgJHN0YXRlLmdvKCdhcGkuY29udHJvbGxlcicsIHtcbiAgICAgICAgY29udHJvbGxlcklkOiBuZXdDb250cm9sbGVyLmlkXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZFJvdXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbmV3Um91dGUgPSBjb250cm9sbGVyLmFkZFJvdXRlKCk7XG5cbiAgICAgICRzdGF0ZS5nbygnYXBpLmNvbnRyb2xsZXIucm91dGUnLCB7XG4gICAgICAgIHJvdXRlSWQ6IG5ld1JvdXRlLmlkXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnRhYnMgPSBbe1xuICAgICAgYWN0aXZlOiAkc2NvcGUuY29udHJvbGxlclRhYkluZGV4ID09PSAwXG4gICAgfSwge1xuICAgICAgYWN0aXZlOiAkc2NvcGUuY29udHJvbGxlclRhYkluZGV4ID09PSAxXG4gICAgfSwge1xuICAgICAgYWN0aXZlOiAkc2NvcGUuY29udHJvbGxlclRhYkluZGV4ID09PSAyXG4gICAgfSwge1xuICAgICAgYWN0aXZlOiAkc2NvcGUuY29udHJvbGxlclRhYkluZGV4ID09PSAzXG4gICAgfV07XG5cbiAgICAkc2NvcGUuc2VsZWN0VGFiID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgICRzY29wZS4kcGFyZW50LmNvbnRyb2xsZXJUYWJJbmRleCA9IGluZGV4O1xuICAgIH07XG5cbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignQXBpRGlhZ3JhbUN0cmwnLCBbJyRzY29wZScsICckc3RhdGUnLCAnJHN0YXRlUGFyYW1zJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsICRzdGF0ZVBhcmFtcykge1xuXG4gICAgdmFyIG0gPSBbMjAsIDEyMCwgMjAsIDEyMF0sXG4gICAgICB3ID0gMTI4MCAtIG1bMV0gLSBtWzNdLFxuICAgICAgaCA9IDgwMCAtIG1bMF0gLSBtWzJdLFxuICAgICAgaSA9IDAsXG4gICAgICBqID0gMCxcbiAgICAgIHJvb3QsIGpzb247XG5cbiAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgIC5zaXplKFtoLCB3XSk7XG5cbiAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkge1xuICAgICAgICByZXR1cm4gW2QueSwgZC54XTtcbiAgICAgIH0pO1xuXG4gICAgdmFyIHZpcyA9IGQzLnNlbGVjdChcIiNhcGktZGlhZ3JhbVwiKS5hcHBlbmQoXCJzdmc6c3ZnXCIpXG4gICAgICAuYXR0cihcIndpZHRoXCIsIHcgKyBtWzFdICsgbVszXSlcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGggKyBtWzBdICsgbVsyXSlcbiAgICAgIC5hcHBlbmQoXCJzdmc6Z1wiKVxuICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtWzNdICsgXCIsXCIgKyBtWzBdICsgXCIpXCIpO1xuXG5cbiAgICBmdW5jdGlvbiBidWlsZChjb250cm9sbGVyKSB7XG5cbiAgICAgIHZhciBvID0ge1xuICAgICAgICBuYW1lOiBjb250cm9sbGVyLm5hbWVcbiAgICAgIH07XG5cbiAgICAgIGlmIChjb250cm9sbGVyLmNvbnRyb2xsZXJzLmxlbmd0aCkge1xuICAgICAgICBvLmNoaWxkcmVuID0gW107XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBjb250cm9sbGVyLmNvbnRyb2xsZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgby5jaGlsZHJlbi5wdXNoKGJ1aWxkKGNvbnRyb2xsZXIuY29udHJvbGxlcnNbal0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoY29udHJvbGxlci5yb3V0ZXMubGVuZ3RoKSB7XG4gICAgICAgIGlmICghby5jaGlsZHJlbikge1xuICAgICAgICAgIG8uY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGogPSAwOyBqIDwgY29udHJvbGxlci5yb3V0ZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBvLmNoaWxkcmVuLnB1c2goe1xuICAgICAgICAgICAgbmFtZTogY29udHJvbGxlci5yb3V0ZXNbal0uZGVzY3JpcHRpb25cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gbztcblxuICAgICAgLy9cbiAgICAgIC8vXG4gICAgICAvLyBjaGlsZHJlbi5jb25jYXQoY29udHJvbGxlci5yb3V0ZXMubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIC8vICAgcmV0dXJuIHsgbmFtZTogaXRlbS5uYW1lIH07XG4gICAgICAvLyB9KSk7XG4gICAgICAvL1xuXG5cbiAgICB9XG4gICAgLy9cbiAgICAvLyBqc29uID0ge1xuICAgIC8vICAgbmFtZTogJHNjb3BlLmFwaS5jb250cm9sbGVyLm5hbWUsXG4gICAgLy8gICBjaGlsZHJlbjogW3tcbiAgICAvLyAgICAgICBcIm5hbWVcIjogXCJhbmFseXRpY3NcIixcbiAgICAvLyAgICAgICBcImNoaWxkcmVuXCI6IFt7XG4gICAgLy8gICAgICAgICBcIm5hbWVcIjogXCJjbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICBcImNoaWxkcmVuXCI6IFt7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIkFnZ2xvbWVyYXRpdmVDbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICAgIFwic2l6ZVwiOiAzOTM4XG4gICAgLy8gICAgICAgICB9LCB7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIkNvbW11bml0eVN0cnVjdHVyZVwiLFxuICAgIC8vICAgICAgICAgICBcInNpemVcIjogMzgxMlxuICAgIC8vICAgICAgICAgfSwge1xuICAgIC8vICAgICAgICAgICBcIm5hbWVcIjogXCJIaWVyYXJjaGljYWxDbHVzdGVyXCIsXG4gICAgLy8gICAgICAgICAgIFwic2l6ZVwiOiA2NzE0XG4gICAgLy8gICAgICAgICB9LCB7XG4gICAgLy8gICAgICAgICAgIFwibmFtZVwiOiBcIk1lcmdlRWRnZVwiLFxuICAgIC8vICAgICAgICAgICBcInNpemVcIjogNzQzXG4gICAgLy8gICAgICAgICB9XVxuICAgIC8vICAgICAgIH1dXG4gICAgLy8gICAgIH1dXG4gICAgLy8gICB9O1xuICAgIGpzb24gPSBidWlsZCgkc2NvcGUuYXBpLmNvbnRyb2xsZXIpO1xuXG5cbiAgICByb290ID0ganNvbjtcbiAgICByb290LngwID0gaCAvIDI7XG4gICAgcm9vdC55MCA9IDA7XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVBbGwoZCkge1xuICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgZC5jaGlsZHJlbi5mb3JFYWNoKHRvZ2dsZUFsbCk7XG4gICAgICAgIHRvZ2dsZShkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSBkaXNwbGF5IHRvIHNob3cgYSBmZXcgbm9kZXMuXG4gICAgcm9vdC5jaGlsZHJlbi5mb3JFYWNoKHRvZ2dsZUFsbCk7XG4gICAgLy90b2dnbGUocm9vdC5jaGlsZHJlblsxXSk7XG4gICAgLy8gdG9nZ2xlKHJvb3QuY2hpbGRyZW5bMV0uY2hpbGRyZW5bMl0pO1xuICAgIC8vIHRvZ2dsZShyb290LmNoaWxkcmVuWzldKTtcbiAgICAvLyB0b2dnbGUocm9vdC5jaGlsZHJlbls5XS5jaGlsZHJlblswXSk7XG5cbiAgICB1cGRhdGUocm9vdCk7XG5cblxuXG4gICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuICAgICAgdmFyIGR1cmF0aW9uID0gZDMuZXZlbnQgJiYgZDMuZXZlbnQuYWx0S2V5ID8gNTAwMCA6IDUwMDtcblxuICAgICAgLy8gQ29tcHV0ZSB0aGUgbmV3IHRyZWUgbGF5b3V0LlxuICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KS5yZXZlcnNlKCk7XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgZC55ID0gZC5kZXB0aCAqIDE4MDtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIG5vZGVz4oCmXG4gICAgICB2YXIgbm9kZSA9IHZpcy5zZWxlY3RBbGwoXCJnLm5vZGVcIilcbiAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBFbnRlciBhbnkgbmV3IG5vZGVzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgIHZhciBub2RlRW50ZXIgPSBub2RlLmVudGVyKCkuYXBwZW5kKFwic3ZnOmdcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55MCArIFwiLFwiICsgc291cmNlLngwICsgXCIpXCI7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB0b2dnbGUoZCk7XG4gICAgICAgICAgdXBkYXRlKGQpO1xuICAgICAgICB9KTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcInN2ZzpjaXJjbGVcIilcbiAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpXG4gICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLl9jaGlsZHJlbiA/IFwibGlnaHRzdGVlbGJsdWVcIiA6IFwiI2ZmZlwiO1xuICAgICAgICB9KTtcblxuICAgICAgbm9kZUVudGVyLmFwcGVuZChcInN2Zzp0ZXh0XCIpXG4gICAgICAgIC5hdHRyKFwieFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyAtMTAgOiAxMDtcbiAgICAgICAgfSlcbiAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gXCJlbmRcIiA6IFwic3RhcnRcIjtcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLm5hbWU7XG4gICAgICAgIH0pXG4gICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBub2RlcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICB2YXIgbm9kZVVwZGF0ZSA9IG5vZGUudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIGQueSArIFwiLFwiICsgZC54ICsgXCIpXCI7XG4gICAgICAgIH0pO1xuXG4gICAgICBub2RlVXBkYXRlLnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcInJcIiwgNC41KVxuICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImxpZ2h0c3RlZWxibHVlXCIgOiBcIiNmZmZcIjtcbiAgICAgICAgfSk7XG5cbiAgICAgIG5vZGVVcGRhdGUuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgdmFyIG5vZGVFeGl0ID0gbm9kZS5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55ICsgXCIsXCIgKyBzb3VyY2UueCArIFwiKVwiO1xuICAgICAgICB9KVxuICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAuYXR0cihcInJcIiwgMWUtNik7XG5cbiAgICAgIG5vZGVFeGl0LnNlbGVjdChcInRleHRcIilcbiAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDFlLTYpO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIGxpbmtz4oCmXG4gICAgICB2YXIgbGluayA9IHZpcy5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIilcbiAgICAgICAgLmRhdGEodHJlZS5saW5rcyhub2RlcyksIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC50YXJnZXQuaWQ7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBFbnRlciBhbnkgbmV3IGxpbmtzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJzdmc6cGF0aFwiLCBcImdcIilcbiAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICAgIHg6IHNvdXJjZS54MCxcbiAgICAgICAgICAgIHk6IHNvdXJjZS55MFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIGRpYWdvbmFsKHtcbiAgICAgICAgICAgIHNvdXJjZTogbyxcbiAgICAgICAgICAgIHRhcmdldDogb1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuICAgICAgLy8gVHJhbnNpdGlvbiBsaW5rcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICBsaW5rLnRyYW5zaXRpb24oKVxuICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cbiAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgbGluay5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICB2YXIgbyA9IHtcbiAgICAgICAgICAgIHg6IHNvdXJjZS54LFxuICAgICAgICAgICAgeTogc291cmNlLnlcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7XG4gICAgICAgICAgICBzb3VyY2U6IG8sXG4gICAgICAgICAgICB0YXJnZXQ6IG9cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICAvLyBTdGFzaCB0aGUgb2xkIHBvc2l0aW9ucyBmb3IgdHJhbnNpdGlvbi5cbiAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICBkLngwID0gZC54O1xuICAgICAgICBkLnkwID0gZC55O1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVG9nZ2xlIGNoaWxkcmVuLlxuICAgIGZ1bmN0aW9uIHRvZ2dsZShkKSB7XG4gICAgICBpZiAoZC5jaGlsZHJlbikge1xuICAgICAgICBkLl9jaGlsZHJlbiA9IGQuY2hpbGRyZW47XG4gICAgICAgIGQuY2hpbGRyZW4gPSBudWxsO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5jaGlsZHJlbiA9IGQuX2NoaWxkcmVuO1xuICAgICAgICBkLl9jaGlsZHJlbiA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG5cblxuXG5cbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignQXBpUm91dGVDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMpIHtcblxuICAgICRzY29wZS5yb3V0ZSA9ICRzY29wZS5hcGkuZmluZFJvdXRlKCRzdGF0ZVBhcmFtcy5yb3V0ZUlkKTtcblxuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdBbGVydEN0cmwnLCBbJyRzY29wZScsICckbW9kYWxJbnN0YW5jZScsICdkYXRhJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkbW9kYWxJbnN0YW5jZSwgZGF0YSkge1xuXG4gICAgJHNjb3BlLnRpdGxlID0gZGF0YS50aXRsZTtcbiAgICAkc2NvcGUubWVzc2FnZSA9IGRhdGEubWVzc2FnZTtcblxuICAgICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoKTtcbiAgICB9O1xuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdBcHBDdHJsJywgWyckc2NvcGUnLFxuICBmdW5jdGlvbigkc2NvcGUpIHtcbiAgICAkc2NvcGUubmF2YmFyQ29sbGFwc2VkID0gZmFsc2U7XG4gIH1cbl0pO1xuXG5hcHAuY29udHJvbGxlcignQXJyYXlEZWZDdHJsJywgWyckc2NvcGUnLCAnZGlhbG9nJyxcbiAgZnVuY3Rpb24oJHNjb3BlLCAkZGlhbG9nKSB7XG5cbiAgICB2YXIgZGVmID0gJHNjb3BlLmRlZjtcblxuICAgICRzY29wZS5kZWZEYXRhID0ge1xuICAgICAgb2Z0eXBlOiBkZWYub2Z0eXBlXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2RlZkRhdGEub2Z0eXBlJywgZnVuY3Rpb24obmV3VmFsdWUsIG9sZFZhbHVlKSB7XG4gICAgICBpZiAobmV3VmFsdWUgPT09IG9sZFZhbHVlIHx8IG5ld1ZhbHVlID09PSBkZWYub2Z0eXBlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgJGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6ICdNb2RpZnkga2V5IHR5cGUnLFxuICAgICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlIHlvdSB3YW50IGNoYW5nZSB0aGUgdHlwZSBvZiBBcnJheSBrZXkgWycgKyBkZWYua2V5Lm5hbWUgKyAnXT8nXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8vIHJlZGVmaW5lIGRlZiBvZnR5cGVcbiAgICAgICAgdmFyIHR5cGUgPSBuZXdWYWx1ZTtcblxuICAgICAgICBkZWYuZGVmaW5lKHtcbiAgICAgICAgICBvZnR5cGU6IHR5cGUsXG4gICAgICAgICAgZGVmOiB7fVxuICAgICAgICB9LCBkZWYua2V5KTtcblxuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5kZWZEYXRhLm9mdHlwZSA9IG9sZFZhbHVlO1xuICAgICAgfSk7XG5cbiAgICB9KTtcblxuXG4gIH1cbl0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0NvbmZpcm1DdHJsJywgWyckc2NvcGUnLCAnJG1vZGFsSW5zdGFuY2UnLCAnZGF0YScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJG1vZGFsSW5zdGFuY2UsIGRhdGEpIHtcblxuICAgICRzY29wZS50aXRsZSA9IGRhdGEudGl0bGU7XG4gICAgJHNjb3BlLm1lc3NhZ2UgPSBkYXRhLm1lc3NhZ2U7XG5cbiAgICAkc2NvcGUub2sgPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbEluc3RhbmNlLmNsb3NlKCk7XG4gICAgfTtcblxuICAgICRzY29wZS5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbEluc3RhbmNlLmRpc21pc3MoJ2NhbmNlbCcpO1xuICAgIH07XG4gIH1cbl0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ0RiQ3RybCcsIFsnJHNjb3BlJywgJyRzdGF0ZScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlKSB7XG5cblxuXG4gICAgJHNjb3BlLmdvdG9Nb2RlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJHN0YXRlLmdvKCdkYi5tb2RlbCcsIHtcbiAgICAgICAgLy9wYXRoOiBvYmoucGF0aCA/IG9iai5wYXRoKCkubWFwKGZ1bmN0aW9uKHApIHsgcmV0dXJuIHAubmFtZTsgfSkuam9pbignLycpIDogJydcbiAgICAgICAgbW9kZWxOYW1lOiAnZGVtbydcbiAgICAgIH0pO1xuICAgIH07XG5cblxuICB9XG5dKTtcbiIsImFwcC5jb250cm9sbGVyKCdLZXlDdHJsJywgWyckc2NvcGUnLCAnJHN0YXRlUGFyYW1zJywgJ2RpYWxvZycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCAkZGlhbG9nKSB7XG4gICAgdmFyIGtleSA9ICRzY29wZS5tb2RlbC5nZXRLZXlCeUlkKCRzdGF0ZVBhcmFtcy5rZXlJZCk7XG5cbiAgICAkc2NvcGUua2V5ID0ga2V5O1xuXG4gICAgJHNjb3BlLmtleURhdGEgPSB7XG4gICAgICB0eXBlOiBrZXkgPyBrZXkudHlwZSA6ICcnXG4gICAgfTtcblxuICAgICRzY29wZS4kd2F0Y2goJ2tleURhdGEudHlwZScsIGZ1bmN0aW9uKG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgICAgaWYgKG5ld1ZhbHVlID09PSBvbGRWYWx1ZSB8fCBuZXdWYWx1ZSA9PT0ga2V5LnR5cGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAkZGlhbG9nLmNvbmZpcm0oe1xuICAgICAgICB0aXRsZTogJ01vZGlmeSBrZXkgdHlwZScsXG4gICAgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gbW9kaWZ5IGtleSBbJyArIGtleS5uYW1lICsgJ10/J1xuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyByZWRlZmluZSBrZXkgdHlwZVxuICAgICAgICB2YXIgdHlwZSA9IG5ld1ZhbHVlO1xuICAgICAgICB2YXIgbmV3RGVmID0gdHlwZSA9PT0gJ0FycmF5JyA/IHtcbiAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgIGRlZjoge1xuICAgICAgICAgICAgb2Z0eXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgIGRlZjoge31cbiAgICAgICAgICB9XG4gICAgICAgIH0gOiB7XG4gICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICBkZWY6IHt9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcmVkZWZpbmUga2V5IGRlZlxuICAgICAgICBrZXkudHlwZSA9IHR5cGU7XG4gICAgICAgIGtleS5kZWZpbmUobmV3RGVmKTtcblxuICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICRzY29wZS5rZXlEYXRhLnR5cGUgPSBvbGRWYWx1ZTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG5cbiAgfVxuXSk7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBkYiA9IHJlcXVpcmUoJy4uL21vZGVscy9kYicpO1xudmFyIGRhZ3JlID0gcmVxdWlyZSgnZGFncmUnKTtcblxuYXBwLmNvbnRyb2xsZXIoJ01vZGVsQ3RybCcsIFsnJHNjb3BlJywgJyRodHRwJywgJyRzdGF0ZScsICckbW9kYWwnLCAnZGlhbG9nJywgJyR0aW1lb3V0JywgJ21vZGVsUHJvbWlzZScsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJGh0dHAsICRzdGF0ZSwgJG1vZGFsLCAkZGlhbG9nLCAkdGltZW91dCwgbW9kZWxQcm9taXNlKSB7XG5cbiAgICB2YXIgbW9kZWwgPSBPYmplY3QuY3JlYXRlKGRiKTtcblxuICAgIG1vZGVsLmluaXRpYWxpemUobW9kZWxQcm9taXNlLmRhdGEpO1xuXG4gICAgJHNjb3BlLm1vZGVsID0gbW9kZWw7XG5cbiAgICAvLyBzY29wZSBkYXRhXG4gICAgJHNjb3BlLmRhdGEgPSB7XG4gICAgICBpc0NvbGxhcHNlZDogZmFsc2VcbiAgICB9O1xuXG5cbiAgICAvLyR0aW1lb3V0KGF1dG9MYXlvdXQpO1xuXG4gICAgJHNjb3BlLiR3YXRjaCgnbW9kZWwubmFtZScsIGZ1bmN0aW9uKG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgY29uc29sZS5sb2coJ3Jlbm1hZSBmaWxlJyk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUubW9kZWxBc0pzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgIC8vIHN0cmlwIG91dCAkJGhhc2hLZXkgZXRjLlxuICAgICAgcmV0dXJuIGFuZ3VsYXIudG9Kc29uKEpTT04ucGFyc2UobW9kZWwudG9Kc29uKCkpLCB0cnVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNob3dNb2RlbEpzb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi1qc29uLmh0bWwnLFxuICAgICAgICBzY29wZTogJHNjb3BlXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLnNob3dNb2RlbERpYWdyYW0gPSBmdW5jdGlvbigpIHtcbiAgICAgICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9kYi1kaWFncmFtLmh0bWwnLFxuICAgICAgICBzY29wZTogJHNjb3BlXG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmdvdG9QYXRoID0gZnVuY3Rpb24ob2JqKSB7XG5cbiAgICAgIHZhciBpc01vZGVsID0gb2JqLnNjaGVtYXM7XG4gICAgICB2YXIgaXNTY2hlbWEgPSAhaXNNb2RlbCAmJiAhb2JqLnR5cGU7XG5cbiAgICAgIGlmIChpc01vZGVsKSB7XG5cbiAgICAgICAgJHN0YXRlLmdvKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgICAgIG1vZGVsTmFtZTogb2JqLm5hbWVcbiAgICAgICAgfSk7XG5cbiAgICAgIH0gZWxzZSBpZiAoaXNTY2hlbWEpIHtcblxuICAgICAgICAkc3RhdGUuZ28oJ2RiLm1vZGVsLnNjaGVtYScsIHtcbiAgICAgICAgICBzY2hlbWFJZDogb2JqLmlkXG4gICAgICAgIH0pO1xuXG4gICAgICB9IGVsc2Uge1xuXG4gICAgICAgICRzdGF0ZS5nbygnZGIubW9kZWwuc2NoZW1hLmtleScsIHtcbiAgICAgICAgICBzY2hlbWFJZDogb2JqLmtleXMuc2NoZW1hLmlkLFxuICAgICAgICAgIGtleUlkOiBvYmouaWRcbiAgICAgICAgfSk7XG5cbiAgICAgIH1cblxuXG4gICAgfTtcblxuICAgIHZhciBpZGVtcG90ZW50aWFsaXplID0gZnVuY3Rpb24oZikge1xuICAgICAgdmFyIHByZXZpb3VzO1xuICAgICAgdmFyIGZfaWRlbXBvdGVudCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmV0ID0gZigpO1xuICAgICAgICBpZiAoYW5ndWxhci5lcXVhbHMocmV0LCBwcmV2aW91cykpIHtcbiAgICAgICAgICByZXQgPSBwcmV2aW91cztcbiAgICAgICAgfVxuICAgICAgICBwcmV2aW91cyA9IHJldDtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZl9pZGVtcG90ZW50O1xuICAgIH07XG5cbiAgICAkc2NvcGUuZXJyb3JzID0gaWRlbXBvdGVudGlhbGl6ZShmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBtb2RlbC5lcnJvcnMoKTtcbiAgICB9KTtcblxuICAgICRzY29wZS5hZGRTY2hlbWEgPSBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHNjaGVtYSA9IG1vZGVsLmNyZWF0ZVNjaGVtYSgpO1xuICAgICAgc2NoZW1hLmluaXRpYWxpemUoe1xuICAgICAgICBpZDogdXRpbHMuZ2V0dWlkKCksXG4gICAgICAgIG5hbWU6ICdOZXdTY2hlbWFOYW1lJyxcbiAgICAgICAgaW5zdGFsbGVkOiB0cnVlLFxuICAgICAgICBrZXlzOiB7XG4gICAgICAgICAgaXRlbXM6IFt7XG4gICAgICAgICAgICAnbmFtZSc6ICdGaXJzdEtleU5hbWUnLFxuICAgICAgICAgICAgJ3R5cGUnOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICdkZWYnOiB7XG4gICAgICAgICAgICAgICdyZXF1aXJlZCc6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XVxuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgbW9kZWwuaW5zZXJ0U2NoZW1hKHNjaGVtYSk7XG5cbiAgICAgICRzY29wZS5nb3RvUGF0aChzY2hlbWEpO1xuICAgIH07XG5cbiAgICAkc2NvcGUuZGVsZXRlU2NoZW1hID0gZnVuY3Rpb24oc2NoZW1hKSB7XG5cbiAgICAgICRkaWFsb2cuY29uZmlybSh7XG4gICAgICAgIHRpdGxlOiAnRGVsZXRlIHNjaGVtYScsXG4gICAgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlIHNjaGVtYSBbJyArIHNjaGVtYS5kb3RQYXRoKCkgKyAnXT8nXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBzY2hlbWEuZGIucmVtb3ZlU2NoZW1hKHNjaGVtYSk7XG4gICAgICAgIC8vIGdvIHRvIG1vZGVsIHJvb3RcbiAgICAgICAgJHNjb3BlLmdvdG9QYXRoKHNjaGVtYS5kYik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmFkZEtleSA9IGZ1bmN0aW9uKGtleXMsIHNpYmxpbmcsIGluc2VydEFib3ZlKSB7XG5cbiAgICAgIC8vIGFkZCBhIG5ldyBLZXksIG9wdGlvbmFsbHkgcGFzc2luZyBhIHJlbGF0aXZlIHNpYmxpbmcgdG8gaW5zZXJ0IG5leHQgdG8gZWl0aGVyIGFib3ZlIG9yIGJlbG93XG5cbiAgICAgIHZhciBkYXRhID0ge1xuICAgICAgICBpZDogdXRpbHMuZ2V0dWlkKCksXG4gICAgICAgIG5hbWU6ICdOZXdLZXlOYW1lJyxcbiAgICAgICAgdHlwZTogJ1N0cmluZycsXG4gICAgICAgIGRlZjoge31cbiAgICAgIH07XG5cbiAgICAgIHZhciBrZXk7XG4gICAgICBpZiAoc2libGluZykge1xuICAgICAgICB2YXIgc2libGluZ0luZGV4ID0gc2libGluZy5rZXlzLml0ZW1zLmluZGV4T2Yoc2libGluZyk7XG4gICAgICAgIHZhciBpbmRleCA9IGluc2VydEFib3ZlID8gc2libGluZ0luZGV4IDogKytzaWJsaW5nSW5kZXg7XG4gICAgICAgIGtleSA9IGtleXMuaW5zZXJ0S2V5KGRhdGEsIGluZGV4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtleSA9IGtleXMuYWRkS2V5KGRhdGEpO1xuICAgICAgfVxuXG4gICAgICAkc2NvcGUuZ290b1BhdGgoa2V5KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmRlbGV0ZUtleSA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgJGRpYWxvZy5jb25maXJtKHtcbiAgICAgICAgdGl0bGU6ICdEZWxldGUga2V5JyxcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byBkZWxldGUga2V5IFsnICsga2V5LmRvdFBhdGgoKSArICddPydcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIGtleS5rZXlzLmRlbGV0ZUtleShrZXkpO1xuICAgICAgICAkc2NvcGUuZ290b1BhdGgoa2V5LmtleXMuc2NoZW1hKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUtleVVwID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgaXRlbXMgPSBrZXkua2V5cy5pdGVtcztcbiAgICAgIHZhciBpbmRleCA9IGl0ZW1zLmluZGV4T2Yoa2V5KTtcbiAgICAgIGl0ZW1zLm1vdmUoaW5kZXgsIC0taW5kZXgpO1xuICAgIH07XG5cbiAgICAkc2NvcGUubW92ZUtleURvd24gPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBpdGVtcyA9IGtleS5rZXlzLml0ZW1zO1xuICAgICAgdmFyIGluZGV4ID0gaXRlbXMuaW5kZXhPZihrZXkpO1xuICAgICAgaXRlbXMubW92ZShpbmRleCwgKytpbmRleCk7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGF1dG9MYXlvdXQoKSB7XG4gICAgICB2YXIgZyA9IG5ldyBkYWdyZS5EaWdyYXBoKCk7XG4gICAgICB2YXIgZWRnZXMgPSBbXTtcbiAgICAgIHZhciBlbDtcbiAgICAgIC8vICQoJy5zY2hlbWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgLy8gICAgIHZhciAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAvLyAgICAgdmFyIGlkID0gJCh0aGlzKS5hdHRyKCdpZCcpO1xuICAgICAgLy8gICAgIGcuYWRkTm9kZShpZCwge1xuICAgICAgLy8gICAgICAgICBsYWJlbDogaWQsXG4gICAgICAvLyAgICAgICAgIHdpZHRoOiAkdGhpcy53aWR0aCgpLFxuICAgICAgLy8gICAgICAgICBoZWlnaHQ6ICR0aGlzLmhlaWdodCgpXG4gICAgICAvLyAgICAgfSk7XG4gICAgICAvLyAgICAgJHRoaXMuZmluZCgnLmtleS1oZWFkZXJbZGF0YS1yZWZdJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIC8vICAgICAgICAgZWRnZXMucHVzaChbJCh0aGlzKS5kYXRhKCdyZWYnKSwgaWRdKTtcbiAgICAgIC8vICAgICB9KTtcbiAgICAgIC8vIH0pO1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vZGVsLnNjaGVtYXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNjaGVtYSA9IG1vZGVsLnNjaGVtYXNbaV07XG4gICAgICAgIHZhciBpZCA9IHNjaGVtYS5pZDtcbiAgICAgICAgLy8gZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgIC8vIGVsLnN0eWxlLnBvc2l0aW9uID0gJ2Fic29sdXRlJztcbiAgICAgICAgLy8gdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwsIG51bGwpO1xuXG4gICAgICAgIGcuYWRkTm9kZShpZCwge1xuICAgICAgICAgIGxhYmVsOiBpZCxcbiAgICAgICAgICAvLyB3aWR0aDogcGFyc2VGbG9hdChzdHlsZS53aWR0aCksXG4gICAgICAgICAgLy8gaGVpZ2h0OiBwYXJzZUZsb2F0KHN0eWxlLmhlaWdodClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHNjaGVtYVJlZmVyZW5jZXMgPSBzY2hlbWEuc2NoZW1hUmVmZXJlbmNlcygpO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNjaGVtYVJlZmVyZW5jZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBlZGdlcy5wdXNoKFtzY2hlbWFSZWZlcmVuY2VzW2pdLmtleXMuc2NoZW1hLmlkLCBpZF0pO1xuICAgICAgICB9XG5cbiAgICAgIH1cblxuXG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IGVkZ2VzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIGcuYWRkRWRnZShudWxsLCBlZGdlc1trXVswXSwgZWRnZXNba11bMV0pO1xuICAgICAgfVxuXG4gICAgICB2YXIgbGF5b3V0ID0gZGFncmUubGF5b3V0KCkubm9kZVNlcCgyMCkuZWRnZVNlcCg1KS5yYW5rU2VwKDIwKS5ydW4oZyk7XG4gICAgICAvLyB2YXIgbGF5b3V0ID0gZGFncmUubGF5b3V0KCkucnVuKGcpO1xuICAgICAgbGF5b3V0LmVhY2hOb2RlKGZ1bmN0aW9uKHUsIHZhbHVlKSB7XG5cbiAgICAgICAgLy8gZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh1KTtcbiAgICAgICAgLy8gZWwuc3R5bGUudG9wID0gdmFsdWUueSArICdweCc7XG4gICAgICAgIC8vIGVsLnN0eWxlLmxlZnQgPSB2YWx1ZS54ICsgJ3B4JztcbiAgICAgICAgLy8gZWwuc3R5bGUud2lkdGggPSAnMjAwcHgnO1xuICAgICAgICAvLyBlbC5zdHlsZS5oZWlnaHQgPSAnMzAwcHgnO1xuICAgICAgICAvLyBlbC5zdHlsZS5vdmVyZmxvdyA9ICdoaWRkZW4nO1xuXG4gICAgICB9KTtcbiAgICB9XG5cbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignUHJvbXB0Q3RybCcsIFsnJHNjb3BlJywgJyRtb2RhbEluc3RhbmNlJywgJ2RhdGEnLFxuICBmdW5jdGlvbigkc2NvcGUsICRtb2RhbEluc3RhbmNlLCBkYXRhKSB7XG5cbiAgICAkc2NvcGUudGl0bGUgPSBkYXRhLnRpdGxlO1xuICAgICRzY29wZS5tZXNzYWdlID0gZGF0YS5tZXNzYWdlO1xuICAgICRzY29wZS5wbGFjZWhvbGRlciA9IGRhdGEucGxhY2Vob2xkZXI7XG4gICAgJHNjb3BlLmlucHV0ID0ge1xuICAgICAgdmFsdWU6IGRhdGEuZGVmYXVsdFZhbHVlXG4gICAgfTtcblxuICAgICRzY29wZS5vayA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuY2xvc2UoJHNjb3BlLmlucHV0LnZhbHVlKTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgJG1vZGFsSW5zdGFuY2UuZGlzbWlzcygnY2FuY2VsJyk7XG4gICAgfTtcbiAgfVxuXSk7XG4iLCJhcHAuY29udHJvbGxlcignU2NoZW1hQ3RybCcsIFsnJHNjb3BlJywgJyRzdGF0ZVBhcmFtcycsXG4gIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zKSB7XG4gICAgJHNjb3BlLnNjaGVtYSA9ICRzY29wZS5tb2RlbC5nZXRTY2hlbWFCeUlkKCRzdGF0ZVBhcmFtcy5zY2hlbWFJZCk7XG4gIH1cbl0pO1xuIiwidmFyIEJlaGF2ZSA9IHJlcXVpcmUoJy4uL3ZlbmRvci9iZWhhdmUnKTtcblxuLy8gLy8gQXV0b3NpemUgYmVoYXZlIHRleHRhcmVhXG4vLyBCZWhhdmVIb29rcy5hZGQoWydrZXlkb3duJ10sIGZ1bmN0aW9uKGRhdGEpIHtcbi8vICAgdmFyIG51bUxpbmVzID0gZGF0YS5saW5lcy50b3RhbCxcbi8vICAgICBmb250U2l6ZSA9IHBhcnNlSW50KGdldENvbXB1dGVkU3R5bGUoZGF0YS5lZGl0b3IuZWxlbWVudClbJ2ZvbnQtc2l6ZSddKSxcbi8vICAgICBwYWRkaW5nID0gcGFyc2VJbnQoZ2V0Q29tcHV0ZWRTdHlsZShkYXRhLmVkaXRvci5lbGVtZW50KVsncGFkZGluZyddKTtcbi8vICAgZGF0YS5lZGl0b3IuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSAoKChudW1MaW5lcyAqIGZvbnRTaXplKSArIHBhZGRpbmcpKSArICdweCc7XG4vLyB9KTtcblxuXG5hcHAuZGlyZWN0aXZlKCdiZWhhdmUnLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgdmFyIGVkaXRvciA9IG5ldyBCZWhhdmUoe1xuICAgICAgICB0ZXh0YXJlYTogZWxlbWVudFswXSxcbiAgICAgICAgcmVwbGFjZVRhYjogdHJ1ZSxcbiAgICAgICAgc29mdFRhYnM6IHRydWUsXG4gICAgICAgIHRhYlNpemU6IDIsXG4gICAgICAgIGF1dG9PcGVuOiB0cnVlLFxuICAgICAgICBvdmVyd3JpdGU6IHRydWUsXG4gICAgICAgIGF1dG9TdHJpcDogdHJ1ZSxcbiAgICAgICAgYXV0b0luZGVudDogdHJ1ZSxcbiAgICAgICAgZmVuY2U6IGZhbHNlXG4gICAgICB9KTtcblxuICAgICAgc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImRlc3Ryb3lcIik7XG4gICAgICAgIGVkaXRvci5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2RiRGlhZ3JhbScsIFsnJHRpbWVvdXQnLCBmdW5jdGlvbigkdGltZW91dCkge1xuICByZXR1cm4ge1xuICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvZGlyZWN0aXZlcy9kYi1kaWFncmFtLmh0bWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50KSB7XG5cbiAgICAgIHZhciBtb2RlbCA9IHNjb3BlLm1vZGVsO1xuXG4gICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcblxuXG4gICAgICAgIHZhciBzdGF0ZXMgPSBtb2RlbC5zY2hlbWFzLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlkOiBpdGVtLmlkLFxuICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgbGFiZWw6IGl0ZW0ubmFtZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZhciBlZGdlcyA9IG1vZGVsLnNjaGVtYVJlZmVyZW5jZXMoKS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1OiBpdGVtLmtleXMuc2NoZW1hLmlkLFxuICAgICAgICAgICAgdjogaXRlbS5yZWYoKSxcbiAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgIGxhYmVsOiBpdGVtLm5hbWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIENyZWF0ZSBhIGdyYXBoIGZyb20gdGhlIEpTT05cbiAgICAgICAgdmFyIGcgPSBkYWdyZUQzLmpzb24uZGVjb2RlKHN0YXRlcywgZWRnZXMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgcmVuZGVyZXJcbiAgICAgICAgdmFyIHJlbmRlcmVyID0gbmV3IGRhZ3JlRDMuUmVuZGVyZXIoKTtcblxuICAgICAgICAvLyBTZXQgdXAgYW4gU1ZHIGdyb3VwIHNvIHRoYXQgd2UgY2FuIHRyYW5zbGF0ZSB0aGUgZmluYWwgZ3JhcGguXG4gICAgICAgIHZhciBzdmdFbCA9IGVsZW1lbnQuZmluZCgnc3ZnJylbMF07XG4gICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3Qoc3ZnRWwpO1xuICAgICAgICAvL3ZhciBzdmcgPSBkMy5zZWxlY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKGQzLm5zLnByZWZpeC5zdmcsICdzdmcnKSk7XG4gICAgICAgIC8vc3ZnLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuICAgICAgICB2YXIgc3ZnR3JvdXAgPSBzdmcuYXBwZW5kKCdnJyk7XG5cbiAgICAgICAgdmFyIHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoc3ZnRWwpO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwid2lkdGhcIiwgc3ZnRWwud2lkdGgpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImhlaWdodFwiLCBzdmdFbC5oZWlnaHQpO1xuXG4gICAgICAgIC8vc3ZnLmF0dHIoXCJ3aWR0aFwiLCBzdHlsZS53aWR0aCkuYXR0cihcImhlaWdodFwiLCBlbGVtZW50LmhlaWdodCk7XG4gIC8vZWxlbWVudC5hcHBlbmQoc3ZnWzBdWzBdKTtcbiAgICAgICAgLy8gU2V0IGluaXRpYWwgem9vbSB0byA3NSVcbiAgICAgICAgdmFyIGluaXRpYWxTY2FsZSA9IDAuNzU7XG4gICAgICAgIHZhciBvbGRab29tID0gcmVuZGVyZXIuem9vbSgpO1xuICAgICAgICByZW5kZXJlci56b29tKGZ1bmN0aW9uKGdyYXBoLCBzdmcpIHtcbiAgICAgICAgICB2YXIgem9vbSA9IG9sZFpvb20oZ3JhcGgsIHN2Zyk7XG5cbiAgICAgICAgICAvLyBXZSBtdXN0IHNldCB0aGUgem9vbSBhbmQgdGhlbiB0cmlnZ2VyIHRoZSB6b29tIGV2ZW50IHRvIHN5bmNocm9uaXplXG4gICAgICAgICAgLy8gRDMgYW5kIHRoZSBET00uXG4gICAgICAgICAgem9vbS5zY2FsZShpbml0aWFsU2NhbGUpLmV2ZW50KHN2Zyk7XG4gICAgICAgICAgcmV0dXJuIHpvb207XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJ1biB0aGUgcmVuZGVyZXIuIFRoaXMgaXMgd2hhdCBkcmF3cyB0aGUgZmluYWwgZ3JhcGguXG4gICAgICAgIHZhciBsYXlvdXQgPSByZW5kZXJlci5ydW4oZywgc3ZnR3JvdXApO1xuXG4gICAgICAgIC8vIENlbnRlciB0aGUgZ3JhcGhcbiAgICAgICAgdmFyIHhDZW50ZXJPZmZzZXQgPSAoc3ZnLmF0dHIoJ3dpZHRoJykgLSBsYXlvdXQuZ3JhcGgoKS53aWR0aCAqIGluaXRpYWxTY2FsZSkgLyAyO1xuICAgICAgICBzdmdHcm91cC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB4Q2VudGVyT2Zmc2V0ICsgJywgMjApJyk7XG4gICAgICAgIC8vc3ZnLmF0dHIoJ2hlaWdodCcsIGxheW91dC5ncmFwaCgpLmhlaWdodCAqIGluaXRpYWxTY2FsZSArIDQwKTtcblxuICAgICAgfSwgNTAwKTtcblxuXG5cblxuICAgIH1cbiAgfTtcbn1dKTtcbiIsImFwcC5kaXJlY3RpdmUoJ2ZvY3VzJyxcblxuICBmdW5jdGlvbigkdGltZW91dCkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNjb3BlOiB7XG4gICAgICAgIHRyaWdnZXI6ICdAZm9jdXMnXG4gICAgICB9LFxuXG4gICAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCkge1xuICAgICAgICBzY29wZS4kd2F0Y2goJ3RyaWdnZXInLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSB7XG4gICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgZWxlbWVudFswXS5mb2N1cygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIFxuKTtcbiIsImFwcC5kaXJlY3RpdmUoJ25lZ2F0ZScsIFtcblxuICBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJpYnV0ZSwgbmdNb2RlbENvbnRyb2xsZXIpIHtcbiAgICAgICAgbmdNb2RlbENvbnRyb2xsZXIuJGlzRW1wdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgIHJldHVybiAhIXZhbHVlO1xuICAgICAgICB9O1xuXG4gICAgICAgIG5nTW9kZWxDb250cm9sbGVyLiRmb3JtYXR0ZXJzLnVuc2hpZnQoZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICByZXR1cm4gIXZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICBuZ01vZGVsQ29udHJvbGxlci4kcGFyc2Vycy51bnNoaWZ0KGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuICF2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuXSk7Iiwid2luZG93LmFwcCA9IHJlcXVpcmUoJy4vbW9kdWxlcy9hcHAnKTtcblxuLy8gKioqKioqKioqKipcbi8vIFNoaW1zXG4vLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9zaGltcy9hcnJheScpO1xuXG53aW5kb3cuX2FwaSA9IHJlcXVpcmUoJy4uLy4uL3NoYXJlZC9hcGkvYXBpJyk7XG5cblxuLy8gKioqKioqKioqKipcbi8vIERpcmVjdGl2ZXNcbi8vICoqKioqKioqKioqXG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvbmVnYXRlJyk7XG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvZm9jdXMnKTtcbnJlcXVpcmUoJy4vZGlyZWN0aXZlcy9kYi1kaWFncmFtJyk7XG5yZXF1aXJlKCcuL2RpcmVjdGl2ZXMvYmVoYXZlJyk7XG5cblxuLy8gKioqKioqKioqKipcbi8vIENvbnRyb2xsZXJzXG4vLyAqKioqKioqKioqKlxuXG4vLyBkaWFsb2cgY29udHJvbGxlcnNcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMvY29uZmlybScpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9hbGVydCcpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9wcm9tcHQnKTtcblxuLy8gZGIgbW9kZWwgY29udHJvbGxlcnNcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMva2V5Jyk7XG5yZXF1aXJlKCcuL2NvbnRyb2xsZXJzL3NjaGVtYScpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9tb2RlbCcpO1xucmVxdWlyZSgnLi9jb250cm9sbGVycy9kYicpO1xuXG5cbi8vIGFwaSBtb2RlbCBjb250cm9sbGVyc1xucmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvYXBpJyk7XG5yZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9jb250cm9sbGVyJyk7XG5yZXF1aXJlKCcuL2FwaS9jb250cm9sbGVycy9yb3V0ZScpO1xucmVxdWlyZSgnLi9hcGkvY29udHJvbGxlcnMvZGlhZ3JhbScpO1xuXG5cblxuLy8gKioqKioqKioqKipcbi8vIFNlcnZpY2VzXG4vLyAqKioqKioqKioqKlxucmVxdWlyZSgnLi9zZXJ2aWNlcy9kaWFsb2cnKTtcblxuXG5cbi8vIE1haW4gQXBwIEN0cmxcbnJlcXVpcmUoJy4vY29udHJvbGxlcnMvYXBwJyk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7fSxcbiAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSlNPTi5wYXJzZShhbmd1bGFyLnRvSnNvbih0aGlzKSk7XG4gIH0sXG4gIG5hbWVSZWdleFZhbGlkYXRlOiAvXlthLXpBLVpdW2EtekEtWjAtOV9dezAsMjl9JC9cbn07XG5cbi8vICB2YXIgcHJvcGVydHlEZWZpbml0aW9ucyA9IHtcbi8vICAgIG51bWJlclByb3BlcnR5OiBmdW5jdGlvbiAoaW5pdGlhbFZhbHVlKSB7XG4vLyAgICAgIHZhciBwcm9wZXJ0eVZhbHVlLCBwcm9wZXJ0eURlc2NyaXB0b3I7XG4vL1xuLy8gICAgICBwcm9wZXJ0eURlc2NyaXB0b3IgPSB7XG4vLyAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4vLyAgICAgICAgICByZXR1cm4gcHJvcGVydHlWYWx1ZTtcbi8vICAgICAgICB9LFxuLy8gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4vLyAgICAgICAgICBpZiAoIWlzTmFOKHZhbHVlKSkge1xuLy8gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbi8vICAgICAgICAgIH1cbi8vICAgICAgICB9XG4vLyAgICAgIH07XG4vLyAgICAgIGlmIChpbml0aWFsVmFsdWUpIHtcbi8vICAgICAgICBwcm9wZXJ0eURlc2NyaXB0b3Iuc2V0KGluaXRpYWxWYWx1ZSk7XG4vLyAgICAgIH1cbi8vICAgICAgcmV0dXJuIHByb3BlcnR5RGVzY3JpcHRvcjtcbi8vICAgIH0sXG4vLyAgICBib29sZWFuUHJvcGVydHk6IGZ1bmN0aW9uIChpbml0aWFsVmFsdWUpIHtcbi8vICAgICAgdmFyIHByb3BlcnR5VmFsdWUsIHByb3BlcnR5RGVzY3JpcHRvcjtcbi8vXG4vLyAgICAgIHByb3BlcnR5RGVzY3JpcHRvciA9IHtcbi8vICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgIHJldHVybiBwcm9wZXJ0eVZhbHVlO1xuLy8gICAgICAgIH0sXG4vLyAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbi8vICAgICAgICAgIHZhciB2YWwgPSB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUudG9Mb3dlckNhc2UoKSA6IHZhbHVlO1xuLy8gICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHZhbCA/IEJvb2xlYW4odmFsID09PSAnZmFsc2UnIHx8IHZhbCA9PT0gJ29mZicgPyB1bmRlZmluZWQgOiB2YWwpIDogdW5kZWZpbmVkO1xuLy8gICAgICAgIH1cbi8vICAgICAgfTtcbi8vICAgICAgaWYgKGluaXRpYWxWYWx1ZSkge1xuLy8gICAgICAgIHByb3BlcnR5RGVzY3JpcHRvci5zZXQoaW5pdGlhbFZhbHVlKTtcbi8vICAgICAgfVxuLy8gICAgICByZXR1cm4gcHJvcGVydHlEZXNjcmlwdG9yO1xuLy8gICAgfSxcbi8vICAgIGRhdGVQcm9wZXJ0eTogZnVuY3Rpb24gKGluaXRpYWxWYWx1ZSkge1xuLy8gICAgICB2YXIgcHJvcGVydHlWYWx1ZSwgcHJvcGVydHlEZXNjcmlwdG9yO1xuLy9cbi8vICAgICAgcHJvcGVydHlEZXNjcmlwdG9yID0ge1xuLy8gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgcmV0dXJuIHByb3BlcnR5VmFsdWU7XG4vLyAgICAgICAgfSxcbi8vICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuLy8gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlO1xuLy8gICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHZhbCA/IG5ldyBEYXRlKHZhbCkgOiB1bmRlZmluZWQ7XG4vLyAgICAgICAgfVxuLy8gICAgICB9O1xuLy8gICAgICBpZiAoaW5pdGlhbFZhbHVlKSB7XG4vLyAgICAgICAgcHJvcGVydHlEZXNjcmlwdG9yLnNldChpbml0aWFsVmFsdWUpO1xuLy8gICAgICB9XG4vLyAgICAgIHJldHVybiBwcm9wZXJ0eURlc2NyaXB0b3I7XG4vLyAgICB9XG4vLyAgfTtcbiIsInZhciBiYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG52YXIgc2NoZW1hID0gcmVxdWlyZSgnLi9zY2hlbWEnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIgc3RhdGljVHlwZXMgPSAnU3RyaW5nIEJvb2xlYW4gTnVtYmVyIERhdGUgTmVzdGVkRG9jdW1lbnQgQXJyYXkgRm9yZWlnbktleSBPYmplY3RJZCBNaXhlZCBCdWZmZXInLnNwbGl0KCcgJyk7XG52YXIgY2hpbGREb2N1bWVudFR5cGUgPSBbJ0NoaWxkRG9jdW1lbnQnXTtcblxudmFyIGRiID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAgaWQ6IG51bGwsXG4gIG5hbWU6IG51bGwsXG4gIGRlc2NyaXB0aW9uOiBudWxsLFxuICBzY2hlbWFzOiBbXSxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgZGF0YSA9IChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YS5zY2hlbWFzKSkgPyBkYXRhIDoge1xuICAgICAgc2NoZW1hczogW11cbiAgICB9O1xuXG4gICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgdGhpcy5uYW1lID0gZGF0YS5uYW1lO1xuICAgIHRoaXMuc2NoZW1hcyA9IFtdO1xuICAgIGlmIChkYXRhLnNjaGVtYXMpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YS5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMuYWRkU2NoZW1hKGRhdGEuc2NoZW1hc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBhZGRTY2hlbWE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgcyA9IHRoaXMuY3JlYXRlU2NoZW1hKCk7XG4gICAgcy5pbml0aWFsaXplKGRhdGEpO1xuICAgIHRoaXMuc2NoZW1hcy5wdXNoKHMpO1xuICAgIHJldHVybiBzO1xuICB9LFxuICBpbnNlcnRTY2hlbWE6IGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgIHRoaXMuc2NoZW1hcy5wdXNoKHNjaGVtYSk7XG4gICAgcmV0dXJuIHNjaGVtYTtcbiAgfSxcbiAgY3JlYXRlU2NoZW1hOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gT2JqZWN0LmNyZWF0ZShzY2hlbWEsIHtcbiAgICAgIGRiOiB7XG4gICAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHZhbHVlOiB0aGlzXG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIGdldFNjaGVtYUJ5SWQ6IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIF8uZmluZFdoZXJlKHRoaXMuc2NoZW1hcywge1xuICAgICAgaWQ6IGlkXG4gICAgfSk7XG4gIH0sXG4gIGdldFNjaGVtYUJ5TmFtZTogZnVuY3Rpb24obmFtZSkge1xuICAgIHJldHVybiB0aGlzLnNjaGVtYXMuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5uYW1lID09PSBuYW1lO1xuICAgIH0pO1xuICB9LFxuICByZW1vdmVTY2hlbWE6IGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgIHRoaXMuc2NoZW1hcy5zcGxpY2UodGhpcy5zY2hlbWFzLmluZGV4T2Yoc2NoZW1hKSwgMSk7XG4gIH0sXG4gIGVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLm5hbWUpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ01vZGVsIG5hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgLy8gZ2V0IHNjaGVtYSBuYW1lc1xuICAgIHZhciBzY2hlbWFOYW1lcyA9IHRoaXMuc2NoZW1hcy5tYXAoZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4gc2NoZW1hLm5hbWU7XG4gICAgfSk7XG5cbiAgICAvLyBlbnN1cmUgdW5pcXVlIHNjaGVtYSBuYW1lc1xuICAgIHZhciBkdXBlcyA9IHNjaGVtYU5hbWVzLnNvcnQoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSwgaW5kZXgsIGFycikge1xuICAgICAgcmV0dXJuIChpbmRleCAhPT0gMCkgJiYgKGl0ZW0gPT09IGFycltpbmRleCAtIDFdKTtcbiAgICB9KTtcblxuICAgIGlmIChkdXBlcy5sZW5ndGgpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ0R1cGxpY2F0ZSBzY2hlbWEgbmFtZXM6ICcgKyBfLnVuaXEoZHVwZXMpLmpvaW4oJywgJykpKTtcbiAgICB9XG5cbiAgICAvLyBidWJibGUgYW55IGluZGl2aWR1YWwgc2NoZW1hIGVycm9yc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlcnJvcnMsIHRoaXMuc2NoZW1hc1tpXS5lcnJvcnMoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfSxcbiAgaXNWYWxpZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuZXJyb3JzKCkubGVuZ3RoID09PSAwO1xuICB9LFxuICB2YWxpZGF0ZVNjaGVtYU5hbWU6IGZ1bmN0aW9uKG5hbWUsIGlnbm9yZVNjaGVtYSkge1xuICAgIGlmICghbmFtZSkgcmV0dXJuIG5ldyBNc2coJ05hbWUgY2Fubm90IGJlIGJsYW5rLiBQbGVhc2Ugc3VwcGx5IGEgbmFtZS4nKTtcbiAgICB2YXIgZHVwZXMgPSBfLmZpbmQodGhpcy5zY2hlbWFzLCBmdW5jdGlvbihzKSB7XG4gICAgICByZXR1cm4gcyAhPT0gaWdub3JlU2NoZW1hICYmIHMubmFtZS50b0xvd2VyQ2FzZSgpID09PSBuYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGR1cGVzID8gbmV3IE1zZygnRHVwbGljYXRlIFNjaGVtYSBuYW1lLiBQbGVhc2Ugc3VwcGx5IGEgdW5pcXVlIG5hbWUuJykgOiB0cnVlO1xuICB9LFxuICBzY2hlbWFSZWZlcmVuY2VzOiBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICByZXR1cm4gdGhpcy5jaGlsZEtleXMoKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gc2NoZW1hID8ga2V5LnJlZigpID09PSBzY2hlbWEuaWQgOiBrZXkucmVmKCk7XG4gICAgfSk7XG4gIH0sXG4gIGlzU2NoZW1hUmVmZXJlbmNlZDogZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgcmV0dXJuIHRoaXMuc2NoZW1hUmVmZXJlbmNlcyhzY2hlbWEpLmxlbmd0aCA+IDA7XG4gIH0sXG4gIHN0YXRpY1R5cGVzOiBzdGF0aWNUeXBlcyxcbiAgY2hpbGREb2N1bWVudFR5cGU6IGNoaWxkRG9jdW1lbnRUeXBlLFxuICBhbGxUeXBlczogW10uY29uY2F0KHN0YXRpY1R5cGVzLCBjaGlsZERvY3VtZW50VHlwZSksXG4gIG5vdEluc3RhbGxlZFNjaGVtYXM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmZpbHRlcih0aGlzLnNjaGVtYXMsIGZ1bmN0aW9uKHNjaGVtYSkge1xuICAgICAgcmV0dXJuICFzY2hlbWEuaW5zdGFsbGVkO1xuICAgIH0pO1xuICB9LFxuICBpbnN0YWxsZWRTY2hlbWFzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIodGhpcy5zY2hlbWFzLCBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICAgIHJldHVybiBzY2hlbWEuaW5zdGFsbGVkO1xuICAgIH0pO1xuICB9LFxuICBhdmFpbGFibGVEb2N1bWVudFJlZnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLm1hcCh0aGlzLmluc3RhbGxlZFNjaGVtYXMoKSwgZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogc2NoZW1hLmlkLFxuICAgICAgICBuYW1lOiBzY2hlbWEubmFtZVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSxcbiAgYXZhaWxhYmxlQ2hpbGREb2N1bWVudFJlZnM6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLm1hcCh0aGlzLm5vdEluc3RhbGxlZFNjaGVtYXMoKSwgZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogc2NoZW1hLmlkLFxuICAgICAgICBuYW1lOiBzY2hlbWEubmFtZVxuICAgICAgfTtcbiAgICB9KTtcbiAgfSxcbiAgY2hpbGRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5zY2hlbWFzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShrZXlzLCB0aGlzLnNjaGVtYXNbaV0ua2V5cy5jaGlsZEtleXMoKSk7XG4gICAgfVxuICAgIHJldHVybiBrZXlzO1xuICB9LFxuICBmaW5kQnlQYXRoOiBmdW5jdGlvbihwYXRoKSB7XG4gICAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLycpO1xuXG4gICAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMikge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0U2NoZW1hQnlOYW1lKHBhcnRzWzFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRLZXlzKCkuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHJldHVybiBpdGVtLnNsYXNoUGF0aCgpID09PSBwYXRoO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBnZXRLZXlCeUlkOiBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiB0aGlzLmNoaWxkS2V5cygpLmZpbmQoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0uaWQgPT09IGlkO1xuICAgIH0pO1xuICB9LFxuICB0b0pzb246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBpZiAodGhpcy5wcm9wZXJ0eUlzRW51bWVyYWJsZShrZXkpID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSwgMik7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbmRvdy5kYiA9IGRiO1xuIiwidmFyIGJhc2UgPSByZXF1aXJlKCcuL2Jhc2UnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG4vL1xuLy8gdG9kbyAtIHR5cGUgZ2V0dGVycy9zZXR0ZXJzIGNhc3Rpbmcgb2YgcHJvcGVydGllcyBmb3IgbnVtYmVycywgZGF0ZXMgZXRjLlxuLy9cblxudmFyIFN0cmluZ0RlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG4gIHRoaXMuZGVmYXVsdFZhbHVlID0gZGF0YS5kZWZhdWx0VmFsdWU7XG4gIHRoaXMuZW51bWVyYXRpb24gPSBkYXRhLmVudW1lcmF0aW9uO1xuICB0aGlzLnVwcGVyY2FzZSA9IGRhdGEudXBwZXJjYXNlO1xuICB0aGlzLmxvd2VyY2FzZSA9IGRhdGEubG93ZXJjYXNlO1xuICB0aGlzLm1hdGNoID0gZGF0YS5tYXRjaDtcbiAgdGhpcy50cmltID0gZGF0YS50cmltO1xufTtcblxudmFyIEJvb2xlYW5EZWYgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHRoaXMucmVxdWlyZWQgPSBkYXRhLnJlcXVpcmVkO1xuICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGRhdGEuZGVmYXVsdFZhbHVlO1xufTtcblxudmFyIE51bWJlckRlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG4gIHRoaXMuZGVmYXVsdFZhbHVlID0gZGF0YS5kZWZhdWx0VmFsdWU7XG4gIHRoaXMubWluID0gZGF0YS5taW47XG4gIHRoaXMubWF4ID0gZGF0YS5tYXg7XG4gIHRoaXMuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuICAgIHZhciBtaW4gPSB0aGlzLm1pbjtcbiAgICB2YXIgbWF4ID0gdGhpcy5tYXg7XG4gICAgdmFyIGRmbHQgPSB0aGlzLmRlZmF1bHRWYWx1ZTtcblxuICAgIGlmIChkZmx0IDwgbWluKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdUaGUgRGVmYXVsdCB2YWx1ZSBzaG91bGQgYmUgZ3JlYXRlciB0aGFuIE1pbicpKTtcbiAgICB9XG4gICAgaWYgKGRmbHQgPiBtYXgpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ1RoZSBEZWZhdWx0IHZhbHVlIHNob3VsZCBiZSBsZXNzIHRoYW4gTWF4JykpO1xuICAgIH1cblxuICAgIGlmIChtYXggPD0gbWluKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdNYXggdmFsdWUgc2hvdWxkIGJlIGdyZWF0ZXIgdGhhbiBNaW4nKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfTtcbn07XG5cbnZhciBEYXRlRGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5kZWZhdWx0VmFsdWUgPSBkYXRhLmRlZmF1bHRWYWx1ZTtcbn07XG5cbnZhciBOZXN0ZWREb2N1bWVudERlZiA9IGZ1bmN0aW9uKGRhdGEsIGtleSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5rZXlzID0gT2JqZWN0LmNyZWF0ZShyZXF1aXJlKCcuL2tleXMnKSwgeyAvLyByZXF1aXJlKCdrZXlzJykgaXMgdXNlZCBsYXppbHkgaGVyZSBzaW5jZSAna2V5cycgaXMgYSBjaXJjdWxhciBkZXBlbmRlbmN5XG4gICAgc2NoZW1hOiB7XG4gICAgICB2YWx1ZToga2V5LmtleXMuc2NoZW1hLFxuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICB9LFxuICAgIGtleToge1xuICAgICAgdmFsdWU6IGtleSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgfVxuICB9KTtcbiAgdGhpcy5rZXlzLmluaXRpYWxpemUoZGF0YS5rZXlzID8gZGF0YS5rZXlzLml0ZW1zIDogW10pO1xuXG4gIHRoaXMuZXJyb3JzID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5lcnJvcnMoKTtcbiAgfTtcbn07XG5cbnZhciBBcnJheURlZiA9IGZ1bmN0aW9uKGRhdGEsIGtleSkge1xuICB0aGlzLmRlZmluZShkYXRhLCBrZXkpO1xuICB0aGlzLmVycm9ycyA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmRlZi5lcnJvcnMgPyB0aGlzLmRlZi5lcnJvcnMoKSA6IFtdO1xuICB9O1xufTtcbkFycmF5RGVmLnByb3RvdHlwZS5kZWZpbmUgPSBmdW5jdGlvbihkYXRhLCBrZXkpIHtcbiAgdGhpcy5vZnR5cGUgPSBkYXRhLm9mdHlwZTtcbiAgdGhpcy5kZWYgPSBPYmplY3QuY3JlYXRlKGRlZiwge1xuICAgIGtleToge1xuICAgICAgd3JpdGFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZToga2V5XG4gICAgfVxuICB9KTtcbiAgdGhpcy5kZWYuaW5pdGlhbGl6ZShkYXRhKTtcbn07XG5cbnZhciBGb3JlaWduS2V5RGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5yZWYgPSBkYXRhLnJlZjtcbn07XG5cbnZhciBNaXhlZERlZiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgdGhpcy5yZXF1aXJlZCA9IGRhdGEucmVxdWlyZWQ7XG59O1xuXG52YXIgT2JqZWN0SWREZWYgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHRoaXMucmVxdWlyZWQgPSBkYXRhLnJlcXVpcmVkO1xuICB0aGlzLmF1dG8gPSBkYXRhLmF1dG87XG59O1xuXG52YXIgQnVmZmVyRGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlcXVpcmVkID0gZGF0YS5yZXF1aXJlZDtcbiAgdGhpcy5yZWYgPSBkYXRhLnJlZjtcbn07XG5cbnZhciBDaGlsZERvY3VtZW50RGVmID0gZnVuY3Rpb24oZGF0YSkge1xuICB0aGlzLnJlZiA9IGRhdGEucmVmO1xufTtcblxuZnVuY3Rpb24gZmFjdG9yeURlZihkYXRhLCBrZXkpIHtcbiAgdmFyIHR5cGUgPSAoZGF0YS50eXBlIHx8IGRhdGEub2Z0eXBlKS50b0xvd2VyQ2FzZSgpO1xuICB2YXIgZGVmID0gZGF0YS5kZWY7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICByZXR1cm4gbmV3IFN0cmluZ0RlZihkZWYpO1xuICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgcmV0dXJuIG5ldyBCb29sZWFuRGVmKGRlZik7XG4gICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgIHJldHVybiBuZXcgTnVtYmVyRGVmKGRlZik7XG4gICAgY2FzZSAnZGF0ZSc6XG4gICAgICByZXR1cm4gbmV3IERhdGVEZWYoZGVmKTtcbiAgICBjYXNlICduZXN0ZWRkb2N1bWVudCc6XG4gICAgICByZXR1cm4gbmV3IE5lc3RlZERvY3VtZW50RGVmKGRlZiwga2V5KTtcbiAgICBjYXNlICdhcnJheSc6XG4gICAgICByZXR1cm4gbmV3IEFycmF5RGVmKGRlZiwga2V5KTtcbiAgICBjYXNlICdmb3JlaWdua2V5JzpcbiAgICAgIHJldHVybiBuZXcgRm9yZWlnbktleURlZihkZWYpO1xuICAgIGNhc2UgJ29iamVjdGlkJzpcbiAgICAgIHJldHVybiBuZXcgT2JqZWN0SWREZWYoZGVmKTtcbiAgICBjYXNlICdtaXhlZCc6XG4gICAgICByZXR1cm4gbmV3IE1peGVkRGVmKGRlZik7XG4gICAgY2FzZSAnYnVmZmVyJzpcbiAgICAgIHJldHVybiBuZXcgQnVmZmVyRGVmKGRlZik7XG4gICAgY2FzZSAnY2hpbGRkb2N1bWVudCc6XG4gICAgICByZXR1cm4gbmV3IENoaWxkRG9jdW1lbnREZWYoZGVmKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlIG5vdCBzdXBwb3J0ZWQnKTtcbiAgfVxufVxuXG52YXIgZGVmID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAga2V5OiBudWxsLFxuICBpbml0aWFsaXplOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgXy5leHRlbmQodGhpcywgZmFjdG9yeURlZihkYXRhLCB0aGlzLmtleSkpO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWY7XG4iLCJ2YXIgdXRpbHMgPSByZXF1aXJlKCcuLi8uLi8uLi9zaGFyZWQvdXRpbHMnKTtcbnZhciBiYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG52YXIgZGVmID0gcmVxdWlyZSgnLi9kZWYnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIga2V5ID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAga2V5czogbnVsbCxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMuaWQgPSBkYXRhLmlkIHx8IHV0aWxzLmdldHVpZCgpO1xuICAgIHRoaXMubmFtZSA9IGRhdGEubmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0gZGF0YS5kZXNjcmlwdGlvbjtcbiAgICB0aGlzLmRlZmluZShkYXRhKTtcbiAgfSxcbiAgZGVmaW5lOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdGhpcy50eXBlID0gZGF0YS50eXBlO1xuICAgIHRoaXMuZGVmID0gT2JqZWN0LmNyZWF0ZShkZWYsIHtcbiAgICAgIGtleToge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZGVmLmluaXRpYWxpemUoZGF0YSk7XG4gIH0sXG4gIHR5cGVBc1N0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5hbWVzID0gXy5vYmplY3QoXy5tYXAodGhpcy5rZXlzLnNjaGVtYS5kYi5zY2hlbWFzLCBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICAgIHJldHVybiBbc2NoZW1hLmlkLCBzY2hlbWEubmFtZV07XG4gICAgfSkpO1xuXG4gICAgdmFyIGRlZiA9IHRoaXMuZGVmO1xuICAgIHZhciB0ID0gdGhpcy50eXBlO1xuICAgIGlmICh0ID09PSAnQXJyYXknKSB7XG4gICAgICB2YXIgb2ZUID0gZGVmLm9mdHlwZTtcbiAgICAgIGlmIChvZlQgPT09ICdGb3JlaWduS2V5Jykge1xuICAgICAgICByZXR1cm4gJ1snICsgb2ZUICsgJzwnICsgbmFtZXNbZGVmLmRlZi5yZWZdICsgJz5dJztcbiAgICAgIH0gZWxzZSBpZiAob2ZUID09PSAnQ2hpbGREb2N1bWVudCcpIHtcbiAgICAgICAgcmV0dXJuICdbJyArIG9mVCArICc8JyArIG5hbWVzW2RlZi5kZWYucmVmXSArICc+XSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gJ1snICsgb2ZUICsgJ10nO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodCA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdCArICc8JyArIG5hbWVzW2RlZi5yZWZdICsgJz4nO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdDtcbiAgICB9XG4gIH0sXG4gIHJlZjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMudHlwZSA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWYucmVmO1xuICAgIH0gZWxzZSBpZiAodGhpcy50eXBlID09PSAnQXJyYXknICYmIHRoaXMuZGVmLm9mdHlwZSA9PT0gJ0ZvcmVpZ25LZXknKSB7XG4gICAgICByZXR1cm4gdGhpcy5kZWYuZGVmLnJlZjtcbiAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PT0gJ0FycmF5JyAmJiB0aGlzLmRlZi5vZnR5cGUgPT09ICdDaGlsZERvY3VtZW50Jykge1xuICAgICAgcmV0dXJuIHRoaXMuZGVmLmRlZi5yZWY7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH0sXG4gIGlzTmVzdGVkVHlwZTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PSAnTmVzdGVkRG9jdW1lbnQnO1xuICB9LFxuICBpc05lc3RlZFR5cGVBcnJheTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNBcnJheSgpICYmIHRoaXMuZGVmLm9mdHlwZSA9PT0gJ05lc3RlZERvY3VtZW50JztcbiAgfSxcbiAgaXNOZXN0ZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmlzTmVzdGVkVHlwZSgpIHx8IHRoaXMuaXNOZXN0ZWRUeXBlQXJyYXkoKTtcbiAgfSxcbiAgaXNBcnJheTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ0FycmF5JztcbiAgfSxcbiAgcGF0aDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHBhdGggPSBbdGhpc107XG4gICAgdmFyIGFyZ3MgPSBbMCwgMF0uY29uY2F0KHRoaXMua2V5cy5wYXRoKCkpO1xuICAgIEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkocGF0aCwgYXJncyk7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH0sXG4gIGRvdFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBhdGgoKS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5uYW1lOyB9KS5qb2luKCcuJyk7XG4gIH0sXG4gIHNsYXNoUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucGF0aCgpLm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLm5hbWU7IH0pLmpvaW4oJy8nKTtcbiAgfSxcbiAgY2hpbGRLZXlzOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5pc05lc3RlZFR5cGUoKSkge1xuICAgICAgcmV0dXJuIHRoaXMuZGVmLmtleXMuY2hpbGRLZXlzKCk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmlzTmVzdGVkVHlwZUFycmF5KCkpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlZi5kZWYua2V5cy5jaGlsZEtleXMoKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0sXG4gIHNpYmxpbmdzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5pdGVtcy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIGl0ZW0gIT09IHNlbGY7XG4gICAgfSk7XG4gIH0sXG4gIGVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVycm9ycyA9IFtdO1xuXG4gICAgaWYgKCF0aGlzLm5hbWUpIHtcbiAgICAgIGVycm9ycy5wdXNoKG5ldyBNc2coJ05hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgdmFyIGRlZiA9IHRoaXMuZGVmO1xuICAgIHJldHVybiBkZWYuZXJyb3JzID8gZXJyb3JzLmNvbmNhdChkZWYuZXJyb3JzKCkpIDogZXJyb3JzO1xuICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXk7XG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xudmFyIGtleSA9IHJlcXVpcmUoJy4va2V5Jyk7XG52YXIgTXNnID0gcmVxdWlyZSgnLi9tc2cnKTtcblxudmFyIGtleXMgPSBfLmV4dGVuZCh7fSwgYmFzZSwge1xuICBzY2hlbWE6IG51bGwsXG4gIGtleTogbnVsbCxcbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oZGF0YSkge1xuICAgIHRoaXMuaXRlbXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuYWRkS2V5KGRhdGFbaV0pO1xuICAgIH1cbiAgfSxcbiAgY3JlYXRlS2V5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIG8gPSBPYmplY3QuY3JlYXRlKGtleSwge1xuICAgICAga2V5czoge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuICAgIG8uaW5pdGlhbGl6ZShkYXRhKTtcbiAgICByZXR1cm4gbztcbiAgfSxcbiAgYWRkS2V5OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgdmFyIG8gPSB0aGlzLmNyZWF0ZUtleShkYXRhKTtcbiAgICB0aGlzLml0ZW1zLnB1c2gobyk7XG4gICAgcmV0dXJuIG87XG4gIH0sXG4gIGluc2VydEtleTogZnVuY3Rpb24oZGF0YSwgaW5kZXgpIHtcbiAgICB2YXIgbyA9IHRoaXMuY3JlYXRlS2V5KGRhdGEpO1xuICAgIHRoaXMuaXRlbXMuc3BsaWNlKGluZGV4LCAwLCBvKTtcbiAgICByZXR1cm4gbztcbiAgfSxcbiAgZGVsZXRlS2V5OiBmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLml0ZW1zLmluZGV4T2Yoa2V5KTtcbiAgICBpZiAofmluZGV4KSB7XG4gICAgICB0aGlzLml0ZW1zLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9LFxuICBwYXRoOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5rZXkgPyB0aGlzLmtleS5wYXRoKCkgOiB0aGlzLnNjaGVtYS5wYXRoKCk7XG4gIH0sXG4gIGNoaWxkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShrZXlzLCB0aGlzLml0ZW1zKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGtleXMsIHRoaXMuaXRlbXNbaV0uY2hpbGRLZXlzKCkpO1xuICAgIH1cbiAgICByZXR1cm4ga2V5cztcbiAgfSxcbiAgZXJyb3JzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXJyb3JzID0gW107XG4gICAgdmFyIGtleU5hbWVzID0gW107XG5cbiAgICAvLyBrZXkgZXJyb3JzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLml0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBrZXlOYW1lcy5wdXNoKHRoaXMuaXRlbXNbaV0ubmFtZSk7XG4gICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlcnJvcnMsIHRoaXMuaXRlbXNbaV0uZXJyb3JzKCkpO1xuICAgIH1cblxuICAgIC8vIGVuc3VyZSB1bmlxdWUgbmFtZXNcbiAgICB2YXIgZHVwZXMgPSBrZXlOYW1lcy5zb3J0KCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0sIGluZGV4LCBhcnIpIHtcbiAgICAgIHJldHVybiAoaW5kZXggIT09IDApICYmIChpdGVtID09PSBhcnJbaW5kZXggLSAxXSk7XG4gICAgfSk7XG5cbiAgICBpZiAoZHVwZXMubGVuZ3RoKSB7XG4gICAgICBlcnJvcnMucHVzaChuZXcgTXNnKCdEdXBsaWNhdGUga2V5IG5hbWVzOiAnICsgXy51bmlxKGR1cGVzKS5qb2luKCcsICcpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5cztcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gTXNnKG1lc3NhZ2UpIHtcclxuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG59O1xyXG4iLCJ2YXIgYmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xudmFyIGtleXMgPSByZXF1aXJlKCcuL2tleXMnKTtcbnZhciBNc2cgPSByZXF1aXJlKCcuL21zZycpO1xuXG52YXIgc2NoZW1hID0gXy5leHRlbmQoe30sIGJhc2UsIHtcbiAgZGI6IG51bGwsXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICB0aGlzLm5hbWUgPSBkYXRhLm5hbWU7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IGRhdGEuZGVzY3JpcHRpb247XG4gICAgdGhpcy5pbnN0YWxsZWQgPSBkYXRhLmluc3RhbGxlZCB8fCBmYWxzZTtcbiAgICB0aGlzLmtleXMgPSBPYmplY3QuY3JlYXRlKGtleXMsIHtcbiAgICAgIHNjaGVtYToge1xuICAgICAgICB3cml0YWJsZTogZmFsc2UsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB2YWx1ZTogdGhpc1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5rZXlzLmluaXRpYWxpemUoKGRhdGEua2V5cyAmJiBkYXRhLmtleXMuaXRlbXMpIHx8IHt9ICk7XG4gIH0sXG4gIHBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBbdGhpcy5kYiwgdGhpc107XG4gIH0sXG4gIGRvdFBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLnBhdGgoKS5tYXAoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5uYW1lOyB9KS5qb2luKCcuJyk7XG4gIH0sXG4gIHNsYXNoUGF0aDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucGF0aCgpLm1hcChmdW5jdGlvbihwKSB7IHJldHVybiBwLm5hbWU7IH0pLmpvaW4oJy8nKTtcbiAgfSxcbiAgZXJyb3JzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZXJyb3JzID0gW107XG5cbiAgICBpZiAoIXRoaXMubmFtZSkge1xuICAgICAgZXJyb3JzLnB1c2gobmV3IE1zZygnU2NoZW1hIG5hbWUgaXMgcmVxdWlyZWQnKSk7XG4gICAgfVxuXG4gICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB0aGlzLmtleXMuZXJyb3JzKCkpO1xuXG4gICAgcmV0dXJuIGVycm9ycztcbiAgfSxcbiAgc2NoZW1hUmVmZXJlbmNlczogZnVuY3Rpb24oc2NoZW1hKSB7XG4gICAgcmV0dXJuIHRoaXMuZGIuc2NoZW1hUmVmZXJlbmNlcyh0aGlzKTtcbiAgfSxcbiAgaXNTY2hlbWFSZWZlcmVuY2VkOiBmdW5jdGlvbihzY2hlbWEpIHtcbiAgICByZXR1cm4gdGhpcy5kYi5pc1NjaGVtYVJlZmVyZW5jZWQodGhpcyk7XG4gIH0sXG4gIGNoaWxkS2V5czogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMua2V5cy5jaGlsZEtleXMoKTtcbiAgfSxcbiAgZmluZEtleTogZnVuY3Rpb24ocGF0aCkge1xuICAgIHJldHVybiB0aGlzLmNoaWxkS2V5cygpLmZpbHRlcihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpdGVtLnBhdGgoKSA9PT0gcGF0aDtcbiAgICB9KTtcbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gc2NoZW1hO1xuIiwidmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ25nUm91dGUnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICd1aS5hY2UnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcblxuICAvLyRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcblxuICAvLyBGb3IgYW55IHVubWF0Y2hlZCB1cmwsIHJlZGlyZWN0IHRvIC9kYlxuICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKFwiL2RiXCIpO1xuXG4gIC8vIE5vdyBzZXQgdXAgdGhlIHN0YXRlc1xuICAkc3RhdGVQcm92aWRlclxuICAgIC5zdGF0ZSgnZGInLCB7XG4gICAgICB1cmw6ICcvZGInLFxuICAgICAgY29udHJvbGxlcjogJ0RiQ3RybCcsXG4gICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLmh0bWwnXG4gICAgfSlcbiAgICAuc3RhdGUoJ2RiLm1vZGVsJywge1xuICAgICAgYWJzdHJhY3Q6IHRydWUsXG4gICAgICB1cmw6ICcvOm1vZGVsTmFtZScsXG4gICAgICBjb250cm9sbGVyOiAnTW9kZWxDdHJsJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvbW9kZWwuaHRtbCcsXG4gICAgICByZXNvbHZlOiB7XG4gICAgICAgIG1vZGVsUHJvbWlzZTogWyckaHR0cCcsICckc3RhdGVQYXJhbXMnLFxuICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy8nICsgJHN0YXRlUGFyYW1zLm1vZGVsTmFtZSArICcuanNvbicpO1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdkYi5tb2RlbC5lZGl0Jywge1xuICAgICAgdXJsOiAnJywgLy8gRGVmYXVsdC4gV2lsbCBiZSB1c2VkIGluIHBsYWNlIG9mIGFic3RyYWN0IHBhcmVudCBpbiB0aGUgY2FzZSBvZiBoaXR0aW5nIHRoZSBpbmRleCAoZGIubW9kZWwvKVxuICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9tb2RlbC1lZGl0b3IuaHRtbCdcbiAgICB9KVxuICAgIC5zdGF0ZSgnZGIubW9kZWwuc2NoZW1hJywge1xuICAgICAgdXJsOiAnLzpzY2hlbWFJZCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnU2NoZW1hQ3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9zY2hlbWEuaHRtbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgLnN0YXRlKCdkYi5tb2RlbC5zY2hlbWEua2V5Jywge1xuICAgICAgdXJsOiAnLzprZXlJZCcsXG4gICAgICB2aWV3czoge1xuICAgICAgICAnQGRiLm1vZGVsJzogeyAvLyBUYXJnZXQgdGhlIHVpLXZpZXc9JycgaW4gcGFyZW50IHN0YXRlICdkYi5tb2RlbCdcbiAgICAgICAgICBjb250cm9sbGVyOiAnS2V5Q3RybCcsXG4gICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9rZXkuaHRtbCcsXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuICAgIC5zdGF0ZSgnZGIubW9kZWwuZGlhZ3JhbScsIHtcbiAgICAgIHVybDogJyNkaWFncmFtJyxcbiAgICAgIHZpZXdzOiB7XG4gICAgICAgICdAZGIubW9kZWwnOiB7IC8vIFRhcmdldCB0aGUgdWktdmlldz0nJyBpbiBwYXJlbnQgc3RhdGUgJ2RiLm1vZGVsJ1xuICAgICAgICAgIC8vY29udHJvbGxlcjogJ0RpYWdyYW1DdHJsJyxcbiAgICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2RiLWRpYWdyYW0uaHRtbCdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyQXBpU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlclxuICAgICAgLnN0YXRlKCdhcGknLCB7XG4gICAgICAgIHVybDogJy9hcGkvOmFwaU5hbWUnLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpQ3RybCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvYXBpL2FwaS5odG1sJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICAgIGFwaVByb21pc2U6IFsnJGh0dHAnLCAnJHN0YXRlUGFyYW1zJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRodHRwLCAkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHdpbmRvdy5fYXBpOyAvLyRodHRwLmdldCgnLycgKyAkc3RhdGVQYXJhbXMubW9kZWxOYW1lICsgJy5qc29uJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuZGlhZ3JhbScsIHtcbiAgICAgICAgdXJsOiAnL2RpYWdyYW0nLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpRGlhZ3JhbUN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9kaWFncmFtLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlcicsIHtcbiAgICAgICAgdXJsOiAnLzpjb250cm9sbGVySWQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQXBpQ29udHJvbGxlckN0cmwnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2FwaS9jb250cm9sbGVyLmh0bWwnXG4gICAgICB9KVxuICAgICAgLnN0YXRlKCdhcGkuY29udHJvbGxlci5yb3V0ZScsIHtcbiAgICAgICAgdXJsOiAnLzpyb3V0ZUlkJyxcbiAgICAgICAgdmlld3M6IHtcbiAgICAgICAgICAnc2Vjb25kYXJ5QGFwaSc6IHsgLy8gVGFyZ2V0IHRoZSB1aS12aWV3PSdzZWNvbmRhcnknIGluIHJvb3Qgc3RhdGUgJ2FwaSdcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdBcGlSb3V0ZUN0cmwnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hcGkvcm91dGUuaHRtbCdcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICB9XG5cblxuXG4gIHJlZ2lzdGVyQXBpU3RhdGVzKCRzdGF0ZVByb3ZpZGVyKTtcblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gYXBwO1xuIiwiYXBwLnNlcnZpY2UoJ2RpYWxvZycsIFsnJG1vZGFsJyxcbiAgZnVuY3Rpb24oJG1vZGFsKSB7XG5cbiAgICB2YXIgc2VydmljZSA9IHt9O1xuXG4gICAgc2VydmljZS5hbGVydCA9IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgcmV0dXJuICRtb2RhbC5vcGVuKHtcbiAgICAgICAgdGVtcGxhdGVVcmw6ICcvaHRtbC9hbGVydC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0FsZXJ0Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2VcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KS5yZXN1bHQ7XG5cbiAgICB9O1xuXG4gICAgc2VydmljZS5jb25maXJtID0gZnVuY3Rpb24oZGF0YSkge1xuXG4gICAgICByZXR1cm4gJG1vZGFsLm9wZW4oe1xuICAgICAgICB0ZW1wbGF0ZVVybDogJy9odG1sL2NvbmZpcm0uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdDb25maXJtQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2VcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KS5yZXN1bHQ7XG5cbiAgICB9O1xuXG4gICAgc2VydmljZS5wcm9tcHQgPSBmdW5jdGlvbihkYXRhKSB7XG5cbiAgICAgIHJldHVybiAkbW9kYWwub3Blbih7XG4gICAgICAgIHRlbXBsYXRlVXJsOiAnL2h0bWwvcHJvbXB0Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnUHJvbXB0Q3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBkYXRhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHRpdGxlOiBkYXRhLnRpdGxlLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBkYXRhLm1lc3NhZ2UsXG4gICAgICAgICAgICAgIGRlZmF1bHRWYWx1ZTogZGF0YS5kZWZhdWx0VmFsdWUsXG4gICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBkYXRhLnBsYWNlaG9sZGVyXG4gICAgICAgICAgICB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSkucmVzdWx0O1xuXG4gICAgfTtcblxuICAgIHJldHVybiBzZXJ2aWNlO1xuXG4gIH1cbl0pO1xuIiwiQXJyYXkucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbihvbGRJbmRleCwgbmV3SW5kZXgpIHtcblxuICBpZiAoaXNOYU4obmV3SW5kZXgpIHx8IGlzTmFOKG9sZEluZGV4KSB8fCBvbGRJbmRleCA8IDAgfHwgb2xkSW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAobmV3SW5kZXggPCAwKSB7XG4gICAgbmV3SW5kZXggPSB0aGlzLmxlbmd0aCAtIDE7XG4gIH0gZWxzZSBpZiAobmV3SW5kZXggPj0gdGhpcy5sZW5ndGgpIHtcbiAgICBuZXdJbmRleCA9IDA7XG4gIH1cblxuICB0aGlzLnNwbGljZShuZXdJbmRleCwgMCwgdGhpcy5zcGxpY2Uob2xkSW5kZXgsIDEpWzBdKTtcblxuICByZXR1cm4gbmV3SW5kZXg7XG59O1xuXG5pZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gIEFycmF5LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgaWYgKHRoaXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FycmF5LnByb3RvdHlwZS5maW5kIGNhbGxlZCBvbiBudWxsIG9yIHVuZGVmaW5lZCcpO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IE9iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGggPj4+IDA7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWUgPSBsaXN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBsaXN0KSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH07XG59XG4iLCIvKlxuICogQmVoYXZlLmpzXG4gKlxuICogQ29weXJpZ2h0IDIwMTMsIEphY29iIEtlbGxleSAtIGh0dHA6Ly9qYWtpZXN0ZnUuY29tL1xuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbmNlXG4gKiBodHRwOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUXG4gKlxuICogR2l0aHViOiAgaHR0cDovL2dpdGh1Yi5jb20vamFraWVzdGZ1L0JlaGF2ZS5qcy9cbiAqIFZlcnNpb246IDEuNVxuICovXG5cblxuKGZ1bmN0aW9uKHVuZGVmaW5lZCl7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICB2YXIgQmVoYXZlSG9va3MgPSBCZWhhdmVIb29rcyB8fCAoZnVuY3Rpb24oKXtcblx0XHR2YXIgaG9va3MgPSB7fTtcblxuXHRcdHJldHVybiB7XG5cdFx0ICAgIGFkZDogZnVuY3Rpb24oaG9va05hbWUsIGZuKXtcblx0XHRcdCAgICBpZih0eXBlb2YgaG9va05hbWUgPT0gXCJvYmplY3RcIil7XG5cdFx0XHQgICAgXHR2YXIgaTtcblx0XHRcdCAgICBcdGZvcihpPTA7IGk8aG9va05hbWUubGVuZ3RoOyBpKyspe1xuXHRcdFx0XHQgICAgXHR2YXIgdGhlSG9vayA9IGhvb2tOYW1lW2ldO1xuXHRcdFx0XHQgICAgXHRpZighaG9va3NbdGhlSG9va10pe1xuXHRcdFx0XHRcdCAgICBcdGhvb2tzW3RoZUhvb2tdID0gW107XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0aG9va3NbdGhlSG9va10ucHVzaChmbik7XG5cdFx0XHQgICAgXHR9XG5cdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIGlmKCFob29rc1tob29rTmFtZV0pe1xuXHRcdFx0XHQgICAgXHRob29rc1tob29rTmFtZV0gPSBbXTtcblx0XHRcdCAgICBcdH1cblx0XHRcdCAgICBcdGhvb2tzW2hvb2tOYW1lXS5wdXNoKGZuKTtcblx0XHRcdCAgICB9XG5cdFx0ICAgIH0sXG5cdFx0ICAgIGdldDogZnVuY3Rpb24oaG9va05hbWUpe1xuXHRcdFx0ICAgIGlmKGhvb2tzW2hvb2tOYW1lXSl7XG5cdFx0XHQgICAgXHRyZXR1cm4gaG9va3NbaG9va05hbWVdO1xuXHRcdCAgICBcdH1cblx0XHQgICAgfVxuXHQgICAgfTtcblxuXHR9KSgpLFxuXHRCZWhhdmUgPSBCZWhhdmUgfHwgZnVuY3Rpb24gKHVzZXJPcHRzKSB7XG5cbiAgICAgICAgaWYgKHR5cGVvZiBTdHJpbmcucHJvdG90eXBlLnJlcGVhdCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgU3RyaW5nLnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbih0aW1lcykge1xuICAgICAgICAgICAgICAgIGlmKHRpbWVzIDwgMSl7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYodGltZXMgJSAyKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVwZWF0KHRpbWVzIC0gMSkgKyB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgaGFsZiA9IHRoaXMucmVwZWF0KHRpbWVzIC8gMik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhhbGYgKyBoYWxmO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgQXJyYXkucHJvdG90eXBlLmZpbHRlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLmZpbHRlciA9IGZ1bmN0aW9uKGZ1bmMgLyosIHRoaXNwICovKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciB0ID0gT2JqZWN0KHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICBsZW4gPSB0Lmxlbmd0aCA+Pj4gMDtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGZ1bmMgIT0gXCJmdW5jdGlvblwiKXtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gW10sXG4gICAgICAgICAgICAgICAgICAgIHRoaXNwID0gYXJndW1lbnRzWzFdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgaW4gdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHZhbCA9IHRbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnVuYy5jYWxsKHRoaXNwLCB2YWwsIGksIHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2godmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIHRleHRhcmVhOiBudWxsLFxuICAgICAgICAgICAgcmVwbGFjZVRhYjogdHJ1ZSxcbiAgICAgICAgICAgIHNvZnRUYWJzOiB0cnVlLFxuICAgICAgICAgICAgdGFiU2l6ZTogNCxcbiAgICAgICAgICAgIGF1dG9PcGVuOiB0cnVlLFxuICAgICAgICAgICAgb3ZlcndyaXRlOiB0cnVlLFxuICAgICAgICAgICAgYXV0b1N0cmlwOiB0cnVlLFxuICAgICAgICAgICAgYXV0b0luZGVudDogdHJ1ZSxcbiAgICAgICAgICAgIGZlbmNlOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICB0YWIsXG4gICAgICAgIG5ld0xpbmUsXG4gICAgICAgIGNoYXJTZXR0aW5ncyA9IHtcblxuICAgICAgICAgICAga2V5TWFwOiBbXG4gICAgICAgICAgICAgICAgeyBvcGVuOiBcIlxcXCJcIiwgY2xvc2U6IFwiXFxcIlwiLCBjYW5CcmVhazogZmFsc2UgfSxcbiAgICAgICAgICAgICAgICB7IG9wZW46IFwiJ1wiLCBjbG9zZTogXCInXCIsIGNhbkJyZWFrOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgIHsgb3BlbjogXCIoXCIsIGNsb3NlOiBcIilcIiwgY2FuQnJlYWs6IGZhbHNlIH0sXG4gICAgICAgICAgICAgICAgeyBvcGVuOiBcIltcIiwgY2xvc2U6IFwiXVwiLCBjYW5CcmVhazogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHsgb3BlbjogXCJ7XCIsIGNsb3NlOiBcIn1cIiwgY2FuQnJlYWs6IHRydWUgfVxuICAgICAgICAgICAgXVxuXG4gICAgICAgIH0sXG4gICAgICAgIHV0aWxzID0ge1xuXG4gICAgICAgIFx0X2NhbGxIb29rOiBmdW5jdGlvbihob29rTmFtZSwgcGFzc0RhdGEpe1xuICAgIFx0XHRcdHZhciBob29rcyA9IEJlaGF2ZUhvb2tzLmdldChob29rTmFtZSk7XG5cdCAgICBcdFx0cGFzc0RhdGEgPSB0eXBlb2YgcGFzc0RhdGE9PVwiYm9vbGVhblwiICYmIHBhc3NEYXRhID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZTtcblxuXHQgICAgXHRcdGlmKGhvb2tzKXtcblx0XHRcdCAgICBcdGlmKHBhc3NEYXRhKXtcblx0XHRcdFx0ICAgIFx0dmFyIHRoZUVkaXRvciA9IGRlZmF1bHRzLnRleHRhcmVhLFxuXHRcdFx0XHQgICAgXHRcdHRleHRWYWwgPSB0aGVFZGl0b3IudmFsdWUsXG5cdFx0XHRcdCAgICBcdFx0Y2FyZXRQb3MgPSB1dGlscy5jdXJzb3IuZ2V0KCksXG5cdFx0XHRcdCAgICBcdFx0aTtcblxuXHRcdFx0XHQgICAgXHRmb3IoaT0wOyBpPGhvb2tzLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0XHQgICAgXHRob29rc1tpXS5jYWxsKHVuZGVmaW5lZCwge1xuXHRcdFx0XHRcdCAgICBcdFx0ZWRpdG9yOiB7XG5cdFx0XHRcdFx0XHQgICAgXHRcdGVsZW1lbnQ6IHRoZUVkaXRvcixcblx0XHRcdFx0XHRcdCAgICBcdFx0dGV4dDogdGV4dFZhbCxcblx0XHRcdFx0XHRcdCAgICBcdFx0bGV2ZWxzRGVlcDogdXRpbHMubGV2ZWxzRGVlcCgpXG5cdFx0XHRcdFx0ICAgIFx0XHR9LFxuXHRcdFx0XHRcdFx0ICAgIFx0Y2FyZXQ6IHtcblx0XHRcdFx0XHRcdFx0ICAgIFx0cG9zOiBjYXJldFBvc1xuXHRcdFx0XHRcdFx0ICAgIFx0fSxcblx0XHRcdFx0XHRcdCAgICBcdGxpbmVzOiB7XG5cdFx0XHRcdFx0XHRcdCAgICBcdGN1cnJlbnQ6IHV0aWxzLmN1cnNvci5nZXRMaW5lKHRleHRWYWwsIGNhcmV0UG9zKSxcblx0XHRcdFx0XHRcdFx0ICAgIFx0dG90YWw6IHV0aWxzLmVkaXRvci5nZXRMaW5lcyh0ZXh0VmFsKVxuXHRcdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHRcdCAgICBcdH0pO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHRmb3IoaT0wOyBpPGhvb2tzLmxlbmd0aDsgaSsrKXtcblx0XHRcdFx0ICAgIFx0XHRob29rc1tpXS5jYWxsKHVuZGVmaW5lZCk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdCAgICBcdH1cblx0XHQgICAgXHR9XG5cdCAgICBcdH0sXG5cbiAgICAgICAgICAgIGRlZmluZU5ld0xpbmU6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdmFyIHRhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGV4dGFyZWEnKTtcbiAgICAgICAgICAgICAgICB0YS52YWx1ZSA9IFwiXFxuXCI7XG5cbiAgICAgICAgICAgICAgICBpZih0YS52YWx1ZS5sZW5ndGg9PTIpe1xuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lID0gXCJcXHJcXG5cIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBuZXdMaW5lID0gXCJcXG5cIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVmaW5lVGFiU2l6ZTogZnVuY3Rpb24odGFiU2l6ZSl7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRlZmF1bHRzLnRleHRhcmVhLnN0eWxlLk9UYWJTaXplICE9IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS5PVGFiU2l6ZSA9IHRhYlNpemU7IHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIGRlZmF1bHRzLnRleHRhcmVhLnN0eWxlLk1velRhYlNpemUgIT0gXCJ1bmRlZmluZWRcIil7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzLnRleHRhcmVhLnN0eWxlLk1velRhYlNpemUgPSB0YWJTaXplOyByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS50YWJTaXplICE9IFwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0cy50ZXh0YXJlYS5zdHlsZS50YWJTaXplID0gdGFiU2l6ZTsgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjdXJzb3I6IHtcblx0ICAgICAgICAgICAgZ2V0TGluZTogZnVuY3Rpb24odGV4dFZhbCwgcG9zKXtcblx0XHQgICAgICAgIFx0cmV0dXJuICgodGV4dFZhbC5zdWJzdHJpbmcoMCxwb3MpKS5zcGxpdChcIlxcblwiKSkubGVuZ3RoO1xuXHQgICAgICAgIFx0fSxcblx0ICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RleHRhcmVhJykuc2VsZWN0aW9uU3RhcnQ9PT1cIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmYXVsdHMudGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZG9jdW1lbnQuc2VsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FyZXRQb3MgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlID0gZGVmYXVsdHMudGV4dGFyZWEuY3JlYXRlVGV4dFJhbmdlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VEdXBlID0gZG9jdW1lbnQuc2VsZWN0aW9uLmNyZWF0ZVJhbmdlKCkuZHVwbGljYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VEdXBlQm9va21hcmsgPSByYW5nZUR1cGUuZ2V0Qm9va21hcmsoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlLm1vdmVUb0Jvb2ttYXJrKHJhbmdlRHVwZUJvb2ttYXJrKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJhbmdlLm1vdmVTdGFydCgnY2hhcmFjdGVyJyAsIC0xKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhcmV0UG9zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FyZXRQb3M7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoIWVuZCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBzdGFydDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdHMudGV4dGFyZWEuc2V0U2VsZWN0aW9uUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzLnRleHRhcmVhLmZvY3VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0cy50ZXh0YXJlYS5zZXRTZWxlY3Rpb25SYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChkZWZhdWx0cy50ZXh0YXJlYS5jcmVhdGVUZXh0UmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYW5nZSA9IGRlZmF1bHRzLnRleHRhcmVhLmNyZWF0ZVRleHRSYW5nZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2UuY29sbGFwc2UodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5tb3ZlRW5kKCdjaGFyYWN0ZXInLCBlbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2UubW92ZVN0YXJ0KCdjaGFyYWN0ZXInLCBzdGFydCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2VsZWN0aW9uOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgdGV4dEFyZWFFbGVtZW50ID0gZGVmYXVsdHMudGV4dGFyZWEsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCA9IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9ybWFsaXplZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0SW5wdXRSYW5nZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZFJhbmdlO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGV4dEFyZWFFbGVtZW50LnNlbGVjdGlvblN0YXJ0ID09IFwibnVtYmVyXCIgJiYgdHlwZW9mIHRleHRBcmVhRWxlbWVudC5zZWxlY3Rpb25FbmQgPT0gXCJudW1iZXJcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSB0ZXh0QXJlYUVsZW1lbnQuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSB0ZXh0QXJlYUVsZW1lbnQuc2VsZWN0aW9uRW5kO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2UgPSBkb2N1bWVudC5zZWxlY3Rpb24uY3JlYXRlUmFuZ2UoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJhbmdlICYmIHJhbmdlLnBhcmVudEVsZW1lbnQoKSA9PSB0ZXh0QXJlYUVsZW1lbnQpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRWYWx1ZSA9IHV0aWxzLmVkaXRvci5nZXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gPSBub3JtYWxpemVkVmFsdWUubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dElucHV0UmFuZ2UgPSB0ZXh0QXJlYUVsZW1lbnQuY3JlYXRlVGV4dFJhbmdlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dElucHV0UmFuZ2UubW92ZVRvQm9va21hcmsocmFuZ2UuZ2V0Qm9va21hcmsoKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRSYW5nZSA9IHRleHRBcmVhRWxlbWVudC5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmRSYW5nZS5jb2xsYXBzZShmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGV4dElucHV0UmFuZ2UuY29tcGFyZUVuZFBvaW50cyhcIlN0YXJ0VG9FbmRcIiwgZW5kUmFuZ2UpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSBlbmQgPSBsZW47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgPSAtdGV4dElucHV0UmFuZ2UubW92ZVN0YXJ0KFwiY2hhcmFjdGVyXCIsIC1sZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydCArPSBub3JtYWxpemVkVmFsdWUuc2xpY2UoMCwgc3RhcnQpLnNwbGl0KG5ld0xpbmUpLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRleHRJbnB1dFJhbmdlLmNvbXBhcmVFbmRQb2ludHMoXCJFbmRUb0VuZFwiLCBlbmRSYW5nZSkgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gbGVuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gLXRleHRJbnB1dFJhbmdlLm1vdmVFbmQoXCJjaGFyYWN0ZXJcIiwgLWxlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgKz0gbm9ybWFsaXplZFZhbHVlLnNsaWNlKDAsIGVuZCkuc3BsaXQobmV3TGluZSkubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGFydD09ZW5kID8gZmFsc2UgOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQ6IGVuZFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlZGl0b3I6IHtcbiAgICAgICAgICAgICAgICBnZXRMaW5lczogZnVuY3Rpb24odGV4dFZhbCl7XG5cdFx0ICAgICAgICBcdHJldHVybiAodGV4dFZhbCkuc3BsaXQoXCJcXG5cIikubGVuZ3RoO1xuXHQgICAgICAgIFx0fSxcblx0ICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVmYXVsdHMudGV4dGFyZWEudmFsdWUucmVwbGFjZSgvXFxyL2csJycpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHMudGV4dGFyZWEudmFsdWUgPSBkYXRhO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmZW5jZVJhbmdlOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBkZWZhdWx0cy5mZW5jZSA9PSBcInN0cmluZ1wiKXtcblxuICAgICAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHV0aWxzLmVkaXRvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhY2tlZCA9IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRmVuY2UgPSBkYXRhLmluZGV4T2YoZGVmYXVsdHMuZmVuY2UpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hDYXNlID0gMDtcblxuICAgICAgICAgICAgICAgICAgICB3aGlsZShtYXRjaGVkRmVuY2U+PTApe1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hDYXNlKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiggcG9zIDwgKG1hdGNoZWRGZW5jZStoYWNrZWQpICl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGhhY2tlZCArPSBtYXRjaGVkRmVuY2UrZGVmYXVsdHMuZmVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGEuc3Vic3RyaW5nKG1hdGNoZWRGZW5jZStkZWZhdWx0cy5mZW5jZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEZlbmNlID0gZGF0YS5pbmRleE9mKGRlZmF1bHRzLmZlbmNlKTtcblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYoIChoYWNrZWQpIDwgcG9zICYmICggKG1hdGNoZWRGZW5jZStoYWNrZWQpID4gcG9zICkgJiYgbWF0Y2hDYXNlJTI9PT0wKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNFdmVuOiBmdW5jdGlvbihfdGhpcyxpKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gaSUyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxldmVsc0RlZXA6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gdXRpbHMuZWRpdG9yLmdldCgpO1xuXG4gICAgICAgICAgICAgICAgdmFyIGxlZnQgPSB2YWwuc3Vic3RyaW5nKDAsIHBvcyksXG4gICAgICAgICAgICAgICAgICAgIGxldmVscyA9IDAsXG4gICAgICAgICAgICAgICAgICAgIGksIGo7XG5cbiAgICAgICAgICAgICAgICBmb3IoaT0wOyBpPGxlZnQubGVuZ3RoOyBpKyspe1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGo9MDsgajxjaGFyU2V0dGluZ3Mua2V5TWFwLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjaGFyU2V0dGluZ3Mua2V5TWFwW2pdLmNhbkJyZWFrKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjaGFyU2V0dGluZ3Mua2V5TWFwW2pdLm9wZW4gPT0gbGVmdC5jaGFyQXQoaSkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXZlbHMrKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihjaGFyU2V0dGluZ3Mua2V5TWFwW2pdLmNsb3NlID09IGxlZnQuY2hhckF0KGkpKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZWxzLS07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHRvRGVjcmVtZW50ID0gMCxcbiAgICAgICAgICAgICAgICAgICAgcXVvdGVNYXAgPSBbXCInXCIsIFwiXFxcIlwiXTtcbiAgICAgICAgICAgICAgICBmb3IoaT0wOyBpPGNoYXJTZXR0aW5ncy5rZXlNYXAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYoY2hhclNldHRpbmdzLmtleU1hcFtpXS5jYW5CcmVhayl7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IoaiBpbiBxdW90ZU1hcCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9EZWNyZW1lbnQgKz0gbGVmdC5zcGxpdChxdW90ZU1hcFtqXSkuZmlsdGVyKHV0aWxzLmlzRXZlbikuam9pbignJykuc3BsaXQoY2hhclNldHRpbmdzLmtleU1hcFtpXS5vcGVuKS5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGZpbmFsTGV2ZWxzID0gbGV2ZWxzIC0gdG9EZWNyZW1lbnQ7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gZmluYWxMZXZlbHMgPj0wID8gZmluYWxMZXZlbHMgOiAwO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRlZXBFeHRlbmQ6IGZ1bmN0aW9uKGRlc3RpbmF0aW9uLCBzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNvdXJjZVtwcm9wZXJ0eV0gJiYgc291cmNlW3Byb3BlcnR5XS5jb25zdHJ1Y3RvciAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlW3Byb3BlcnR5XS5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5kZWVwRXh0ZW5kKGRlc3RpbmF0aW9uW3Byb3BlcnR5XSwgc291cmNlW3Byb3BlcnR5XSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXN0aW5hdGlvbltwcm9wZXJ0eV0gPSBzb3VyY2VbcHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkZXN0aW5hdGlvbjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZGRFdmVudDogZnVuY3Rpb24gYWRkRXZlbnQoZWxlbWVudCwgZXZlbnROYW1lLCBmdW5jKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcil7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsZnVuYyxmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0YWNoRXZlbnQoXCJvblwiK2V2ZW50TmFtZSwgZnVuYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlbW92ZUV2ZW50OiBmdW5jdGlvbiBhZGRFdmVudChlbGVtZW50LCBldmVudE5hbWUsIGZ1bmMpe1xuXHQgICAgICAgICAgICBpZiAoZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKXtcblx0ICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsZnVuYyxmYWxzZSk7XG5cdCAgICAgICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5hdHRhY2hFdmVudCkge1xuXHQgICAgICAgICAgICAgICAgZWxlbWVudC5kZXRhY2hFdmVudChcIm9uXCIrZXZlbnROYW1lLCBmdW5jKTtcblx0ICAgICAgICAgICAgfVxuXHQgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0RXZlbnQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICAgIGlmKGUucHJldmVudERlZmF1bHQpe1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZS5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgaW50ZXJjZXB0ID0ge1xuICAgICAgICAgICAgdGFiS2V5OiBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgICAgICAgaWYoIXV0aWxzLmZlbmNlUmFuZ2UoKSl7IHJldHVybjsgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSA5KSB7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLnByZXZlbnREZWZhdWx0RXZlbnQoZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHRvUmV0dXJuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCd0YWI6YmVmb3JlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHNlbGVjdGlvbiA9IHV0aWxzLmN1cnNvci5zZWxlY3Rpb24oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHV0aWxzLmVkaXRvci5nZXQoKTtcblxuICAgICAgICAgICAgICAgICAgICBpZihzZWxlY3Rpb24pe1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcFN0YXJ0ID0gc2VsZWN0aW9uLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUodGVtcFN0YXJ0LS0pe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZhbC5jaGFyQXQodGVtcFN0YXJ0KT09XCJcXG5cIil7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGlvbi5zdGFydCA9IHRlbXBTdGFydCArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRvSW5kZW50ID0gdmFsLnN1YnN0cmluZyhzZWxlY3Rpb24uc3RhcnQsIHNlbGVjdGlvbi5lbmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzID0gdG9JbmRlbnQuc3BsaXQoXCJcXG5cIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoZS5zaGlmdEtleSl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yKGkgPSAwOyBpPGxpbmVzLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGluZXNbaV0uc3Vic3RyaW5nKDAsdGFiLmxlbmd0aCkgPT0gdGFiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzW2ldID0gbGluZXNbaV0uc3Vic3RyaW5nKHRhYi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvSW5kZW50ID0gbGluZXMuam9pbihcIlxcblwiKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoIHZhbC5zdWJzdHJpbmcoMCxzZWxlY3Rpb24uc3RhcnQpICsgdG9JbmRlbnQgKyB2YWwuc3Vic3RyaW5nKHNlbGVjdGlvbi5lbmQpICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChzZWxlY3Rpb24uc3RhcnQsIHNlbGVjdGlvbi5zdGFydCt0b0luZGVudC5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcihpIGluIGxpbmVzKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZXNbaV0gPSB0YWIgKyBsaW5lc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9JbmRlbnQgPSBsaW5lcy5qb2luKFwiXFxuXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuZWRpdG9yLnNldCggdmFsLnN1YnN0cmluZygwLHNlbGVjdGlvbi5zdGFydCkgKyB0b0luZGVudCArIHZhbC5zdWJzdHJpbmcoc2VsZWN0aW9uLmVuZCkgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHNlbGVjdGlvbi5zdGFydCwgc2VsZWN0aW9uLnN0YXJ0K3RvSW5kZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IHZhbC5zdWJzdHJpbmcoMCwgcG9zKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByaWdodCA9IHZhbC5zdWJzdHJpbmcocG9zKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZGl0ZWQgPSBsZWZ0ICsgdGFiICsgcmlnaHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGUuc2hpZnRLZXkpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHZhbC5zdWJzdHJpbmcocG9zLXRhYi5sZW5ndGgsIHBvcykgPT0gdGFiKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWRpdGVkID0gdmFsLnN1YnN0cmluZygwLCBwb3MtdGFiLmxlbmd0aCkgKyByaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXRpbHMuZWRpdG9yLnNldChlZGl0ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHBvcy10YWIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoZWRpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHBvcyArIHRhYi5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvUmV0dXJuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCd0YWI6YWZ0ZXInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvUmV0dXJuO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudGVyS2V5OiBmdW5jdGlvbiAoZSkge1xuXG4gICAgICAgICAgICAgICAgaWYoIXV0aWxzLmZlbmNlUmFuZ2UoKSl7IHJldHVybjsgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PSAxMykge1xuXG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLnByZXZlbnREZWZhdWx0RXZlbnQoZSk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnZW50ZXI6YmVmb3JlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IHV0aWxzLmVkaXRvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnQgPSB2YWwuc3Vic3RyaW5nKDAsIHBvcyksXG4gICAgICAgICAgICAgICAgICAgICAgICByaWdodCA9IHZhbC5zdWJzdHJpbmcocG9zKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxlZnRDaGFyID0gbGVmdC5jaGFyQXQobGVmdC5sZW5ndGggLSAxKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJpZ2h0Q2hhciA9IHJpZ2h0LmNoYXJBdCgwKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bVRhYnMgPSB1dGlscy5sZXZlbHNEZWVwKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXJJbmRlbnQgPSBcIlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2luZ0JyZWFrID0gXCJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsQ3Vyc29yUG9zLFxuICAgICAgICAgICAgICAgICAgICAgICAgaTtcbiAgICAgICAgICAgICAgICAgICAgaWYoIW51bVRhYnMpe1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxDdXJzb3JQb3MgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUobnVtVGFicy0tKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXJJbmRlbnQrPXRhYjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG91ckluZGVudCA9IG91ckluZGVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsQ3Vyc29yUG9zID0gb3VySW5kZW50Lmxlbmd0aCArIDE7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcihpPTA7IGk8Y2hhclNldHRpbmdzLmtleU1hcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLm9wZW4gPT0gbGVmdENoYXIgJiYgY2hhclNldHRpbmdzLmtleU1hcFtpXS5jbG9zZSA9PSByaWdodENoYXIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zaW5nQnJlYWsgPSBuZXdMaW5lO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGVkaXRlZCA9IGxlZnQgKyBuZXdMaW5lICsgb3VySW5kZW50ICsgY2xvc2luZ0JyZWFrICsgKG91ckluZGVudC5zdWJzdHJpbmcoMCwgb3VySW5kZW50Lmxlbmd0aC10YWIubGVuZ3RoKSApICsgcmlnaHQ7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoZWRpdGVkKTtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MgKyBmaW5hbEN1cnNvclBvcyk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnZW50ZXI6YWZ0ZXInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlS2V5OiBmdW5jdGlvbiAoZSkge1xuXG5cdCAgICAgICAgICAgIGlmKCF1dGlscy5mZW5jZVJhbmdlKCkpeyByZXR1cm47IH1cblxuXHQgICAgICAgICAgICBpZihlLmtleUNvZGUgPT0gOCl7XG5cdCAgICAgICAgICAgIFx0dXRpbHMucHJldmVudERlZmF1bHRFdmVudChlKTtcblxuXHQgICAgICAgICAgICBcdHV0aWxzLl9jYWxsSG9vaygnZGVsZXRlOmJlZm9yZScpO1xuXG5cdCAgICAgICAgICAgIFx0dmFyIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcblx0ICAgICAgICAgICAgICAgICAgICB2YWwgPSB1dGlscy5lZGl0b3IuZ2V0KCksXG5cdCAgICAgICAgICAgICAgICAgICAgbGVmdCA9IHZhbC5zdWJzdHJpbmcoMCwgcG9zKSxcblx0ICAgICAgICAgICAgICAgICAgICByaWdodCA9IHZhbC5zdWJzdHJpbmcocG9zKSxcblx0ICAgICAgICAgICAgICAgICAgICBsZWZ0Q2hhciA9IGxlZnQuY2hhckF0KGxlZnQubGVuZ3RoIC0gMSksXG5cdCAgICAgICAgICAgICAgICAgICAgcmlnaHRDaGFyID0gcmlnaHQuY2hhckF0KDApLFxuXHQgICAgICAgICAgICAgICAgICAgIGk7XG5cblx0ICAgICAgICAgICAgICAgIGlmKCB1dGlscy5jdXJzb3Iuc2VsZWN0aW9uKCkgPT09IGZhbHNlICl7XG5cdCAgICAgICAgICAgICAgICAgICAgZm9yKGk9MDsgaTxjaGFyU2V0dGluZ3Mua2V5TWFwLmxlbmd0aDsgaSsrKSB7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjaGFyU2V0dGluZ3Mua2V5TWFwW2ldLm9wZW4gPT0gbGVmdENoYXIgJiYgY2hhclNldHRpbmdzLmtleU1hcFtpXS5jbG9zZSA9PSByaWdodENoYXIpIHtcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlZGl0ZWQgPSB2YWwuc3Vic3RyaW5nKDAscG9zLTEpICsgdmFsLnN1YnN0cmluZyhwb3MrMSk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5lZGl0b3Iuc2V0KGVkaXRlZCk7XG5cdCAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHBvcyAtIDEpO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuXHQgICAgICAgICAgICAgICAgICAgICAgICB9XG5cdCAgICAgICAgICAgICAgICAgICAgfVxuXHQgICAgICAgICAgICAgICAgICAgIHZhciBlZGl0ZWQgPSB2YWwuc3Vic3RyaW5nKDAscG9zLTEpICsgdmFsLnN1YnN0cmluZyhwb3MpO1xuXHQgICAgICAgICAgICAgICAgICAgIHV0aWxzLmVkaXRvci5zZXQoZWRpdGVkKTtcblx0ICAgICAgICAgICAgICAgICAgICB1dGlscy5jdXJzb3Iuc2V0KHBvcyAtIDEpO1xuXHQgICAgICAgICAgICAgICAgfSBlbHNlIHtcblx0ICAgICAgICAgICAgICAgIFx0dmFyIHNlbCA9IHV0aWxzLmN1cnNvci5zZWxlY3Rpb24oKSxcblx0ICAgICAgICAgICAgICAgIFx0XHRlZGl0ZWQgPSB2YWwuc3Vic3RyaW5nKDAsc2VsLnN0YXJ0KSArIHZhbC5zdWJzdHJpbmcoc2VsLmVuZCk7XG5cdCAgICAgICAgICAgICAgICAgICAgdXRpbHMuZWRpdG9yLnNldChlZGl0ZWQpO1xuXHQgICAgICAgICAgICAgICAgICAgIHV0aWxzLmN1cnNvci5zZXQocG9zKTtcblx0ICAgICAgICAgICAgICAgIH1cblxuXHQgICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCdkZWxldGU6YWZ0ZXInKTtcblxuXHQgICAgICAgICAgICB9XG5cdCAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjaGFyRnVuY3MgPSB7XG4gICAgICAgICAgICBvcGVuZWRDaGFyOiBmdW5jdGlvbiAoX2NoYXIsIGUpIHtcbiAgICAgICAgICAgICAgICB1dGlscy5wcmV2ZW50RGVmYXVsdEV2ZW50KGUpO1xuICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnb3BlbkNoYXI6YmVmb3JlJyk7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gdXRpbHMuZWRpdG9yLmdldCgpLFxuICAgICAgICAgICAgICAgICAgICBsZWZ0ID0gdmFsLnN1YnN0cmluZygwLCBwb3MpLFxuICAgICAgICAgICAgICAgICAgICByaWdodCA9IHZhbC5zdWJzdHJpbmcocG9zKSxcbiAgICAgICAgICAgICAgICAgICAgZWRpdGVkID0gbGVmdCArIF9jaGFyLm9wZW4gKyBfY2hhci5jbG9zZSArIHJpZ2h0O1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdHMudGV4dGFyZWEudmFsdWUgPSBlZGl0ZWQ7XG4gICAgICAgICAgICAgICAgdXRpbHMuY3Vyc29yLnNldChwb3MgKyAxKTtcbiAgICAgICAgICAgICAgICB1dGlscy5fY2FsbEhvb2soJ29wZW5DaGFyOmFmdGVyJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2xvc2VkQ2hhcjogZnVuY3Rpb24gKF9jaGFyLCBlKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBvcyA9IHV0aWxzLmN1cnNvci5nZXQoKSxcbiAgICAgICAgICAgICAgICAgICAgdmFsID0gdXRpbHMuZWRpdG9yLmdldCgpLFxuICAgICAgICAgICAgICAgICAgICB0b092ZXJ3cml0ZSA9IHZhbC5zdWJzdHJpbmcocG9zLCBwb3MgKyAxKTtcbiAgICAgICAgICAgICAgICBpZiAodG9PdmVyd3JpdGUgPT0gX2NoYXIuY2xvc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMucHJldmVudERlZmF1bHRFdmVudChlKTtcbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCdjbG9zZUNoYXI6YmVmb3JlJyk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLmN1cnNvci5zZXQodXRpbHMuY3Vyc29yLmdldCgpICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIHV0aWxzLl9jYWxsSG9vaygnY2xvc2VDaGFyOmFmdGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFjdGlvbiA9IHtcbiAgICAgICAgICAgIGZpbHRlcjogZnVuY3Rpb24gKGUpIHtcblxuICAgICAgICAgICAgICAgIGlmKCF1dGlscy5mZW5jZVJhbmdlKCkpeyByZXR1cm47IH1cblxuICAgICAgICAgICAgICAgIHZhciB0aGVDb2RlID0gZS53aGljaCB8fCBlLmtleUNvZGU7XG5cbiAgICAgICAgICAgICAgICBpZih0aGVDb2RlID09IDM5IHx8IHRoZUNvZGUgPT0gNDAgJiYgZS53aGljaD09PTApeyByZXR1cm47IH1cblxuICAgICAgICAgICAgICAgIHZhciBfY2hhciA9IFN0cmluZy5mcm9tQ2hhckNvZGUodGhlQ29kZSksXG4gICAgICAgICAgICAgICAgICAgIGk7XG5cbiAgICAgICAgICAgICAgICBmb3IoaT0wOyBpPGNoYXJTZXR0aW5ncy5rZXlNYXAubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhclNldHRpbmdzLmtleU1hcFtpXS5jbG9zZSA9PSBfY2hhcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRpZENsb3NlID0gZGVmYXVsdHMub3ZlcndyaXRlICYmIGNoYXJGdW5jcy5jbG9zZWRDaGFyKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0sIGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRpZENsb3NlICYmIGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0ub3BlbiA9PSBfY2hhciAmJiBkZWZhdWx0cy5hdXRvT3Blbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoYXJGdW5jcy5vcGVuZWRDaGFyKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0sIGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJTZXR0aW5ncy5rZXlNYXBbaV0ub3BlbiA9PSBfY2hhciAmJiBkZWZhdWx0cy5hdXRvT3Blbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhckZ1bmNzLm9wZW5lZENoYXIoY2hhclNldHRpbmdzLmtleU1hcFtpXSwgZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdGVuOiBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgICAgICBpZihkZWZhdWx0cy5yZXBsYWNlVGFiKXsgdXRpbHMuYWRkRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlkb3duJywgaW50ZXJjZXB0LnRhYktleSk7IH1cbiAgICAgICAgICAgICAgICBpZihkZWZhdWx0cy5hdXRvSW5kZW50KXsgdXRpbHMuYWRkRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlkb3duJywgaW50ZXJjZXB0LmVudGVyS2V5KTsgfVxuICAgICAgICAgICAgICAgIGlmKGRlZmF1bHRzLmF1dG9TdHJpcCl7IHV0aWxzLmFkZEV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC5kZWxldGVLZXkpOyB9XG5cbiAgICAgICAgICAgICAgICB1dGlscy5hZGRFdmVudChkZWZhdWx0cy50ZXh0YXJlYSwgJ2tleXByZXNzJywgYWN0aW9uLmZpbHRlcik7XG5cbiAgICAgICAgICAgICAgICB1dGlscy5hZGRFdmVudChkZWZhdWx0cy50ZXh0YXJlYSwgJ2tleWRvd24nLCBmdW5jdGlvbigpeyB1dGlscy5fY2FsbEhvb2soJ2tleWRvd24nKTsgfSk7XG4gICAgICAgICAgICAgICAgdXRpbHMuYWRkRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXl1cCcsIGZ1bmN0aW9uKCl7IHV0aWxzLl9jYWxsSG9vaygna2V5dXAnKTsgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGluaXQgPSBmdW5jdGlvbiAob3B0cykge1xuXG4gICAgICAgICAgICBpZihvcHRzLnRleHRhcmVhKXtcbiAgICAgICAgICAgIFx0dXRpbHMuX2NhbGxIb29rKCdpbml0OmJlZm9yZScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB1dGlscy5kZWVwRXh0ZW5kKGRlZmF1bHRzLCBvcHRzKTtcbiAgICAgICAgICAgICAgICB1dGlscy5kZWZpbmVOZXdMaW5lKCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdHMuc29mdFRhYnMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFiID0gXCIgXCIucmVwZWF0KGRlZmF1bHRzLnRhYlNpemUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRhYiA9IFwiXFx0XCI7XG5cbiAgICAgICAgICAgICAgICAgICAgdXRpbHMuZGVmaW5lVGFiU2l6ZShkZWZhdWx0cy50YWJTaXplKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhY3Rpb24ubGlzdGVuKCk7XG4gICAgICAgICAgICAgICAgdXRpbHMuX2NhbGxIb29rKCdpbml0OmFmdGVyJywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHV0aWxzLnJlbW92ZUV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC50YWJLZXkpO1xuXHQgICAgICAgIHV0aWxzLnJlbW92ZUV2ZW50KGRlZmF1bHRzLnRleHRhcmVhLCAna2V5ZG93bicsIGludGVyY2VwdC5lbnRlcktleSk7XG5cdCAgICAgICAgdXRpbHMucmVtb3ZlRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlkb3duJywgaW50ZXJjZXB0LmRlbGV0ZUtleSk7XG5cdCAgICAgICAgdXRpbHMucmVtb3ZlRXZlbnQoZGVmYXVsdHMudGV4dGFyZWEsICdrZXlwcmVzcycsIGFjdGlvbi5maWx0ZXIpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGluaXQodXNlck9wdHMpO1xuXG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IEJlaGF2ZTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGVuZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB0aGlzLkJlaGF2ZSA9IEJlaGF2ZTtcbiAgICAgICAgdGhpcy5CZWhhdmVIb29rcyA9IEJlaGF2ZUhvb2tzO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICBkZWZpbmUoXCJiZWhhdmVcIiwgW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBCZWhhdmU7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSkuY2FsbCh0aGlzKTtcbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIFJvdXRlKGNvbnRyb2xsZXIsIGlkLCB2ZXJiLCB1cmwsIHJvdXRlUGlwZWxpbmUpIHtcbiAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgdGhpcy5pZCA9IGlkO1xuICB0aGlzLnVybCA9IHVybDtcbiAgdGhpcy52ZXJiID0gdmVyYjtcbiAgdGhpcy5yb3V0ZVBpcGVsaW5lID0gcm91dGVQaXBlbGluZTtcbn1cblJvdXRlLnByb3RvdHlwZS52ZXJicyA9IFsnQUxMJywgJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdERUxFVEUnXTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFJvdXRlLnByb3RvdHlwZSwge1xuICBoYW5kbGVyczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5yb3V0ZVBpcGVsaW5lLmhhbmRsZXJBcmdzLm1hcChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLnRvU3RyaW5nKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBSb3V0ZVBpcGVsaW5lKGhhbmRsZXJzKSB7XG4gIC8vIGVuc3VyZSAnQWN0aW9uJyB0eXBlIGhhbmRsZXIgaXMgbGFzdCBhbmQgb25seSBwcmVzZW50IG9uY2UgaWYgYXQgYWxsIHByZXNlbnRcbiAgdGhpcy5oYW5kbGVycyA9IGhhbmRsZXJzO1xufVxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUm91dGVQaXBlbGluZS5wcm90b3R5cGUsIHtcbiAgaGFuZGxlckFyZ3M6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBbXTtcbiAgICAgIHRoaXMuaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgIGFyZ3MucHVzaChoYW5kbGVyIGluc3RhbmNlb2YgSGFuZGxlciA/IGhhbmRsZXIuaGFuZGxlciA6IGhhbmRsZXIpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gYXJncztcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBIYW5kbGVyKG5hbWUsIGhhbmRsZXIpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbn1cblxuZnVuY3Rpb24gTWlkZGxld2FyZShuYW1lLCBoYW5kbGVyKSB7XG4gIEhhbmRsZXIuY2FsbCh0aGlzLCBuYW1lLCBoYW5kbGVyKTtcbn1cbk1pZGRsZXdhcmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShIYW5kbGVyLnByb3RvdHlwZSwge1xuICBjb25zdHJ1Y3Rvcjoge1xuICAgIHZhbHVlOiBNaWRkbGV3YXJlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9XG59KTtcblxuZnVuY3Rpb24gQWN0aW9uKG5hbWUsIGhhbmRsZXIpIHtcbiAgSGFuZGxlci5jYWxsKHRoaXMsIG5hbWUsIGhhbmRsZXIpO1xufVxuQWN0aW9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSGFuZGxlci5wcm90b3R5cGUsIHtcbiAgY29uc3RydWN0b3I6IHtcbiAgICB2YWx1ZTogQWN0aW9uLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICB9XG59KTtcblxuZnVuY3Rpb24gQ29udHJvbGxlcihuYW1lLCBiYXNlVXJsLCBjb2RlKSB7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMuYmFzZVVybCA9IGJhc2VVcmw7XG4gIHRoaXMuY29kZSA9IGNvZGU7XG4gIHRoaXMuX3JvdXRlcyA9IFtdO1xuICB0aGlzLl9taWRkbGV3YXJlID0gW107XG4gIHRoaXMuX2FjdGlvbnMgPSBbXTtcbn1cbkNvbnRyb2xsZXIucHJvdG90eXBlID0ge1xuICBhZGRSb3V0ZTogZnVuY3Rpb24odmVyYiwgdXJsKSB7XG4gICAgdmFyIGhhbmRsZXJzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKS5zcGxpY2UoMik7XG4gICAgdmFyIHJvdXRlUGlwZWxpbmUgPSBuZXcgUm91dGVQaXBlbGluZShoYW5kbGVycyk7XG4gICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHRoaXMsIHV0aWxzLmdldHVpZCgpLCB2ZXJiLCB1cmwsIHJvdXRlUGlwZWxpbmUpO1xuICAgIHRoaXMuX3JvdXRlcy5wdXNoKHJvdXRlKTtcbiAgICByZXR1cm4gcm91dGU7XG4gIH0sXG4gIGZpbmRSb3V0ZTogZnVuY3Rpb24odmVyYiwgdXJsKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JvdXRlcy5maW5kKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnZlcmIgPT09IG5hbWUgJiYgaXRlbS51cmwgPT0gdXJsO1xuICAgIH0pO1xuICB9LFxuICBhZGRBY3Rpb246IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIpIHtcbiAgICB2YXIgYWN0aW9uID0gbmV3IEFjdGlvbihuYW1lLCBoYW5kbGVyKTtcbiAgICB0aGlzLl9hY3Rpb25zLnB1c2goYWN0aW9uKTtcbiAgICByZXR1cm4gYWN0aW9uO1xuICB9LFxuICBmaW5kQWN0aW9uOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGlvbnMuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5uYW1lID09PSBuYW1lO1xuICAgIH0pO1xuICB9LFxuICBhZGRNaWRkbGV3YXJlOiBmdW5jdGlvbihuYW1lLCBoYW5kbGVyKSB7XG4gICAgdmFyIG1pZGRsZXdhcmUgPSBuZXcgTWlkZGxld2FyZShuYW1lLCBoYW5kbGVyKTtcbiAgICB0aGlzLl9taWRkbGV3YXJlLnB1c2gobWlkZGxld2FyZSk7XG4gICAgcmV0dXJuIG1pZGRsZXdhcmU7XG4gIH0sXG4gIGZpbmRNaWRkbGV3YXJlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIHRoaXMuX21pZGRsZXdhcmUuZmluZChmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5uYW1lID09PSBuYW1lO1xuICAgIH0pO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIEFwaShiYXNlVXJsKSB7XG4gIHRoaXMuX2Jhc2VVcmwgPSBiYXNlVXJsO1xuICB0aGlzLl9taWRkbGV3YXJlID0gW107XG4gIHRoaXMuX3VzZU1pZGRsZXdhcmUgPSBbXTtcbiAgdGhpcy5fY29udHJvbGxlcnMgPSBbXTtcbn1cbkFwaS5wcm90b3R5cGUudXNlTWlkZGxld2FyZSA9IGZ1bmN0aW9uKG5hbWUsIGhhbmRsZXIsIGluZGV4KSB7XG4gIHRoaXMuX3VzZU1pZGRsZXdhcmUucHVzaChuZXcgTWlkZGxld2FyZShuYW1lLCBoYW5kbGVyKSk7XG59O1xuQXBpLnByb3RvdHlwZS5hZGRNaWRkbGV3YXJlID0gZnVuY3Rpb24obmFtZSwgaGFuZGxlcikge1xuICB0aGlzLl9taWRkbGV3YXJlLnB1c2gobmV3IE1pZGRsZXdhcmUobmFtZSwgaGFuZGxlcikpO1xufTtcbkFwaS5wcm90b3R5cGUuYWRkQ29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUsIGJhc2VVcmwsIGNvZGUpIHtcblxuICBpZiAoIW5hbWUgfHwgdGhpcy5maW5kQ29udHJvbGxlcihuYW1lKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBDb250cm9sbGVyIE5hbWUnKTtcbiAgfVxuXG4gIHZhciBjb250cm9sbGVyID0gbmV3IENvbnRyb2xsZXIobmFtZSwgYmFzZVVybCwgY29kZSA/IGNvZGUudG9TdHJpbmcoKSA6ICcnKTtcbiAgdGhpcy5fY29udHJvbGxlcnMucHVzaChjb250cm9sbGVyKTtcbiAgcmV0dXJuIGNvbnRyb2xsZXI7XG59O1xuQXBpLnByb3RvdHlwZS5maW5kQ29udHJvbGxlciA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMuX2NvbnRyb2xsZXJzLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuICAgIHJldHVybiBpdGVtLm5hbWUgPT09IG5hbWU7XG4gIH0pO1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKEFwaS5wcm90b3R5cGUsIHtcbiAgcm91dGVzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciByb3V0ZXMgPSBbXTtcbiAgICAgIHRoaXMuX2NvbnRyb2xsZXJzLmZvckVhY2goZnVuY3Rpb24oY29udHJvbGxlcikge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShyb3V0ZXMsIGNvbnRyb2xsZXIuX3JvdXRlcyk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxuICB9XG59KTtcblxuXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZXhwcmVzc2pzIGV4YW1wbGUuLi4uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS1cbnZhciBhcGkgPSBuZXcgQXBpKCcvYXBpJyk7XG5cbmFwaS51c2VNaWRkbGV3YXJlKCdjb29raWUtcGFyc2VyJywgZnVuY3Rpb24ocmVzLCByZXEsIG5leHQpIHtcbiAgLy8gRG8gc29tZXRoaW5nIHVzZWZ1bC5cbiAgLy8gTWF5YmUgbXV0YXRlIHJlcSBvciByZXMgc3RhdGUuXG4gIC8vIFRoZW4gY2FsbCBuZXh0KCkuXG4gIG5leHQoKTtcbn0pO1xuXG5hcGkudXNlTWlkZGxld2FyZSgnYm9keS1wYXJzZXInLCBmdW5jdGlvbihyZXMsIHJlcSwgbmV4dCkge1xuICAvLyBEbyBzb21ldGhpbmcgdXNlZnVsLlxuICAvLyBNYXliZSBtdXRhdGUgcmVxIG9yIHJlcyBzdGF0ZS5cbiAgLy8gVGhlbiBjYWxsIG5leHQoKS5cbiAgbmV4dCgpO1xufSk7XG5cbnZhciBhdXRoTWlkZGxld2FyZSA9IGFwaS5hZGRNaWRkbGV3YXJlKCdhdXRoJywgZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgaWYgKCFyZXEucXVlcnkuYXV0aG1lKSB7XG4gICAgcmVzLnNldFN0YXR1cyg0MDMpO1xuICAgIG5leHQobmV3IEVycm9yKCdVbmF1dGhvcml6ZWQnKSk7XG4gIH0gZWxzZSB7XG4gICAgbmV4dCgpO1xuICB9XG59KTtcblxudmFyIGluZGV4Q29udHJvbGxlciA9IGFwaS5hZGRDb250cm9sbGVyKCdpbmRleCcsICcvJywgZnVuY3Rpb24ocmVxLCByZXMpIHtcblxuICB2YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbiAgLy8uLi5cbiAgLy8uLi5cbiAgLy8uLi5cblxufSk7XG5cbmluZGV4Q29udHJvbGxlci5hZGRSb3V0ZSgnR0VUJywgJy9waW5nJywgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgcmVzLnNlbmQoJ3BvbmcnKTtcbn0pO1xuXG52YXIgdXNlckNvbnRyb2xsZXIgPSBhcGkuYWRkQ29udHJvbGxlcigndXNlcicsICcvdXNlcicsIGZ1bmN0aW9uKHJlcSwgcmVzKSB7XG5cbiAgdmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG4gIC8vLi4uXG4gIC8vLi4uXG4gIC8vLi4uXG5cbn0pO1xuXG5cbnZhciBsb2FkVXNlck1pZGRsZXdhcmUgPSB1c2VyQ29udHJvbGxlci5hZGRNaWRkbGV3YXJlKCdsb2FkLXVzZXInLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuICByZXEudXNlciA9IHtcbiAgICBpZDogMSxcbiAgICBuYW1lOiAnYm9iJ1xuICB9O1xuICBuZXh0KCk7XG59KTtcbnZhciBnZXRVc2VyQWN0aW9uID0gdXNlckNvbnRyb2xsZXIuYWRkQWN0aW9uKCdnZXRVc2VyJywgZnVuY3Rpb24ocmVxLCByZXMpIHtcbiAgY29uc29sZS5sb2cocmVxLnVzZXIpO1xuICByZXMuc2VuZChyZXEudXNlcik7XG59KTtcblxudXNlckNvbnRyb2xsZXIuYWRkUm91dGUoJ0FMTCcsICcvdXNlci8qJywgbG9hZFVzZXJNaWRkbGV3YXJlKTtcbnVzZXJDb250cm9sbGVyLmFkZFJvdXRlKCdHRVQnLCAnL3VzZXIvOmlkJywgZ2V0VXNlckFjdGlvbik7XG5cbm1vZHVsZS5leHBvcnRzID0gYXBpO1xuIiwiZXhwb3J0cy5ybmRzdHIgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICgrbmV3IERhdGUoKSkudG9TdHJpbmcoMzYpO1xufTtcblxuZXhwb3J0cy5nZXR1aWQgPSBmdW5jdGlvbigpIHtcbiAgLy9yZXR1cm4gKCcnICsgTWF0aC5yYW5kb20oKSkucmVwbGFjZSgvXFxEL2csICcnKTtcbiAgcmV0dXJuIE1hdGgucm91bmQoKE1hdGgucmFuZG9tKCkgKiAxZTcpKS50b1N0cmluZygpO1xufTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcInErNjRmd1wiKSkiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJxKzY0ZndcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSJdfQ==
