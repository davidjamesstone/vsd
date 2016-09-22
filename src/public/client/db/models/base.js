module.exports = {
  initialize: function() {},
  toJson: function() {
    return JSON.parse(angular.toJson(this));
  },
  nameRegexValidate: /^[a-zA-Z][a-zA-Z0-9_]{0,29}$/
};
