var _ = require('lodash');
var Parse = require('parse').Parse;

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
	getCity: function(){
		var city = '';
		var location = this.get('locality');
		var municipality = this.get('municipality');
		var state = this.get('federal_entity');

		if(location === municipality){
			city += location + ', ' + state;
		}else {
			city += location + ', ' + municipality + ', ' + state;
		}

		if(this.get('postal_code')){
			city += ' C.P ' + this.escape('postal_code');
		}

		return city;
	},
	getLogo: function(){
		if(_.isString(this.get('logo'))){
			return this.get('logo');
		}else if(this.get('logo') && this.get('logo').get('file')){
			return this.get('logo').get('file').url();
		}else{
			return 'http://www.jound.mx/images/venue_default@2x.jpg';
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
			email: !!this.get('email_address'),
			www: this.getWWW()
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

module.exports = {Venue: PlaceModel, fields: fieldsWhiteList};