var supermodels = require('supermodels.js')
var File = require('../file')
var Main = require('../controller')
var fileMenu = require('../file-menu')
var treeify = require('./treeify')

function onClick (file) {
  if (file.isDirectory) {
    var expanded = this.isExpanded(file)
    this.isExpanded(file, !expanded)
  }
  return false
}

function onRightClick (e, node) {
  e.preventDefault()
  e.stopPropagation()
  fileMenu.show((e.pageX - 2) + 'px', (e.pageY - 2) + 'px', node)
}

function isExpanded (file, value) {
  var idx = this.expanded.indexOf(file)
  if (arguments.length === 1) {
    return ~idx
  } else {
    if (value) {
      this.expanded.push(file)
    } else {
      this.expanded.splice(idx, 1)
    }
  }
}

var model = {
  main: Main,
  root: Object,
  expanded: [File],
  isExpanded: isExpanded,
  onClick: onClick,
  onRightClick: onRightClick,
  get tree () {
    return treeify(this.main.files.slice(1))
  }
}

var Model = supermodels(model)

module.exports = Model
