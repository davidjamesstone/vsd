var supermodels = require('supermodels.js')
var prop = require('../prop')
var Route = require('./route')

var model = {
  name: prop(String).value('').required(),
  description: prop(String).value(''),
  routes: [Route]
}

var Model = supermodels(model)

module.exports = Model
