const Boom = require('boom')
const standardize = require('standard-format')

module.exports = {
  method: 'POST',
  path: '/standard-format',
  options: {
    handler: (request, h) => {
      try {
        const standardized = standardize.transform(request.payload.value)
        return standardized
      } catch (err) {
        return Boom.badRequest('standard-format threw an error', err)
      }
    }
  }
}
