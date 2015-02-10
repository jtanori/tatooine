'use strict'; 

var express = require('express');
var Parse = require('parse').Parse;
var app = express();
var User = require('./User.js');
var bodyParser = require('body-parser');
var compression = require('compression');
var multer = require('multer');
var _ = require('lodash');
var validations = require('./validations.js');
var ejs = require('ejs-locals');
var MobileDetect = require('mobile-detect');
var s = require("underscore.string");
var helmet = require('helmet');
//Jound utils
var utils = require('./utils.js');

var LocalStorage = require('node-localstorage').LocalStorage;
var isMobile = false, isPhone = false, isTablet = false, isDesktop = true;

this.localStorage = new LocalStorage('./scratch');

Parse.initialize('hq7NqhxfTb2p7vBij2FVjlWj2ookUMIPTmHVF9ZH', 'cdfm37yRroAiw82t1qukKv9rLVhlRqQpKmuVlkLC');

//===============EXPRESS================
// Configure Express
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
var title = 'Jound - Busca y encuentra entre mas de 13000 establecimientos y contando';
var venueFieldsWhitelist = ['name', 'activity_description', 'block', 'building', 'building_floor', 'exterior_letter', 'email_address', 'exterior_number', 'federal_entity', 
                'internal_letter', 'internal_number', 'keywords', 'locality', 'municipality', 'phone_number', 'position', 'postal_code', 'road_name', 
                'road_name_1', 'road_name_2', 'road_name_3', 'road_type', 'road_type_1', 'road_type_2', 'road_type_3', 'settling_name', 'settling_type', 'shopping_center_name', 'shopping_center_store_number', 'shopping_center_type', 'www'];
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
    var currentUser = User.current();
    /*
    * If there is not user we do the following:
    * - Check the request url
    * -- If it is equal to /forgot or /login we continue
    * -- We redirect to /login otherwise (because there is no user)
    */
    if(_.isEmpty(currentUser)){
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

var getVenueByPosition = function(req, res){
    var position = [], venue, venueQuery, geoObject, Venue;
    if (validations.POSITION.test(req.params.position)){
        position = _.map(req.params.position.split(','), function(v){return parseFloat(v.trim());});
        
        Venue = Parse.Object.extend('Location');
        venueQuery = new Parse.Query(Venue);
        geoObject = new Parse.GeoPoint({latitude: position[0], longitude: position[1]});

        venueQuery
            .include('category')
            .equalTo('position', geoObject)
            .select(venueFieldsWhitelist);
    }

    var Category = Parse.Object.extend({className: 'Category'});
    var Categories = Parse.Collection.extend({
        model: Category,
        query: (new Parse.Query(Category)).ascending('name').equalTo('active', true).equalTo('primary', true)
    });
    var categories = new Categories();
    var render = function(data){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: data
        });
    };
    var onVenueLoad = function(v){
        render(
            {
                activeMenuItem: 'home',
                title: 'Jound - ' + v.get('name') + ' en ' + v.get('locality'),
                user: User.current(),
                categories: categories.toJSON() || [],
                position: position,
                venue: v.toJSON()
            }
        );
    };
    var onVenueError = function(e){
        render(
            {
                activeMenuItem: 'home',
                title: title,
                user: User.current(),
                categories: categories.toJSON() || [],
                position: position,
                error: e
            }
        );
    };
    var onLoad = function(){
        if(venueQuery){
            venueQuery.find().then(onVenueLoad).fail(onVenueError);
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: title,
                    user: User.current(),
                    categories: categories.toJSON() || []
                }
            )
        }
    };
    //Try getting those damm categories
    categories.fetch({success: onLoad, error: onLoad});
};

