var _ = require('lodash');
var s = require("underscore.string");
var sanitizeHtml = require('sanitize-html');
var Channel = require('./Channel.js');

var Venue = Parse.Object.extend('Location', {
	getURL: function(){
        return process.env.HOST_URL + this.id;
    },
    getWWW: function(){
        if(this.get('www')){
            return this.get('www').replace(/^(https?|ftp):\/\//, '');
        }
    },
    getAddress: function(){
        var address = '';
        var n = this.get('exterior_number');
        var castedN = parseInt(n, 10);

        if(!_.isEmpty(this.get('road_type'))){
            address += this.escape('road_type') + ' ' + this.escape('road_name');
        }

        if(!_.isEmpty(this.get('road_type_1'))){
            address += ' entre ' + this.escape('road_type_1') + ' ' + this.escape('road_name_1');
        }

        if(!_.isEmpty(this.get('road_type_2'))){
            address += ' y ' + this.escape('road_type_2') + ' ' + this.escape('road_name_2');
        }

        if(n){
            if(!_.isNaN(castedN) && _.isNumber(castedN)){
                address += ' #' + _.escape(n);
            }else if(!_.isString(n)){
                if(n === 'SN' || n === 'sn'){
                    address += ' Sin numero';
                }else {
                    address += ' #' + _.escape(n);
                }
            }
        }

        return address;
    },
    getVecinity: function(){
        var address = '';

        if(this.get('settling_type') && this.get('settling_name')){
            address += this.get('settling_type') + ' ' + this.get('settling_name');
        }else if(this.get('settling_name')){
            address += 'Colonia ' + this.get('settling_name');
        }

        return address;
    },
    getCityName: function(){
        var city = '';
        var l = this.get('locality');
        var m = this.get('municipality');

        if(!_.isEmpty(l)){
            city = l;
        }else{
            city = m;
        }

        return city;
    },
    getCity: function(){
        var city = '';
        var l = this.get('locality');
        var m = this.get('municipality');
        var s = this.get('federal_entity');

        if(l === m){
            city += l + ', ' + s;
        }else {
            city += l + ', ' + m + ', ' + s;
        }

        if(this.get('postal_code')){
            city += ' C.P ' + this.escape('postal_code');
        }

        return city;
    },
    getBanner: function(){
        var l;

        if(this.get('cover')){
            l = this.get('cover').get('file');

            if(l.url){
                return {url: l.url(), isDefault: false};
            }else if(l._url){
                return {url: l._url, isDefault: false};
            }
        }else{
            return {url:'img/splash.jpg', isDefault: true};
        }
    },
    getLogo: function(){
        var l;
        console.log(this, 'logo');
        if(this.get('logo')){
            l = this.get('logo').get('file');

            if(l.url){
                return l.url();
            }else if(l._url){
                return l._url;
            }
        }else{
            return 'img/venue_default_large.jpg';
        }
    },
    getBasicData: function(){
        return {
            name: this.get('name'),
            address: this.getAddress(),
            city: this.getCity(),
            vecinity: this.getVecinity(),
            phoneNumber: this.get('phone_number'),
            url: this.get('www'),
            activity: this.get('activity_description'),
            logo: this.getLogo(),
            banner: this.getBanner(),
            email: this.get('email_address'),
            www: this.getWWW(),
            postalCode: this.get('postal_code')
        };
    }
});

var fieldsWhiteList = [
	'avatar',
    'activity_description',
    'block',
    'building',
    'building_floor',
    'claimed_by',
    'category',
    'cover',
    'cover_video',
    'exterior_letter',
    'email_address',
    'exterior_number',
    'featured',
    'federal_entity',
    'images',
    'internal_letter',
    'internal_number',
    'keywords',
    'locality',
    'logo',
    'municipality',
    'name',
    'page',
    'phone_number',
    'position',
    'postal_code',
    'rating',
    'road_name',
    'road_name_1',
    'road_name_2',
    'road_name_3',
    'road_type',
    'road_type_1',
    'road_type_2',
    'road_type_3',
    'settling_name',
    'settling_type',
    'slug',
    'shopping_center_name',
    'shopping_center_store_number',
    'shopping_center_type',
    'verificationLevel',
    'www'
];

var venueParse = function(v){
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
	venue.id = v.id;
	venue.objectId = v.id;

	if(venue.page && venue.page.about){
		venue.page.about = sanitizeHtml(venue.page.about, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
		});
	}

	return venue;
};

