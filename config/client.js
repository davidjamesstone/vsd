var args = require('./cli').args

var config = {
  ace: {
    tabSize: 2,
    fontSize: 12,
    useSoftTabs: true
  }
}

if (args.f) {
  config = require(args.f)
}

module.exports = config
