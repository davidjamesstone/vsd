const Joi = require('joi')
const schema = require('./schema')
const args = require('./cli').args
const config = require('./server.json')

// Apply command line overrides
if (args.p) {
  config.server.port = args.p
}

if (args.s) {
  config.server.host = args.s
}

// Validate config
const result = Joi.validate(config, schema, {
  abortEarly: false
})

// Throw if config is invalid
if (result.error) {
  throw new Error('The server config is invalid. ' + result.error.message)
}

// Return the config
module.exports = result.value
