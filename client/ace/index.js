var config = require('../../config/client')
var client = require('../client')

function lint (session) {
  if (session.getMode().$id === 'ace/mode/javascript') {
    client.request({
      path: '/standard',
      payload: {
        value: session.getValue(),
        projectDir: window.UCO.path
      },
      method: 'POST'
    }, function (err, payload) {
      if (err) {
        // return util.handleError(err)
      }
      session.setAnnotations(payload)
    })
  }
}

var Ace = document.registerElement(
  'vsd-ace',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        createdCallback: {
          value: function () {
            var editor = window.ace.edit(this)

            // Set editor options
            editor.setOptions({
              enableSnippets: true,
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              tabSize: config.ace.tabSize,
              fontSize: config.ace.fontSize,
              autoScrollEditorIntoView: true,
              // maxLines: config.ace.maxLines
            })

            // Set theme
            if (config.ace.theme) {
              editor.setTheme('ace/theme/' + config.ace.theme)
            }

            // Call change handler when the session changes
            var session = editor.getSession()
            session.setUseWorker(false)

            session.on('change', function (e) {
              // Lint to update annotations
              lint(session)

              if (this.oncontentchange) {
                var event = new window.CustomEvent('contentchange', {
                  detail: {
                    originalEvent: e,
                    contents: session.getValue()
                  }
                })

                this.oncontentchange(event)
              }
            }.bind(this))

            // Properties
            this.editor = editor
            this.session = session
          }
        },
        attributeChangedCallback: {
          value: function (name, previousValue, value) {
            if (name === 'contents') {
              this.session.setValue(value)
            } else if (name === 'mode') {
              this.session.setMode(value)
            }
            lint(this.session)
          }
        },
        focus: {
          value: function () {
            this.editor.focus()
          }
        }
      })
  }
)

module.exports = Ace
