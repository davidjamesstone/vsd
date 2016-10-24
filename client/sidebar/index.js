var path = require('path')
var Controller = require('./controller')
var view = require('./view.html')
var patch = require('../patch')
var main = require('../main')

var Sidebar = document.registerElement(
  'vsd-sidebar',
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
            var ctrl = new Controller({
              main: main,
              query: '',
              name: path.basename(window.UCO.path)
            })

            var update = function update () {
              this.render()
            }.bind(this)

            main.on('change', update)
            ctrl.on('change', update)

            this.ctrl = ctrl
            this.render()
          }
        }
      })
  }
)

module.exports = Sidebar
