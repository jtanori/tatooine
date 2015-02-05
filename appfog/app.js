'use strict'; 

var express = require('express');
var Parse = require('parse').Parse;
var app = express();
var User = require('./User');
var bodyParser = require('body-parser');
var compression = require('compression');
var multer = require('multer');
var _ = require('lodash');
var validations = require('./validations');
var ejs = require('ejs-locals');
//Jound utils
var utils = require('./utils.js');

var LocalStorage = require('node-localstorage').LocalStorage;

this.localStorage = new LocalStorage('./scratch');

Parse.initialize('hq7NqhxfTb2p7vBij2FVjlWj2ookUMIPTmHVF9ZH', 'cdfm37yRroAiw82t1qukKv9rLVhlRqQpKmuVlkLC');

//===============EXPRESS================
// Configure Express
app.engine('ejs', ejs);
app.set('views', __dirname + '/views');  // Specify the folder to find templates
app.set('view engine', 'ejs');    // Set the template engine
app.use(compression());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(multer());
app.use(express.static(__dirname + '/public'));

//===============ROUTES===============
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

var logRequest = function(req, res, next){
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
}

//Dashboard router
var Dashboard = express.Router();
//Add auth checking
Dashboard.use(checkAuth);
//Log all requests
Dashboard.use(logRequest);

Dashboard.get('/', function(req, res){
    res.render('dashboard', {
        data: {
            activeMenuItem: 'dashboard',
            title: 'Jound Manager :: Dashboard'
        }
    });
});

Dashboard.get('/categories', function(req, res){
    var isAjax = req.xhr;

    if(isAjax){
        var Category = Parse.Object.extend({className: 'Category'});
        var Categories = Parse.Collection.extend({
            model:Category,
            query: (new Parse.Query(Category)).ascending('name')
        });
        //var Country = Parse.Object.extend('Country');
        //var Countries = new Parse.Query(Country);
        //TODO: Fetch countries to return them too
        var categories = new Categories();
        var onLoad = function(){
            res.status(200).json({ status: 'success',  results: categories.toJSON() });
        };
        var onError = function(r, e){
            res.status(404).json({ status: 'error', error: e.message, code: e.code });
        };

        categories.fetch({
            success:onLoad,
            error: onError
        });
    }else{
        res.render('categories', {
            data: {
                activeMenuItem: 'categories',
                title: 'Jound Manager :: Categories'
            }
        });
    }
});

