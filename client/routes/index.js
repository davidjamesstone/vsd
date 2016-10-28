var patch = require('../patch')
var Controller = require('./controller')
var view = require('./view.html')
var main = require('../main')

var Routes = document.registerElement(
  'vsd-routes', {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            patch(this, view, this.ctrl)
          }
        },
        data: {
          get: function () {
            return this._data
          },
          set: function (value) {
            this._data = value
            var data = JSON.parse(value)
            var ctrl = new Controller({
              main: main,
              path: this.file.path,
              model: data
            })

            // Render on changes to the controller
            ctrl.on('change', function (e) {
              this.render()
            }.bind(this))

            // Emit data changes when the model changes
            ctrl.model.on('change', function (e) {
              var event = new window.CustomEvent('data', {
                detail: {
                  originalEvent: e,
                  data: JSON.stringify(ctrl.model, null, 2)
                }
              })
              this.dispatchEvent(event)
            }.bind(this))

            this.ctrl = ctrl
            this.render()
          }
        }
      })
  }
)

module.exports = Routes
