const fs = require('fs')
const util = require('util')
const path = require('path')
const Boom = require('boom')
const standard = require('standard')
const readFile = util.promisify(fs.readFile)
const pkgCache = {}

function lintText (value, options) {
 return new Promise((resolve, reject) => {
  standard.lintText(value, options, (err, data) => {
    if (err) {
      return reject(err)
    }
    resolve(data)
  })
 })
}

function format (data) {
  const annotations = []
  if (data.errorCount) {
    const messages = data.results[0].messages
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

  return annotations
}

async function lint (value, options) {
  const data = await lintText(value, options)
  return format(data)
}

module.exports = {
  method: 'POST',
  path: '/standard',
  options: {
    handler: async (request, h) => {
      const payload = request.payload
      const value = payload.value
      const projectDir = payload.projectDir
      let pkg = pkgCache[projectDir]

      if (!pkg) {
        try {
          const data = await readFile(path.join(projectDir, 'package.json'))
          pkg = JSON.parse(data)
          pkgCache[projectDir] = pkg
        } catch (err) {
          request.log(['info', 'error'], err)
        }
      }

      try {
        return await lint(value, pkg ? pkg.standard : null)
      } catch (err) {
        return Boom.badRequest('An error occurred standardizing the code', err)
      }

    }
  }
}
