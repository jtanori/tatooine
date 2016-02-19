var _ = require('lodash');
var validations = require('./validations');
var Categories = require('./Category');
var Category = require('./Category');
var Venue = require('./Venue');
var utils = require('./utils');
var s = require('underscore.string');

var checkAuth = function (req, res, next) {
    var token = req.headers['x-parse-user-token'];
    /*
    * If there is not user we do the following:
    * - Check the request url
    * -- If it is equal to /login we continue
    * -- We redirect to /login otherwise (because there is no user)
    */

    console.log('Current User', Parse.User.current());
    if(req.url === '/logout' || req.url === '/login'){
        console.log('no auth operation');
        next();
    }else if(_.isEmpty(token)){
        console.log('Token not empty');
        res.status(403).json({message: 'Not authorized.'});
    }else if(!Parse.User.current()){//Become user if this does not exists and the token is valid
        console.log('we will become', token);
        Parse.User
            .become(token)
            .then(function(u){
                if(u){
                    var RoleQuery = new Parse.Query(Parse.Role);
                    var UserQuery = new Parse.Query('_User');
                    var noAdmin = 'You are not a listed as an administrator, if you think this is an error please contact customer support: <strong>support@jound.mx</strong>. Are you event related to Jound at all?.';

                    UserQuery.equalTo('objectId', u.id);

                    Parse.Cloud.useMasterKey();

                    RoleQuery
                        .matchesQuery('users', UserQuery)
                        .find(function(roles){
                            console.log('we have roles for user', roles);
                            try{
                                var roles = roles.map(function(r){
                                    return {name: r.get('name'), id: r.id, priority: r.get('priority')};
                                });

                                if(!_.isEmpty(roles)){
                                    console.log('we have roles', roles);
                                    req.session.user = u.toJSON();
                                    req.session.sessionToken = u.getSessionToken();
                                    req.session.roles = roles;
                                    next();
                                }else{
                                    if(Parse.User.current()){
                                        Parse.User.logOut()
                                    }
                                    req.session.reset();
                                    res.status(403).json({message: noAdmin});
                                }
                            }catch(e){
                                res.status(403).json({message: e.message});
                            }
                        }, function(e){
                            if(Parse.User.current()){
                                Parse.User.logOut()
                            }
                            req.session.reset();
                            res.status(403).json({message: noAdmin});
                        });
                }else{
                    res.status(403).json({message: 'Not authorized.'});
                }
            });
    }else if(_.isEmpty(req.session)){
        console.log('no sess');
        res.status(403).json({message: 'Not authorized.'});
    }else if(_.isEmpty(req.session.user)){
        console.log('no user');
        res.status(403).json({message: 'Not authorized.'});
    }else if(_.isEmpty(req.session.user.sessionToken)){
        console.log('no token');
        res.status(403).json({message: 'Not authorized.'});
    }else if(req.session.user.sessionToken !== token){
        console.log('no token match');
        res.status(403).json({message: 'Not authorized.'});
    }else{
        console.log('everything seems fine');
        next();
    }
};

var login = function(req, res){
    var data = req.body || {};
    var sess = req.session;
    //Set json header
    res.setHeader('Content-Type', 'application/json');

    var onSuccess = function(u){
        var RoleQuery = new Parse.Query(Parse.Role);
        var UserQuery = new Parse.Query('_User');
        var noAdmin = 'You are not a listed as an administrator, if you think this is an error please contact customer support: <strong>support@jound.mx</strong>. Are you event related to Jound at all?.';

        UserQuery.equalTo('objectId', u.id);

        Parse.Cloud.useMasterKey();

        RoleQuery
            .matchesQuery('users', UserQuery)
            .find(function(roles){

                try{
                    var roles = roles.map(function(r){
                        return {name: r.get('name'), id: r.id, priority: r.get('priority')};
                    });

                    console.log('roles', roles);

                    if(!_.isEmpty(roles)){
                        req.session.user = u.toJSON();
                        req.session.sessionToken = u.getSessionToken();
                        req.session.roles = roles;
                        res.status(200).json({ user: u.toJSON(), roles: roles});
                    }else{
                        if(Parse.User.current()){
                            Parse.User.logOut()
                        }
                        req.session.reset();
                        res.status(403).json({message: noAdmin});
                    }
                }catch(e){
                    console.log('error', e);
                    res.status(403).json({message: e.message});
                }
            }, function(e){
                if(Parse.User.current()){
                    Parse.User.logOut()
                }
                req.session.reset();
                res.status(403).json({message: noAdmin});
            });
    };
    var onError = function(u, e){
        if(Parse.User.current()){
            Parse.User.logOut();
        }
        req.session.reset();
        res.status(500).json({message: e.message});
    };

    if(data.username && validations.EMAIL.test(data.username) && data.password && data.password.length > 4){
        Parse.User.logIn(data.username, data.password, {success: onSuccess, error: onError});
    }else{
        res.status(500).json({message: 'Invalid parameters'});
    }
};

