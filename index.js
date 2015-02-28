'use strict'; 

require('newrelic');

var express = require('express');
var session = require('express-session');
var _ = require('lodash');
var Parse = require('parse').Parse;
var s = require("underscore.string");
var bodyParser = require('body-parser');
var compression = require('compression');
var multer = require('multer');
var ejs = require('ejs-locals');
var MobileDetect = require('mobile-detect');
var helmet = require('helmet');
var gmaputil = require('googlemapsutil');
var memjs = require('memjs');
var CryptoJS = require('cryptojs');
var client = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});
var defaultImage = '/images/jound-square.jpg';
var defaultImageType = 'image/jpg';
//Jound utils
var validations = require('./validations.js');
var utils = require('./utils.js');
var Venue = require('./Venue.js');
//Device type
var isMobile = false, isPhone = false, isTablet = false, isDesktop = true;
//Set localstorage
//Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);
//===============EXPRESS================
// Configure Express
var app = express();
app.set('port', (process.env.PORT || 4000));
app.use(session({secret: process.env.SESSION_SECRET, rolling: true, saveUninitialized: true, resave: false}));
app.engine('ejs', ejs);
app.set('views', __dirname + '/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer());
app.use(express.static(__dirname + '/public'));
app.use(helmet());

//===============ROUTES===============
var title = 'Jound - Busca y encuentra entre miles de establecimientos';
var venueFieldsWhitelist = ['name', 'activity_description', 'block', 'building', 'building_floor', 'exterior_letter', 'email_address', 'exterior_number', 'federal_entity', 
                'internal_letter', 'internal_number', 'keywords', 'locality', 'municipality', 'phone_number', 'position', 'postal_code', 'road_name',
                'road_name_1', 'road_name_2', 'road_name_3', 'road_type', 'road_type_1', 'road_type_2', 'road_type_3', 'settling_name', 'settling_type', 'shopping_center_name', 'shopping_center_store_number', 'shopping_center_type', 'www', 'page', 'logo', 'category', 'slug'];
var logRequest = function(req, res, next){
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
}
var getDeviceExtension = function(ua){
    var md = new MobileDetect(ua);

    return md.phone() ? '-phones' : md.tablet() ? '-tablets' : '';
};

// a middleware with no mount path; gets executed for every request to the app
var checkAuth = function (req, res, next) {
    var sess = req.session;
    /*
    * If there is not user we do the following:
    * - Check the request url
    * -- If it is equal to /forgot or /login we continue
    * -- We redirect to /login otherwise (because there is no user)
    */
    if(_.isEmpty(sess.user)){
        switch(req.url){
        case '/forgot':
        case '/login': next(); break;
        case '/': res.redirect('/login'); break;
        default: res.redirect('/'); break;
        }
    /*
    * Otherwise:
    * - Check the request url
    * -- If it is equal to /forgot or /login we redirect to home
    * -- We continue otherwise (because we have a logged in user)
    */
    }else{
        switch(req.url){
        case '/forgot':
        case '/login': res.redirect('/'); break;
        default: next(); break;
        }
    }
};

var Category = Parse.Object.extend({className: 'Category'});
var Categories = Parse.Collection.extend({
    model: Category,
    query: (new Parse.Query(Category)).ascending('pluralized').equalTo('active', true).equalTo('primary', true)
});

var getVenueByPosition = function(req, res){
    var position = keywords = [], venue, venueQuery, geoObject, Venue;
    var protocol = req.connection.encrypted ? 'https' : 'http';
    if (validations.POSITION.test(req.params.position)){
        position = _.map(req.params.position.split(','), function(v){return parseFloat(v.trim());});
        
        venueQuery = new Parse.Query(Venue);
        geoObject = new Parse.GeoPoint({latitude: position[0], longitude: position[1]});

        venueQuery
            .include('category')
            .include('logo')
            .equalTo('position', geoObject)
            .select(venueFieldsWhitelist);
    }

    var categories = new Categories();
    var render = function(data){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: data
        });
    };
    var onVenueLoad = function(v){
        if(v){
            render(
                {
                    activeMenuItem: 'home',
                    title: 'Jound - ' + v[0].get('name') + ' en ' + v[0].get('locality'),
                    categories: categories.toJSON() || [],
                    position: position,
                    venue: v.toJSON(),
                    keywords: keywords,
                    image: venue.logo ? venue.logo : defaultImage
                }
            );
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: title,
                    categories: categories.toJSON() || [],
                    position: position,
                    error: {error: 'No position found'},
                    keywords: keywords,
                    image: defaultImage
                }
            );
        }
        
    };
    var onVenueError = function(e){
        render(
            {
                activeMenuItem: 'home',
                title: title,
                categories: categories.toJSON() || [],
                position: position,
                error: e,
                keywords: keywords,
                image: defaultImage
            }
        );
    };
    var onLoad = function(){
        keywords = categories.toJSON().map(function(c){return {name: c.pluralized, keywords: _.chain(c.keywords).uniq().sort().compact(), id: c.id}});
        
        if(venueQuery){
            venueQuery.first().then(onVenueLoad).fail(onVenueError);
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: title,
                    categories: categories.toJSON() || [],
                    keywords: keywords,
                    image: defaultImage
                }
            )
        }
    };
    
    client.get("categories", function (err, value, key) {
        if (!_.isEmpty(value)) {
            categories.reset(JSON.parse(value));
            onLoad();
        }else{
            //Try getting those damm categories
            categories.fetch({
                success: function(){client.set('categories', JSON.stringify(categories.toJSON())); onLoad();}, 
                error: onLoad
            });
        }
    });
};

