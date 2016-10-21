var config = require('../../config/client')
// var client = require('../client')
var el = document.getElementById('ace')
var editor = window.ace.edit(el)

// Set editor options
editor.setOptions({
  enableSnippets: true,
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  tabSize: config.ace.tabSize,
  fontSize: config.ace.fontSize,
  autoScrollEditorIntoView: true // ,
  // maxLines: config.ace.maxLines
})

// Set theme
if (config.ace.theme) {
  editor.setTheme('ace/theme/' + config.ace.theme)
}

module.exports = editor
