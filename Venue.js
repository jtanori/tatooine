var _ = require('lodash');
var Parse = require('parse').Parse;
var s = require("underscore.string");
var sanitizeHtml = require('sanitize-html');

var PlaceModel = Parse.Object.extend('Location', {
	getURL: function(){
        return '//www.jound.mx/venue/' + this.id;
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
}

module.exports = {Venue: PlaceModel, fields: fieldsWhiteList, parse: venueParse};
