var patch = require('../patch')
var Controller = require('./controller')
var Model = require('./model')
var view = require('./view.html')

function setModel (el, value) {
  var data = JSON.parse(value)
  var model = new Model(data)

  model.on('change', function (e) {
    if (this.oncontentchange) {
      // Raise a contentchange event
      var event = new window.CustomEvent('contentchange', {
        detail: {
          originalEvent: e,
          contents: JSON.stringify(model, null, 2)
        }
      })

      this.oncontentchange(event)
    }
  }.bind(el))

  el.ctrl.model = model
}

var Routes = document.registerElement(
  'vsd-routes',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            patch(this, view, this.ctrl)
          }
        },
        createdCallback: {
          value: function () {
            var path = this.getAttribute('path')

            var ctrl = new Controller({
              path: path
            })

            this.ctrl = ctrl

            ctrl.on('change', function (e) {
              this.render()
            }.bind(this))

            var contents = this.getAttribute('contents')

            if (contents) {
              setModel(this, contents)
            }
          }
        },
        attributeChangedCallback: {
          value: function (name, previousValue, value) {
            if (name === 'contents') {
              setModel(this, value)
            } else if (name === 'path') {
              this.ctrl.path = value
            }
          }
        }
      })
  }
)

module.exports = Routes