var getVenueById = function(req, res){
    var Venue = Parse.Object.extend('Location');
    var venueQuery = new Parse.Query(Venue);

    venueQuery.include('category').include('logo').select(venueFieldsWhitelist);

    var Category = Parse.Object.extend({className: 'Category'});
    var Categories = Parse.Collection.extend({
        model: Category,
        query: (new Parse.Query(Category)).ascending('name').equalTo('active', true).equalTo('primary', true)
    });
    var categories = new Categories();
    var render = function(data){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: data
        });
    };
    var onVenueLoad = function(v){
        console.log('venueloaded', v.length);
        render(
            {
                activeMenuItem: 'home',
                title: 'Jound - ' + v.get('name') + ' en ' + v.get('locality'),
                user: User.current(),
                categories: categories.toJSON() || [],
                venue: v.toJSON()
            }
        );
    };
    var onVenueError = function(e){
        render(
            {
                activeMenuItem: 'home',
                title: title,
                user: User.current(),
                categories: categories.toJSON() || [],
                error: e
            }
        );
    };
    var onLoad = function(){
        if(venueQuery){
            venueQuery.get(req.params.id, {success: onVenueLoad, error: onVenueError});
        }else{
            render(
                {
                    activeMenuItem: 'home',
                    title: title,
                    user: User.current(),
                    categories: categories.toJSON() || []
                }
            )
        }
    };
    //Try getting those damm categories
    categories.fetch({success: onLoad, error: onLoad});
};

//Main router
var Jound = express.Router();
//Log all requests
Jound.use(logRequest);

Jound.get('/', function(req, res){
    var u = User.current();
    var Category = Parse.Object.extend({className: 'Category'});
    var Categories = Parse.Collection.extend({
        model: Category,
        query: (new Parse.Query(Category)).ascending('name').equalTo('active', true).equalTo('primary', true)
    });
    var categories = new Categories();
    var onLoad = function(){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                activeMenuItem: 'home',
                title: title,
                user: u ? u.getBasicData() : null,
                categories: categories.toJSON() || []
            }
        });
    };
    console.log('current user', u);
    if(u){console.log(u.toJSON(), 'user to json');}
    //Try getting those damm categories
    categories.fetch({success: onLoad, error: onLoad});
});

Jound.get('/venue/:id', getVenueById);
Jound.get('/position/:position', getVenueByPosition);

Jound.get('/profile', checkAuth, function(req, res){
    res.render('profile' + getDeviceExtension(req.headers['user-agent']), {
        data: {
            activeMenuItem: 'profile',
            title: 'Jound - Mi perfil'
        }
    });
});

