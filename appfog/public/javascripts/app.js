$(function(){
	/********* SETTINGS AND DEFAULTS **********/
	_.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g,
        evaluate: /\{\%(.+?)\%\}/g
    };
    var md5 = CryptoJS.MD5;
	var User = Parse.User.extend({
		getDisplayName: function(){
			var name = this.escape('name') ? this.escape('name') : this.escape('username') ? this.escape('username') : 'Joundini';

			return name;
		},
		getAvatar: function(){
			var a = this.get('avatar');
			if(_.isString(a)){
				return a;
			}else if(!_.isEmpty() && this.get('avatar').get('file')){
				return this.get('avatar').get('file').url();
			}else{
				return '//www.gravatar.com/avatar/' + md5(this.get('username'))
			}
		},
		getBasicData: function(){
			var data = {
				id: this.id,
				username: this.get('username'),
				email: this.get('email'),
				displayName: User.prototype.getDisplayName.call(this),
				settings: this.get('settings'),
				avatar: User.prototype.getAvatar.call(this),
				name: this.get('name'),
				lastName: this.get('lastName')
			}

			return data;
		}
	});
	var Visitor = Parse.Object.extend('Visitor');
	var gmaps = google.maps;
	var config = {
		PARSE: {
			KEY: 'hq7NqhxfTb2p7vBij2FVjlWj2ookUMIPTmHVF9ZH',
			JSKEY: 'cdfm37yRroAiw82t1qukKv9rLVhlRqQpKmuVlkLC'
		},
		GEO: {
			DEFAULT: { enableHighAccuracy: true/*, timeout: 10000, maximumAge: 600000*/},
			DEFAULT_CENTER: {coords: {latitude: 19.432608, longitude: -99.133208}},
			DEFAULT_ZOOM: 5
		},
		GOOGLE: {
			MAPS_WEB_KEY:'AIzaSyDErD0SmoSczDbedVgFhTdamYStKYU1mXM'
		},
		FACEBOOK: {
			APP_ID: '688997761197114'
		},
		MAP: {
			DEFAULT_OPTIONS: {
				zoom: 5,
				mapTypeId: 'roadmap',//ROADMAP,
				zoomControl: true,
			    zoomControlOptions: {
			        style: 2,//LARGE
			        position: 7//google.maps.ControlPosition.RIGHT_TOP
			    },
			    mapTypeControl: true,
			    mapTypeControlOptions: {
			        position: google.maps.ControlPosition.RIGHT_BOTTOM
			    },
			    panControl: true,
			    panControlOptions: {
			        position: google.maps.ControlPosition.RIGHT_TOP
			    },
			}
		},
		MARKERS: {
			LOCATION: {
				url: '/images/marker_location.png'
			},
			LOCATION_CUSTOM: {
				url: '/images/marker_location_custom.png',
				size: {
					width: 20,
					height: 20
				}
			},
			LOCATION_CUSTOM_PIN: {
				url: '/images/marker_location_custom_pin.png',
				size: {
					width: 32.5,
					height: 35
				}
			},
			VENUE: {
				url: '/images/marker_venue.png',
				size: {
					width: 30,
					height: 43
				}
			},
			VENUE_SELECTED: {
				url: '/images/marker_venue_selected.png',
				size: {
					width: 30,
					height: 43
				}
			},
			A: {
				url: '/images/marker_a.png',
				size: {
					width: 30,
					height: 43
				}
			},
			B: {
				url: '/images/marker_b.png',
				size: {
					width: 30,
					height: 43
				}
			},
			C: {
				url: '/images/marker_c.png',
				size: {
					width: 30,
					height: 43
				}
			},
			D: {
				url: '/images/marker_d.png',
				size: {
					width: 30,
					height: 43
				}
			},
			E: {
				url: '/images/marker_e.png',
				size: {
					width: 30,
					height: 43
				}
			}
		},
		SETTINGS: {
			autoSearch: false,
			autoFocus: true,
			searchRadius: 3000//meters
		},
		RADIUS: {
			DEFAULT: {
				'radius': 3000,
				'strokeColor' : 'rgba(255,0,0,0.1)',
				'strokeWidth': 1,
				'fillColor' : 'rgba(255,0,0,0.07)',
				'visible': false
			}
		},
		VENUE_FIELDS: ['name', 'activity_description', 'block', 'building', 'building_floor', 'exterior_letter', 'email_address', 'exterior_number', 'federal_entity', 
                'internal_letter', 'internal_number', 'keywords', 'locality', 'municipality', 'phone_number', 'position', 'postal_code', 'road_name', 
                'road_name_1', 'road_name_2', 'road_name_3', 'road_type', 'road_type_1', 'road_type_2', 'road_type_3', 'settling_name', 'settling_type', 'shopping_center_name', 'shopping_center_store_number', 'shopping_center_type', 'www', 'logo', 'avatar', 'page']
	};

	Parse.initialize(config.PARSE.KEY, config.PARSE.JSKEY);

	/********* HEADER **********/
	var Header = Backbone.View.extend({
		el: '#header',
		dom: {},
		userMenuTemplate: _.template($('#template-user-menu').html()),
		events: {
			'change #header-category-dropdown': 'setCategory',
			'click #header-logo': 'home',
			'click #facebook-login-button': 'facebookLogin',
			'click #header-login-button': 'login',
			'click #header-signup-button': 'signup',
			'click #header-signout-button': 'signout',
			'click #header-settings-button': 'settings',
			'click #header-search-icon': 'onSubmit',
			'click #position-toggle': 'geolocationModeChange',
			'change #header-search-text': 'onSearchChange',
			'keyup #header-search-text': 'onSearchChange',
			'submit': 'submit'
		},
		initialize: function(options){
			if(options && options.positionModel){
				this.positionModel = options.positionModel;
			}else{
				throw new Error('Header requires a shared position Model.');
			}

			Backbone.on('position:found', this.onPosition, this);
			Backbone.on('position:notfound', this.onPositionError, this);
			Backbone.on('map:ready', this.onMapReady, this);
			Backbone.on('user:profile:photo', this.updateAvatar, this);
			Backbone.on('user:login', this.updateOptions, this);
			Backbone.on('user:logout', this.updateOptions, this);

			this.listenTo(this.positionModel, 'change:usingGeolocation', this.onGeolocationModeChange, this);

			return this.render();
		},
		render: function(){
			this.updateOptions();

			return this;
		},
		onPosition: function(){
			this.dom.positionToggle.addClass('active').removeClass('disabled');
		},
		onPositionError: function(){
			this.dom.positionToggle.removeClass('active').removeClass('disabled');
		},
		onMapReady: function(){
			if(this.dom.positionToggle.hasClass('disabled')){
				this.dom.positionToggle.removeClass('disabled');
			}
		},
		geolocationModeChange: function(){
			this.positionModel.set('usingGeolocation', !this.positionModel.get('usingGeolocation'));
		},
		onGeolocationModeChange: function(){
			switch(this.positionModel.get('usingGeolocation')){
			case true: this.dom.positionToggle.addClass('active');break;
			case false: this.dom.positionToggle.removeClass('active');break;
			}
		},
		onSearchChange: function(){
			switch(this.dom.search.val().length >= 3){
			case true: this.dom.searchIcon.removeClass('disabled'); break;
			default: this.dom.searchIcon.addClass('disabled'); break;
			}
		},
		onSubmit: function(){
			this.dom.form.trigger('submit');
		},
		submit: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			var keywords = _.chain(this.dom.search.val().split(' ')).map(function(v){return $.trim(v);}).compact().value();
			var category = this.dom.dropdown.dropdown('get value');
			var p = this.positionModel.toJSON();
			var data = {};

			if(keywords.length || !!category){
				data.q = keywords;
				data.p = {lat: p.center.lat(), lng: p.center.lng(), radius: p.radius};

				if(category && category !== 'all'){
					data.c = category;
				}

				Backbone.trigger('search:start');

				$.ajax({
					type: 'POST',
					dataType: 'json',
					data: data,
					url: '/search'
				}).then(function(r){
					Backbone.trigger('search:results', r.results);
				}).fail(function(){
					console.log('fail loading', arguments);
				}).always(function(){
					Backbone.trigger('search:end');
				});
			}
		},
		setCategory: function(){
			if(!!this.dom.dropdown.dropdown('get value')){
				this.dom.searchIcon.removeClass('disabled');
			}
		},
		home: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			Backbone.history.navigate('/', {trigger: false});
		},
		login: function(){
			if(User.current()){
				return;
			}

			if(!this.loginModal){
				this.loginModal = new LoginModal();
			}

			this.loginModal.show();
		},
		signup: function(){
			if(User.current()){
				return;
			}

			if(!this.signupModal){
				this.signupModal = new SignupModal();
			}

			this.signupModal.show();
		},
		facebookLogin: function(){
			$('body').dimmer('show');

			Parse.FacebookUtils.logIn(null, {
				success: function(user){
					var isNew = !user.existed();

					if(!user.setting && !user.get('avatar')){
						//Get user picture
						FB.api(
							'/me/picture',
							function (response) {
								$('body').dimmer('hide');
								if (response && !response.error) {
									user.set('avatar', response.url)
										.save()
										.then(function(){Backbone.trigger('user:profile:photo', response.url)});
								}
							}
						);
					}else{
						$('body').dimmer('hide');
					}

					Backbone.trigger('user:login', isNew);
				}.bind(this),
				error: function(user, error) {
					$('body').dimmer('hide');
					alert("No hemos podido enlazar a tu cuenta de Facebook.");
				}
			});
		},
		signout: function(){
			User.logOut();
			Backbone.trigger('user:logout');
		},
		settings: function(){
			if(!this.settingsModal){
				this.settingsModal = new SettingsModal();
			}

			this.settingsModal.show();
		},
		updateAvatar: function(url){
			this.dom.avatar.attr('src', url);
		},
		updateOptions: function(){
			var user = User.current();

			this.undelegateEvents();

			this.$el.find('#header-user-menu').html(this.userMenuTemplate({data: {user: user ? user.getBasicData() : null}}));

			this._cacheElements();
			this.delegateEvents();
		},
		_cacheElements: function(){
			this.dom = {
				search: this.$el.find('[type=text]'),
				searchIcon: this.$el.find('#header-search-icon'),
				positionToggle: this.$el.find('#position-toggle'),
				facebookLogin: this.$el.find('#facebook-login-button'),
				login: this.$el.find('#login-button'),
				signup: this.$el.find('#signup-button'),
				dropdown: this.$el.find('#header-category-dropdown-wrapper'),
				userDropdown: this.$el.find('#header-user-options-dropdown'),
				userMenu: this.$el.find('#header-user-menu'),
				form: this.$el.find('form'),
				avatar: this.$el.find('#header-avatar img')
			};

			this.dom.userDropdown.dropdown();
			this.dom.dropdown.dropdown();
		}
	});

	var PositionModel = Backbone.Model.extend({
		defaults: {
			center: null,
			radius: 1000,
			usingGeolocation: false,
			position: null//Geolocation returned value
		}
	});

	/********* MAP **********/
	var geolocatedMarkerIcon = {
		url: config.MARKERS.LOCATION.url,
		size: new google.maps.Size(20, 20),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(10,10)
	};

	var customLocatedMarkerIcon = {
		url: config.MARKERS.LOCATION_CUSTOM.url,
		size: new google.maps.Size(20, 20),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(10,10)
	};
	var venueMarkerIcon = {
		url: config.MARKERS.VENUE.url,
		size: new google.maps.Size(20, 30),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(10,10)
	};
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
	var Places = Parse.Collection.extend({
		model: PlaceModel
	});
	var Map = Backbone.View.extend({
		el: '#map',
		currentPosition: null,
		currentPositionMarker: null,
		currentRadius: null,
		points: [],
		markers: [],
		bounds: null,
		position: null,
		usingGeolocation: false,
		directionsService: null,
		directionsDisplay: null,
		initialize: function(options){
			if(options && options.positionModel){
				this.positionModel = options.positionModel;
			}else{
				throw new Error('Map requires a shared position Model.');
			}

			this.listenTo(this.positionModel, 'change:center', this.centerMap, this);
			this.listenTo(this.positionModel, 'change:radius', this.zoomTo, this);
			this.listenTo(this.positionModel, 'change:usingGeolocation', this.onGeolocationModeChange, this);

			//Create settings model
			this.model = settingsModel;
			this.listenTo(this.model, 'change:searchRadius', this.onUpdateRatio, this);

			//Places collection
			this.collection = new Places();
			this.listenTo(this.collection, 'reset', this.addAll, this);
			this.listenTo(this.collection, 'add', this.addOne, this);

			this.directionsService = new google.maps.DirectionsService();
			this.directionsDisplay = new google.maps.DirectionsRenderer();

			Backbone.on('search:start', this.onSearchStart, this);
			Backbone.on('search:end', this.onSearchEnd, this);
			Backbone.on('search:results', this.parse, this);
			Backbone.on('route:trace', this.route, this);

			return this.render();
		},
		render: function(){
			var p = this.position = new google.maps.LatLng(config.GEO.DEFAULT_CENTER.coords.latitude,config.GEO.DEFAULT_CENTER.coords.longitude);

			this.map = new gmaps.Map(this.$el[0], _.extend({}, config.MAP.DEFAULT_OPTIONS, {center: p}));

			this.currentPositionMarker = new google.maps.Marker({
				position: p,
				map: this.map,
				visible: false,
				title: 'Mi ubicacion',
				draggable: true,
				icon: geolocatedMarkerIcon
			});

			this.currentRadius = new google.maps.Circle(_.extend({}, config.RADIUS.DEFAULT, {
				center: p,
				radius: this.model.get('searchRadius')*1,
				map: this.map,
				visible: false
			}));

			this._updateRadius(this.model.get('searchRadius')*1);

			Backbone.trigger('map:ready');

			google.maps.event.addListener(this.map, 'click', _.bind(this.clearVenue, this));
			google.maps.event.addListener(this.currentRadius, 'click', _.bind(this.clearVenue, this));
			google.maps.event.addListener(this.currentPositionMarker, 'dragstart', _.bind(this.onCenterDragStart, this));
			google.maps.event.addListener(this.currentPositionMarker, 'dragend', _.bind(this.onCenterDragEnd, this));

			//this.getCurrentPosition();

			this.directionsDisplay.setMap(this.map);

			return this;			
		},
		clearVenue: function(e){
			Backbone.trigger('venue:info:hide');
		},
		onCenterDragStart: function(){
			this.currentRadius.setVisible(false);
			this.positionModel.set('usingGeolocation', false);
		},
		onCenterDragEnd: function(){
			var p = this.currentPositionMarker.getPosition();
			var o = {silent: !this.model.get('autoFocus')};

			this.currentRadius.setCenter(p);
			this.currentRadius.setVisible(true);
			this.positionModel.set('center', p, o);

			Backbone.trigger('position:change');
		},
		onGeolocationModeChange: function(model, useGeolocation){
			switch(useGeolocation){
			case true: this.getCurrentPosition(); break;
			}
		},
		getCurrentPosition: function(){
			$('body').dimmer('show');
			navigator.geolocation.getCurrentPosition(this.onPosition.bind(this), this.onPositionError.bind(this), config.GEO.DEFAULT);
		},
		onPosition: function(position){
			$('body').dimmer('hide');
			var p = this.position = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);

			this.usingGeolocation = true;
			this.model.set('useGeolocation', true);
			this.positionModel.set('center', p);
			this.positionModel.set('radius', this.model.get('searchRadius'));
			this.positionModel.set('position', position);//Save native values
			this.positionModel.set('usingGeolocation', true);
			Backbone.trigger('position:found');
		},
		onPositionError: function(){
			$('body').dimmer('hide');
			Backbone.trigger('position:notfound');
		},
		onUpdateRatio: function(model, newRadius){
			this._updateRadius(newRadius*1);
		},
		onSearchStart: function(){
			this.$el.dimmer('show');
		},
		onSearchEnd: function(){
			this.$el.dimmer('hide');
		},
		/* DATA METHODS */
		parse: function(results){
			this.collection.reset(results);
		},
		addAll: function(){
			var defaultZoom = 10;
			this.points = [];
			this.bounds = new google.maps.LatLngBounds();
			//Remove all markers
			_.each(this.markers, function(m){m.setMap(null); m = null;});
			//Clear markers
			this.markers = [];
			//Add all markers
			this.collection.each(this.addOne.bind(this));

			if(this.points.length){
				//If we are using user position
				if(this.usingGeolocation){
					this.points.push(this.positionModel.get('center'));
					this.bounds.extend(this.positionModel.get('center'));
				}

				if(this.model.get('autoFocus')){
					this.map.fitBounds(this.bounds);
				}
				
			}else{
				alert('No encontramos establecimientos para tu busqueda :(');
			}
			
			//Hide dialog
			//window.plugins.spinnerDialog.hide();
		},
		addOne: function(model){
			var l = model.get('position');
			var p = new google.maps.LatLng(l.latitude, l.longitude);

			this.points.push(p);

			var marker = new google.maps.Marker({
				position: p,
				map: this.map,
				visible: true,
				title: model.get('name')/*,
				icon: geolocatedMarkerIcon*/
			});
			
			this.markers.push(marker);

			if(this.bounds){
				this.bounds.extend(p);
			}

			google.maps.event.addListener(marker, 'click', function() {
				Backbone.trigger('venue:info', model.toJSON());
				Backbone.history.navigate('venue/' + model.id, {trigger: false});
			});
			/*
			this.map.addMarker({
				position: lng,
				data: {id: model.id},
				visible: false,
				markerClick: function(marker){
					//Reset marker icon only if it is not in the markers object or if there is no routes
					if(_.size(this.routes) && this.currentMarker){
						var currentMarkers = _.map(this.routes, function(r){return r.marker.id;});

						if(!_.contains(currentMarkers, this.currentMarker.id)){
							this.currentMarker.setIcon(config.MARKERS.VENUE);
						}
					}else if(this.currentMarker){
						this.currentMarker.setIcon(config.MARKERS.VENUE);
					}
					
					//Highlight marker
					this.currentMarker = marker;
					this.currentModel = this.collection.get(marker.get('data').id);
					marker.setIcon(config.MARKERS.VENUE_SELECTED);
					Backbone.trigger('venue:info', marker.get('data').id);
				}.bind(this)
			}, function(marker) {
				marker.setIcon(config.MARKERS.VENUE);
				marker.setVisible(true);
				
			}.bind(this));
			*/
		},

		centerMap: function(){
			var p = this.position = this.positionModel.get('center');

			if(this.model.get('useGeolocation')){
				this.currentPositionMarker.setIcon(geolocatedMarkerIcon);
			}else{
				this.currentPositionMarker.setIcon(customLocatedMarkerIcon);
			}

			this.map.setCenter(p);
			this.currentPositionMarker.setPosition(p);
			this.currentPositionMarker.setVisible(true);
			this.currentRadius.setCenter(p);
			this.currentRadius.setVisible(true);
		},
		route: function(from, to){
			var request = {
				origin:from,
				destination:to,
				travelMode: google.maps.TravelMode.DRIVING
			};
			this.directionsService.route(request, _.bind(function(response, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					this.directionsDisplay.setPanel(document.getElementById('directions-panel'));
					this.directionsDisplay.setDirections(response);
					Backbone.trigger('route:complete');
				}
			}, this));
		},
		zoomTo: function(model, newRadius){
			this._updateRadius(newRadius*1);
			this.centerMap();
		},
		_updateRadius: function(newRadius){
			try{
				this.currentRadius.setRadius(newRadius);
				this.positionModel.set('radius', newRadius);

				switch(newRadius/1000){
				case 1:
					this.map.setZoom(15);
					break;
				case 2:
				case 3:
					this.map.setZoom(14);
					break;
				case 4:
				case 5:
				case 6:
				case 7:
					this.map.setZoom(13);
					break;
				case 8:
				case 9:
				case 10:
					this.map.setZoom(12);
					break;
				}	
			}catch(e){
				console.log('can not set radius', e.message);
				this.currentRadius.setRadius(10);
			}
			
		}
	});

	/********* AUTH **********/
	var LoginModal = Backbone.View.extend({
		el: '#login-modal',
		dom: {},
		events: {
			'click #login-modal-ok': 'submit',
			'click #login-modal-cancel': 'hide',
			'submit': 'submit'
		},
		initialize: function(){
			return this.render();
		},
		render: function(){
			this.$el.modal({
				closable: false
			});

			this.dom.errorList = this.$el.find('.message .list');
			this.dom.form = this.$el.find('form');
			this.dom.form.form({
				inline: true,
				on: 'blur',
				'username': {
                    identifier: 'login-modal-username',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Por favor introduce tu correo electronico.'
                        },
                        {
                            type: 'email',
                            prompt: 'Ese no parece ser un correo electronico valido.'
                        }
                    ]
                },
                'password': {
                    identifier: 'login-modal-password',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Necesitamos tu contrasena.'
                        },
                        {
                            type: 'length[6]',
                            prompt: 'La contrasena debe tener al menos 6 caracteres.'
                        }
                    ]
                }
			});

			return this;
		},
		show: function(){
			this.$el.modal('show');

			return this;
		},
		hide: function(){
			this.$el.modal('hide');
			this.dom.form.form('reset');

			return this;
		},
		submit: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			var isValid = this.dom.form.form('validate form');
			var values;
			if(isValid){
				this.dom.form.addClass('loading').removeClass('error');
				values = this.dom.form.form('get values');

				User
					.logIn(values['login-modal-username'], values['login-modal-password'])
					.then(_.bind(this.onSuccess, this))
					.fail(_.bind(this.onError, this))
					.always(_.bind(function(){this.dom.form.removeClass('loading');}, this));
			}
		},
		onSuccess: function(u){
			Backbone.trigger('user:login');
			this.hide();
		},
		onError: function(e){
			var values = this.dom.form.form('get values');
			
			switch(e.code){
			case 101: e.error = 'Tu correo y contraseña no coinciden, intenta de nuevo.'; break;
			}

			this.dom.form.addClass('error');

			alert(e.error);
		}
	});
	var SignupModal = Backbone.View.extend({
		el: '#signup-modal',
		dom: {},
		events: {
			'click #signup-modal-ok': 'submit',
			'click #signup-modal-cancel': 'hide',
			'submit': 'submit'
		},
		initialize: function(){
			console.log('initialize signup modal');
			return this.render();
		},
		render: function(){
			this.$el.modal({
				closable: false
			});

			this.dom.errorList = this.$el.find('.message .list');
			this.dom.form = this.$el.find('form');
			this.dom.form.form({
				inline: true,
				on: 'blur',
				'username': {
                    identifier: 'signup-modal-username',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Por favor introduce tu correo electronico.'
                        },
                        {
                            type: 'email',
                            prompt: 'Ese no parece ser un correo electronico valido.'
                        }
                    ]
                },
                'password': {
                    identifier: 'signup-modal-password',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Necesitamos tu contrasena.'
                        },
                        {
                            type: 'length[6]',
                            prompt: 'La contrasena debe tener al menos 6 caracteres.'
                        }
                    ]
                },
                'password-confirm': {
                    identifier: 'signup-modal-password-confirmation',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Necesitamos que confirmes tu contrasena.'
                        },
                        {
                            type: 'match[signup-modal-password]',
                            prompt: 'Las contrasenas no coinciden.'
                        }
                    ]
                },
                'signup-tos-confirmation': {
                	identifier: 'signup-tos-confirmation',
                	rules: [
                		{
                			type: 'checked',
                			prompt: 'Debes aceptar los terminos de servicio.'
                		}
                	]
                }
			});

			return this;
		},
		show: function(){
			this.$el.modal('show');

			return this;
		},
		hide: function(){
			this.$el.modal('hide');
			this.dom.form.form('reset');

			return this;
		},
		submit: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			var isValid = this.dom.form.form('validate form');
			var values, user;
			if(isValid){
				this.dom.form.addClass('loading').removeClass('error');
				values = this.dom.form.form('get values');

				User
					.signUp(values['signup-modal-username'], values['signup-modal-password'])
					.then(_.bind(this.onSuccess, this))
					.fail(_.bind(this.onError, this))
					.always(_.bind(function(){this.dom.form.removeClass('loading');}, this));
			}
		},
		onSuccess: function(u){
			Backbone.trigger('user:login');
			this.hide();
		},
		onError: function(e){
			var values = this.dom.form.form('get values');
			
			switch(e.code){
			case 202: e.error = 'El usuario ' + values['signup-modal-username'] + ' ya esta registrado.'; break;
			}

			this.dom.form.addClass('error');

			alert(e.error);
		}
	});

	/********* SETTINGS **********/
	var SettingsModel = Backbone.Model.extend({
		defaults: config.SETTINGS,
		initialize: function(){
			var currentSettings = localStorage.getItem('jound-settings');

			if(!_.isEmpty(currentSettings)){
				currentSettings = _.extend(this.toJSON(), JSON.parse(currentSettings));
			}

			this.set(currentSettings);

			return this;
		},
		toLocal: function(){
			var currentSettings = localStorage.getItem('jound-settings');

			if(!_.isEmpty(currentSettings)){
				currentSettings = _.extend(JSON.parse(currentSettings), this.toJSON());
			}else{
				currentSettings = this.toJSON();
			}

			localStorage.setItem('jound-settings', JSON.stringify(currentSettings));

			return this;
		}
	});

	var SettingsModal = Backbone.View.extend({
		el: '#settings-modal',
		dom: {},
		events: {
			'change #settings-modal-radius': 'onRadiusChange',
			'change #settings-modal-auto-search': 'onAutoSearchChange',
			'change #settings-modal-auto-focus': 'onAutoFocusChange'
		},
		initialize: function(){

			this.model = settingsModel;

			return this.render();
		},
		render: function(){
			this.dom.searchRadius = this.$el.find('#settings-modal-radius');
			this.dom.autoSearch = this.$el.find('#settings-modal-auto-search-wrapper');
			this.dom.autoFocus = this.$el.find('#settings-modal-auto-focus-wrapper');

			this.dom.autoFocus.checkbox();
			this.dom.autoSearch.checkbox();

			this.dom.autoSearch.checkbox(this.model.get('autoSearch') ? 'check' : 'uncheck');
			this.dom.autoFocus.checkbox(this.model.get('autoFocus') ? 'check' : 'uncheck');
			this.dom.searchRadius.val(this.model.get('searchRadius'));

			console.log('current settings', this.model.toJSON());

			this.$el.modal();

			return this;
		},
		show: function(){
			this.$el.modal('show');

			return this;
		},
		hide: function(){
			this.$el.modal('hide');

			return this;
		},
		onRadiusChange: function(){
			this.model.set('searchRadius', this.dom.searchRadius.val()*1);
			this.model.toLocal();
			
			if(User.current()){
				User.current().set('settings', this.model.toJSON()).save();
			}
		},
		onAutoSearchChange: function(){
			this.model.set('autoSearch', this.dom.autoSearch.checkbox('is checked'));
			this.model.toLocal();

			if(User.current()){
				User.current().set('settings', this.model.toJSON()).save();
			}
		},
		onAutoFocusChange: function(){
			console.log('focus', this.dom.autoFocus.checkbox('is checked'));
			this.model.set('autoFocus', this.dom.autoFocus.checkbox('is checked'));
			this.model.toLocal();

			if(User.current()){
				User.current().set('settings', this.model.toJSON()).save();
			}
		}
	});

	/********* VENUE **********/
	var Directions = Backbone.Collection.extend({
		model: Backbone.Model.extend()
	});
	var Venue = Backbone.View.extend({
		className: 'venue',
		id: 'ui-card-wrapper',
		template: _.template($('#venue-template').html()),
		routeEnabled: false,
		share: null,
		events: {
			'click a.label': 'hide',
			'click #venue-card-directions': 'getDirecctions',
			'click #venue-card-like': 'like',
			'click #venue-card-unlike': 'unlike',
			'click #venue-card-share': 'share',
			'click #venue-options-send-message': 'sendMessage'
		},
		initialize: function(options){
			Backbone.on('venue:info', this.update, this);
			
			this.positionModel = positionModel;
			this.model = new PlaceModel();
			this.directionsCollection = new Directions();

			this.listenTo(this.model, 'change:name', this.render, this);
			this.listenTo(this.directionsCollection, 'request', this.onDirectionsRequest, this);
			this.listenTo(this.directionsCollection, 'reset', this.onDirections, this);
			this.listenTo(this.directionsCollection, 'error', this.onDirectionsError, this);

			if(options){
				if(options.venue){
					this.model.set(options.venue);
				}
			}

			Backbone.on('route:complete', this.onDirections, this);
			Backbone.on('route:error', this.onDirectionsError, this);
			Backbone.on('position:change', this._requestDirections, this);

			return this;
		},
		render: function(){
			var u = User.current();
			var id = this.model.id;
			var data = this.model.getBasicData();
			var p = this.model.get('position');

			data.liked = false;
			data.page = this.model.get('page');

			if(u && _.indexOf(u.get('likedVenues'), id) >= 0){
				data.liked = true;
			}else{
				data.liked = false;
			}

			this.$el.html(this.template({data: data}));
			
			if(this.model.get('page') && !this.model.pageLoaded){
				this.model.get('page').fetch();
			}

			this.dom = {
				rating: this.$el.find('.rating'),
				directionsButton: this.$el.find('#venue-card-directions'),
				likeButton: this.$el.find('#venue-card-like'),
				shareButton: this.$el.find('#venue-card-share'),
				unlikeButton: this.$el.find('#venue-card-unlike'),
				address: this.$el.find('#venue-card-address')
			};

			this.dom.rating.rating();
			Backbone.trigger('page:set:title', this.model.get('name') + ' - Jound');

			this.dom.address.html(PlaceModel.prototype.getAddress.call(this.model));
			/*
			$.ajax({url: '/address', type: 'POST', data: {latitude: p.latitude, longitude: p.longitude}})
				.then(_.bind(function(r){
					if(r && r.address && r.address.results.length){
						this.dom.address.text(r.address.results[0].formatted_address);
					}else{
						this.dom.address.text(PlaceModel.prototype.getAddress.call(this.model));
					}
				}, this))
				.fail(_.bind(function(){
					this.dom.address.text(PlaceModel.prototype.getAddress.call(this.model));
				}));*/

			console.log(this.model.toJSON());

			
			return this;
		},
		show: function(){
			if(!this.$el.is(':visible')){
				this.$el.transition('fade up');
			}
			return this;
		},
		hide: function(){
			if(this.$el.is(':visible')){
				this.$el.transition('fade down');
				Backbone.history.navigate('/', {trigger: false});
			}
			return this;
		},
		update: function(data){
			this.model.clear({silent: true}).set(data);
			this.show();
		},
		onPage: function(){

		},
		onPageError: function(){

		},
		getDirecctions: function(){
			this.routeEnabled = true;
			this.dom.directionsButton.addClass('active');
			this._requestDirections();
		},
		onDirections: function(){
			this.dom.directionsButton.removeClass('loading');
		},
		onDirectionsError: function(){
			this.dom.directionsButton.removeClass('loading').addClass('error');
		},
		like: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			var id = this.model.id;
			var u = User.current();
			var $button = this.dom.likeButton;
			var liked, data;

			if(u){
				$button.addClass('loading');
				data = {id: id, u: u.id, token: u.getSessionToken()};
				liked = (_.indexOf(u.get('likedVenues'), id) >= 0);
				//Like it or not
				if(liked){
					u.remove('likedVenues', id).save();
					$.ajax({url: '/unlike', type: 'POST', data: data})
						.then(function(){$button.removeClass('orange');})
						.fail(function(){console.log('unable to unlike', arguments);})
						.always(function(){$button.removeClass('loading');});
				}else{
					u.addUnique('likedVenues', id).save();
					$.ajax({url: '/like', type: 'POST', data: data})
						.then(function(){$button.addClass('orange');})
						.fail(function(){console.log('unable to like', arguments);})
						.always(function(){$button.removeClass('loading');});
				}
			}
		},
		share: function(){
			console.log('share');
		},
		sendMessage: function(){
			Backbone.trigger('message:write', this.model.id);
		},
		_requestDirections: function(){
			if(!this.routeEnabled) return;//Route already been traced

			var p = this.model.get('position');
			var pp = this.positionModel.get('center');
			var to = p.latitude + ',' + p.longitude;
			var from = pp.lat() + ',' + pp.lng();

			this.dom.directionsButton.addClass('loading');

			Backbone.trigger('route:trace', from, to);
		}
	});

	/********* MESSAGE MODAL ***********/
	var MessageModel = Parse.Object.extend('Message');
	var MessageModal = Backbone.View.extend({
		className: 'ui small modal',
		template: _.template($('#venue-message-template').html()),
		dom: {},
		events: {
			'click .ok.button': 'onSubmit',
			'click .cancel.button': 'hide',
			'submit': 'submit'
		},
		initialize: function(){
			this.model = new MessageModel();

			return this.render();
		},
		render: function(){
			this.$el.html(this.template());
			this.$el.modal({
				closable: false,
				onApprove: _.bind(this.onApprove, this),
                onDeny: _.bind(this.onDeny, this)
			});

			this.dom = {
				form: this.$el.find('form'),
				checkboxWrapper: this.$el.find('#message-modal-contact-wrapper'),
				checkbox: this.$el.find('input[type=checkbox]')
			};

			this.dom.checkboxWrapper.checkbox();
			this.dom.form.form({
				inline: true,
				on: 'blur',
				'name': {
                    identifier: 'message-modal-name',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Por favor introduce tu nombre completo.'
                        }
                    ]
                },
                'email': {
                    identifier: 'message-modal-email',
                    rules: [
                        {
                            type: 'email',
                            prompt: 'Por favor introduce un correo electronico valido.'
                        }
                    ]
                },
                'phone': {
                    identifier: 'message-modal-phone',
                    rules: [
                        {
                            type: 'length[10]',
                            prompt: 'Por favor introduce un numero telefonico valido, e.g. 123-456-7890.'
                        }
                    ]
                },
                'message': {
                    identifier: 'message-modal-message',
                    rules: [
                        {
                            type: 'length[10]',
                            prompt: 'Por favor introduce un mensaje mas significativo.'
                        }
                    ]
                }
			})

			return this;
		},
		show: function(venueID){
			var venue = new Place();
			var visitor;
			if(venueID){
				venue.id = venueID;
				this.model.set('venue', venue);
			}else{
				return false;
			}

			if(User.current()){
				this.model.set('user', User.current());
			}else{
				visitor = new Visitor();
				this.model.set('visitor', visitor);
			}

			this.$el.modal('show');

			return this;
		},
		hide: function(){
			this.$el.modal('hide');
			this.dom.form.form('reset');
			this.dom.checkbox.checkbox('uncheck');
			this.model.clear();

			return this;
		},
		onApprove: function(){
			this.dom.form.trigger('submit');

			return false;
		},
		onDeny: function(){
			this.hide();
		},
		submit: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			this.$el.dimmer('show');

			var values = this.dom.form.form('get values');
			var visitor;

			var onVisitorSave = _.bind(function(){
				console.log('visitor saved', arguments);
			}, this);
			var onMessageSave = _.bind(function(){
				console.log('message saved', arguments);
			}, this);
			var onError = function(){
				console.log('error', arguments);
			}

			if(this.model.get('visitor')){
				visitor = this.model.get('visitor');
				visitor.set('email', values['message-modal-email']);
				visitor.set('phone', values['message-modal-phone']);
				visitor.set('name', values['message-modal-name']);
				visitor.set('canBeContacted', this.dom.checkboxWrapper.checkbox('is checked'));

				visitor.save().then(onVisitorSave).fail(onError);
			}else{
				this.model.save().then(onMessageSave).fail(onError);
			}
		}
	});
	
	/********* INITIALIZE OBJECTS (Temporal) **********/
	var user = User.current();
	var settings = user && user.get('settings') ? user.get('settings') : {};
	var settingsModel = new SettingsModel(settings);
	var positionModel = new PositionModel();
	var header = new Header({positionModel: positionModel});
	var map = new Map({positionModel: positionModel});
	var venue = new Venue({venue: window.initialVenueConfig || null, el: '#venue-view'});

	var Router = Backbone.Router.extend({
		views: {
			map: map,
			header: header
		},
		routes: {
			'venue/:position' : 'venue',
			'': 'home'
		},
		initialize: function(){
			Backbone.on('page:set:title', this.constructor.setTitle);
			Backbone.on('message:write', this.constructor.sendMessage);
		},
		home: function(){
			positionModel.set('usingGeolocation', true);
		},

		venue: function(id){
			var view, p, latln;
			if(!this.views.venue){
				this.views.venue = venue;
			}

			if(this.views.venue.model && window.initialVenueConfig){
				p = this.views.venue.model.toJSON();

				latln = new google.maps.LatLng(p.position.latitude,p.position.longitude);
				this.views.map.map.setCenter(latln);
				this.views.map.collection.add(this.views.venue.model);
				this.views.map.map.setZoom(14);
				//Show view
				this.views.venue.show();
			}else if(this.views.venue.model){
				console.log('venue model exist in venue view');
			}

			positionModel.set('center', latln);

			window.initialVenueConfig = null;
			delete window.initialVenueConfig;
		}
	}, {
		setTitle: function(title){
			$('title').text(title || 'Jound');
		},
		sendMessage: function(venueID){
			if(!venueID){
				return;
			}

			if(!this._messageModal){
				this._messageModal = new MessageModal();
			}

			this._messageModal.show(venueID);
		}
	});
	//Create anonymous router
	(window.App = new Router());
	Backbone.history.start({pushState: true});//

	//Load FB
    window.fbAsyncInit = function() {
        Parse.FacebookUtils.init({ // this line replaces FB.init({
            appId      : config.FACEBOOK.APP_ID, // Facebook App ID
            status     : true,  // check Facebook Login status
            cookie     : true,  // enable cookies to allow Parse to access the session
            xfbml      : true,  // initialize Facebook social plugins on the page
            version    : 'v2.2' // point to the latest Facebook Graph API version
        });

        // Run code after the Facebook SDK is loaded.
    };

    (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
});