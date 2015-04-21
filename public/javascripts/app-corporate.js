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
	var config = {
		PARSE: {
			KEY: 'hq7NqhxfTb2p7vBij2FVjlWj2ookUMIPTmHVF9ZH',
			JSKEY: 'cdfm37yRroAiw82t1qukKv9rLVhlRqQpKmuVlkLC'
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
		}
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
			'click #header-logo': 'home',
			'click #facebook-login-button': 'facebookLogin',
			'click #header-login-button': 'login',
			'click #header-signup-button': 'signup',
			'click #header-signout-button': 'signout',
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

			var $search = this.dom.search;
			var $category = this.dom.categoryHidden;
			var $input = this.dom.searchInput;
			var $button = this.dom.searchButton;

			$search.search({
				source: [],
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

			this.dom.search.search('hide results');
			
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
				userDropdown: this.$el.find('#header-user-options-dropdown'),
				userMenu: this.$el.find('#header-user-menu'),
				form: this.$el.find('form'),
				avatar: this.$el.find('#header-avatar img'),
				search: this.$el.find('#search-box'),
				searchInput: this.$el.find('#search-box-value'),
				categoryHidden: this.$el.find('#search-box-category'),
				searchButton: this.$el.find('#search-box-button')
			};

			this.dom.userDropdown.dropdown();
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

	//Initialize object (temporal)
	var user = User.current();
	var settings = user && user.get('settings') ? user.get('settings') : {};
	var settingsModel = new SettingsModel(settings);
	var positionModel = new PositionModel();
	var header = new Header({positionModel: positionModel});

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