var savePhotoForVenue = function(req, res){
    var body = req.body;
    var File = Parse.Object.extend('File');
    var F, f;

    if(body.id && body.data){
        var venue = new Venue({id: body.id})

        venue
            .fetch()
            .then(function(v){
                if(v){
                    f = new File();
                    F = new Parse.File(s.slugify(v.get('name')) + '-' + new Date()*1, {base64: body.data});

                    F
                        .save()
                        .then(function(){
                            return f.save('file', F);
                        })
                        .then(function(){
                            Parse.Cloud.useMasterKey();

                            return v.addUnique('images', F.url()).save();
                        })
                        .then(function(){
                            res.status(200).json({status: 'success', url: F.url()});
                        }, function(e){
                            res.status(400).json({status: 'error', error: e});
                        });
                }else{
                    res.status(400).json({status: 'error', error: {message: 'Invalid venue ID'}});
                }
            }, function(e){
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
};

var updatePage = function(req, res){
    var body = req.body;
    var Page = Parse.Object.extend('Page');
    var pageQuery = new Parse.Query(Page);

    body.val = body.val || undefined;

    if(body.id && body.attr && body.val && _.isString(body.attr)){
        pageQuery
            .equalTo('objectId', body.id)
            .first(function(p){
                if(p){
                    Parse.Cloud.useMasterKey();

                    p
                        .save(body.attr, body.val)
                        .then(function(result){
                            res.status(200).json({status: 'success'});
                        }, function(e){
                            res.status(400).json({status: 'error', error: e});
                        });
                }else {
                    res.status(400).json({status: 'error', error: {message: 'Page not found'}});
                }
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var isClaimed = function(req, res){
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
                res.status(200).json({status: 'success', results: c});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

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

var saveReview = function(req, res){
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
};

var getReviews = function(req, res){
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

var getEventById = function(req, res){
    var body = req.body;
    var E = Parse.Object.extend('Event');
    var e = new E();

    if(body.id){
        e.id = body.id;
        e
            .fetch()
            .then(function(e){
                if(e){
                    res.status(200).json({status: 'success', results: e.toJSON()});
                }else{
                    res.status(400).json({status: 'error', error: {message: 'event not found'}});
                }
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getEvents = function(req, res){
    var body = req.body;
    var E = Parse.Object.extend('Event');
    var query = new Parse.Query(E);
    var venue = new Venue();
    var now = new Date();
    var plusFiveDays = new Date((now*1) + (5*24*60*60*1000));
    var isAjax = req.xhr || req.headers.accept.indexOf('json') > -1;

    if(body.id){
        venue.id = body.id || req.params.id;

        query
            .equalTo('venue', venue)
            .equalTo('active', true)
            .lessThan('startViewableDate', new Date())
            .greaterThan('endViewableDate', new Date((now*1) + 5*24*60*60*1000))
            .find()
            .then(function(events){
                if(isAjax){
                    res.status(200).json({status: 'success', results: events});
                }else{
                    res.render('events', {
                        data: {
                            events: events.toJSON()
                        }
                    });
                }
            }, function(e){
                if(isAjax){
                    res.status(400).json({status: 'error', error: e});
                }else{
                    res.render('events', {
                        data: {
                            events: []
                        }
                    });
                }
            });

    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getDeals = function(req, res){
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

var getProductById = function(req, res){
    var body = req.body;

    if(body.id && body.venue){
        var venue = new Venue({id: body.venue});
        var Product = Parse.Object.extend('Product');
        var productQuery = new Parse.Query(Product);

        Parse.Cloud.useMasterKey();

        productQuery
            .equalTo('objectId', body.id)
            .equalTo('client', venue)
            .equalTo('available', true)
            .first(function(p){
                if(p){
                    res.status(200).json({status: 'success', product: p.toJSON()});
                }else{
                    res.status(404).json({status: 'error', error: {message: 'Product not found', code: 404}});
                }
            }, function(e){
                res.status(200).json({status: 'success', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
};

var getProducts = function(req, res){
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

var getProductForVenue= function(req, res){
    var body = req.body;

    if(body.id && body.venue){
        var venue = new Venue({id: body.venue});
        var Product = Parse.Object.extend('Product');
        var productQuery = new Parse.Query(Product);

        Parse.Cloud.useMasterKey();

        productQuery
            .equalTo('objectId', body.id)
            .equalTo('client', venue)
            .equalTo('available', true)
            .include('client')
            .include('client.logo')
            .include('client.page')
            .include('client.cover')
            .include('client.claimed_by')
            .first(function(p){
                if(p){
                    var v = VenueModule.parse(p.get('client'));

                    res.status(200).json({status: 'success', product: p.toJSON(), venue: v});
                }else{
                    res.status(404).json({status: 'error', error: {message: 'Product not found', code: 404}});
                }
            }, function(e){
                res.status(200).json({status: 'success', error: e});
            });
    }else{
        res.status(400).json({status: 'error', error: {message: 'Invalid params'}});
    }
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
                res.status(400).json({status: 'error', error: e});
            });

        break;

    case 'facebook':
        Channel
            .facebook(body.id, body.accessToken, body.next)
            .then(function(data){
                res.status(200).json({status: 'success', results: data.data, paging: data.paging});
            }, function(e){
                res.status(400).json({status: 'error', error: e});
            });

        break;

    default:
        res.status(404).json({status: 'error', error: {message: 'No supported channel found'}});
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

module.exports = {
	Venue: Venue,
	fields: fieldsWhiteList,
	parse: venueParse,
	savePhoto: savePhotoForVenue,
	setLogo: setLogoForVenue,
	setPage: setPageForVenue,
	report: report,
	updatePage: updatePage,
	isClaimed: isClaimed,
	claim: claimVenue,
	isUserCheckedIn: checkUserCheckIn,
	checkIn: checkIn,
	review: saveReview,
	reviews: getReviews,
	getEventById: getEventById,
	getEvents: getEvents,
	getDeals: getDeals,
	getProducts: getProducts,
	getProductById: getProductById,
	getProductForVenue: getProductForVenue,
	getChannel: getChannelForVenue,
	unlike: unlike,
	like: like
};