Jound.post('/search', function(req, res){
    var data = req.body || {};
    var isAjax = req.xhr;
    var Venue = Parse.Object.extend({className: 'Location'});
    var query = new Parse.Query(Venue);
    var Category = Parse.Object.extend('Category');
    var category, position, categoryQuery;
    var onSuccess = function(r){
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            //Parse results
            r.forEach(function(r){
                r.set('name', s(r.get('name')).humanize().value());
                r.set('vecinity_type', s(r.get('vecinity_type')).titleize().value());
                r.set('road_type', s(r.get('road_type')).humanize().value());
                r.set('road_type_1', s(r.get('road_type_1')).humanize().value());
                r.set('road_type_2', s(r.get('road_type_2')).humanize().value());
                r.set('road_type_3', s(r.get('road_type_3')).humanize().value());
                r.set('road_name', s(r.get('road_name')).titleize().value());
                r.set('road_name_1', s(r.get('road_name_1')).titleize().value());
                r.set('road_name_2', s(r.get('road_name_2')).titleize().value());
                r.set('road_name_3', s(r.get('road_name_3')).titleize().value());
                r.set('locality', s(r.get('locality')).titleize().value());
                r.set('municipality', s(r.get('municipality')).titleize().value());
                r.set('federal_entity', s(r.get('federal_entity')).titleize().value());
            });

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
        if(data.q.length === 1){
            query.equalTo('keywords', data.q[0]);
        }else{
            query.containsAll('keywords', data.q);
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
        query
            .select(venueFieldsWhitelist)
            .include('logo')
            .limit(200)
            .find({
                success: onSuccess,
                error: onError
            });
    }else{
        res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
    }
});

//Simple login
Jound.get('/about', function(req, res){
        var u = User.current();

        res.render('about' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - Acerca de la empresa',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.get('/privacy', function(req, res){
        var u = User.current();

        res.render('referrals' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - Politicas de privacidad',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.get('/referrals', function(req, res){
        var u = User.current();
        
        res.render('referrals' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - Nuestro programa de afiliados (en el laboratorio)',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.get('/business-add', function(req, res){
        var u = User.current();
        
        res.render('business-add' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - Agrega tu negocio',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.get('/what-is-jound', function(req, res){
        var u = User.current();
        
        res.render('what-is-jound' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - ¿Que es Jound?',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.get('/products', function(req, res){
        var u = User.current();
        
        res.render('products' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - Agrega tu negocio',
                user: u ? u.getBasicData() : null,
            }
        });
    });

app.use('/', Jound);

app.route('/logout')
    .post(function(req, res){
        var isAjax = req.xhr;

        User.logOut();
        
        if(isAjax){
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({ status: 'success', message: 'Good bye'});
        }else{
            res.redirect('/');
        }
    });

app.route('/become')
    .post(function(req, res){
        var data = req.body || {};
        var isAjax = req.xhr;

        var onSuccess = function(){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({ status: 'success', message: 'Become the bull!' });
            }else{
                res.redirect('/');
            }
        };
        var onError = function(r, e){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            }else{
                res.redirect('/');
            }
        };

        if(data.token && !_.isEmpty(data.token) && _.isString(data.token)){
            User.become(data.token).then(onSuccess).fail(onError);
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
        }
    });

app.route('/login')
    .get(function(req, res){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: title
            }
        });
    })
    .post(function(req, res){
        var data = req.body || {};
        var isAjax = req.xhr;

        var onSuccess = function(){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({ status: 'success',  user: User.current().getBasicData(), token: User.current().getSessionToken()});
            }else{
                res.redirect('/');
            }
        };
        var onError = function(r, e){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            }else{
                res.redirect('/');
            }
        };
        
        if(data.username && validations.EMAIL.test(data.username) && data.password && data.password.length > 4){
            Parse.User.logIn(data.username, data.password, {success: onSuccess, error: onError});
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
        }
    });

app.route('/signup')
    .get(function(req, res){
        res.render('home' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: title
            }
        });
    })
    .post(function(req, res){
        var data = req.body || {};
        var isAjax = req.xhr;

        var onSuccess = function(){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({ status: 'success',  user: User.current().getBasicData(), token: User.current().getSessionToken()});
            }else{
                res.redirect('/');
            }
        };
        var onError = function(r, e){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            }else{
                res.redirect('/');
            }
        };

        if(data.username && validations.EMAIL.test(data.username) && data.password && data.password.length > 4){
            user = new Parse.User();
            user.signUp({username: data.username, password: data.password, email: data.username}, {success:onSuccess, error:onError});
        }else{
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
            }else{
                res.redirect('/');
            }
        }
    });

app.route('/forgot')
    .get(function(req, res){
        res.render('forgot' + getDeviceExtension(req.headers['user-agent']), {
            data: {
                title: 'Jound - ¿Se te olvido el password?'
            }
        });
    })
    .post(function(req, res){
        var data = req.body || {};
        var isAjax = req.xhr;

        var onSuccess = function(){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({ status: 'success',  user: User.current().getBasicData(), token: User.current().getSessionToken()});
            }else{
                res.redirect('/');
            }
        };
        var onError = function(r, e){
            if(isAjax){
                res.setHeader('Content-Type', 'application/json');
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            }else{
                res.redirect('/');
            }
        };

        if(data.username && validations.EMAIL.test(data.username)){
            User.requestPasswordReset(data.username, {success: onSuccess, error: onError});
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid email', code: 602});
        }
    });
//===============START=================
var port = process.env.VCAP_APP_PORT || 4000;
app.listen(port);

console.log('listening on port: ' + port);