/* global $ */
var view = require('./view.html')
var patch = require('../patch')
var keyView = require('./key.html')
var keysView = require('./keys.html')
var modelView = require('./model.html')
var schemaView = require('./schema.html')
var graph = require('./graph')
var Controller = require('./controller')

var Db = document.registerElement('vsd-db', {
  prototype: Object.create(window.HTMLElement.prototype, {
    createdCallback: {
      value: function () {
        $('a.graph', this).on('shown.bs.tab', function (e) {
          graph(this.querySelector('svg'), this.ctrl)
        })
      }
    },
    render: {
      value: function () {
        var ctrl = this.ctrl
        patch(this, function () {
          view(ctrl, modelView, schemaView, keysView, keyView)
        })
      }
    },
    data: {
      get: function () {
        return this._data
      },
      set: function (value) {
        this._data = value
        var data = JSON.parse(value)
        var ctrl = new Controller({ model: data })
        ctrl.currentItem = ctrl.model

        ctrl.on('change', function (e) {
          this.render()
        }.bind(this))

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
})

module.exports = Db
