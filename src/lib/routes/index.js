exports.home = function(req, res) {
  res.sendFile('/Users/guest/Documents/tequid/vsd/main.html');
};

exports.graph = function(req, res) {
  res.sendFile('/Users/guest/Documents/tequid/vsd/graph.html');
};
// var mongoose = require('mongoose');
// var generator = require('vsd-mongoose-generator')(mongoose);
// var mers = require('mers');
// exports.runDb = function(req, res) {
//
//   mongoose.connect('mongodb://tequid:Babble01@ds035260.mongolab.com:35260/vsd');
//
//   var modelData = require('../../../public/' + req.query.modelName + '.json');
//
//   var schemas = generator.generateSchemas(modelData);
//
//   var models = generator.generateModels(schemas);
//
//   for (var name in models) {
//     models[name].schema.eachPath(function(path) {
//       console.log(path);
//     });
//   }
//
//   res.send(modelData);
// };
