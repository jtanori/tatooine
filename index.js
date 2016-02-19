'use strict';
//TODO: Implement API TOKENS
require('newrelic');

var express = require('express');
var helmet = require('helmet');
var bodyParser = require('body-parser');
var compression = require('compression');
var multer = require('multer');
var rollbar = require('rollbar');
var session = require('express-session');
var ParseServer = require('parse-server').ParseServer;
var _ = require('lodash');
var app = express();
const sessions = require("client-sessions");
var forceSSL = require('./middleware/ssl').force(proces.env.HOST_NAME);

if ('production' == app.get('env')) {
  app.use(forceSSL);
}

app.set('port', (process.env.PORT || 5000));
app.use(sessions({
    cookieName: 'session',
    secret: process.env.SESSION_SECRET,
    duration: 24 * 60 * 60 * 1000,
    activeDuration: 1000 * 60 * 20
}));
app.use(rollbar.errorHandler(process.env.ROLLBAR_ACCESS_TOKEN));
app.use(compression());
app.use(bodyParser.json());
app.use(multer());
app.use(express.static(__dirname + '/public'));
app.use(helmet());

var logRequest = function(req, res, next){
    console.log(req.body);
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
};

var Search = require('./Search');
var Analytics = require('./Analytics');
var Geo = require('./Geo.js');
var Newsletter = require('./Newsletter.js');
var Categories = require('./Categories.js');
var Venues = require('./Venue.js');
var Manager = require('./Manager.js');

// Specify the connection string for your mongodb database
// and the location to your Parse cloud code
var Jound = new ParseServer({
  databaseURI: process.env.MONGOLAB_URI,
  cloud: process.env.CLOUD_PATH + '/cloud/main.js', // Provide an absolute path
  appId: process.env.PARSE_APP_ID,
  masterKey: process.env.PARSE_MASTER_KEY,
  javascriptKey: process.env.PARSE_JS_KEY
});

Parse.User.enableRevocableSession();
Parse.User.enableUnsafeCurrentUser();

Jound.use(logRequest);

/**

MAIN API

**/

//POST
//TODO: Improve security on all POST
Jound.post('/venue/:id/unlike', Venues.unlike);
Jound.post('/venue/:id/like', Venues.like);
Jound.post('/venue/:id/reviews', Venues.review);
Jound.post('/venue/:id/checkin', Venues.checkIn);
Jound.post('/venue/:id/claim', Venues.claim);
Jound.post('/venue/:id/update', Venues.updatePage);
Jound.post('/venue/:id/report', Venues.report);
//Jound.post('/venue/add/page', Venues.setPage);
//Jound.post('/venue/update/logo', Venues.setLogo);
Jound.post('/venue/:id/add/photo', Venues.savePhoto);
Jound.post('/venue/:id/channel', Venues.getChannel);
Jound.post('/analytics', Analytics.track);
Jound.post('/subscribe', Newsletter.subscribe);

//GET
Jound.get('/directions/:from/:to', Geo.getDirections);
Jound.get('/directions/:from/:to/:mode', Geo.getDirections);
Jound.get('/venue/:id', Venues.getById);
Jound.get('/venue/:id/products', Venues.getProducts);
Jound.get('/venue/:id/products/:productId', Venues.getProductById);
Jound.get('/venue/:id/products/:productId/include', Venues.getProductForVenue);
Jound.get('/venue/:id/deals', Venues.getDeals);
Jound.get('/venue/:id/events', Venues.getEvents);
Jound.get('/venue/:id/events/:eventId', Venues.getEventById);
Jound.get('/venue/:id/reviews', Venues.reviews);
Jound.get('/venue/:id/checkin', Venues.isUserCheckedIn);
Jound.get('/venue/:id/claimed', Venues.isClaimed);
Jound.get('/search', Search.search);
Jound.get('/categories', Categories.get);
Jound.get('/categories/:id', Categories.getById);

//Default home message
Jound.get('/', function(req, res){
    res.status(200).send('Hello.');
});

// Serve the Parse API on the /parse URL prefix
app.use('/', Jound);

/**

MAIN API END

**/

/**

MANAGER API

**/

var JoundManager = express.Router();

//Add auth checking
JoundManager.use(Manager.check);
//Auth
JoundManager.route('/login').post(Manager.login);
JoundManager.route('/logout').post(Manager.logout);
//Roles and Users
JoundManager.route('/roles').get(Manager.getRoles);
JoundManager.route('/roles/:id').get(Manager.getRoleById);
JoundManager
    .route('/roles/:id/users')
    .get(Manager.getUsersForRole)
    .put(Manager.addUserToRole);
JoundManager.route('/roles/:id/roles')
    .get(Manager.getRolesForRole)
    .put(Manager.addRoleToRole);
JoundManager.route('/users').post(Manager.getUsers);
JoundManager.route('/users/:id').get(Manager.getUser);

//Categories
JoundManager.route('/categories/indicators').get(Manager.getCategoryIndicators);
JoundManager
    .route('/categories/:id')
    .get(Manager.getCategoryById)
    .patch(Manager.updateCategory);
JoundManager
    .route('/categories/:id/i18n')
    .get(Manager.getLocalizationsForCategory)
    .post(Manager.addLocalizationForCategory);
JoundManager
    .route('/categories/:id/i18n/:i18nid')
    .patch(Manager.updateLocalizationForCategory)
    .delete(Manager.removeLocalizationForCategory);
JoundManager
    .route('/categories')
    .get(Manager.getCategories)
    .post(Manager.addCategory);

//Venues
JoundManager
    .route('/venues/collection')
    .post(Manager.saveVenues);

//Geodata
JoundManager
    .route('/countries/:id/states')
    .patch(Manager.addStatesToCountry);
JoundManager
    .route('/countries/:id/states/:stateId')
    .get(Manager.getStateById)
    .patch(Manager.addMunicipalitiesToState);
JoundManager
    .route('/countries/:id')
    .get(Manager.getCountryById);
JoundManager
    .route('/countries')
    .get(Manager.getCountries);
app.use('/manager', JoundManager);

/**

MANAGER API END

*/

var port = process.env.PORT || 5000;

app.listen(port, function() {
  console.log('Jound API running on port ' + port + '.');
});
