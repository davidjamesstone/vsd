var args = require('./cli').args

console.log(args)

var config = {
  ace: {
    tabSize: args.b || 2,
    fontSize: args.f || 12,
    useSoftTabs: !args.d
  }
}

module.exports = config