Dashboard.post('/categories/import', function(req, res){
    var isAjax = req.xhr;
    var data = req.body;
    var LocationModel = Parse.Object.extend('Location');
    var Category = Parse.Object.extend('Category');
    var objects = [], ACL, venueObject;

    if(isAjax){
        if(data && data.venues && data.venues.length){
            ACL = new Parse.ACL();
            ACL.setPublicReadAccess(true);
            ACL.setRoleReadAccess('SuperAdministrator', true);
            ACL.setRoleWriteAccess('SuperAdministrator', true);
            ACL.setRoleReadAccess('Administrator', true);
            ACL.setRoleWriteAccess('Administrator', true);
            //Iterate over all venues in the request body
            _.each(data.venues, function(v){
                //Create category for all venues in current object
                var category = new Category();
                category.id = v.category;

                _.each(v.venues, function(venue){

                    //Check if the thing is valid at all, no name, no position, no fucking record.
                    if(_.isNumber(venue.latitud) && _.isNumber(venue.longitud)){
                        //Mea culpa, didn't fix all headers on the CSV files
                        if(venue.latitud){venue.latitude = parseFloat(venue.latitud, 10); delete venue.latitud;}//Fix spanish name for lat/lng
                        if(venue.longitud){venue.longitude = parseFloat(venue.longitud, 10); delete venue.longitud;}
                        if(venue.id){venue.deneueId = venue.id+""; delete venue.id;}//Remove source id (legacy)
                        if(_.isNumber(venue.postal_code)){venue.postal_code = venue.postal_code+"";}
                        if(_.isNumber(venue.phone_number)){venue.phone_number = venue.phone_number+"";}
                        if(_.isNumber(venue.exterior_number)){venue.exterior_number = venue.exterior_number+"";}
                        if(_.isNumber(venue.activity_type)){venue.activity_type = venue.activity_type+"";}
                        if(_.isNumber(venue.road_name)){venue.road_name = venue.road_name+"";}
                        if(_.isNumber(venue.road_name_1)){venue.road_name_1 = venue.road_name_1+"";}//It may happen that PapaParse converts a name such as 43 or 13 to number (logically)
                        if(_.isNumber(venue.road_name_2)){venue.road_name_2 = venue.road_name_2+"";}
                        if(_.isNumber(venue.road_name_3)){venue.road_name_3 = venue.road_name_3+"";}
                        if(_.isNumber(venue.basic_geostatistical_area)){venue.basic_geostatistical_area = venue.basic_geostatistical_area+"";}
                        if(_.isNumber(venue.shopping_center_store_number)){venue.shopping_center_store_number = venue.shopping_center_store_number+"";}
                        if(_.isNumber(venue.building)){venue.building = venue.building+"";}
                        if(_.isNumber(venue.exterior_letter)){venue.exterior_letter = venue.exterior_letter+"";}
                        if(_.isNumber(venue.internal_number)){venue.internal_number = venue.internal_number+"";}
                        if(_.isNumber(venue.internal_letter)){venue.internal_letter = venue.internal_letter+"";}
                        if(_.isNumber(venue.settling_name)){venue.settling_name = venue.settling_name+"";}
                        //Remove extra info if existen
                        if(venue.__parsed_extra){delete venue.__parsed_extra;}
                        //Publish by default
                        venue.online = true;
                        //Set category object
                        venue.category = category;
                        //Add name keywords
                        venue.keywords = venue.keywords.split(',').concat(utils.strings.keywordize(venue.name, ' '));
                        venue.position = new Parse.GeoPoint({latitude: venue.latitude, longitude: venue.longitude});
                        venue.createdBy = User.current();
                        venue.updateHistory = [{op: 'created', timestamp: (new Date())*1, by: User.current().id}];
                        //Add name to object object for latter save
                        venueObject = new LocationModel(venue);
                        venueObject.setACL(ACL);
                        //Push to venues object
                        objects.push(venueObject);
                    }
                });
            });

            var onLoad = function(){
                res.status(200).json({ status: 'success' });
            };
            var onError = function(e){
                console.log(e);
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            };

            //Do the fucked up thing
            Parse.Object.saveAll(objects, {
                success: onLoad,
                error: onError
            });
        }else{
            res.status(404).json({ status: 'error', error: 'Venues can not be empty.'});
        }
    }else {
        res.render('categories', {
            data: {
                activeMenuItem: 'categories',
                title: 'Jound Manager :: Categories'
            }
        });
    }
});

Dashboard.post('/categories', function(req, res){
    var isAjax = req.xhr;
    var data = req.body;

    if(isAjax){
        if(!_.isEmpty(data)){
            //Basic validations
            if(!data.name || data.name.lentth < 3){
                res.status(404).json({ status: 'error', error: 'Name must be at least three characters length.'});
            }
            if(!data.pluralized || data.pluralized.length < 3){
                res.status(404).json({ status: 'error', error: 'Pluralized name must be at least three characters length.'});
            }
            if(!data.primary){
                data.primary = false;
            }
            if(!data.active){
                data.active = false;
            }
            //Save historycal data
            data.createdBy = User.current();
            data.priority = data.priority || 0;
            data.updateHistory = [{op: 'created', timestamp: (new Date())*1, by: User.current().id}];
            //Create category object
            var Category = Parse.Object.extend({className: 'Category'});
            var category = new Category(data);
            //Callbacks
            var onLoad = function(){
                res.status(200).json({ status: 'success',  results: category.toJSON() });
            };
            var onError = function(r, e){
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            };
            //OR Queries
            var nameQuery = new Parse.Query(Category);
            nameQuery.equalTo('name', data.name);

            var pluralQuery = new Parse.Query(Category);
            pluralQuery.equalTo('pluralized', data.pluralized);

            var categoryQuery = Parse.Query.or(nameQuery, pluralQuery);
            //Create public read permissions
            var ACL = new Parse.ACL();
            ACL.setPublicReadAccess(true);
            ACL.setRoleReadAccess('SuperAdministrator', true);
            ACL.setRoleWriteAccess('SuperAdministrator', true);
            ACL.setRoleReadAccess('Administrator', true);
            ACL.setRoleWriteAccess('Administrator', true);
            //Unleash it
            categoryQuery
                .count({
                    success: function(count){
                        //Well at least we can get the ACL, we're good
                        if(count){
                            res.status(404).json({ status: 'error', error: 'Category already exists', code: 403 });
                        }else{
                            category.setACL(ACL);
                            category.save({
                                success:onLoad,
                                error: onError
                            });
                        }
                    }.bind(this),
                    error: function(r, e){
                        res.status(404).json({ status: 'error', error: e.error, code: e.code });
                    }.bind(this)
                });
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid data'});
        }
        
    }else{
        res.render('categories', {
            data: {
                activeMenuItem: 'categories',
                title: 'Jound Manager :: Categories'
            }
        });
    }
});

