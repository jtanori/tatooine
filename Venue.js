var _ = require('lodash');
var Parse = require('parse').Parse;

var Place = Parse.Object.extend('Location');
var PlaceModel = Place.extend({
	pageLoaded: false,
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
			return '/images/venue_default@2x.jpg';
		}
	},
	getBasicData: function(){
		return {
			name: this.get('name'),
			address: PlaceModel.prototype.getAddress.call(this),
			city: PlaceModel.prototype.getCity.call(this),
			vecinity: PlaceModel.prototype.getVecinity.call(this),
			phoneNumber: this.get('phone_number'),
			url: this.get('www'),
			activity: this.get('activity_description'),
			logo: PlaceModel.prototype.getLogo.call(this),
			email: !!this.get('email_address')
		};
	}
});

module.exports = PlaceModel;