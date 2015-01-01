require('string.prototype.startswith');
require('string.prototype.endswith');

var express = require('express');
var http = require('http');
var path = require('path');
var sockets = require('./lib/sockets');

var app = express();

/**
 *  Configure express application
 */
app.disable('x-powered-by');
app.enable('verbose errors');

/**
 * Express application middleware
 */
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 300000
}));

/**
 * Register middleware
 */
app.use(function(req, res, next) {
  res.header('Cache-Control', 'public, max-age=300');
  next();
});

/**
 * Register error handling middleware
 */
app.use(function(req, res, next) {
  res.send(404, 'File Not found :(');
});
app.use(function(err, req, res, next) {
  res.send(500, err.stack);
});

/**
 * Initialize Server
 */
var server = http.Server(app);

/**
 * Register socket endpoints
 */
sockets(server);


module.exports = server;
