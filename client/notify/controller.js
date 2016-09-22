var supermodels = require('supermodels.js')

var schema = {
  items: [{
    icon: String,
    type: String,
    title: String,
    message: String
  }]
}

var Controller = supermodels(schema)

module.exports = Controller
