var Session = require('../models/session');
var fsw = require('../../file-system-watcher');

var Sessions = function(map) {
  this._sessions = [];
  this._map = map;
};
Sessions.prototype.findSession = function(path) {
  var sessions = this._sessions;

  return sessions.find(function(item) {
    return item.path === path;
  });

};
Sessions.prototype.addSession = function(path, data, isUtf8) {

  if (this.findSession(path)) {
    throw new Error('Session for path exists already.');
  }

  var sessions = this._sessions;
  var session = new Session({
    path: path,
    time: Date.now(),
    data: data,
    isUtf8: isUtf8
  });
  sessions.unshift(session);

  return session;
};
Sessions.prototype.removeSession = function(session) {

  var sessions = this._sessions;

  var idx = sessions.indexOf(session);
  if (idx !== -1) {
    sessions.splice(idx, 1);
    return true;
  }

  return false;
};

Object.defineProperties(Sessions.prototype, {
  sessions: {
    get: function() {
      var sessions = this._sessions;
      var map = this._map;
      
      // clean any files that may no longer exist
      var i = sessions.length;
      while (i--) {
        if (!map[sessions[i].path]) {
          sessions.splice(i, 1);
        }
      }
      
      return sessions;
    }
  },
  dirty: {
    get: function() {
      return this.sessions.filter(function(item) {
        return item.isDirty;
      });
    }
  }
});


/*
 * module exports
 */
module.exports = function() {

  var sessions = new Sessions(fsw.map);
  return sessions;

};
