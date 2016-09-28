var supermodels = require('supermodels.js')
var prop = require('../prop')

var route = {
  isRoute: prop(Boolean).value(true).enumerable(false).writable(false),
  method: prop(String).value('').required(),
  path: prop(String).value('').required(),
  description: prop(String).value(''),
  ignore: prop(Boolean),
  resource: {
    inline: prop(Boolean).value(true),
    config: prop(String).requiredIf(() => this.inline),
    path: prop(String).value('').name('Resource path').requiredIf(() => !this.inline),
    name: prop(String).value('')
  },
  pathDisplay: prop(String).enumerable(false).get(function () {
    var method = this.method
    var path = this.path
    return method + ' ' + path
  }),
  resourceDisplay: prop(String).enumerable(false).get(function () {
    var resource = this.resource
    var name = resource.name
    return resource.path + (name ? '[' + name + ']' : '')
  }),
  className: prop(String).enumerable(false).get(function () {
    switch (this.method) {
      case 'GET':
        return 'primary'
      case 'POST':
        return 'success'
      case 'PUT':
        return 'warning'
      case 'DELETE':
        return 'danger'
      case 'HEAD':
      case 'OPTIONS':
        return 'info'
      default:
        return 'default'
    }
  }),
  getRowClassName: function (currentRoute) {
    if (currentRoute === this) {
      return this.ignore ? 'text-muted active' : 'active'
    } else {
      return this.ignore ? 'text-muted' : ''
    }
  }
}

var Route = supermodels(route)

module.exports = Route
