$(function(){
	var User = Parse.User.extend({

	});
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
			mapAnimation: true,
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
                'road_name_1', 'road_name_2', 'road_name_3', 'road_type', 'road_type_1', 'road_type_2', 'road_type_3', 'settling_name', 'settling_type', 'shopping_center_name', 'shopping_center_store_number', 'shopping_center_type', 'www']
	};

	Parse.initialize(config.PARSE.KEY, config.PARSE.JSKEY);

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

					$.ajax({
						type: 'POST',
						dataType: 'json',
						url: '/become',
						data: {token: User.current().getSessionToken()}
					})
					.then(function(){
						$('body').dimmer('hide');
						Backbone.trigger('user:login', isNew);
					})
					.fail(function(){
						$('body').dimmer('hide');
						Backbone.trigger('user:login:facebook', isNew);
					});
				}.bind(this),
				error: function(user, error) {
					alert("No hemos podido enlazar a tu cuenta de Facebook.");
				}
			});
		},
		signout: function(){
			$.ajax({
				url: '/logout',
				type: 'POST',
				success: function(){
					User.logOut();
				},
				error: function(){
					console.log('could not terminate session');
				}
			});
		},
		isVisible: function(){
			return this.$el.sidebar('is visible');
		}
	});
	var Header = Backbone.View.extend({
		el: '#header',
		dom: {},
		events: {
			'change #header-category-dropdown': 'setCategory',
			'click #sidebar-toggle': 'sidebar'
		},
		initialize: function(){
			Backbone.on('position:found', this.onPosition, this);
			Backbone.on('position:notfound', this.onPositionError, this);
			Backbone.on('map:ready', this.onMapReady, this);

			return this.render();
		},
		render: function(){
			this.dom = {
				search: this.$el.find('[type=text]'),
				positionToggle: this.$el.find('#position-toggle'),
				dropdown: this.$el.find('#header-category-dropdown')
			};

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
		setCategory: function(){
			console.log('set category', arguments);
		},
		sidebar: function(e){
			if(!sidebar.isVisible()){ Backbone.trigger('sidebar:toggle'); }
		}
	});

	var PositionModel = Backbone.Model.extend({
		defaults: {
			center: null,
			useGeolocation: false
		}
	});

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
	//Create fallback settings model
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
	var Place = Parse.Object.extend('Location');
	var PlaceModel = Place.extend({
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
				address += ' entre ' + this.escape('road_type_2') + ' ' + this.escape('road_name_2');
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

			return address.toLowerCase();
		},
		getVecinity: function(){
			var address = '';

			if(this.get('settling_type') && this.get('settling_name')){
				address += this.get('settling_type') + ' ' + this.get('settling_name');
			}else if(this.get('settling_name')){
				address += 'Colonia ' + this.get('settling_name');
			}

			return address.toLowerCase();
		},
		getCity: function(){
			var city = '';
			var location = this.get('locality_id').get('name');
			var municipality = this.get('municipality_id').get('name');
			var state = this.get('federal_entity_id').get('Name');

			if(location.toLowerCase() === municipality.toLowerCase()){
				city += location + ', ' + state;
			}else {
				city += location + ', ' + municipality + ', ' + state;
			}

			if(this.get('postal_code')){
				city += ' C.P ' + this.escape('postal_code');
			}

			return city.toLowerCase();
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
		initialize: function(){
			Backbone.on('geolocation:on', this.getCurrentPosition, this);
			Backbone.on('geolocation:off', this.clearGeolocation, this);

			this.positionModel = new PositionModel();
			this.listenTo(this.positionModel, 'change:center', this.centerMap, this);
			this.listenTo(this.positionModel, 'change:radius', this.zoomTo, this);

			var user = User.current();
			var settings = user && user.get('settings') ? user.get('settings') : {};

			//Create settings model
			this.model = new SettingsModel(settings);
			this.listenTo(this.model, 'change:searchRadius', this.onUpdateRatio, this);

			//Places collection
			this.collection = new Places();
			this.listenTo(this.collection, 'reset', this.addAll, this);
			this.listenTo(this.collection, 'add', this.addOne, this);

			return this.render();
		},
		render: function(){
			var p = this.position = new google.maps.LatLng(config.GEO.DEFAULT_CENTER.coords.latitude,config.GEO.DEFAULT_CENTER.coords.longitude);

			this.map = new gmaps.Map(this.$el[0], _.extend({}, config.MAP.DEFAULT_OPTIONS, {center: p}));

			this.currentPositionMarker = new google.maps.Marker({
				position: p,
				map: this.map,
				visible: false,
				icon: geolocatedMarkerIcon
			});

			this.currentRadius = new google.maps.Circle(_.extend({}, config.RADIUS.DEFAULT, {
				center: p,
				radius: this.model.get('searchRadius')*1,
				map: this.map,
				visible: false
			}));

			Backbone.trigger('map:ready');

			//this.getCurrentPosition();

			return this;			
		},
		getCurrentPosition: function(){
			$('body').dimmer('show');
			navigator.geolocation.watchPosition(this.onPosition.bind(this), this.onPositionError.bind(this), config.GEO.DEFAULT);
		},
		onPosition: function(position){
			$('body').dimmer('hide');
			var position = this.position = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);

			this.usingGeolocation = true;
			this.model.set('useGeolocation', true);
			this.positionModel.set('center', position);
			this.positionModel.set('radius', this.model.get('searchRadius'));
			Backbone.trigger('position:found');
		},
		onPositionError: function(){
			$('body').dimmer('hide');
			Backbone.trigger('position:notfound');
		},
		/* DATA METHODS */
		addAll: function(){
			var defaultZoom = 10;
			this.points = [];
			//Remove all markers
			_.each(this.markers, function(m){m.remove(); m = null;});
			//Clear markers
			this.markers = [];
			//Add all markers
			this.collection.each(this.addOne.bind(this));

			if(this.points.length){
				//If we are using user position
				if(this.usingGeolocation){
					this.points.push(this.position);
				}
				//Create bounds to enclose all results
				this.bounds = new google.maps.LatLngBounds(this.points);
				//Move the camera to the bounds object
				this.map.fitBounds(this.bounds);
				
			}else{
				alert('No encontramos establecimientos para tu busqueda :(');
			}
			
			//Hide dialog
			window.plugins.spinnerDialog.hide();
		},
		addOne: function(model){
			var l = model.get('position');
			var p = new google.maps.LatLng(l.latitude, l.longitude);

			this.points.push(p);

			var marker = new google.maps.Marker({
				position: p,
				map: this.map,
				visible: true/*,
				icon: geolocatedMarkerIcon*/
			});
			this.markers.push(marker);
			console.log()
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
		zoomTo: function(model, newRadius){
			console.log(arguments, 'new radius');
			this._updateRadius(newRadius*1);
		},
		_updateRadius: function(newRadius){
			this.currentRadius.setRadius(newRadius);

			switch(newRadius/1000){
			case 1:
				this.map.setZoom(15);
				break;
			case 3:
				this.map.setZoom(14);
				break;
			case 5:
				this.map.setZoom(13);
				break;
			case 10:
				this.map.setZoom(12);
				break;
			case 15:
				this.map.setZoom(11);
				break;
			}
		}
	});

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
				$.ajax({
					url: '/login',
					dataType: 'json',
					type: 'POST',
					data: {username: values['login-modal-username'], password: values['login-modal-password']}
				})
				.then(_.bind(this.onSuccess, this))
				.fail(_.bind(this.onError, this));
			}
		},
		onBecomeUser: function(){
			this.dom.form.removeClass('loading');
			Backbone.trigger('user:login');
			this.hide();
		},
		onSuccess: function(response){
			User.become(response.token).then().fail(_.bind(this.onError, this));
		},
		onError: function(xhr, e){
			var data = JSON.parse(xhr.responseText);

			this.dom.form.removeClass('loading').addClass('error');
			switch(data.code){
			case 101: data.error = 'Tu correo y contrasena no coinciden, intenta de nuevo.'; break;
			}

			alert(data.error);
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

				$.ajax({
					url: '/login',
					dataType: 'json',
					type: 'POST',
					data: {username: values['signup-modal-username'], password: values['signup-modal-password']}
				})
				.then(_.bind(this.onSuccess, this))
				.fail(_.bind(this.onError, this));
			}
		},
		onSuccess: function(u){

			console.log(u, arguments);

			this.dom.form.removeClass('loading');
			Backbone.trigger('user:login');
			this.hide();
		},
		onError: function(xhr, e){
			console.log('error', arguments);
			this.dom.form.removeClass('loading').addClass('error');
			switch(e.code){
			case 101: e.message = 'Tu correo y contrasena no coinciden, intenta de nuevo.'; break;
			}

			alert(e.message);
		}
	});

	//Initialize object (temporal)
	var sidebar = new Sidebar();
	var header = new Header();
	var map = new Map();

	var Venue = Backbone.View.extend({
		className: 'venue',
		template: _.template('<div class="ui top attached segment"><%= data.name %></div><div class="ui attached segment center"><%= data.name %></div><div class="ui bottom attached segment"></div>'),
		initialize: function(options){
			this.model = new Place();

			if(options){
				if(options.venue){
					this.model.set(options.venue);
				}
			}

			return this.render();
		},
		render: function(){
			this.$el.html(this.template({data: this.model.toJSON()}));

			return this;
		},
		show: function(){
			console.log('show venue view');
			this.$el.removeAttr('hidden');
			return this;
		},
		update: function(p){
			this.$el.dimmer('show');

			var geoPoint, query = new Parse.Query(Place);

			if(_.isArray(p)){
				geoPoint = new Parse.GeoPoint({latitude: p[0], longitude: p[1]});
				query
					.equalTo('position', geoPoint)
					.select(config.VENUE_FIELDS)
					.find({success: _.bind(this.onLoad, this), error: _.bind(this.onError, this)});
			}else if(_.isString(position)){

			}
			return this.show();
		},
		onLoad: function(){
			this.$el.dimmer('hide');
			console.log('loaded', arguments);
		},
		onError: function(){
			this.$el.dimmer('hide');
			console.log('error', arguments);
		}
	});

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
			console.log('initialize router');
		},
		home: function(){
			if(!this.views.map.usingGeolocation){
				this.views.map.getCurrentPosition();
			}
		},

		venue: function(position){
			var view, p, latln;
			if(!this.views.venue){
				this.views.venue = new Venue({venue: window.initialVenueConfig || null, el: '#venue-view'});
			}

			if(this.views.venue.model && window.initialVenueConfig){
				p = this.views.venue.model.toJSON();

				latln = new google.maps.LatLng(p.position.latitude,p.position.longitude);
				this.views.map.map.setCenter(latln);
				this.views.map.collection.add(this.views.venue.model);
				this.views.map.map.setZoom(14);
				//Show view
				this.views.venue.show();
			}else {
				p = position.split(',');
				p = _.map(p, function(p){return parseFloat($.trim(p));});

				if(p.length === 2){
					this.views.venue.update(p);
				}else{
					//Go to home, or maybe go to a 404 instead
					Backbone.history.navigate('/', {trigger: true});
				}
			}

			window.initialVenueConfig = null;
			delete window.initialVenueConfig;
		}
	});
	//Create anonymous router
	(new Router());
	Backbone.history.start({pushState: true});//

	//Load FB
    window.fbAsyncInit = function() {
        Parse.FacebookUtils.init({ // this line replaces FB.init({
            appId      : '688997761197114', // Facebook App ID
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