var getVenueById = function(req, res){
    var venueQuery = new Parse.Query(Venue);
    var keywords = [];
    var protocol = req.connection.encrypted ? 'https:' : 'http:';

    venueQuery
        .include('category')
        .include('logo')
        .include('page')
        .select(venueFieldsWhitelist);

    
    var categories = new Categories();
    var render = function(data){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: data
        });
    };
    var onVenueLoad = function(v){
        //Fix format (We need to get ride of this)
        v.set('name', s(v.get('name')).humanize().value());
        v.set('vecinity_type', s(v.get('vecinity_type')).titleize().value());
        v.set('road_type', s(v.get('road_type')).humanize().value());
        v.set('road_type_1', s(v.get('road_type_1')).humanize().value());
        v.set('road_type_2', s(v.get('road_type_2')).humanize().value());
        v.set('road_type_3', s(v.get('road_type_3')).humanize().value());
        v.set('road_name', s(v.get('road_name')).titleize().value());
        v.set('road_name_1', s(v.get('road_name_1')).titleize().value());
        v.set('road_name_2', s(v.get('road_name_2')).titleize().value());
        v.set('road_name_3', s(v.get('road_name_3')).titleize().value());
        v.set('locality', s(v.get('locality')).titleize().value());
        v.set('municipality', s(v.get('municipality')).titleize().value());
        v.set('federal_entity', s(v.get('federal_entity')).titleize().value());
        v.set('www', v.get('www').toLowerCase());

        var venue = v.toJSON();
        venue.logo = v.getLogo();

        render(
            {
                activeMenuItem: 'home',
                title: v.get('name') + ', ' + v.get('locality') + ' - Jound',
                categories: categories.toJSON() || [],
                venue: venue,
                keywords: keywords,
                image: venue.logo ? venue.logo : defaultImage,
                url: protocol + '//www.jound.mx/venue/' + v.id
            }
        );
    };
    var onVenueError = function(e){
        render(
            {
                activeMenuItem: 'home',
                title: title,
                categories: categories.toJSON() || [],
                error: e,
                keywords: keywords,
                image: defaultImage,
                url: protocol + '//www.jound.mx'
            }
        );
    };
    var onLoad = function(){
        keywords = categories.toJSON().map(function(c){return {title: c.pluralized, keywords: _.chain(c.keywords).uniq().sort().compact().value().join(' '), id: c.objectId}});

        if(venueQuery){
            venueQuery.get(req.params.id, {success: onVenueLoad, error: onVenueError});
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: title,
                    categories: categories.toJSON() || [],
                    keywords: keywords,
                    image: defaultImage,
                    url: protocol + '//www.jound.mx'
                }
            )
        }
    };
    
    client.get("categories", function (err, value, key) {
        if (!_.isEmpty(value)) {
            categories.reset(JSON.parse(value));
            onLoad();
        }else{
            //Try getting those damm categories
            categories.fetch({
                success: function(){client.set('categories', JSON.stringify(categories.toJSON())); onLoad();}, 
                error: onLoad
            });
        }
    });
};

