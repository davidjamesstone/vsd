
// ***********
// Shims
// ***********
require('./array'); // custom array prototype move method
require('array.prototype.find');
require('array.prototype.findindex');
require('string.prototype.endswith');


// load client app
window.app = require('./app');


//
// // db model controllers
// require('./controllers/key');
// require('./controllers/array-def');
// require('./controllers/schema');
// require('./controllers/model');
// require('./controllers/db');
//
//
// // api model controllers
// require('./api/controllers/api');
// require('./api/controllers/controller');
// require('./api/controllers/handler');
// require('./api/controllers/route');
// require('./api/controllers/action');
// require('./api/controllers/diagram');
// require('./api/controllers/add-resource');
