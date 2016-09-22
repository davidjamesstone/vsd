var ctrl = require('./controller')
var view = require('./view.html')
var patch = require('../patch')
var files = window.UCO.files

var Fs = document.registerElement(
  'vsd-sidebar',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            patch(this, view, ctrl)
          }
        },
        createdCallback: {
          value: function () {
            var update = function update () {
              this.render()
            }.bind(this)

            files.on('change', update)
            ctrl.on('change', update)
            ctrl.recent.on('change', update)

            this.render()
          }
        }
      })
  }
)

module.exports = Fs
