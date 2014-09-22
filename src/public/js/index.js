window.app = require('./modules/app');

// ***********
// Shims
// ***********
require('./shims/array');

window._api = require('../../shared/api/api');


// ***********
// Directives
// ***********
require('./directives/negate');
require('./directives/focus');
require('./directives/db-diagram');
require('./directives/behave');


// ***********
// Controllers
// ***********

// dialog controllers
require('./controllers/confirm');
require('./controllers/alert');
require('./controllers/prompt');

// db model controllers
require('./controllers/key');
require('./controllers/schema');
require('./controllers/model');
require('./controllers/db');


// api model controllers
require('./api/controllers/api');
require('./api/controllers/controller');
require('./api/controllers/route');
require('./api/controllers/diagram');



// ***********
// Services
// ***********
require('./services/dialog');



// Main App Ctrl
require('./controllers/app');
