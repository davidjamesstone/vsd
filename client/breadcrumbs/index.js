var patch = require('incremental-dom').patch
var view = require('./view.html')
var Model = require('./model')

var Breadcrumbs = document.registerElement(
  'vsd-breadcrumbs',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            patch(this, view, this)
          }
        },
        createdCallback: {
          value: function () {
            var model = new Model(this.model, this.getAttribute('icon'))

            Object.defineProperties(this, {
              model: {
                get: function () {
                  return model
                },
                set: function (value) {
                  model = new Model(value, this.getAttribute('icon'))
                  this.render()
                }
              }
            })

            this.render()
          }
        }
      }
    )
  })

module.exports = Breadcrumbs