Dashboard.put('/categories/:id', function(req, res){
    var isAjax = req.xhr;
    var data = req.body;

    if(isAjax){
        if(!_.isEmpty(data)){
            //Basic validations
            if(!data.objectId){
                res.status(404).json({ status: 'error', error: 'Object is can not be null.'});
                return;
            }

            var id = data.objectId;

            if(!data.name || data.name.lentth < 3){
                res.status(404).json({ status: 'error', error: 'Name must be at least three characters length.'});
                return;
            }
            if(!data.pluralized || data.pluralized.length < 3){
                res.status(404).json({ status: 'error', error: 'Pluralized name must be at least three characters length.'});
                return;
            }
            
            console.log(data.keywords.length, 'keywords length');

            if(!data.pluralized || data.pluralized.length < 2){
                res.status(404).json({ status: 'error', error: 'you must provide at least two keywords.'});
                return;
            }
            if(!data.primary){
                data.primary = false;
            }
            if(!data.active){
                data.active = false;
            }
            //Save historycal data
            data.priority = data.priority || 0;
            data.updateHistory = [{op: 'updated', timestamp: (new Date())*1, by: User.current().id}].concat(data.updateHistory);

            //Create category object
            var Category = Parse.Object.extend({className: 'Category'});
            var category = new Category();
            var strippedData = {
                name: data.name,
                pluralized: data.pluralized,
                active: data.active,
                primary: data.primary,
                priority: data.priority*1 || 0,
                keywords: data.keywords,
                displayName: data.displayName,
                updateHistory: data.updateHistory
            };

            category.id = id;

            //Callbacks
            var onLoad = function(){
                res.status(200).json({ status: 'success',  results: category.toJSON() });
            };
            var onError = function(r, e){
                res.status(404).json({ status: 'error', error: e.message, code: e.code });
            };

            var objectQuery = new Parse.Query(Category);
            //OR Queries
            var nameQuery = new Parse.Query(Category);
            nameQuery.equalTo('name', data.name);

            var pluralQuery = new Parse.Query(Category);
            pluralQuery.equalTo('pluralized', data.pluralized);

            var categoryQuery = Parse.Query.or(nameQuery, pluralQuery);
            //Unleash it
            categoryQuery
                .first({
                    success: function(c){
                        if(c.id !== id){
                            res.status(404).json({ status: 'error', error: 'That category name has already been defined in another object: ' + c.id, code: 403 });
                        }
                        else{
                            objectQuery.get(id, {
                                success: function(cat){
                                    cat.save(null, {success: onLoad, error: onError});
                                },
                                error: function(xhr, e){
                                    res.status(404).json({ status: 'error', error: e.message, code: e.code });
                                }
                            })
                        }
                    }.bind(this),
                    error: function(r, e){
                        console.log('not found', r, e);
                        res.status(404).json({ status: 'error', error: e.error, code: e.code });
                    }.bind(this)
                });
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid data'});
        }
        
    }else{
        res.render('categories', {
            data: {
                activeMenuItem: 'categories',
                title: 'Jound Manager :: Categories'
            }
        });
    }
});

