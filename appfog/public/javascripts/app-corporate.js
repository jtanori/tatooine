$(function(){
	_.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g,
        evaluate: /\{\%(.+?)\%\}/g
    };
	var User = Parse.User.extend({
		getDisplayName: function(){
			var name = this.escape('name') ? this.escape('name') : this.escape('username') ? this.escape('username') : 'Joundini';

			return name;
		},
		getBasicData: function(){
			var data = {
				id: this.id,
				username: this.get('username'),
				email: this.get('email'),
				displayName: User.prototype.getDisplayName.call(this),
				settings: this.get('settings'),
				avatar: this.get('avatar'),
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
		}
	};

	Parse.initialize(config.PARSE.KEY, config.PARSE.JSKEY);

	var Header = Backbone.View.extend({
		el: '#header',
		dom: {},
		userMenuTemplate: _.template($('#template-user-menu').html()),
		events: {
			'click #facebook-login-button': 'facebookLogin',
			'click #header-login-button': 'login',
			'click #header-signup-button': 'signup',
			'click #header-signout-button': 'signout'
		},
		initialize: function(options){
			Backbone.on('user:profile:photo', this.updateAvatar, this);
			Backbone.on('user:login', this.updateOptions, this);
			Backbone.on('user:logout', this.updateOptions, this);

			return this.render();
		},
		render: function(){
			this._cacheElements();

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

					if(!user.setting && !user.settings.avatar){
						//Get user picture
						FB.api(
							'/me/picture',
							function (response) {
								if (response && !response.error) {
									Backbone.trigger('user:profile:photo', responser.url);
									user.set('avatar', response.url).save().then(function(){console.log('avatar saved');}).fail(function(){console.log('avatar not saved');});
								}
							}
						);
					}

					$.ajax({
						type: 'POST',
						dataType: 'json',
						url: '/become',
						data: {token: user.getSessionToken()}
					})
					.then(function(){
						$('body').dimmer('hide');
						Backbone.trigger('user:login', isNew);
					})
					.fail(function(){
						$('body').dimmer('hide');
						Backbone.trigger('user:login:fail', isNew);
					});
				}.bind(this),
				error: function(user, error) {
					alert("No hemos podido enlazar a tu cuenta de Facebook.");
				}
			});
		},
		signout: function(){
			$('body').dimmer('show');
			$.ajax({
				url: '/logout',
				type: 'POST'
			}).always(function(){
				User.logOut();
				Backbone.trigger('user:logout');
				$('body').dimmer('hide');
			});
		},
		updateAvatar: function(url){
			this.dom.avatar.attr(url);
		},
		updateOptions: function(){
			var user = User.current();

			this.undelegateEvents();

			this.dom.userMenu.remove();
			this.$el.append(this.userMenuTemplate({data: {user: user ? user.getBasicData() : null}}));

			this._cacheElements();
			this.delegateEvents();
		},
		_cacheElements: function(){
			this.dom = {
				facebookLogin: this.$el.find('#facebook-login-button'),
				login: this.$el.find('#login-button'),
				signup: this.$el.find('#signup-button'),
				userDropdown: this.$el.find('#header-user-options-dropdown'),
				userMenu: this.$el.find('#header-user-menu')
			};

			this.dom.userDropdown.dropdown();
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
			User.become(response.token).then(_.bind(this.onBecomeUser, this)).fail(_.bind(this.onError, this));
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
	var header = new Header();
	
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