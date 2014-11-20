require('string.prototype.startswith');
require('string.prototype.endswith');



var express = require('express');
var http = require('http');
var path = require('path');
// var favicon = require('static-favicon');
// var httpLogger = require('morgan');
// var cookieParser = require('cookie-parser');
// var bodyParser = require('body-parser');
var routes = require('./lib/routes');
// var middleware = require('./lib/middleware');
var sockets = require('./lib/sockets');

//
var app = express();
//
// /*
//  *  Configure express application
//  */
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'vash');
//
// if (process.env.NODE_ENV === 'production') {
//   app.enable('view cache');
// } else {
//   app.disable('view cache');
// }
// app.disable('x-powered-by');
// app.enable('verbose errors');
//
// /*
//  * Express application middleware
//  */
// app.use(cookieParser());
// app.use(httpLogger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded());
//
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 300000
}));
// app.use(middleware.cacheHeader);
//
// /*
//  * Register routes
//  */
app.get('/', routes.home);
// app.get('/graph', routes.graph);
// //app.get('/run-db', routes.runDb);
// // app.get('/header/:workspaceId', routes.header);
// // app.get('/ide', routes.ide);
// // app.get('/ide/:workspaceId', routes.ide);
// // app.get('/workspace/:id', routes.workspace);
// // app.get('/editor', routes.editor);
// // app.get('/tab', routes.tab);
//
//
// var api = require('./shared/api/api');
//
// api._controllers.forEach(function(controller) {
//   controller._routes.forEach(function(route) {
//     var args = [route.url].concat(route.routePipeline.handlerArgs);
//     app[route.verb.toLowerCase()].apply(app, args);
//   });
// });
//
//
//
// var mongoose = require('mongoose');
// var generator = require('vsd-mongoose-generator')(mongoose);
// var mers = require('mers');
//
// mongoose.connect('mongodb://tequid:Babble01@ds035260.mongolab.com:35260/vsd');
//
// var modelData = require('./public/demo.json');
//
// var schemas = generator.generateSchemas(modelData);
//
// var models = generator.generateModels(schemas);
//
// for (var name in models) {
//   models[name].schema.eachPath(function(path) {
//     console.log(path);
//   });
// }
//
// app.use('/rest', mers({
//   mongoose: mongoose
// }).rest());
//
//
//
//
//
//
//
// /*
//  * Register error handling middleware
//  */
// app.use(middleware._404);
// app.use(middleware._500);

// var app = express();
//
// app.route('/events')
// .all(function(req, res, next) {
//   // runs for all HTTP verbs first
//   // think of it as route specific middleware!
//   console.log('all');
//   next();
// })
// .get(function(req, res, next) {console.log('get0'); next(); }, function(req, res) {
//   console.log('get1');
//   res.send('ok');
// });

/*
 * Initialize Server
 */
var server = http.Server(app);

/*
 * Register socket endpoints
 */
sockets(server);


module.exports = server;
