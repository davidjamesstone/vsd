var supermodels = require('supermodels.js')
var prop = supermodels.prop()

prop.prototype.uuid = function () {
  return this.value(function () { return Math.round((Math.random() * 1e7)).toString() })
}

prop.register('required', function () {
  return function (val, name) {
    if (!val) {
      return name + ' is required'
    }
  }
})

prop.register('range', function (min, max) {
  return function (val, name) {
    if (val > max || val < min) {
      return name + ' is out of range'
    }
  }
})

prop.register('min', function (min, max) {
  return function (val, name) {
    if (val < min) {
      return name + ' is less than ' + min
    }
  }
})

prop.register('max', function (max) {
  return function (val, name) {
    if (val > max) {
      return name + ' is greater than ' + max
    }
  }
})

module.exports = prop
