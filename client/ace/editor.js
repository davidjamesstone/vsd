var config = window.UCO.config
var el = document.getElementById('ace')
var editor = window.ace.edit(el)

// Set editor options
editor.setOptions({
  enableSnippets: true,
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  tabSize: config.ace.tabSize,
  fontSize: config.ace.fontSize,
  autoScrollEditorIntoView: true
})

// Set theme
if (config.ace.theme) {
  editor.setTheme('ace/theme/' + config.ace.theme)
}

module.exports = editor
