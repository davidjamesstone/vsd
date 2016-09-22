var fs = require('fs')
var path = require('path')
var Boom = require('boom')
var standard = require('standard')
var pkgCache = {}

function lint (options, request, reply) {
  standard.lintText(request.payload.value, options, function (err, data) {
    if (err) {
      return reply(Boom.badRequest('An error occurred standardizing the code', err))
    }

    var annotations = []
    if (data.errorCount) {
      var messages = data.results[0].messages
      messages.forEach(function (message) {
        annotations.push(
          {
            row: message.line - 1, // must be 0 based
            column: message.column - 1,  // must be 0 based
            text: message.message,  // text to show in tooltip
            type: 'error'
          }
        )
      })
    }

    return reply(annotations)
  })
}

module.exports = {
  method: 'POST',
  path: '/standard',
  config: {
    handler: function (request, reply) {
      var projectDir = request.payload.projectDir
      var pkg = pkgCache[projectDir]

      if (!pkg) {
        fs.readFile(path.join(projectDir, 'package.json'), (err, data) => {
          if (err) {
            request.log(['info', 'error'], err)
          } else {
            try {
              pkg = JSON.parse(data)
            } catch (e) {
            }
          }

          pkgCache[projectDir] = pkg
          lint(pkg.standard, request, reply)
        })
      } else {
        lint(pkg.standard, request, reply)
      }
    }
  }
}
