function Session(data) {
  data = data || {};
  this.path = data.path;
  this.time = data.time;
  this.data = data.data || {};
  this.isUtf8 = data.isUtf8;
}
Session.prototype.markClean = function() {
  if (this.data.getUndoManager) {
    this.data.getUndoManager().markClean();
  }
};
Object.defineProperties(Session.prototype, {
  isDirty: {
    get: function() {
      if (this.data.getUndoManager) {
        return !this.data.getUndoManager().isClean();
      }
    }
  }
});
module.exports = Session;