Dashboard.get('/geography', function(req, res){
    var countryQuery = new Parse.Query('Country');

    //Just get Mexico for the time being
    countryQuery.equalTo('code', 'MX').first({
        success: function(country){
            console.log('country', country);

            res.render('geography', {
                data: {
                    activeMenuItem: 'geography',
                    title: 'Jound Manager :: Geographic items',
                    country: country.toJSON()
                }
            });
        },
        error: function(){
            res.render('error', {
                data: {
                    activeMenuItem: 'geography',
                    title: 'Jound Manager :: Geographic items'
                }
            });
        }
    });
    
});

Dashboard.get('/venues', checkAuth, function(req, res){
    res.render('venues', {
        data: {
            activeMenuItem: 'venues',
            title: 'Jound Manager :: Venues and pages'
        }
    });
});

Dashboard.get('/users', checkAuth, function(req, res){
    res.render('users', {
        data: {
            activeMenuItem: 'users',
            title: 'Jound Manager :: User and permissions'
        }
    });
});

Dashboard.get('/profile', checkAuth, function(req, res){
    res.render('profile', {
        data: {
            activeMenuItem: 'profile',
            title: 'Jound Manager :: My Profile'
        }
    });
});

Dashboard.get('/logout', checkAuth, function(req, res){
    User.logOut();
    res.redirect('/login');
});

app.use('/', Dashboard);

//Simple login
app.route('/login')
    .get(function(req, res){
        res.render('login', {
            data: {
                title: 'Jound Manager :: Login'
            }
        });
    })
    .post(function(req, res){
        var data = req.body || {};
        //Set json header
        res.setHeader('Content-Type', 'application/json');

        var onSuccess = function(){
            //Check permission levels
            var currentUser = User.current();
            var adminQuery = new Parse.Query(Parse.Role);
            var noAdmin = 'You are not a listed as an administrator, if you think this is an error please contact customer support: <strong>support@jound.mx</strong>. Are you event related to Jound at all? If you think you will hack us stop it! It won\'t happen.';
            adminQuery
                .equalTo('name', 'SuperAdministrator')
                .first({
                    success: function(role){
                        //Well at least we can get the ACL, we're good
                        if(role){
                            var ACL = role.get('ACL');
                            if(currentUser.id in ACL.permissionsById){
                                res.status(200).json({ status: 'success',  user: User.current().toJSON()});
                            }else{
                                User.logOut();
                                res.status(404).json({ status: 'error', error: noAdmin, code: 666 });
                            }
                        }else{
                            User.logOut();
                            res.status(404).json({ status: 'error', error: noAdmin, code: 666 });
                        }
                    }.bind(this),
                    error: function(){
                        User.logOut();
                        res.status(404).json({ status: 'error', error: noAdmin, code: 666 });
                    }.bind(this)
                });
        };
        var onError = function(r, e){
            User.logOut();
            res.status(404).json({ status: 'error', error: e.message, code: e.code });
        };

        if(data.username && validations.EMAIL.test(data.username) && data.password && data.password.length > 4){
            Parse.User.logIn(data.username, data.password, {success: onSuccess, error: onError});
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid parameters', code: 601});
        }
    });

app.route('/forgot')
    .get(function(req, res){
        res.render('forgot', {
            data: {
                title: 'Jound Manager :: Forgot your password?'
            }
        });
    })
    .post(function(req, res){
        var data = req.body || {};

        res.setHeader('Content-Type', 'application/json');

        var onSuccess = function(){
            res.status(200).json({ status: 'success',  message: 'Email has been sent to ' + _.escape(data.username)});
        };
        var onError = function(r, e){
            res.status(404).json({ status: 'error', error: r.message, code: r.code });
        };

        if(data.username && validations.EMAIL.test(data.username)){
            Parse.User.requestPasswordReset(data.username, {success: onSuccess, error: onError});
        }else{
            res.status(404).json({ status: 'error', error: 'Invalid email', code: 602});
        }
    });
//===============START=================
var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);

console.log('listening on port: ' + port);