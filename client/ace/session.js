var config = window.UCO.config
var EditSession = window.ace.require('ace/edit_session').EditSession
var UndoManager = window.ace.require('ace/undomanager').UndoManager

module.exports = function (contents, mode) {
  var editSession = new EditSession(contents, mode)
  editSession.setUseWorker(false)
  editSession.setTabSize(config.ace.tabSize)
  editSession.setUseSoftTabs(config.ace.useSoftTabs)
  editSession.setUndoManager(new UndoManager())
  return editSession
}
