var validations = require('./validations.js');
var gmaputil = require('googlemapsutil');
var polyline = require('polyline');

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

                    res.status(200).json({ status: 'success', message: 'Drive safetly!', results: r});
                }catch(e){
                    console.log(e);
                    console.log('error decoding polylines');
                    res.status(200).json({ status: 'error', e});
                }
            }
        });
    }else{
        res.status(404).json({ status: 'error', error: 'Invalid data input', code: 404 });
    }
};


module.exports = {
    getDirections: getDirections
}
