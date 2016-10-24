var config = require('../../config/client')
var modes = require('../modes')
var EditSession = window.ace.require('ace/edit_session').EditSession
var UndoManager = window.ace.require('ace/undomanager').UndoManager

module.exports = function (contents, file) {
  var editSession = new EditSession(contents, modes(file))
  editSession.setUseWorker(false)
  editSession.setTabSize(config.ace.tabSize)
  editSession.setUseSoftTabs(config.ace.useSoftTabs)
  editSession.setUndoManager(new UndoManager())
  return editSession
}
