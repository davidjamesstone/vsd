module.exports = {
  initialize: function() {},
  toJson: function() {
    return JSON.parse(angular.toJson(this));
  },
  nameRegexValidate: /^[a-zA-Z][a-zA-Z0-9_]{0,29}$/
};

//  var propertyDefinitions = {
//    numberProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          if (!isNaN(value)) {
//            propertyValue = Number(value);
//          }
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    },
//    booleanProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          var val = value && typeof value === 'string' ? value.toLowerCase() : value;
//          propertyValue = val ? Boolean(val === 'false' || val === 'off' ? undefined : val) : undefined;
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    },
//    dateProperty: function (initialValue) {
//      var propertyValue, propertyDescriptor;
//
//      propertyDescriptor = {
//        get: function () {
//          return propertyValue;
//        },
//        set: function (value) {
//          var val = value;
//          propertyValue = val ? new Date(val) : undefined;
//        }
//      };
//      if (initialValue) {
//        propertyDescriptor.set(initialValue);
//      }
//      return propertyDescriptor;
//    }
//  };