var getDirections = function(req, res){
    var from = req.params.from;
    var to = req.params.to;

    if(validations.POSITION.test(from) && validations.POSITION.test(to)){
        gmaputil.directions(from, to, null, function(e, r){
            if(e){
                res.status(404).json({ status: 'error', error: e, code: 404 });
            }else{
                res.status(200).json({ status: 'success', message: 'Drive safetly!', results: JSON.parse(r)});
            }
        });
    }else{
        res.status(404).json({ status: 'error', error: 'Invalid data input', code: 404 });
    }
};

var like = function(req, res){
    var data = req.body;
    var userQuery = new Parse.Query(Parse.User);
    var venueQuery = new Parse.Query(Venue);

    if(_.isString(data.u) && _.isString(data.token) && data.id){
        userQuery
            .select('likedVenues').get(data.u)
            .then(function(u){
                venueQuery.get(data.id, {
                    success: function(v){
                        Parse.Cloud.useMasterKey();

                        var relation = v.relation('likedBy');
                        relation.add(u);

                        v.increment('likes')
                            .save()
                            .done(function(){res.status(200).json({ status: 'success' });})
                            .fail(function(m, e){res.status(404).json({ status: 'error', error: e.message, code: e.code });});
                    },
                    error: function(o, e){
                        res.status(400).json({ status: 'error', error: e.message, code: e.code });
                    }
                });    
            })
            .fail(function(o, e){
                res.status(400).json({ status: 'error', error: e.message, code: e.code });
            });
    }else{
        res.status(400).json({ status: 'error', error: 'Unprocessable entity', code: 400 });
    }
};

var unlike = function(req, res){
    var data = req.body;
    var userQuery = new Parse.Query(Parse.User);
    var venueQuery = new Parse.Query(Venue);

    if(_.isString(data.u) && _.isString(data.token) && data.id){
        userQuery
            .select('likedVenues').get(data.u)
            .then(function(u){
                venueQuery.get(data.id, {
                    success: function(v){
                        Parse.Cloud.useMasterKey();

                        var relation = v.relation('likedBy');
                        relation.remove(u);

                        if(v.get('likes') > 0){
                            v.increment('likes', -1)
                        }

                        v.save()
                            .done(function(){res.status(200).json({ status: 'success' });})
                            .fail(function(m, e){res.status(404).json({ status: 'error', error: e.message, code: e.code });});
                    },
                    error: function(o, e){
                        res.status(400).json({ status: 'error', error: e.message, code: e.code });
                    }
                });    
            })
            .fail(function(o, e){
                res.status(400).json({ status: 'error', error: e.message, code: e.code });
            });
    }else{
        res.status(400).json({ status: 'error', error: 'Unprocessable entity', code: 400 });
    }
};

var getAddress = function(req, res){
    var lat = parseFloat(req.body.latitude, 10);
    var lng = parseFloat(req.body.longitude, 10);

    if( validations.POSITION.test(lat + ',' + lng)){
        gmaputil.reverseGeocoding(lat, lng, null, function(e, r){
            if(e){
                res.status(400).json({ status: 'error', error: 'Error getting address', code: 400 });
            }else {
                res.status(200).json({ status: 'success', address: JSON.parse(r)});
            }
        });
    }else{
        res.status(400).json({ status: 'error', error: 'Unprocessable entity', code: 400 });
    }
};

var home = function(req, res){
    var categories = new Categories();
    var keywords = {};
    var protocol = req.connection.encrypted ? 'https' : 'http';
    var onLoad = function(){
        keywords = categories.toJSON().map(function(c){return {title: c.pluralized, keywords: _.chain(c.keywords).uniq().sort().compact().value().join(' '), id: c.objectId}});

        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                activeMenuItem: 'home',
                title: title,
                categories: categories.toJSON() || [],
                keywords: keywords,
                image: defaultImage,
                url: protocol + '//www.jound.mx'
            }
        });
    };
    //Try getting those damm categories
    client.get("categories", function (err, value, key) {
        if (!_.isEmpty(value)) {
            categories.reset(JSON.parse(value));
            onLoad();
        }else{
            //Try getting those damm categories
            categories.fetch({
                success: function(){client.set('categories', JSON.stringify(categories.toJSON())); onLoad();}, 
                error: onLoad
            });
        }
    });
};

