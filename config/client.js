const args = require('./cli').args

const config = {
  ace: {
    tabSize: args.b || 2,
    fontSize: args.f || 12,
    useSoftTabs: !args.d,
    theme: args.m
  }
}

module.exports = config
