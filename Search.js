var Categories = require('./Category.js');
var Venues = require('./Venue.js');
var Cache = require('./Cache');
var _ = require('lodash');
var utils = require('./utils.js');
var validations = require('./validations.js');

var search = function(req, res){
    var data = {q: req.query.q, p: {lat: req.query.lat, lng: req.query.lng, radius: req.query.radius}, c: req.query.category};

    console.log('data', data);

    var query = new Parse.Query(Venues.Venue);
    var position, q;
    var protocol = req.connection.encrypted ? 'https' : 'http';

    var cities = [];
    var citiesTrack = {};
    var url = _.compact(req.url.split('/'));
    var search = req.url.split('?');

    res.setHeader('Content-Type', 'application/json');

    //Try getting those damm categories
    Cache
        .getCategories()
        .then(function(response){
            var categories = response;
            var keywords = categories.map(function(c){return {title: c.pluralized, keywords: Categories.parseKeywords(c.keywords), id: c.objectId}});

            if(data.q){
                data.q = !_.isEmpty(data.q) ? decodeURIComponent(data.q) : '';
                q = _.chain(data.q.split(',')).compact().uniq().invoke('trim').invoke('toLowerCase').value();
                q = utils.strings.sanitize(q);

                if(!_.isEmpty(data.q)){
                    query.containedIn('keywords', q);
                }

                console.log('will query for', q);
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
                    .select(Venues.fields)
                    .include('logo')
                    .include('page')
                    .include('cover')
                    .include('claimed_by')
                    .include('category')
                    .limit(200)
                    .ascending('name')
                    .find()
                    .then(function(r){
                        r = _.uniq(r, true, function(rs){
                            return rs.get('name') + '-' + rs.get('position').latitude + '-' + rs.get('position').longitude;
                        });

                        _.each(r, function(v){
                            var city = v.get('locality');

                            if(cities.indexOf(city) < 0){
                                cities.push(city);
                            }

                            v.set('logo', v.getLogo());
                        });

                        res.status(200).json({ status: 'success', message: 'Become the bull!', results: r, cities: cities});
                    }, function(e){
                        res.status(404).json({ status: 'error', error: e});
                    });
            }else{
                res.status(404).json({ status: 'error', error: 'Location is a required value', code: 601});
            }

        }, function(e){
            res.status(404).json({ status: 'error', error: e.message, code: e.code });
        });
};

module.exports = {
    search: search
}
