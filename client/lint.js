var util = require('./util')
var client = require('./client')

function lint (session) {
  if (session && session.getMode().$id === 'ace/mode/javascript') {
    client.request({
      path: '/standard',
      payload: {
        value: session.getValue(),
        projectDir: window.UCO.path
      },
      method: 'POST'
    }, function (err, payload) {
      if (err) {
        return util.handleError(err)
      }
      session.setAnnotations(payload)
    })
  }
}

module.exports = lint
