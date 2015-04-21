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
			WEB_KEY:'AIzaSyDErD0SmoSczDbedVgFhTdamYStKYU1mXM'
		},
		FACEBOOK: {
			APP_ID: '688997761197114',//'779644072132482'
			OGDEFAULT: {
				ogimagewidth: 117,
				ogimageheight: 111,
				ogimagetype: 'image/jpg',
				ogimage: '/images/jound-square.jpg',
				ogtitle: 'Jound - Busca y encuentra entre miles de establecimientos' 
			}
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

	function updateOG(data){
		if(!data){
			data = config.FACEBOOK.OGDEFAULT;
		}

		_.each(data, function(d, k){
			if($('#' + k).length){
				$('#' + k).attr('content', d);
			}
		});
	};

	/********* HEADER **********/
	var Header = Backbone.View.extend({
		el: '#header',
		dom: {},
		userMenuTemplate: _.template($('#template-user-menu').html()),
		events: {
			'click #sidebar-toggle': 'sidebar',
			'click #header-logo': 'home',
			'click #header-settings-button': 'settings',
			'click #header-search-icon': 'onSubmit',
			'click #position-toggle': 'geolocationModeChange',
			'click #header-search-category .icon': 'clearCategory',
			'click #search-box-button': 'onSearch',
			'change #header-search-text': 'onSearchChange',
			'keyup #header-search-text': 'onSearchChange',
			'submit': 'submit'
		},
		initialize: function(options){
			console.log('initialize header');
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
			this.dom = {
				search: this.$el.find('[type=text]'),
				searchIcon: this.$el.find('#header-search-icon'),
				positionToggle: this.$el.find('#position-toggle'),
				form: this.$el.find('form'),
				avatar: this.$el.find('#header-avatar img'),
				search: this.$el.find('#search-box'),
				searchInput: this.$el.find('#search-box-value'),
				categoryHidden: this.$el.find('#search-box-category'),
				searchButton: this.$el.find('#search-box-button'),
				dropdown: this.$el.find('#header-category-dropdown')
			};

			var $search = this.dom.search;
			var $category = this.dom.categoryHidden;
			var $input = this.dom.searchInput;
			var $button = this.dom.searchButton;

			$search.search({
				source: globalKeywords,
				searchFields: [
					'title',
					'keywords'
				],
				onSelect: function(selected){
					var $label = $search.find('#header-search-category');
					var text = selected.title;
					var id = selected.id;

					if($label.length){
						$label.find('.title').text(text);
					}else{
						$label = $('<span class="ui blue label" id="header-search-category"><span class="title">' + selected.title + '</span> <i class="icon close"></i></span>');
						$search.append($label);
					}

					$category.val(id);
					$input.css('padding-left', $label.outerWidth() + 10);

					$search.search('hide results');
					$search.search('set value', '');
					$input.attr('placeholder', '').trigger('focus');

					return false;
				}
			});

			return this;
		},
		clearCategory: function(){
			var $search = this.dom.search;
			var $label = $search.find('#header-search-category');
			var $input = this.dom.searchInput;

			$label.remove();
			$search.find('input').val('');
			$input.attr('placeholder', '¿Qué estas buscando?').trigger('focus').removeAttr('style');
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

			var keywords = _.chain(this.dom.searchInput.val().split(' ')).map(function(v){return $.trim(v);}).compact().value();
			var category = this.dom.categoryHidden.val();
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
		sidebar: function(e){
			if(!sidebar.isVisible()){ Backbone.trigger('sidebar:toggle'); }
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

	var Sidebar = Backbone.View.extend({
		el: '#sidebar',
		dom: {},
		events: {
			'click #facebook-login-button': 'facebookLogin',
			'click #header-login-button': 'login',
			'click #header-signup-button': 'signup',
			'click #header-signout-button': 'signout'
		},
		initialize: function(){
			Backbone.on('sidebar:toggle', this.toggle, this);

			return this.render();
		},
		render: function(){
			this.dom = {
				facebookLogin: this.$el.find('#facebook-login-button'),
				login: this.$el.find('#login-button'),
				signup: this.$el.find('#signup-button')
			};

			this.$el.sidebar();

			return this;
		},
		toggle: function(){
			console.log('is visible', this.isVisible(), this.$el.sidebar('is visible'));
			if(!this.isVisible()){
				this.show();
			}

			return this;
		},
		show: function(){
			this.$el.sidebar('show');

			return this;
		},
		hide: function(){
			this.$el.sidebar('hide');

			return this;
		},
		home: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			Backbone.history.navigate('/', {trigger: true});
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

			var login = function(data){
				data = data || {};

				Parse.FacebookUtils.logIn('email,public_profile,user_friends', {
    				success: function(u){
    					u.set({
    						firstName: data.first_name || '',
    						lastName: data.last_name || '',
    						name: data.name || '',
    						gender: data.gender || '',
    						facebook: true
    					});

    					FB.api('/me/picture', function(response){
							if (!response || response.error) {
								u.save()
									.always(function(){
										$('body').dimmer('hide');
										Backbone.trigger('user:login', true);
									});
							}else{
								u.set('avatar', response.data.url)
									.save()
									.then(function(){
										Backbone.trigger('user:profile:photo', response.url)
									}).always(function(){
										$('body').dimmer('hide');
										Backbone.trigger('user:login', true);
									});
							}
						});
    				},
    				error: function(){
    					alert('Ha ocurrido un error al crear tu cuenta, por favor intenta de nuevo');
    					$('body').dimmer('hide');
    				}
    			});
			};
			var me = function(){
				FB.api('/me', function(data){
					if(!data || data.error){
						login();
					} else if(data.verified){
						if(data.email){
							var userQuery = new Parse.Query(Parse.User);
					        userQuery
					        	.equalTo('email', data.email)
					        	.count()
					        	.then(function(count){
					        		if(count){
					        			alert('Parece que ese usuario ya esta registrado, por favor usa tu correo electronico y contraseña para iniciar sesion.');
					        			$('body').dimmer('hide');
					        		}else{
					        			login(data);
					        		}
					        	})
					        	.fail(function(){
					        		login(data);
					        	});
						}else{
							login(data);
						}
					}if(!data.verified){
						alert('Tu cuenta de Facebook parece no estar verificada, por favor verifica tu cuenta de correo con Facebook e intenta de nuevo.');
						$('body').dimmer('hide');
					}
				});
			};

			FB.getLoginStatus(function(response){
				if(response && response.status === 'connected'){
					me();
				}else{
					FB.login(function(response){
						if(response.authResponse){
							me();
						} else {
							alert('No pudimos iniciar sesion con tu cuenta');
							$('body').dimmer('hide');
						}
					});
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
		isVisible: function(){
			return this.$el.sidebar('is visible');
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
		size: new google.maps.Size(30, 43),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(15,43)
	};
	var selectedVenueMarkerIcon = {
		url: config.MARKERS.VENUE_SELECTED.url,
		size: new google.maps.Size(30, 43),
		origin: new google.maps.Point(0,0),
		anchor: new google.maps.Point(15,43)
	};
	var Place = Parse.Object.extend('Location');
	var PlaceModel = Place.extend({
		pageLoaded: false,
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
				email: !!this.get('email_address'),
				www: this.getWWW()
			};
		}
	});
	var Places = window.places = Parse.Collection.extend({
		model: PlaceModel,
		query: (new Parse.Query(PlaceModel)).include('logo')
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
		currentSelectedMarker: null,
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
			this.currentSelectedMarker = null;
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

				var initialModel = this.collection.at(0);

				Backbone.trigger('venue:info', initialModel.toJSON());
				Backbone.history.navigate('venue/' + initialModel.id, {trigger: false});
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
				title: model.get('name'),
				icon: venueMarkerIcon
			});
			
			this.markers.push(marker);

			if(this.bounds){
				this.bounds.extend(p);
			}

			google.maps.event.addListener(marker, 'click', _.bind(function() {
				if(this.currentSelectedMarker){
					this.currentSelectedMarker.setIcon(venueMarkerIcon);
				}

				this.currentSelectedMarker = marker;

				marker.setIcon(selectedVenueMarkerIcon);
				Backbone.trigger('venue:info', model.toJSON());
				Backbone.history.navigate('venue/' + model.id, {trigger: false});
			}, this));
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
				this.currentRadius.setRadius(10);
			}
			
		}
	});

	/********* AUTH **********/
	var LoginModal = Backbone.View.extend({
		dom: {},
		id: 'login-modal',
		className: 'ui small modal',
		template: _.template($('#login-modal-template').html()),
		events: {
			'submit': 'submit'
		},
		initialize: function(){
			$('#login-modal-template').remove();

			return this.render();
		},
		render: function(){
			this.$el.html(this.template()).appendTo('body');

			this.dom = {
				form: this.$el.find('form'),
				buttons: this.$el.find('button')
			}

			this.$el.modal({
				closable: false,
				onApprove: _.bind(function(){
					this.dom.form.trigger('submit');
					return false;
				}, this)
			});

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
				this.dom.buttons.prop('disabled', true);
				values = this.dom.form.form('get values');

				User
					.logIn(values['login-modal-username'], values['login-modal-password'])
					.then(_.bind(this.onSuccess, this))
					.fail(_.bind(this.onError, this))
					.always(_.bind(function(){this.dom.form.removeClass('loading'); this.dom.buttons.removeAttr('disabled');}, this));
			}
		},
		onSuccess: function(u){
			this.dom.form.form('reset');
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
		dom: {},
		id: 'signup-modal',
		className: 'ui small modal',
		template: _.template($('#signup-modal-template').html()),
		events: {
			'submit': 'submit'
		},
		initialize: function(){
			$('#signup-modal-template').remove();

			return this.render();
		},
		render: function(){
			this.$el.html(this.template()).appendTo('body');

			this.dom = {
				form: this.$el.find('form'),
				buttons: this.$el.find('button')
			}

			this.$el.modal({
				closable: false,
				onApprove: _.bind(function(){
					this.dom.form.trigger('submit');
					return false;
				}, this)
			});

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
				this.dom.buttons.prop('disabled', true);

				values = this.dom.form.form('get values');
				user = new User();

				user
					.set({email: values['signup-modal-username'], username: values['signup-modal-username'], password: values['signup-modal-password']})
					.signUp()
					.then(_.bind(this.onSuccess, this))
					.fail(_.bind(this.onError, this))
					.always(_.bind(function(){this.dom.form.removeClass('loading'); this.dom.buttons.removeAttr('disabled');}, this));
			}
		},
		onSuccess: function(u){
			this.dom.form.form('reset');
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
		id: 'settings-modal',
		className: 'ui small modal',
		template: _.template($('#settings-modal-template').html()),
		dom: {},
		events: {
			'change #settings-modal-radius': 'onRadiusChange',
			'change #settings-modal-auto-search': 'onAutoSearchChange',
			'change #settings-modal-auto-focus': 'onAutoFocusChange'
		},
		initialize: function(){
			$('#settings-modal-template').remove();

			this.model = settingsModel;

			return this.render();
		},
		render: function(){
			this.$el.html(this.template()).appendTo('body');

			this.dom.searchRadius = this.$el.find('#settings-modal-radius');
			this.dom.autoSearch = this.$el.find('#settings-modal-auto-search-wrapper');
			this.dom.autoFocus = this.$el.find('#settings-modal-auto-focus-wrapper');

			this.dom.autoFocus.checkbox();
			this.dom.autoSearch.checkbox();

			this.dom.autoSearch.checkbox(this.model.get('autoSearch') ? 'check' : 'uncheck');
			this.dom.autoFocus.checkbox(this.model.get('autoFocus') ? 'check' : 'uncheck');
			this.dom.searchRadius.val(this.model.get('searchRadius'));

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
	var PageModel = Backbone.Model.extend({
		urlRoot: '/page',
		url: function(){
			return this.urlRoot + '/' + this.id;
		}
	});
	var Video = Backbone.Model.extend({

	});
	var Videos = Backbone.Collection.extend({
		model: Video
	});
	var VideoItem = Backbone.View.extend({
		className: 'ui item',
		template: _.template('<div>{{ data.snippet.title }}</div>'),
		initialize: function(options){
			if(!options || !options.model){
				this.model = new Video();
			}

			return this.render();
		},
		render: function(){
			this.$el.html(this.template({data: this.model.toJSON()}));

			return this;
		}
	});
	var VideoCard = Backbone.View.extend({
		id: 'venue-videos',
		className: 'ui segment',
		template: _.template($('#venue-videos-template').html()),
		views: {},
		dom: {},
		initialize: function(){
			$('#venue-videos-template').remove();

			this.collection = new Videos();
			this.listenTo(this.collection, 'reset', this.addAll, this);
			this.listenTo(this.collection, 'error', this.onError, this);

			return this.render();
		},
		render: function(){
			this.$el.html(this.template());

			this.dom = {
				content: this.$el.find('#venue-videos-list')
			};

			return this;
		},
		show: function(){
			if(!this.$el.is(':visible')){
				//.$el.transition('fade up');
			}

			return this;
		},
		hide: function(){
			console.log('hide');
		},
		addAll: function(){
			this.collection.each(this.addOne, this);
		},
		addOne: function(m){
			var view = new VideoItem({model: m}).render();

			this.views[view.cid] = view;

			this.dom.content.append(view.$el);
		}
	});
	var Venue = Backbone.View.extend({
		id: 'venue-view',
		template: _.template($('#venue-template').html()),
		routeEnabled: false,
		events: {
			'click a.label': 'hide',
			'click #venue-card-directions': 'getDirecctions',
			'click #venue-card-like': 'like',
			'click #venue-card-unlike': 'unlike',
			'click #venue-card-share': 'share',
			'click #venue-options-send-message': 'sendMessage'
		},
		views: {},
		dom: {},
		initialize: function(options){
			$('#venue-template').remove();

			Backbone.on('venue:info', this.update, this);
			
			this.positionModel = positionModel;
			this.pageModel = new PageModel();
			this.model = new PlaceModel();
			this.directionsCollection = new Directions();

			this.listenTo(this.model, 'change:name', this.render, this);
			this.listenTo(this.directionsCollection, 'request', this.onDirectionsRequest, this);
			this.listenTo(this.directionsCollection, 'reset', this.onDirections, this);
			this.listenTo(this.directionsCollection, 'error', this.onDirectionsError, this);

			this.listenTo(this.pageModel, 'sync', this.onPage, this);
			this.listenTo(this.pageModel, 'error', this.onPageError, this);

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
			var title = data.name + ', ' + this.model.get('locality') + ' - Jound';

			data.www = this.model.getWWW();

			data.liked = false;
			data.page = this.model.get('page');

			if(u && _.indexOf(u.get('likedVenues'), id) >= 0){
				data.liked = true;
			}else{
				data.liked = false;
			}

			this.$el.html(this.template({data: data}));

			this.dom = {
				rating: this.$el.find('.rating'),
				directionsButton: this.$el.find('#venue-card-directions'),
				likeButton: this.$el.find('#venue-card-like'),
				shareButton: this.$el.find('#venue-card-share'),
				unlikeButton: this.$el.find('#venue-card-unlike'),
				address: this.$el.find('#venue-card-address'),
				image: this.$el.find('#venue-card-logo')
			};

			if(!_.isEmpty(data.page) && !this.model.pageLoaded){
				data.page.fetch().then(_.bind(this.onPage, this)).fail(_.bind(this.onPageError, this));
				this.dom.pageButton = this.$el.find('#venue-card-rocket-button');
			}

			this.dom.rating.rating();
			this.dom.address.html(PlaceModel.prototype.getAddress.call(this.model));

			updateOG({
				ogimage: this.model.getLogo(),
				ogtitle: title,
				ogurl: '//www.jound.mx/venue/' + this.model.id
			});
			Backbone.trigger('page:set:title', title);


			/*
			if(this.model.get('page') && !this.model.pageLoaded){
				this.model.get('page').fetch().then(_.bind(this.onPage, this)).fail(_.bind(this.onPageError, this));
			}else if(this.model.pageLoaded && this.dom.pageButton && this.dom.pageButton.length){
				this.dom.pageButton.removeClass('loading');
			}*/

			this.$el.appendTo('body');

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
			this.model.pageLoaded = true;
			this.dom.pageButton.removeClass('loading');
			
			var data = this.model.get('page').toJSON();

			/*
			if(data.facebook){
				console.log('we have facebook');
			}

			if(data.twitter){
				$.ajax({
					url: '/page',
					data: data.twitter,
					type: 'GET',
					dataType: 'json'
				})
				.then(function(){
					console.log(arguments, 'twitter');
				})
				.fail(function(){
					console.log(arguments, 'twitter error');
				});
			}

			if(data.videoFeed){
				console.log('we have video feed');
			}

			if(data.photoFeed){
				console.log('we have photo feed');
			}*/

			if(data.videoFeed){
				switch(data.videoFeed.type){
				case 'youtube':
					if(!this.views.videos){
						this.views.videos = new VideoCard();
					}

					var videos = this.views.videos;
					var $el = this.$el;
					$.get(
						"https://www.googleapis.com/youtube/v3/channels",
						{
							part : 'contentDetails', 
							forUsername : data.videoFeed.account,
							key: config.GOOGLE.WEB_KEY
						})
						.then(function(data){
							if(data.items && data.items.length){
								var pid = data.items[0].contentDetails.relatedPlaylists.uploads;

								$.get(
							        "https://www.googleapis.com/youtube/v3/playlistItems",
							        {
								        part : 'snippet', 
								        maxResults : 20,
								        playlistId : pid,
								        key: config.GOOGLE.WEB_KEY
							    	}
							    ).then(function(data){
							    	if(data && data.items.length){
							    		videos.collection.reset(data.items);
							    		videos.show().$el.appendTo($el);
							    	}
							    });
							}
						});

					break;
				}
			}
		},
		onPageError: function(){
			console.log('on page error');
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
			FB.ui({
				method: 'share',
				href: window.location.href,
			}, function(response){
				console.log(response, 'shared');
			});
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
		id: 'venue-message-modal',
		events: {
			'submit': 'submit'
		},
		initialize: function(){
			$('#venue-message-template').remove();

			this.model = new MessageModel();

			return this.render();
		},
		render: function(){
			this.$el.html(this.template()).appendTo('body');

			this.dom = {
				form: this.$el.find('form'),
				buttons: this.$el.find('button'),
				checkboxWrapper: this.$el.find('#message-modal-contact-wrapper'),
				checkbox: this.$el.find('input[type=checkbox]')
			}

			this.$el.modal({
				closable: false,
				onApprove: _.bind(function(){
					this.dom.form.trigger('submit');
					return false;
				}, this)
			});

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
			}

			visitor = new Visitor();
			this.model.set('visitor', visitor);

			this.$el.modal('show');

			return this;
		},
		hide: function(){
			this.$el.modal('hide');
			this.dom.form.form('clear');
			this.dom.checkbox.checkbox('uncheck');
			this.model.clear();

			this.model = null;
			this.model = new MessageModel();

			return this;
		},
		submit: function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}

			var values = this.dom.form.form('get values');
			var isValid = this.dom.form.form('validate form');

			var saveMessage = _.bind(function(){
				this.model
					.set({message: _.escape(values['message-modal-message'])})
					.save()
					.then(onMessageSave)
					.fail(onError)
					.always(onComplete);
			}, this);
			var onMessageSave = _.bind(function(){
				alert('Tu mensaje se ha enviado, gracias por usar Jound.');
				this.hide();
			}, this);

			var onError = _.bind(function(){
				this.dom.form.removeClass('loading').addClass('error');
				alert('Ha ocurrido un error al enviar tu mensaje, intenta de nuevo por favor.');
			}, this);

			var onComplete = _.bind(function(){
				this.dom.form.removeClass('loading').removeClass('error');
				this.dom.buttons.removeAttr('disabled');
			}, this);

			if(isValid){
				this.dom.form.addClass('loading').removeClass('error');
				this.dom.buttons.prop('disabled', true);

				visitor = this.model.get('visitor');
				visitor.set('email', values['message-modal-email']);
				visitor.set('phone', values['message-modal-phone']);
				visitor.set('name', values['message-modal-name']);
				visitor.set('canBeContacted', this.dom.checkboxWrapper.checkbox('is checked'));

				visitor.save().then(saveMessage).fail(onError);
			}
			
		}
	});

	/********* INITIALIZE OBJECTS (Temporal) **********/
	var user = User.current();
	var settings = user && user.get('settings') ? user.get('settings') : {};
	var settingsModel = new SettingsModel(settings);
	var positionModel = new PositionModel();
	var sidebar = new Sidebar();
	var header = new Header({positionModel: positionModel});
	var map = new Map({positionModel: positionModel});
	var venue = new Venue({venue: window.initialVenueConfig || null});

	var Router = Backbone.Router.extend({
		views: {
			map: map,
			header: header,
			sidebar: sidebar
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