var profile = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('profile' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            activeMenuItem: 'profile',
            title: 'Jound - Mi perfil',
            url: protocol + '//www.jound.mx/profile'
        }
    });
};

var search = function(req, res){
    var data = req.body || {};
    var isAjax = req.xhr;
    var query = new Parse.Query(Venue);
    var category, position, categoryQuery;
    var onSuccess = function(r){
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            _.each(r, function(r){ r.set('logo', r.getLogo()); });
            res.status(200).json({ status: 'success', message: 'Become the bull!', results: r});
        }else{
            res.redirect('/');
        }
    };
    var onError = function(e){
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            res.status(404).json({ status: 'error', error: e.message, code: e.code });
        }else{
            res.redirect('/');
        }
    };

    if(data.q){
        var q = _.chain(data.q).compact().uniq().invoke('trim').invoke('toLowerCase').value();

        if(data.q.length === 1){
            query.equalTo('keywords', q[0].toLowerCase());
        }else{
            query.containsAll('keywords', utils.strings.sanitize(q));
        }
    }

    if(data.c && data.c !== 'all'){
        category = new Category();
        category.id = data.c;
        query.equalTo('category', category);
    }

    if(data.p){
        position = new Parse.GeoPoint({latitude: parseFloat(data.p.lat,10), longitude: parseFloat(data.p.lng,10)});
        query.near('position', position);
        query.withinKilometers('position', position, parseFloat(data.p.radius/1000, 10));
    }

    //If keywords or category, and position
    if((data.q || data.c) && data.p){
        Parse.Cloud.useMasterKey();
        query
            .select(venueFieldsWhitelist)
            .include('logo')
            .include('page')
            .limit(200)
            .find({
                success: onSuccess,
                error: onError
            });
    }else{
        res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
    }
};

var about = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('about' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - Acerca de la empresa',
            image: defaultImage,
            url: protocol + '//www.jound.mx/about'
        }
    });
};

var privacy = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('referrals' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - Politicas de privacidad',
            image: defaultImage,
            url: protocol + '//www.jound.mx/privacy'
        }
    });
};

var referrals = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('referrals' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - Nuestro programa de afiliados (en el laboratorio)',
            image: defaultImage,
            url: protocol + '//www.jound.mx/referrals'
        }
    });
};

var businessAdd = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('business-add' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - Agrega tu negocio',
            image: defaultImage,
            url: protocol + '//www.jound.mx/business-add'
        }
    });
};

var whatIsJound = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('what-is-jound' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - ¿Que es Jound?',
            image: defaultImage,
            url: protocol + '//www.jound.mx/what-is-jound'
        }
    });
};

var products = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('products' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - Productos',
            image: defaultImage,
            url: protocol + '//www.jound.mx/products'
        }
    });
};

var forgot = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('forgot' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            title: 'Jound - ¿Se te olvido el password?',
            image: defaultImage,
            url: protocol + '//www.jound.mx/forgot'
        }
    });
};

//Main router
var Jound = express.Router();

Jound.use(logRequest);

Jound.get('/', home);
Jound.get('/venue/:id', getVenueById);
Jound.get('/position/:position', getVenueByPosition);
Jound.get('/directions/:from/:to', getDirections);
Jound.get('/about', about);
Jound.get('/privacy', privacy);
Jound.get('/referrals', referrals);
Jound.get('/about', about);
Jound.get('/profile', checkAuth, profile);
Jound.get('/business-add', businessAdd);
Jound.get('/what-is-jound', whatIsJound);
Jound.get('/products', products);
Jound.get('/forgot', forgot);

Jound.post('/like', like);
Jound.post('/unlike', unlike);
Jound.post('/address', getAddress);
Jound.post('/search', search);

app.use('/', Jound);
/*===============START=================*/
app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});