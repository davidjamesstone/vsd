var main = require('../main')
var Controller = require('./controller')
var view = require('./view.html')
var patch = require('../patch')

var Tree = document.registerElement(
  'vsd-tree',
  {
    prototype: Object.create(
      window.HTMLElement.prototype, {
        render: {
          value: function () {
            var model = this.model
            var tree = model.tree
            var root = tree[0]
            patch(this, view, model, tree, root)
          }
        },
        createdCallback: {
          value: function () {
            var files = main.files
            var model = new Controller({
              main: main,
              expanded: [files[1]]
            })

            model.on('change', function () {
              this.render()
            }.bind(this))

            this.model = model
            this.render()
          }
        }
      })
  }
)

module.exports = Tree
