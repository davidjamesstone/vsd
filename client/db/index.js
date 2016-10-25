/* global $ */
var IncrementalDOM = require('incremental-dom')
var patch = IncrementalDOM.patch
var view = require('./view.html')
var keyView = require('./key.html')
var keysView = require('./keys.html')
var modelView = require('./model.html')
var schemaView = require('./schema.html')
var graph = require('./graph')
var Controller = require('./controller')

var Db = document.registerElement('vsd-db', {
  prototype: Object.create(window.HTMLElement.prototype, {
    render: {
      value: function () {
        var ctrl = this.ctrl
        patch(this, function () {
          view(ctrl, modelView, schemaView, keysView, keyView)
        })
      }
    },
    data: {
      get: {
        
      },
      set: {

      }
    },
    attributeChangedCallback: {
      value: function (name, previousValue, value) {
        if (name === 'contents') {
          var data = JSON.parse(value)
          var ctrl = new Controller({ model: data })

          ctrl.currentItem = ctrl.model

          ctrl.on('change', function (e) {
            this.render()
          }.bind(this))

          ctrl.model.on('change', function (e) {
            if (this.oncontentchange) {
              var event = new window.CustomEvent('contentchange', {
                detail: {
                  originalEvent: e,
                  contents: JSON.stringify(ctrl.model, null, 2)
                }
              })

              this.oncontentchange(event)
            }
          }.bind(this))

          this.ctrl = ctrl
          this.render()

          var $svg = this.querySelector('svg')
          $('a.graph', this).on('shown.bs.tab', function (e) {
            graph($svg, ctrl)
            // ctrl.$svg = $svg
          })
        }
      }
    }
  })
})

module.exports = Db
