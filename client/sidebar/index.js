var ctrl = require('./controller')
var view = require('./view.html')
var patch = require('../patch')
var sessions = require('../sessions')
var files = window.UCO.files

var Sidebar = document.registerElement(
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
            sessions.on('change', update)
            ctrl.on('change', update)
            ctrl.recent.on('change', update)

            this.render()
          }
        }
      })
  }
)

module.exports = Sidebar
