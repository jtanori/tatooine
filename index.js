'use strict'; 

require('newrelic');

var express = require('express');
var rollbar = require('rollbar');
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
var MailChimpAPI = require('mailchimp').MailChimpAPI;
var polyline = require('polyline');
var https = require('https');
var sanitizeHtml = require('sanitize-html');
var md5 = require('md5');
var client = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});
var defaultImage = '//www.jound.mx/images/venue_default@2x.jpg';
var defaultImageType = 'image/jpg';

//Jound utils
var validations = require('./validations.js');
var utils = require('./utils.js');
var VenueModule = require('./Venue.js');
var Venue = VenueModule.Venue;
var Channel = require('./Channel.js');
var Geo = require('./GeospatialEntities');

//Device type
var isMobile = false, isPhone = false, isTablet = false, isDesktop = true;
//Main layout
var LAYOUT = 'main';

//Initialize Parse
Parse.initialize(process.env.PARSE_APP_ID, process.env.PARSE_JS_KEY, process.env.PARSE_MASTER_KEY);

//Initialize mailchimp
try { 
    var MailChimpAPIInstance = new MailChimpAPI(process.env.MAILCHIMP_API_KEY, { version : '2.0' });
} catch (error) {
    console.log(error.message);
}

//===============EXPRESS================
// Configure Express
var app = express();
app.set('port', (process.env.PORT || 4000));
app.use(session({secret: process.env.SESSION_SECRET, rolling: true, saveUninitialized: true, resave: false}));
app.use(rollbar.errorHandler('485b224ab6eb401da0855f742dac0c85'));
app.engine('ejs', ejs);
app.set('views', __dirname + '/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(multer());
app.use(express.static(__dirname + '/public'));
app.use(helmet());
//Enable cors
app.use(function(req, res, next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    .options('*', function(req, res, next){
        res.end();
    });

app.locals._ = _;
app.locals.LAYOUT = LAYOUT;

//===============ROUTES===============
var title = process.env.DEFAULT_PAGE_TITLE;
var logRequest = function(req, res, next){
    console.log(req.body);
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
};

var getDeviceExtension = function(ua){
    var md = new MobileDetect(ua);

    return md.phone() ? 'phones' : md.tablet() ? 'tablets' : '';
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

var checkEnvironment = function(req, res, next){
    // Since the session check is performed in all routes we can
    // also configure the layout
    var device = getDeviceExtension(req.headers['user-agent']);
    switch(device){
    case 'phones': app.locals.LAYOUT = LAYOUT = 'phones'; break;
    case 'tablets': app.locals.LAYOUT = LAYOUT = 'tablets'; break;
    default: app.locals.LAYOUT = LAYOUT = 'main'; break;
    }

    next();
};

var Category = Parse.Object.extend('Category');
var Categories = Parse.Collection.extend({
    model: Category,
    query: (new Parse.Query(Category)).ascending('pluralized').equalTo('active', true).equalTo('primary', true)
});

var getVenueByPosition = function(req, res){
    var position = [];
    var keywords = [];
    var venue, venueQuery, geoObject;
    var protocol = req.connection.encrypted ? 'https' : 'http';
    if (validations.POSITION.test(req.params.position)){
        position = _.map(req.params.position.split(','), function(v){return parseFloat(v.trim());});
        
        venueQuery = new Parse.Query(Venue);
        geoObject = new Parse.GeoPoint({latitude: position[0], longitude: position[1]});

        venueQuery
            .include('category')
            .include('logo')
            .include('claimed_by')
            .equalTo('position', geoObject)
            .select(VenueModule.fields);
    }

    var categories = new Categories();
    var render = function(data){
        res.render('home', {
            data: data
        });
    };
    var onVenueLoad = function(v){
        if(!_.isEmpty(v)){
            render(
                {
                    activeMenuItem: 'home',
                    title: 'Jound - ' + v.get('name') + ' en ' + v.get('locality'),
                    categories: categories.toJSON() || [],
                    position: position,
                    venue: v.toJSON(),
                    keywords: keywords,
                    image: v.getLogo()
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

//TODO: Fix this shit
var getVenueById = function(req, res){
    var venueQuery = new Parse.Query(Venue);
    var keywords = [];
    var protocol = req.connection.encrypted ? 'https:' : 'http:';
    var isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

    venueQuery
        .include('category')
        .include('logo')
        .include('cover')
        .include('page')
        .select(VenueModule.fields);

    
    var categories = new Categories();
    var render = function(data){
        data = _.extend(data, {useSearch: true});
        
        res.render('home', {
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
        v.set('www', v.get('www') ? v.get('www').toLowerCase() : '');

        var venue = v.toJSON();
        venue.logo = v.get('logo') ? v.get('logo').toJSON() : undefined;
        venue.category = v.get('category') ? v.get('category').toJSON() : undefined;
        venue.page = v.get('page') ? v.get('page').toJSON() : undefined;
        venue.cover = v.get('cover') ? v.get('cover').toJSON() : undefined;

        if(venue.page && venue.page.about){
            venue.page.about = sanitizeHtml(venue.page.about, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
            });
        }

        if(isAjax){
            res.status(200).json({ status: 'success', venue: venue});
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: v.get('name') + ', ' + v.get('locality') + ' | Jound',
                    categories: categories.toJSON() || [],
                    venue: venue,
                    keywords: keywords,
                    image: v.getLogo(),
                    url: protocol + '//www.jound.mx/venue/' + v.id
                }
            );
        }
    };

    var onVenueError = function(e){
        if(isAjax){
            res.status(404).json({ status: 'error', error: e });
        }else{
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
        }
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
    
    if(isAjax){
        venueQuery.get(req.params.id, {success: onVenueLoad, error: onVenueError});
    }else{
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
    }
};

var getDirections = function(req, res){
    var from = req.params.from;
    var to = req.params.to;
    var options = {};

    if(validations.POSITION.test(from) && validations.POSITION.test(to)){
        switch(req.params.mode){
            case 'bicycling':
                options.mode = 'bicycling';
                break;
            case 'walking':
                options.mode = 'walking';
                break;
        }
        gmaputil.directions(from, to, options, function(e, r){
            if(e){
                res.status(404).json({ status: 'error', error: e, code: 404 });
            }else{
                r = JSON.parse(r);

                try{
                    r.routes[0].legs[0].steps.forEach(function(s){
                        s.decoded_polyline = polyline.decode(s.polyline.points);
                    });
                }catch(e){
                    console.log(e);
                    console.log('error decoding polylines');
                }             
                
                res.status(200).json({ status: 'success', message: 'Drive safetly!', results: r});
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
    var lat = req.body.latitude;
    var lng = req.body.longitude;
    var extended = req.body.extended;

    Geo
        .getAddress(lat, lng, extended)
        .then(function(address){
            res.status(200).json({ status: 'success', address: address});
        }, function(e){
            res.status(400).json({status: 'error', error: e});
        });
};

var home = function(req, res){
    var categories = new Categories();
    var keywords = [];
    var protocol = req.connection.encrypted ? 'https' : 'http';
    var onLoad = function(){
        keywords = categories.toJSON().map(function(c){return {title: c.pluralized, keywords: _.chain(c.keywords).uniq().sort().compact().value().join(' '), id: c.objectId}});

        res.render('home', {
            data: {
                activeMenuItem: 'home',
                title: title,
                categories: categories.toJSON() || [],
                keywords: keywords,
                image: defaultImage,
                url: protocol + '//www.jound.mx',
                useSearch: true
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
    res.render('profile', {
        data: {
            activeMenuItem: 'profile',
            title: 'Mi perfil de Jound | Jound',
            url: protocol + '//www.jound.mx/profile'
        }
    });
};

var search = function(req, res){
    var data = {};
    var isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    var query = new Parse.Query(Venue);
    var category, position, categoryQuery, q;
    
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

    switch(req.method){
    case 'GET': data = {q: req.query.q, p: {lat: req.query.lat, lng: req.query.lng, radius: req.query.radius}}; break;
    default: data = req.body;
    }

    if(data.q){
        q = _.chain(data.q).compact().uniq().invoke('trim').invoke('toLowerCase').value();

        if(data.q.length === 1){
            query.equalTo('keywords', q[0].toLowerCase());
        }else{
            query.containedIn('keywords', utils.strings.sanitize(q));
        }
    }

    if(data.c && data.c !== 'all'){
        query.equalTo('category', new Category({id: data.c}));
    }

    if(data.p){
        position = new Parse.GeoPoint({latitude: parseFloat(data.p.lat,10), longitude: parseFloat(data.p.lng,10)});
        query.near('position', position);
        query.withinKilometers('position', position, parseFloat(data.p.radius/1000, 10) || 1);

        Parse.Cloud.useMasterKey();
        query
            .select(VenueModule.fields)
            .include('logo')
            .include('page')
            .include('claimed_by')
            .limit(200)
            .find({
                success: onSuccess,
                error: onError
            });
    }else{
        res.status(404).json({ status: 'error', error: 'Location is a required value', code: 601});
    }
};

var searchByGET = function(req, res){
    var data = {q: req.query.q, p: {lat: req.query.lat, lng: req.query.lng, radius: req.query.radius}, c: req.query.category};
    var isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;
    var query = new Parse.Query(Venue);
    var category, position, categoryQuery, q;
    var categories = new Categories();
    var keywords = {};
    var protocol = req.connection.encrypted ? 'https' : 'http';
    var venues = [];
    var cities = [];
    var citiesTrack = {};
    var onLoad = function(){
        keywords = categories.toJSON().map(function(c){return {title: c.pluralized, keywords: _.chain(c.keywords).uniq().sort().compact().value().join(' '), id: c.objectId}});

        if(data.q){
            data.q = !_.isEmpty(data.q) ? decodeURIComponent(data.q) : '';
            q = _.chain(data.q.split(',')).compact().uniq().invoke('trim').invoke('toLowerCase').value();

            console.log(q);

            if(data.q.length === 1){
                query.equalTo('keywords', q[0].toLowerCase());
            }else{
                query.containedIn('keywords', utils.strings.sanitize(q));
            }
        }

        if(data.c && data.c !== 'all'){
            query.equalTo('category', new Category({id: data.c}));
        }

        if(data.p && validations.POSITION.test(data.p.lat + ',' + data.p.lng)){
            position = new Parse.GeoPoint({latitude: parseFloat(data.p.lat,10), longitude: parseFloat(data.p.lng,10)});
            query.near('position', position);
            query.withinKilometers('position', position, parseFloat(data.p.radius/1000, 10) || 1);

            Parse.Cloud.useMasterKey();
            query
                .select(VenueModule.fields)
                .include('logo')
                .include('page')
                .include('claimed_by')
                .limit(200)
                .find({
                    success: onSuccess,
                    error: onError
                });
        }else{
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: 'Location is a required value', code: 601});
            }else{
                //Render home page with error message
                render();
            }
        }
    };

    var render = function(){
        res.render('home', {
            data: {
                activeMenuItem: 'home',
                title: title,
                categories: categories.toJSON() || [],
                keywords: keywords,
                image: defaultImage,
                url: protocol + '//www.jound.mx',
                useSearch: true,
                category: category,
                venues: venues
            }
        });
    };
    var onSuccess = function(r){
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            _.each(r, function(r){ r.set('logo', r.getLogo()); });
            res.status(200).json({ status: 'success', message: 'Become the bull!', results: r});
        }else{
            //Render home page
            _.each(r, function(r){ 
                if(!citiesTrack[r.get('locality')]){
                    cities.push(r.get('locality'));
                }

                r.set('logo', r.getLogo());
            });

            cities = _.unique(cities);

            if(cities.length > 2){
                title = (r.length + ' encontrados en ' + cities.join(', ') + ' para "' + (data.q.split(',').join(' ')) + '" | Jound').replace(/,([^,]*)$/, ' y $1');
            }else if(cities.length === 2){
                title = r.length + 'resultados encontrados en ' + cities[0] + ' y ' + cities[1] + ' para "' + (data.q.split(',').join(' ')) + '" | Jound'; 
            } else {
                title = r.length + ' resultados encontrados en ' + cities[0] + ' para "' + (data.q.split(',').join(' ')) + '" | Jound';
            }

            venues = r;
            render();
        }
    };
    var onError = function(e){
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            res.status(404).json({ status: 'error', error: e.message, code: e.code });
        }else{
            //Render home page with error message
            render();
        }
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

var about = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('about', {
        data: {
            title: 'Acerca de Jound | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/about'
        }
    });
};

var help = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('help', {
        data: {
            title: 'Centro de Ayuda Jound | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/help'
        }
    });
};

var privacy = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('privacy', {
        data: {
            title: 'Politicas de privacidad | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/privacy'
        }
    });
};

var referrals = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('referrals', {
        data: {
            title: 'Nuestro programa de afiliados (en el laboratorio) | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/referrals'
        }
    });
};

var businessAdd = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('business-add', {
        data: {
            title: 'Agregar un negocio | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/business-add'
        }
    });
};

var whatIsJound = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('what-is-jound', {
        data: {
            title: '¿Que es Jound? | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/what-is-jound'
        }
    });
};

var products = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('products', {
        data: {
            title: 'Nuestros productos y servicios | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/products'
        }
    });
};

var login = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('login', {
        data: {
            title: 'Crea tu cuenta | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/login'
        }
    });
};

var forgot = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('forgot', {
        data: {
            title: '¿Se te olvido el password? | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/forgot'
        }
    });
};

var newsletterSubscribe = function(req, res){
    var data = req.body;
    var email = data.email;
    var api = MailChimpAPIInstance;

    if(email && api){
        MailChimpAPIInstance.lists_subscribe({id: process.env.NEWSLETTER_LIST_ID, email: {email: email}}, function(error, data){
            if(error){
                res.status(400).json({ status: 'error', error: error});
            }else{
                res.status(200).json({ status: 'success'});
            }
        });
    }else{
        res.status(404).json({ status: 'error', error: 'An error has occurred, please try again', code: 201});
    }
};

var notFound = function(req, res){
    var protocol = req.connection.encrypted ? 'https' : 'http';
    res.render('404', {
        data: {
            title: 'Pagina no encontrada :( | Jound',
            image: defaultImage,
            url: protocol + '//www.jound.mx/404'
        }
    });
};

var getChannelForVenue = function(req, res){
    var body = req.body;
    var url;

    switch(body.type){
    case 'youtube':
        url = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + body.account + '&order=date&key=' + process.env.GOOGLE_SERVER_API_KEY;
        if(body.pageToken){
            url += '&pageToken=' + body.pageToken;
        }

        Channel
            .youtube(url)
            .then(function(data){
                res.status(200).json({status: 'success', data: data});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

        break;
    case 'twitter':

        Channel
            .twitter
            .getTimeline(body.account, body.minId, body.maxId)
            .then(function(data){
                res.status(200).json({status: 'success', data: data});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

        break;

    case 'instagram':

        Channel
            .instagram(body.account, body.id, body.minId, body.maxId)
            .then(function(data){
                res.status(200).json({status: 'success', results: data.results, id: data.id});
            }, function(e){
                console.log(e, 'error');
                res.status(400).json({status: 'error', error: e});
            });

        break;
    default:
        res.status(404).json({status: 'error', error: {message: 'No supported channel found'}});
    }
};

var getProductsForVenue = function(req, res){
    var body = req.body;
    var Product = Parse.Object.extend('Product');
    var query = new Parse.Query(Product);
    var venue = new Venue();

    if(body.id){
        venue.id = body.id;

        query
            .equalTo('client', venue)
            .equalTo('available', true)
            .limit(body.pageSize || 20)
            .descending('name');

        if(body.skip && _.isNumber(body.skip*1)){
            query.skip(body.skip);
        }

        query
            .find()
            .then(function(products){
                res.status(200).json({status: 'success', results: products});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getDealsForVenue = function(req, res){
    var body = req.body;
    var Deal = Parse.Object.extend('Promo');
    var query = new Parse.Query(Deal);
    var venue = new Venue();
    var now = new Date();

    if(body.id){
        venue.id = body.id;

        query
            .equalTo('venue', venue)
            .lessThan('startViewableDate', now)
            .find()
            .then(function(deals){
                res.status(200).json({status: 'success', results: deals});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getEventsForVenue = function(req, res){
    var body = req.body;
    var E = Parse.Object.extend('Event');
    var query = new Parse.Query(E);
    var venue = new Venue();
    var now = new Date();
    var plusFiveDays = new Date((now*1) + (5*24*60*60*1000));

    if(body.id){
        venue.id = body.id;

        query
            .equalTo('venue', venue)
            .equalTo('active', true)
            .lessThan('startViewableDate', new Date())
            .greaterThan('endViewableDate', new Date((now*1) + 5*24*60*60*1000))
            .find()
            .then(function(events){
                res.status(200).json({status: 'success', results: events});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getReviewsForVenue = function(req, res){
    var body = req.body;
    var Review = Parse.Object.extend('Review');
    var query = new Parse.Query(Review);
    var venue = new Venue();

    if(body.id){
        venue.id = body.id;

        query
            .include(['author'])
            .equalTo('venue', venue)
            .descending('createdAt')
            .limit(body.pageSize || 20);

        if(body.skip && _.isNumber(body.skip*1)){
            query.skip(body.skip);
        }

        if(body.maxDate){
            query.lessThan('createdAt', body.maxDate);
        }else if(body.sinceDate){
            query.greaterThan('createdAt', body.sinceDate);
        }

        query
            .find()
            .then(function(reviews){
                reviews = _.map(reviews, function(r){
                    var u = r.get('author').toJSON();
                    var v = r.get('venue').toJSON();
                    var a = u.avatar;

                    if(_.isEmpty(a) || !_.isString(a)){
                        u.avatar = 'http://www.gravatar.com/avatar/' + md5(u.email);
                    }

                    console.log(r.createdAt, r.updatedAt, 'created and updated');

                    return {
                        comments: r.get('comments'),
                        rating: r.get('rating'),
                        createdAt: r.createdAt,
                        updatedAt: r.updatedAt,
                        id: r.id,
                        venue: v,
                        author: u
                    };
                });
                res.status(200).json({status: 'success', results: reviews});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var saveReviewForVenue = function(req, res){
    var body = req.body;
    var Review = Parse.Object.extend('Review');
    var User = Parse.Object.extend('_User');
    var venue = new Venue();
    var user = new User();
    var review = new Review();

    if(body.id && body.userId && body.text && body.text.length){
        body.rating = body.rating || 0;

        venue.id = body.id;
        user.id = body.userId;

        review
            .save({
                author: user,
                venue: venue,
                rating: body.rating,
                comments: body.text
            })
            .then(function(r){
                res.status(200).json({status: 'success', results: r});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
}

var checkIn = function(req, res){
    var body = req.body;
    var User = Parse.Object.extend('_User');
    var Checkin = Parse.Object.extend('Checkin');
    var venue = new Venue();
    var user, c;

    if(body.id && body.userId){
        venue.id = body.id;
        user = new User({id: body.userId});
        c = new Checkin({venue: venue, user: user});

        Parse.Cloud.useMasterKey();

        c
            .save()
            .then(function(){
                return user.increment('checkinCount').save();   
            })
            .then(function(){
                return venue.increment('checkinCount').save();
            })
            .then(function(){
                res.status(200).json({status: 'success', results: c});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var checkUserCheckIn = function(req, res){
    var body = req.body;
    var User = Parse.Object.extend('_User');
    var venue = new Venue();
    var query = new Parse.Query('Checkin');
    var user, date;
    var sixteenHours = 16*60*60*1000;

    if(body.id && body.userId){
        venue.id = body.id;
        user = new User({id: body.userId});
        date = (((new Date())*1)-sixteenHours);

        query
            .equalTo('user', user)
            .equalTo('venue', venue)
            //.greaterThan('createdAt', (new Date(date)).toUTCString())
            .first(function(c){
                console.log('check user checkin', c);
                res.status(200).json({status: 'success', results: c});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var updatePage = function(req, res){
    var body = req.body;
    var Page = Parse.Object.extend('Page');
    var page;

    body.val = body.val || undefined;

    if(body.id && body.attr){
        page = new Page({id: id});
        page
            .save(body.attr, body.val)
            .first(function(result){
                res.status(200).json({status: 'success', results: result});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var claimVenue = function(req, res){
    var body = req.body;
    var User = Parse.Object.extend('_User');
    var Claim = Parse.Object.extend('LocationClaim');
    var claimQuery = new Parse.Query(Claim);
    var user, venue;

    if(body.id && body.userId && body.details){
        venue = new Venue({id: body.id});
        user = new User({id: body.userId});

        claimQuery
            .equalTo('by', user)
            .equalTo('venue', venue)
            .find()
            .then(function(claims){
                if(!_.isEmpty(claims)){
                    return Parse.Promise.error({code: 405, message: "That venue is claimed already"});
                }else{
                    return new Claim({
                        by: user,
                        venue: venue,
                        details: body.details,
                        pending: true,
                        approved: false
                    }).save();
                }
            })
            .then(function(c){
                res.status(200).json({status: 'success', results: c});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
}

var venueIsClaimed = function(req, res){
    var body = req.body;
    var Claim = Parse.Object.extend('LocationClaim');
    var claimQuery = new Parse.Query(Claim);
    var venue;

    if(body.id){
        venue = new Venue({id: body.id});

        claimQuery
            .equalTo('venue', venue)
            .select(['approved', 'pending'])
            .find()
            .then(function(claims){
                if(claims){
                    res.status(200).json({status: 'success', results: claims});
                }else{
                    res.status(200).json({status: 'success', results: []});;
                }
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var report = function(req, res){
    var body = req.body;
    var Ticket = Parse.Object.extend('Ticket');
    var User = Parse.Object.extend('_User');
    var venue, user, ticket;

    if(body.id && body.userId && body.details && body.problemType){
        venue = new Venue({id: body.id});
        user = new User({id: body.userId});

        ticket = new Ticket({
            reporter: user,
            venue: venue,
            story: body.details,
            problemType: body.problemType,
            platformDetails: {
                device: body.device,
                cordova: body.cordova,
                model: body.model,
                platform: body.platform
            },
            parseVersion: body.parseVersion,
            uuid: body.uuid,
            cordovaVersion: body.version
        })
        .save()
        .then(function(r){
                res.status(200).json({status: 'success', results: r});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }    
}

var setPageForVenue = function(req, res){
    var body = req.body;
    var Page = Parse.Object.extend('Page');
    var venues, page;
    var venueQuery = new Parse.Query(Venue);

    if(!_.isEmpty(body.id) && body.pageId){
        page = new Page({id: body.pageId});

        if(_.isString(body.id)){
            body.id = [body.id];
        }

        venueQuery
            .containedIn('objectId', body.id)
            .limit(1000)
            .find(function(venues){

                venues.forEach(function(v){
                    v.set('page', page);
                });

                Parse.Cloud.useMasterKey();

                Parse.Object
                    .saveAll(venues)
                    .then(function(r){
                        res.status(200).json({status: 'success'});
                    }, function(e){
                        res.status(400).json({status: 'error', error: e});
                    });
            }, function(e){
                console.log('no venues found', e);
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    } 
};

var setLogoForVenue = function(req, res){
    var body = req.body;
    var File = Parse.Object.extend('File');
    var venues, file;
    var venueQuery = new Parse.Query(Venue);

    if(!_.isEmpty(body.id) && body.fileId){
        file = new File({id: body.fileId});

        if(_.isString(body.id)){
            body.id = [body.id];
        }

        venueQuery
            .containedIn('objectId', body.id)
            .limit(1000)
            .find(function(venues){

                venues.forEach(function(v){
                    v.set('logo', file);
                });

                Parse.Cloud.useMasterKey();

                Parse.Object
                    .saveAll(venues)
                    .then(function(r){
                        res.status(200).json({status: 'success'});
                    }, function(e){
                        res.status(400).json({status: 'error', error: e});
                    });
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    } 
};

var newVenue = function(req, res){
    var body = req.body;
    var File = Parse.Object.extend('File');
    var User = Parse.Object.extend('_User');
    var position, f, u, v, images, country, city, district;
    var countryQuery, cityQuery, districtQuery, promise = new Parse.Promise();
    var promises = [];

    if(body.userId && body.name && body.phone && body.position && body.position.lat && body.position.lng){
        position = new Parse.GeoPoint({latitude: body.position.lat, longitude: body.position.lng});

        v = new Venue({
            position: position,
            verificationLevel: 2,
            phone_number: body.phone,
            name: body.name,
            checkinCount: 0
        });

        if(body.imageId){
            f = new File({id: body.imageId});
            images = v.relation('imagesRelation');
            images.add(f);
        }

        if(body.owner){
            u = new User({id: body.userId});
            v.set('claimed_by', u);
        }
        //Check for new districts
        if(body.address){
            v.set({
                federal_entity: body.address.adminArea || '',
                locality: body.address.locality || '',
                municipality: body.address.subAdminArea || '',
                settling_name: body.address.subLocality || '',
                road_name: body.address.thoroughfare || '',
                postal_code: body.address.postalCode || ''
            });
        }

        //TODO: allow for category save

        v
            .save()
            .then(function(savedVenue){
                res.status(200).json({status: 'success', venue: savedVenue.toJSON()});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            })

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var savePhotoForVenue = function(req, res){

};

//Main router
var Jound = express.Router();

Jound.use(logRequest);
Jound.use(checkEnvironment);

Jound.get('/', home);
Jound.get('/venue/:id', getVenueById);
Jound.get('/venue/:id/details', getVenueById);
Jound.get('/venue/:id/event/:eventId', getVenueById);
Jound.get('/venue/:id/promo/:eventId', getVenueById);
//Jound.get('/venue/:city/:slug');
Jound.get('/position/:position', getVenueByPosition);
Jound.get('/directions/:from/:to', getDirections);
Jound.get('/directions/:from/:to/:mode', getDirections);
Jound.get('/privacy', function(req, res){res.redirect(301, '/privacidad')});
Jound.get('/privacidad', privacy);
Jound.get('/about', function(req, res){res.redirect(301, 'http://app.jound.mx')});
Jound.get('/help', function(req, res){res.redirect(301, '/ayuda')});
Jound.get('/ayuda', help);
Jound.get('/profile', checkAuth, profile);
Jound.get('/business-add', function(req, res){res.redirect(301, '/agregar-negocio')});
Jound.get('/agregar-negocio', businessAdd);
Jound.get('/what-is-jound', whatIsJound);
Jound.get('/products', function(req, res){res.redirect(301, '/productos')});
Jound.get('/productos', products);
Jound.get('/login', login);
Jound.get('/forgot', forgot);

Jound.post('/like', like);
Jound.post('/unlike', unlike);
Jound.post('/address', getAddress);
Jound.post('/search', search);
Jound.post('/subscribe', newsletterSubscribe);
Jound.post('/getChannelForVenue', getChannelForVenue);
Jound.post('/getProductsForVenue', getProductsForVenue);
Jound.post('/getDealsForVenue', getDealsForVenue);
Jound.post('/getEventsForVenue', getEventsForVenue);
Jound.post('/getReviewsForVenue', getReviewsForVenue);
Jound.post('/saveReviewForVenue', saveReviewForVenue);
Jound.post('/checkIn', checkIn);
Jound.post('/checkUserCheckIn', checkUserCheckIn);
Jound.post('/claimVenue', claimVenue);
Jound.post('/venueIsClaimed', venueIsClaimed);
Jound.post('/updatePage', updatePage);
Jound.post('/report', report);
Jound.post('/setPageForVenue', setPageForVenue);
Jound.post('/setLogoForVenue', setLogoForVenue);
Jound.post('/newVenue', newVenue);
Jound.post('/savePhotoForVenue', savePhotoForVenue);
Jound.get('/search', searchByGET);
Jound.get('404.html', notFound);

app.use('/', Jound);
app.use(notFound);
/*===============START=================*/
app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});