var logout = function(req, res){
    req.session.reset();
    res.status(200).json({ status: 'success' });
};

var getRoles = function(req, res){
    var sess = req.session;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles)){
        var RoleQuery = new Parse.Query(Parse.Role);
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;

        if(!isSuperAdmin){
            RoleQuery.containedIn('name', roles);
        }

        Parse.Cloud.useMasterKey();

        RoleQuery
            .ascending('priority')
            .find(function(roles){
                if(!_.isEmpty(roles)){
                    res.status(200).json({roles: roles});
                }else{
                    res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
                }
            }, function(e){
                res.status(403).json({message: e.message});
            });
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getRoleById = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var found = roles.filter(function(r){
            if(r.id === body.id){
                return r;
            }
        });

        if(found.length || isSuperAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var role = new Role({id: body.id});

            Parse.Cloud.useMasterKey();

            role
                .fetch()
                .then(function(r){
                    if(r){
                        r
                            .relation('roles')
                            .query()
                            .find()
                            .then(function(){
                                res.status(200).json({role: r});
                            }, function(e){
                                res.status(200).json({role: r, message: 'Could not get roles for Role'});
                            });
                    }else{
                        res.status(404).json({message: 'Role not found'});
                    }
                }, function(e){
                    res.status(403).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }

    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var createRole = function(req, res){
    var sess = req.session;
    var body = req.body;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.name){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;

        if(isSuperAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var role = new Role({name: body.name});
            var User = Parse.Object.extend('_User');
            var user;
            role
                .save()
                .then(function(r){
                    r.getUsers().add(new User({id: sess.user.id}))

                    r
                        .save()
                        .then(function(){
                            r.status(200).json({message: 'ok', role: r});
                        }, function(e){
                            res.status(500).json({message: e.message});
                        });
                }, function(e){
                    res.status(500).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getUsersForRole = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id){

        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var found = roles.filter(function(r){
            if(r.id === body.id){
                return r;
            }
        });

        if(found.length || isSuperAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var role = new Role({id: body.id});

            Parse.Cloud.useMasterKey();

            role
                .fetch()
                .then(function(r){
                    if(r){
                        r
                            .getUsers()
                            .query()
                            .find()
                            .then(function(u){
                                res.status(200).json({results: u});
                            }, function(e){
                                res.status(404).json({message: e.message});
                            });
                    }else{
                        res.status(404).json({message: 'Role not found'});
                    }
                }, function(e){
                    res.status(403).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getRolesForRole = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var found = roles.filter(function(r){
            if(r.id === body.id){
                return r;
            }
        });

        if(found.length || isSuperAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var role = new Role({id: body.id});

            Parse.Cloud.useMasterKey();

            role
                .fetch()
                .then(function(r){
                    if(r){
                        r
                            .getRoles()
                            .query()
                            .find()
                            .then(function(u){
                                res.status(200).json({results: u});
                            }, function(e){
                                res.status(404).json({message: e.message});
                            });
                    }else{
                        res.status(404).json({message: 'Role not found'});
                    }
                }, function(e){
                    res.status(403).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getUsers = function(req, res){
    var sess = req.session;
    var body = req.body;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;
        var User = Parse.Object.extend('_User');

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();

            var UserQuery;

            if(!_.isEmpty(body.search)){
                if(validations.EMAIL.test(body.search)){
                    var mailQuery = new Parse.Query(User);
                    mailQuery.equalTo('username', body.search);

                    var mailQuery2 = new Parse.Query(User);
                    mailQuery2.equalTo('email', body.search);

                    UserQuery = Parse.Query.or(mailQuery, mailQuery2);
                }else if(body.search === 'faceboook'){
                    UserQuery = new Parse.Query(User);
                    UserQuery.equalTo('facebook', true);
                }else{
                    var usernameQuery = new Parse.Query(User);
                    usernameQuery.equalTo('username', body.search);

                    var emailQuery = new Parse.Query(User);
                    emailQuery.startsWith('email', body.search);

                    var nameQuery = new Parse.Query(User);
                    nameQuery.startsWith('firstName', body.search);

                    var nameQuery2 = new Parse.Query(User);
                    nameQuery2.startsWith('lastName', body.search);

                    UserQuery = Parse.Query.or(usernameQuery, emailQuery, nameQuery, nameQuery2);
                }
            }else{
                UserQuery = new Parse.Query(User);
            }

            UserQuery
                .find()
                .then(function(u){
                    res.status(200).json({results: u});
                }, function(e){
                    res.status(404).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }

    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getUser = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;
        var User = Parse.Object.extend('_User');

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();

            var user = new User({id: body.id});
            var RoleQuery = new Parse.Query(Parse.Role);
            var UserQuery = new Parse.Query(Parse.User);

            user
                .fetch()
                .then(function(u){
                    if(u){
                        RoleQuery
                            .matchesQuery('users', UserQuery.equalTo('objectId', u.id))
                            .ascending('priority')
                            .find(function(r){
                                u
                                    .relation('venues')
                                    .query()
                                    .find()
                                    .then(function(v){
                                        res.status(200).json({user: u, roles: r, venues: v});
                                    }, function(){
                                        res.status(200).json({user: u, roles: r, venues: []});
                                    });
                            }, function(e){
                                console.log('could not find roles');
                                res.status(200).json({user: u, roles: []});
                            })
                    }else{
                        res.status(404).json({message: 'Can not find user, please contact technical support.'});
                    }
                }, function(){
                    res.status(404).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addRoleToRole = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roleToAdd = req.body.role;
    var remove = req.body.remove;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id && roleToAdd){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var found = roles.filter(function(r){
            if(r.id === body.id){
                return r;
            }
        });

        if(found.length || isSuperAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var role = new Role({id: body.id});
            var roleToAdd = new Role({id: roleToAdd});

            Parse.Cloud.useMasterKey();
            //Fetch role
            role
                .fetch()
                .then(function(r){
                    if(r){
                        //Fetch role to be added
                        roleToAdd
                            .fetch()
                            .then(function(rta){
                                //Check if the role to add has lower priority
                                console.log(rta.get('priority') > r.get('priority'), rta.get('priority'), r.get('priority'));
                                if(rta && rta.get('priority') > r.get('priority')){
                                    if(remove){
                                        r
                                            .getRoles()
                                            .remove(rta);
                                    }else{
                                        r
                                            .getRoles()
                                            .add(rta);
                                    }

                                    r
                                        .save()
                                        .then(function(u){
                                            console.log('saved role', u);
                                            res.status(200).json({results: u});
                                        }, function(e){
                                            console.log('not saved', e);
                                            res.status(404).json({message: e.message});
                                        });
                                }else{
                                    res.status(404).json({message: 'Can not add role.'});
                                }
                            }, function(e){
                                res.status(404).json({message: e.message});
                            })
                    }else{
                        res.status(404).json({message: 'Role not found'});
                    }
                }, function(e){
                    res.status(403).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addUserToRole = function(req, res){
    var sess = req.session;
    var body = req.params;
    var userToAdd = req.body.user;
    var remove = req.body.remove;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id && userToAdd){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;
        var found = roles.filter(function(r){
            if(r.id === body.id){
                return r;
            }
        });

        if(found.length || isSuperAdmin || isAdmin){
            var Role = Parse.Object.extend(Parse.Role);
            var User = Parse.Object.extend(Parse.User);
            var role = new Role({id: body.id});
            var userToAdd = new User({id: userToAdd});

            Parse.Cloud.useMasterKey();
            //Fetch role
            role
                .fetch()
                .then(function(r){
                    if(r){
                        //Fetch role to be added
                        userToAdd
                            .fetch()
                            .then(function(uta){
                                if(remove){
                                    r
                                        .getUsers()
                                        .remove(uta);
                                }else{
                                    r
                                        .getUsers()
                                        .add(uta);
                                }

                                r
                                    .save()
                                    .then(function(u){
                                        console.log('saved role', u);
                                        res.status(200).json({results: u});
                                    }, function(e){
                                        console.log('not saved', e);
                                        res.status(404).json({message: e.message});
                                    });
                            }, function(e){
                                res.status(404).json({message: e.message});
                            })
                    }else{
                        res.status(404).json({message: 'Role not found'});
                    }
                }, function(e){
                    res.status(403).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var updateCategory = function(req, res){
    var sess = req.session;
    var body = req.params;
    var data = req.body;
    var roles = sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Category = Parse.Object.extend('Category');
            var category = new Category({id: body.id});

            category
                .fetch()
                .then(function(c){
                    if(c){
                        try {
                            var userHistory = {
                                by: sess.user.objectId,
                                op: 'update',
                                timestamp: new Date()*1
                            };

                            if(data.updateHistory){
                                data.updateHistory.push(userHistory);
                            }else{
                                userHistory.op = 'create';
                                data.updateHistory = [userHistory];
                            }

                            if(data.updatedAt){
                                delete data.updatedAt;
                            }

                            if(data.createdAt){
                                delete data.createdAt;
                            }

                            if(data.i18n){
                                delete data.i18n;
                            }

                            delete data.id;

                            //Set new data and save
                            c
                                .save(data)
                                .then(function(c){
                                    res.status(200).json({message: 'Category has been saved'});
                                }, function(e){
                                    res.status(400).json({message: e.message});
                                });
                        }catch(e){
                            console.log('error', e);
                            res.status(400).json({message: e.message});
                        }
                    }else{
                        res.status(400).json({message: 'Looks like the category you are trying to update does not longer exists, please reload your categories list.'});
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addCategory = function(req, res){
    var sess = req.session;
    var data = req.body;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && !_.isEmpty(data)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Category = Parse.Object.extend('Category');
            var categoryQuery = new Parse.Query(Category);
            var keywords = utils.strings.sanitize(data.keywords);
            var name = s.titleize(data.name);
            var displayName = s.titleize(data.displayName);
            var slug = s.slugify(data.slug);
            var active = _.isEmpty(data.active) ? false : true;
            var pluralized = s.titleize(data.pluralized);

            var nameCheck = new Parse.Query(Category);
            nameCheck.equalTo('name', name);

            var nameCheck2 = new Parse.Query(Category);
            nameCheck2.equalTo('displayName', displayName);

            var nameCheck3 = new Parse.Query(Category);
            nameCheck3.equalTo('slug', slug);

            var nameCheck4 = new Parse.Query(Category);
            nameCheck4.equalTo('pluralized', pluralized);

            Parse.Query
                .or(nameCheck, nameCheck2, nameCheck3, nameCheck4)
                .find()
                .then(function(c){
                    if(!_.isEmpty(c)){
                        console.log('category', c);
                        res.status(409).json({message: 'There seems to be a conflict with either your category name, slug, pluralized name or display name, please check your data.'});
                    }else{
                        var c = new Category({
                            name: name,
                            slug: slug,
                            active: active,
                            displayName: displayName,
                            keywords: keywords,
                            pluralized: pluralized,
                            primary: true,
                            createdBy: Parse.User.current(),
                            updateHistory: [{
                                by: sess.user.objectId,
                                op: 'create',
                                timestamp: new Date()*1
                            }]
                        });
                        //Save category
                        c
                            .save()
                            .then(function(c){
                                if(c){
                                    res.status(200).json({message: 'Category Saved', category: c.toJSON()});
                                }else{
                                    res.status(400).json({message: e.message});
                                }
                            }, function(e){
                                res.status(500).json({message: e.message});
                            });
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getCategories = function(req, res){
    var sess = req.session;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isAdmin || isSuperAdmin){
            var categories = new Categories.Query(true);
            var promise = new Parse.Promise();

            categories.find({
                success: function(c){
                    if(c){
                        var ca = c.map(function(category){
                            var indicators = category.get('indicators') || [];

                            category = Categories.parseCategory(category);
                            category.indicators = indicators;

                            return category;
                        });
                        res.status(200).json({ status: 'success', results: ca});
                    }else{
                        res.status(404).json({ message: 'No categories found'});
                    }
                },
                error: function(e){
                    res.status(404).json({ message: e.message});
                }
            });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getCategoryById = function(req, res){
    var data = req.params;
    var sess = req.session;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && data.id){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isAdmin || isSuperAdmin){
            var c = new Categories.Category;

            c.id = data.id;
            c
                .fetch()
                .then(function(category){
                    if(category){
                        category
                            .relation('i18n')
                            .query()
                            .find()
                            .then(function(i18ns){
                                var c = Categories.parseCategory(category);
                                c.i18n = i18ns || [];

                                res.status(200).json({ status: 'success', results: c});
                            }, function(e){
                                var c = Categories.parseCategory(category);
                                c.i18n = [];

                                res.status(200).json({ status: 'success', results: c});
                            });

                    }else{
                        res.status(404).json({ message: 'No category found for: ' + data.id});
                    }
                }, function(e){
                    res.status(404).json({ message: e.message });
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getLocalizationsForCategory = function(req, res){
    var data = req.params;
    var sess = req.session;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && data.id){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isAdmin || isSuperAdmin){
            var c = new Categories.Category;

            c.id = data.id;
            c
                .fetch()
                .then(function(category){
                    if(category){
                        category
                            .relation('i18n')
                            .query()
                            .ascending('lang')
                            .find()
                            .then(function(i18ns){
                                res.status(200).json({ status: 'success', results: i18ns || []});
                            }, function(e){
                                res.status(400).json({message: e.message});
                            });
                    }else{
                        res.status(404).json({ message: 'No category found for: ' + data.id});
                    }
                }, function(e){
                    res.status(404).json({ message: e.message });
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addLocalizationForCategory = function(req, res){
    var sess = req.session;
    var body = req.params;
    var data = req.body;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id && !_.isEmpty(data)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Category = Parse.Object.extend('Category');
            var category = new Category({id: body.id});

            category
                .fetch()
                .then(function(c){
                    if(c){
                        console.log('category found', c);
                        try {
                            if(_.isEmpty(data.lang)){
                                res.status(400).json({message: 'No language defined.'});
                            }else if(_.isEmpty(data.keywords)){
                                res.status(400).json({message: 'No keywords defined.'});
                            }else if(_.isEmpty(data.displayName)){
                                res.status(400).json({message: 'No display name defined.'});
                            }else if(_.isEmpty(data.name)){
                                res.status(400).json({message: 'No name defined.'});
                            }else if(_.isEmpty(data.slug)){
                                res.status(400).json({message: 'No slug defined.'});
                            }else{
                                var keywords = utils.strings.sanitize(data.keywords);

                                console.log('keywords to save', keywords);

                                if(!_.isEmpty(keywords)){
                                    data.lang = data.lang.toUpperCase();
                                    c.set(data.lang + '_keywords', keywords);

                                    var i18n = c.relation('i18n');
                                    var LocalizedCategory = Parse.Object.extend('LocalizedCategory');
                                    var lc;
                                    console.log(data.lang + '_keywords', 'column');

                                    i18n
                                        .query()
                                        .equalTo('lang', data.lang)
                                        .first()
                                        .then(function(found){
                                            if(found){
                                                console.log('found translation', found);
                                                //Can not update translation here
                                                res.status(400).json({message: 'Translation for that language exists already, please try updating the record instead of creating a new one.'});
                                            }else{
                                                console.log('no translation found');
                                                console.log('data to add', data);
                                                lc = new LocalizedCategory(data);
                                                lc
                                                    .save()
                                                    .then(function(){
                                                        //Add translation to relation
                                                        i18n.add(lc);
                                                        console.log('added data', data);
                                                        c
                                                            .save()
                                                            .then(function(){
                                                                console.log('updated category', c, lc.id);
                                                                res.status(200).json({message: 'Translation created', id: lc.id});
                                                            }, function(e){
                                                                console.log('could not update category', e);
                                                                res.status(400).json({message: e.message});
                                                            });
                                                    }, function(e){
                                                        res.status(400).json({message: e.message});
                                                    });
                                            }
                                        }, function(e){
                                            res.status(400).json({message: e.message});
                                        });
                                }else{
                                    res.status(400).json({message: 'Keywords should be something valid, please check with technical support.'});
                                }
                            }
                        }catch(e){
                            res.status(400).json({message: e.message});
                        }
                    }else{
                        res.status(400).json({message: 'Looks like the category you are trying to update does not longer exists, please reload your categories list.'});
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var updateLocalizationForCategory = function(req, res){
    var sess = req.session;
    var body = req.params;
    var data = req.body;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id && !_.isEmpty(data) && body.i18nid){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Category = Parse.Object.extend('Category');
            var category = new Category({id: body.id});

            category
                .fetch()
                .then(function(c){
                    if(c){
                        try {
                            if(_.isEmpty(data.lang)){
                                res.status(400).json({message: 'No language defined.'});
                            }else if(_.isEmpty(data.keywords)){
                                res.status(400).json({message: 'No keywords defined.'});
                            }else if(_.isEmpty(data.displayName)){
                                res.status(400).json({message: 'No display name defined.'});
                            }else if(_.isEmpty(data.name)){
                                res.status(400).json({message: 'No name defined.'});
                            }else if(_.isEmpty(data.slug)){
                                res.status(400).json({message: 'No slug defined.'});
                            }else{
                                var keywords = utils.strings.sanitize(data.keywords);

                                if(!_.isEmpty(keywords)){
                                    data.lang = data.lang.toUpperCase();
                                    c.set(data.lang + '_keywords', keywords);

                                    var i18n = c.relation('i18n');
                                    var LocalizedCategory = Parse.Object.extend('LocalizedCategory');

                                    i18n
                                        .query()
                                        .equalTo('lang', data.lang)
                                        .equalTo('objectId', body.i18nid)
                                        .first()
                                        .then(function(found){
                                            if(found){
                                                c
                                                    .save()
                                                    .then(function(){
                                                        //Update translation
                                                        found
                                                            .save(data)
                                                            .then(function(){
                                                                res.status(200).json({message: 'Translation updated'});
                                                            }, function(e){
                                                                res.status(400).json({message: e.message});
                                                            });
                                                    }, function(){
                                                        res.status(200).json({message: 'Could not update category for translation.'});
                                                    });
                                            }else{
                                                res.status(400).json({message: 'Translation does not seems to be part of this category.'});
                                            }
                                        }, function(e){
                                            res.status(400).json({message: e.message});
                                        });
                                }else{
                                    res.status(400).json({message: 'Keywords should be something valid, please check with technical support.'});
                                }
                            }
                        }catch(e){
                            res.status(400).json({message: e.message});
                        }
                    }else{
                        res.status(400).json({message: 'Looks like the category you are trying to update does not longer exists, please reload your categories list.'});
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var removeLocalizationForCategory = function(req, res){
    var sess = req.session;
    var body = req.params;
    var roles = sess && sess.roles ? sess.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(sess) && !_.isEmpty(sess.user) && !_.isEmpty(roles) && body.id && body.i18nid){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Category = Parse.Object.extend('Category');
            var category = new Category({id: body.id});
            //Get the category first
            category
                .fetch()
                .then(function(c){
                    if(c){
                        try {
                            var i18n = c.relation('i18n');
                            var LocalizedCategory = Parse.Object.extend('LocalizedCategory');
                            var lc = new LocalizedCategory({id: body.i18nid});
                            //Find localization in relation
                            i18n
                                .query()
                                .equalTo('objectId', body.i18nid)
                                .first()
                                .then(function(found){
                                    if(found){
                                        console.log('localization found', found);
                                        //What language it is?
                                        var lang = found.get('lang').toUpperCase();
                                        console.log('lang', lang);
                                        //Remove from relation
                                        i18n.remove(lc);
                                        console.log('removed');
                                        //Remove keywords from category
                                        c
                                            .save(lang + '_keywords', [])
                                            .then(function(){
                                                console.log('saved category', c);
                                                //Destroy record, no longer needed
                                                found
                                                    .destroy()
                                                    .then(function(){
                                                        console.log('destroyed found');
                                                        res.status(200).json({message: 'Done'});
                                                    }, function(e){
                                                        console.log('could not destroy', e);
                                                        res.status(400).json({message: e.message});
                                                    })
                                            }, function(e){
                                                res.status(400).json({message: e.message});
                                            });
                                    }else{
                                        console.log('localization not found');
                                        res.status(400).json({message: 'Translation does not seems to be part of this category.'});
                                    }
                                }, function(e){
                                    res.status(400).json({message: e.message});
                                });
                        }catch(e){
                            res.status(400).json({message: e.message});
                        }
                    }else{
                        res.status(400).json({message: 'Looks like the category you are trying to update does not longer exists, please reload your categories list.'});
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getCategoryIndicators = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;

    console.log(roles, 'session');

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        console.log(roles, 'roles I got');

        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();
            //Fetch role
            var Indicator = Parse.Object.extend('CategoryIndicator');
            var IndicatorQuery = new Parse.Query(Indicator);

            console.log('User', Parse.User.current());

            //Get the category first
            IndicatorQuery
                .limit(1000)
                .find()
                .then(function(c){
                    if(c){
                        try {
                            res.status(200).json({results: c});
                        }catch(e){
                            res.status(400).json({message: e.message});
                        }
                    }else{
                        res.status(400).json({message: 'No indicators found.'});
                    }
                }, function(e){
                    res.status(400).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        console.log('no user', res.session);
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var saveVenues = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;
    var venues = req.body.venues;

    if(isEmpty(venues)){
        res.status(406).json({message: 'No venues provided.'});
    }else if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles)){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;
        //var isCorporate = roles.indexOf('Corporate') !== -1
        if(isSuperAdmin || isAdmin){
            Parse.Cloud.useMasterKey();

            var venues = venues.filter(function(v){
                if(v.category && _.isString(v.category) && _.isNumber(v.latitude) && _.isNumber(v.longitude)){
                    v.category = new Category.Category({id: v.category});
                    v.keywords = utils.strings.sanitize(v.keywords);
                    v.position = new Parse.GeoPoint({latitude: v.latitude, longitude: v.longitude});

                    v = new Venue(v);

                    return v;
                }
            });

            if(!_.isEmpty(venues)){
                Parse.Object
                    .saveAll(venues)
                    .then(function(venues){
                        if(venues){
                            res.status(200).json({message: 'Venues saved', venues: venues.map(function(v){return v.id;})});
                        }else{
                            res.status(422).json({message: 'Venues were not saved for an unknown reson, please contact technical support.'});
                        }
                    }, function(){

                    });
            }else{
                res.status(422).json({message: 'Venues provided were deemed invalid.'});
            }
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        console.log('no user', res.session);
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getCountries = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles)){
        Parse.Cloud.useMasterKey();

        var Country = Parse.Object.extend('Country');
        var countryQuery = new Parse.Query(Country);

        countryQuery
            .limit(300)
            .include('defaultCurrency')
            .find()
            .then(function(c){
                if(c){
                    res.status(200).json({results: c});
                }else{
                    res.status(422).json({message: 'No countries found.'});
                }
            }, function(e){
                res.status(422).json({message: e.message});
            });
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getCountryById = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;
    var body = req.params;

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles) && body.id){
        Parse.Cloud.useMasterKey();

        var Country = Parse.Object.extend('Country');
        var countryQuery = new Parse.Query(Country);

        countryQuery
            .equalTo('objectId', body.id)
            .include('currency')
            .first()
            .then(function(c){
                if(c){
                    console.log('we got country?', c);
                    try{
                        var states = c.relation('states');

                        states
                            .query()
                            .ascending('name')
                            .limit(200)
                            .find()
                            .then(function(s){
                                if(s){
                                    console.log(s, 'states I got');
                                    s = s.map(function(st){
                                        console.log(st.name, st.get('name'));
                                        return st.toJSON();
                                    });
                                    c.set('states', s);
                                    res.status(200).json({results: c});
                                }else{
                                    c.set('states', []);
                                    res.status(200).json({results: c});
                                }
                            }, function(){

                            });
                    }catch(e){
                        res.status(422).json({message: e.message});
                    }
                }else{
                    console.log('error getting country', c);
                    res.status(422).json({message: 'No countries found.'});
                }
            }, function(e){
                res.status(422).json({message: e.message});
            });
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var getStateById = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;
    var body = req.params;

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles) && body.id){
        Parse.Cloud.useMasterKey();

        var Country = Parse.Object.extend('Country');
        var State = Parse.Object.extend('State');
        var stateQuery = new Parse.Query(State);
        var country = new Country({id: body.id});

        stateQuery
            .equalTo('objectId', body.stateId)
            .equalTo('country', country)
            .include('country')
            .first()
            .then(function(c){
                if(c){
                    console.log('we got state', c);
                    try{
                        var m = c.relation('municipalities');

                        m
                            .query()
                            .ascending('name')
                            .limit(1000)
                            .find()
                            .then(function(s){
                                if(s){
                                    console.log(s, 'municipalities I got');
                                    s = s.map(function(st){
                                        console.log(st.name, st.get('name'));
                                        return st.toJSON();
                                    });
                                    c.set('municipalities', s);
                                    res.status(200).json({results: c});
                                }else{
                                    c.set('municipalities', []);
                                    res.status(200).json({results: c});
                                }
                            }, function(){

                            });
                    }catch(e){
                        res.status(422).json({message: e.message});
                    }
                }else{
                    console.log('error getting state', c);
                    res.status(422).json({message: 'No states found.'});
                }
            }, function(e){
                res.status(422).json({message: e.message});
            });
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addStatesToCountry = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;
    var body = req.params;
    var states = req.body.states;

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles) && body.id && states){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){

            Parse.Cloud.useMasterKey();

            var Country = Parse.Object.extend('Country');
            var countryQuery = new Parse.Query(Country);

            countryQuery
                .equalTo('objectId', body.id)
                .first()
                .then(function(c){
                    if(c){
                        try{
                            var s = c.relation('states');
                            var State = Parse.Object.extend('State');

                            states = states.map(function(s){
                                var st = new State(s);

                                st.set('country', c);

                                return st.save();
                            });

                            Parse.Promise
                                .when(states)
                                .then(function(s){
                                    c.relation('states').add(s);

                                    c
                                        .save()
                                        .then(function(){
                                            if(s){
                                                res.status(200).json({results: s});
                                            }else{
                                                res.status(200).json({results: s});
                                            }
                                        }, function(e){
                                            res.status(422).json({message: e.message});
                                        });
                                });
                        }catch(e){
                            res.status(422).json({message: e.message});
                        }
                    }else{
                        res.status(422).json({message: 'No countries found.'});
                    }
                }, function(e){
                    res.status(422).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

var addMunicipalitiesToState = function(req, res){
    var roles = req.session && req.session.roles ? req.session.roles.map(function(r){return r.name;}) : null;
    var body = req.params;
    var municipalities = req.body.municipalities;

    if(!_.isEmpty(req.session) && !_.isEmpty(req.session.user) && !_.isEmpty(roles) && body.id && body.stateId && municipalities){
        var isSuperAdmin = roles.indexOf('SuperAdmin') !== -1;
        var isAdmin = roles.indexOf('Admin') !== -1;

        if(isSuperAdmin || isAdmin){

            Parse.Cloud.useMasterKey();

            var State = Parse.Object.extend('State');
            var stateQuery = new Parse.Query(State);
            var Country = Parse.Object.extend('Country');
            var country = new Country({id: body.id});
            var state = new State({id: body.stateId});

            console.log(body.stateId, body.id);
            console.log(country, 'country', state);

            stateQuery
                .equalTo('objectId', body.stateId)
                .equalTo('country', country)
                .include('country')
                .first()
                .then(function(c){
                    if(c){
                        try{
                            var s = c.relation('municipalities');
                            var Municipality = Parse.Object.extend('Municipality');
                            var country = c.get('country');

                            console.log('country for state', country);

                            municipalities = municipalities.map(function(s){
                                var st = new Municipality({
                                    did: s.did,
                                    name: s.name,
                                    country: country,
                                    state: state
                                });

                                return st.save();
                            });

                            Parse.Promise
                                .when(municipalities)
                                .then(function(s){
                                    c.relation('municipalities').add(s);

                                    console.log('municiapalities saved', s);

                                    c
                                        .save()
                                        .then(function(){
                                            if(s){
                                                res.status(200).json({results: s});
                                            }else{
                                                res.status(200).json({results: s});
                                            }
                                        }, function(e){
                                            res.status(422).json({message: e.message});
                                        });
                                });
                        }catch(e){
                            res.status(422).json({message: e.message});
                        }
                    }else{
                        res.status(422).json({message: 'No state found.'});
                    }
                }, function(e){
                    res.status(422).json({message: e.message});
                });
        }else{
            res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
        }
    }else{
        res.status(403).json({message: 'You don\'t have privilegies to perform this operation.'});
    }
};

module.exports = {
    //Auth
    login: login,
    logout: logout,
    check: checkAuth,
    //Users and roles
    getRoles: getRoles,
    getRoleById: getRoleById,
    getUsersForRole: getUsersForRole,
    getRolesForRole: getRolesForRole,
    getUsers: getUsers,
    getUser: getUser,
    addRoleToRole: addRoleToRole,
    addUserToRole: addUserToRole,
    //Categories
    updateCategory: updateCategory,
    getCategories: getCategories,
    getCategoryById: getCategoryById,
    getLocalizationsForCategory: getLocalizationsForCategory,
    addLocalizationForCategory: addLocalizationForCategory,
    updateLocalizationForCategory: updateLocalizationForCategory,
    removeLocalizationForCategory: removeLocalizationForCategory,
    getCategoryIndicators: getCategoryIndicators,
    addCategory: addCategory,
    //Venues
    saveVenues: saveVenues,
    //Geostatic
    getCountries: getCountries,
    getCountryById: getCountryById,
    addStatesToCountry: addStatesToCountry,
    getStateById: getStateById,
    addMunicipalitiesToState: addMunicipalitiesToState

};
