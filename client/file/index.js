var Model = require('./model')
var view = require('./view.html')
var patch = require('../patch')
var util = require('../util')
var service = require('../file-service')
var files = window.UCO.files

var Fs = document.registerElement(
  'vsd-file',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            var model = this.model
            patch(this, view, model)
          }
        },
        createdCallback: {
          value: function () {
            var model = new Model({
              el: this,
              service: service
            })

            model.on('change', function () {
              this.render()
            }.bind(this))

            this.model = model

            // Look out for changes to the stat
            // Reload the file if it has changed
            // on disk but not initiated by us
            files.on('change', function (e) {
              if (e.target === model.file) {
                if (model.stat.mtime !== model.file.stat.mtime) {
                  this._readFile()
                }
              }
            }.bind(this))

            if (this.getAttribute('src')) {
              this._load()
            }
          }
        },
        attributeChangedCallback: {
          value: function (name, previousValue, value) {
            if (name === 'src') {
              this._load()
            }
          }
        },
        focus: {
          value: function () {
            var child = this.querySelector('[child]')
            child && child.focus()
          }
        },
        _load: {
          value: function () {
            var model = this.model
            var src = this.getAttribute('src')
            var file = files.find(function (item) {
              return item.path === src
            })

            if (!file) {
              return
            }

            model.file = file
            this._readFile()
          }
        },
        _readFile: {
          value: function () {
            var model = this.model
            var file = model.file
            var src = file.path

            service.readFile(src)
              .then(function (result) {
                var payload = result.payload
                model.stat = payload.stat
                file.stat = payload.stat
                model.contents = payload.contents
              })
              .catch(util.handleError)
          }
        }
      })
  }
)

module.exports = Fs
