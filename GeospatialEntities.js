var _ = require('lodash');
var Parse = require('parse').Parse;
var Country = Parse.Object.extend('Country');
var State = Parse.Object.extend('State');
var Municipality = Parse.Object.extend('Municipality');//County
var City = Parse.Object.extend('City');
var District = Parse.Object.extend('District');//Colonia
var Postal = Parse.Object.extend('PostalCode');
var gmaputil = require('googlemapsutil');
var validations = require('./validations');

var getAddress = function(lat, lng, extended){
	var lat = parseFloat(lat, 10);
    var lng = parseFloat(lng, 10);
    var p = new Parse.Promise();

    if( validations.POSITION.test(lat + ',' + lng)){
        gmaputil.reverseGeocoding(lat, lng, null, function(e, r){
            if(e){
                p.reject(e);
            }else {
            	if(extended){
            		p
            			.when(getExtendedAddress(JSON.parse(r)))
            			.then(function(r){
            				p.resolve(r);
            			}, function(e){
            				p.reject(e);
            			})
            	}else{
            		p.resolve(JSON.parse(r));
            	}
            }
        });
    }else{
        p.reject({message: 'Invalid lat/lng', code: 400});
    }

    return p;
};

var findByType = function(adds, type){
	adds = adds || [];
	type = type.split('|');
	type = type.length > 1 ? type : type[0];
	adds = adds.filter(function(a){
		if(_.isString(type)){
			return _.contains(a.types, type);
		}else{
			return !!_.intersection(a.types, type).length;
		}
	});

	return _.first(adds);
};

var getExtendedAddress = function(address){
	var p = new Parse.Promise();
	var country, state, city, district, postalCode, municipality, formattedAddress;
	var countryQuery, stateQuery, cityQuery, districtQuery, postalQuery, municipalityQuery;
	var entities;
	var response;
	var results;

	if(address){
		results = address.results;

		formattedAddress = address.results[0].formatted_address;
		country = findByType(address.results, 'country');
		postalCode = findByType(address.results[0], 'postal_code');
		state = findByType(address.results, 'administrative_area_level_1');
		municipality = findByType(address.results, 'administrative_area_level_2|administrative_area_level_3');
		city = findByType(address.results, 'locality');
		district = findByType(address.results, 'sublocality_level_1');
		countryQuery = new Parse.Query('Country');
		stateQuery = new Parse.Query('State');
		municipalityQuery = new Parse.Query('Municipality');
		postalQuery = new Parse.Query('Postal');
		cityQuery = new Parse.Query('City');
		districtQuery = new Parse.Query('District');

		countryQuery
            .equalTo('code', country.code)
            .first()
            .then(function(c){//Return country or new country promise
                if(c){
                    return c;
                }else{
                    return new (Parse.Object.extend('Country'))({
                    	name: country.name, 
                    	code: country.code, 
                    	center: new GeoPoint({
                    		latitude: country.geometry.location.lat, 
                    		longitude: country.geometry.location.lng
                    })}).save();
                }
            })
            .then(function(c){//Configure state query based in country
                response.country = c;

                stateQuery
                    .equalTo('name', state.name)
                    .equalTo('country', c);

                return stateQuery.first();
            })
            .then(function(c){//Return state or new state promise
                if(c){
                    return c;
                }else{
                    return new (Parse.Object.extend('State'))({
                    	name: state.name, 
                    	country: response.country, 
                    	center: new GeoPoint({
                    		latitude: city.geometry.location.lat, 
                    		longitude: city.geometry.location.lng
                    })}).save();
                }
            })
            .then(function(c){//Configuring municipality query
                response.state = c;

                municipalityQuery
                    .equalTo('name', municipality.name)
                    .equalTo('country', response.country)
                    .equalTo('state', response.state);

                return municipalityQuery.first();
            })
            .then(function(c){//Return municipality or new municipality promise
                if(c){
                    return c;
                }else{
                    return new (Parse.Object.extend('Municipality'))({
                    	name: municipality.name, 
                    	country: response.country, 
                    	state: response.state,
                    	center: new GeoPoint({
                    		latitude: city.geometry.location.lat, 
                    		longitude: city.geometry.location.lng
                    })}).save();
                }
            })
            .then(function(c){//Configure city query
                response.municipality = c;

                cityQuery
                    .equalTo('name', city.name)
                    .equalTo('state', response.country)
                    .equalTo('municipality', response.state);

                return cityQuery.first();
            })
            .then(function(c){//Return city or new city promise
                if(c){
                    return c;
                }else{
                    return new (Parse.Object.extend('City'))({
                    	name: city.name, 
                    	state: response.state,
                    	municipality: response.municipality, 
                    	center: new GeoPoint({
                    		latitude: city.geometry.location.lat, 
                    		longitude: city.geometry.location.lng
                    })}).save();
                }
            })
            .then(function(c){//Configure district query
                response.city = c;

                districtQuery
                    .equalTo('name', district.name)
                    .equalTo('city', response.city)
                    .equalTo('municipality', response.municipality);

                return districtQuery.first();
            })
            .then(function(c){//Return district or new district promise
                if(c){
                    return c;
                }else{
                    return new (Parse.Object.extend('District'))({
                    	name: district.name, 
                    	city: response.city,
                    	municipality: response.municipality, 
                    	center: new GeoPoint({
                    		latitude: city.geometry.location.lat, 
                    		longitude: city.geometry.location.lng
                    })}).save();
                }
            })
            .then(function(c){
                response.district = c;
                p.resolve(response)
            }, function(e){
                p.reject(e);
            });
	}else{
		p.reject({message: 'No address provided', code: 401});
	}

	return p;
}

module.exports = {
	getAddress: getAddress
}