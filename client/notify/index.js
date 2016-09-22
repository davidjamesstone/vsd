var Controller = require('./controller')
var view = require('./view.html')
var patch = require('../patch')

var Notify = document.registerElement(
  'vsd-notify',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            var ctrl = this.ctrl
            patch(this, view, ctrl)
          }
        },
        createdCallback: {
          value: function () {
            var ctrl = new Controller()

            ctrl.on('change', function () {
              this.render()
            }.bind(this))

            this.ctrl = ctrl
          }
        },
        show: {
          value: function (icon, type, title, message) {
            var ctrl = this.ctrl

            var notification = ctrl.items.create()

            notification.icon = icon
            notification.type = type
            notification.title = title
            notification.message = message

            ctrl.items.push(notification)
            setTimeout(function () {
              var idx = ctrl.items.indexOf(notification)
              if (~idx) {
                ctrl.items.splice(idx, 1)
              }
            }, 2000)
          }
        }
      })
  }
)

module.exports = Notify
