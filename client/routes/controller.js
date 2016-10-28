var path = require('path')
var supermodels = require('supermodels.js')
var Route = require('./route')
var Model = require('./model')
var Main = require('../controller')

var controller = {
  main: Main,
  path: String,
  currentRoute: Route,
  query: String,
  model: Model,
  get filtered () {
    var query = this.query
    var routes = this.model.routes

    if (!query) {
      return routes
    }

    query = query.toLowerCase()

    return routes.filter(function (item) {
      return (item.path && ~item.path.toLowerCase().indexOf(query)) ||
        (item.description && ~item.description.toLowerCase().indexOf(query)) ||
        (item.resource.path && ~item.resource.path.toLowerCase().indexOf(query)) ||
        (item.resource.name && ~item.resource.name.toLowerCase().indexOf(query))
    })
  },
  addRoute: function () {
    var route = new Route({
      method: 'GET'
    })

    this.model.routes.push(route)
    this.currentRoute = route
  },
  removeRoute: function (route) {
    var routes = this.model.routes
    var idx = routes.indexOf(route)
    if (~idx) {
      routes.splice(idx, 1)
      this.currentRoute = routes.length ? routes[0] : null
    }
  },
  onClickErrorNode: function (item) {
    this.currentRoute = item.target.isRoute ? item.target : item.target.__parent
  },
  getRelativePath: function (route) {
    var routeTablePath = this.path

    if (!routeTablePath) {
      return ''
    }

    var projectPath = window.UCO.path
    var routeTableDir = path.dirname(routeTablePath)
    var resourcePath = route.resource.path

    if (resourcePath === './') {
      resourcePath += 'index.js'
    }

    var resolvedPath = path.resolve(routeTableDir, resourcePath)
    var projectRelativePath = path.relative(projectPath, resolvedPath)
    var ext = path.extname(projectRelativePath)

    if (!ext) {
      projectRelativePath += '.js'
    }

    return projectRelativePath
  },
  openRouteResourceFile: function (route) {
    var relativePath = this.getRelativePath(route)
    var file = this.main.findFile(relativePath)

    if (!file) {
      window.alert('404: File not found')
    } else {
      this.main.setCurrentFile(file)
    }
  }
}

var Controller = supermodels(controller)

module.exports = Controller
