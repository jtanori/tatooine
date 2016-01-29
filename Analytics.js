'use strict';

var _ = require('lodash');
var Analytics = Parse.Object.extend('Analytics');
var Venues = require('./Venue.js');

var trackEvent = function(req, res){
    if(req.body && req.body.data){

        var a = new Analytics();

        _.each(req.body.data, function(d, i){

            switch(i){
            case 'id':
            case 'venue':

                if(d){
                    var venue = new Venues.Venue({id: d});

                    a.set('venue', venue);
                }

                break;
            case 'user':
            case 'userId':

                if(d){
                    var User = Parse.Object.extend('_User');
                    var user = new User({id: d});

                    a.set('user', user);
                }

                break;
            case 'position':
                var coords = d.split(',');
                var point = new Parse.GeoPoint({latitude: coords[0]*1, longitude: coords[1]*1});

                a.set('position', point);

                break;
            case 'category':

                if(d){
                    var C = Parse.Object.extend('Category');
                    var c = new C({id: d});

                    a.set('category', c);
                }

                break;
            case 'venues':

                if(d && d.split(',').length){
                    var venues = d.split(',');
                    a.set('venues', venues);
                }

                break;
            default:
                a.set(i, d);
            }
        });

        Parse.Cloud.useMasterKey();

        a
            .save()
            .then(function(){
                res.status(200).json({status: 'ok'});
            }, function(e){
                res.status(200).json({status: 'ok'});
            });
    }else{
        res.status(200).json({status: 'ok'});
    }
};

module.exports = {
    track: trackEvent
};
