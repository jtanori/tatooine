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
var Venues = require('./Venue.js');
var app = express();

console.log(__dirname, 'dir name');

app.set('port', (process.env.PORT || 5000));
app.use(session({secret: process.env.SESSION_SECRET, rolling: true, saveUninitialized: true, resave: false}));
app.use(rollbar.errorHandler(process.env.ROLLBAR_ACCESS_TOKEN));
app.use(compression());
app.use(bodyParser.json());
app.use(multer());
app.use(express.static(__dirname + '/public'));
app.use(helmet());

//Enable CORS - Already done by ParseServer
/*app.use(function(req, res, next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    .options('*', function(req, res, next){
        res.end();
    });
*/

var logRequest = function(req, res, next){
    console.log(req.body);
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
};

var Search = require('./Search');
var Analytics = require('./Analytics');
var Geo = require('./Geo.js');
var Newsletter = require('./Newsletter.js');

// Specify the connection string for your mongodb database
// and the location to your Parse cloud code
var Jound = new ParseServer({
  databaseURI: process.env.MONGOLAB_URI,
  cloud: process.env.CLOUD_PATH + '/cloud/main.js', // Provide an absolute path
  appId: process.env.PARSE_APP_ID,
  masterKey: process.env.PARSE_MASTER_KEY,
  javascriptKey: process.env.PARSE_JS_KEY
});

Jound.use(logRequest);


/**

MAIN API

**/


Jound.post('/parse/unlike', Venues.unlike);
Jound.post('/parse/like', Venues.like);
Jound.post('/parse/venue/reviews', Venues.review);
Jound.post('/parse/venue/checkin', Venues.checkIn);
Jound.post('/parse/venue/claim', Venues.claim);
Jound.post('/parse/venue/update', Venues.updatePage);
Jound.post('/parse/venue/report', Venues.report);
Jound.post('/parse/venue/add/page', Venues.setPage);
Jound.post('/parse/venue/update/logo', Venues.setLogo);
Jound.post('/parse/venue/add/photo', Venues.savePhoto);
Jound.post('/parse/analytics', Analytics.track);
Jound.post('/parse/subscribe', Newsletter.subscribe);

Jound.get('/directions/:from/:to', Geo.getDirections);
Jound.get('/directions/:from/:to/:mode', Geo.getDirections);
Jound.get('/parse/venue/:id/channel', Venues.getChannel);
Jound.get('/parse/venue/:id/products', Venues.getProducts);
Jound.get('/parse/venue/:id/products/:id', Venues.getProductById);
Jound.get('/parse/venue/:id/products/:id/include', Venues.getProductForVenue);
Jound.get('/parse/venue/:id/deals', Venues.getDeals);
Jound.get('/parse/venue/:id/events', Venues.getEvents);
Jound.get('/parse/venue/:id/events/:id', Venues.getEventById);
Jound.get('/parse/venue/:id/reviews', Venues.reviews);
Jound.get('/parse/venue/:id/checkin', Venues.isUserCheckedIn);
Jound.get('/parse/venue/:id/claimed', Venues.isClaimed);
Jound.get('/parse/search', Search.search);


/**

MAIN API END

**/

// Serve the Parse API on the /parse URL prefix
app.use('/', Jound);

// Hello world
app.get('/', function(req, res) {
  res.status(200).send('Hello.');
});

var port = process.env.PORT || 5000;

app.listen(port, function() {
  console.log('Jound API running on port ' + port + '.');
});
