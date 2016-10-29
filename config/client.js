var args = require('./cli').args

var config = {
  ace: {
    tabSize: args.b || 2,
    fontSize: args.f || 12,
    useSoftTabs: !args.d,
    theme: args.m
  }
}

module.exports = config
