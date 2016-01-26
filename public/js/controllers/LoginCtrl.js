angular
    .module('jound.controllers')
    .controller('LoginCtrl', function(
        $scope,
        $rootScope,
        $state,

        $ionicHistory,
        $ionicLoading,
        $localStorage,
        $timeout,

        Facebook,
        User,
        AnonymousUser,
        AppConfig,
        AnalyticsService,

        HOME_SLIDESHOW) {

        if ($rootScope.user) {
            $state.go('app.home');
            return;
        }

        var _signup = false;

        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();

        $scope.user = {};
        $scope.master = {};
        $scope.items = HOME_SLIDESHOW;
        $scope.swiper = null;

        $ionicHistory.nextViewOptions({
            disableBack: true,
            historyRoot: true
        });

        $scope.isSignup = function(){
            return _signup;
        };

        $scope.enableLogin = function(){
            $timeout(function(){
                $scope.$apply(function(){
                    _signup = false;
                    $scope.label = 'Entrar';
                });
            });
        };

        $scope.enableSignup = function(){
            $timeout(function(){
                $scope.$apply(function(){
                    _signup = true;
                    $scope.label = 'Crear Cuenta';
                });
            });
        };

        var _onLogin = function(){
            //Set root user
            $rootScope.user = User.current();

            if(!_.isEmpty($rootScope.user) && !_.isEmpty($rootScope.user.get('settings'))){
                $rootScope.settings = $rootScope.user.get('settings');
            }else{
                $rootScope.settings = AppConfig.SETTINGS;
                $rootScope.user.save('settings', $rootScope.settings);
            }

            AnalyticsService.track('login', {user: $rootScope.user.id});

            $scope.enableLogin();

            if(AnonymousUser.exists()){
                AnonymousUser.logOut();
            }
        };

        $scope.login = function(form) {
            if (!form.$invalid) {
                $timeout(function(){
                    $ionicLoading.show('Autenticando...');
                });

                User
                    .logIn($scope.user.username, $scope.user.password)
                    .then(function() {

                        _onLogin();

                        form.$setPristine();
                        form.$setUntouched();

                        $scope.user = angular.copy($scope.master);

                        $timeout(function(){
                            $ionicLoading.hide();
                        });

                        goHome();
                    }, function(e) {
                        AnalyticsService.track('error', {code:  e.code, message: e.message});

                        switch (e.code) {
                            case 101:
                                e.message = 'Usuario y contraseña invalidos';
                                break;
                        }

                        $timeout(function(){
                            $ionicLoading.hide();
                        });
                        $timeout(function(){
                            swal({text: e.message, title: 'Hay caramba!', confirmButtonText: 'Ok', type: 'error'});
                        });
                    });
            }
        };

        $scope.signup = function(form){
            if (!form.$invalid && !$scope.checkForm(form)) {

                var user = new User();

                $timeout(function(){
                    $ionicLoading.show('Creando cuenta...');
                });

                user.set('username', $scope.user.username);
                user.set('email', $scope.user.username);
                user.set('password', $scope.user.password);

                user.signUp(null, {
                    success: function() {
                        AnalyticsService.track('signup', {user: User.current().id});

                        _onLogin();

                        form.$setPristine();
                        form.$setUntouched();

                        $scope.user = angular.copy($scope.master);

                        $timeout(function(){
                            $ionicLoading.hide();
                        });

                        goHome();
                    },
                    error: function(user, e) {
                        AnalyticsService.track('error', {code:  e.code, message: e.message});

                        switch (e.code) {
                            case 202:
                                e.message = 'Ya existe un usuario con ese correo';
                                break;
                        }
                        $timeout(function(){
                            $ionicLoading.hide();
                        });
                        $timeout(function(){
                            swal({text: e.message, title: 'Hay caramba!', confirmButtonText: 'Ok', type: 'error'});
                        });
                    }
                });
            }
        };

        $scope.checkForm = function(form){
            var isEqual = ($scope.user.password === $scope.user.passwordConfirmation);

            return !(form.$valid && isEqual);
        };

        $scope.skip = function(){
            $rootScope.user = AnonymousUser.current();
            $rootScope.settings = AnonymousUser.current().get('settings');

            goHome();
        };

        function goHome(){
            console.log('login');
            if($localStorage.get('tutorial')){
                $state.go('app.home');
            }else{
                $state.go('app.tutorial');
            }
        }

        function facebookLogin(response) {
            if (!response.authResponse) {
                swal({text: 'Ha ocurrido un problema al intentar comunicarnos con Facebook, por favor intenta de nuevo.', title: 'Disculpa', type: 'error', confirmButtonText: 'Ok'});
            } else {
                var expDate = new Date(
                    new Date().getTime() + response.authResponse.expiresIn * 1000
                ).toISOString();

                var authData = {
                    id: String(response.authResponse.userID),
                    access_token: response.authResponse.accessToken,
                    expiration_date: expDate
                };

                $timeout(function(){
                    $ionicLoading.show('Conectando...');
                });

                //Login
                Parse.FacebookUtils
                    .logIn(authData)
                    .then(function() {
                        Facebook
                            .api("me", ["public_profile", "email", "user_friends"], function(data) {
                                _onLogin();

                                console.log('data', data);

                                $rootScope.user.save({
                                        gender: data.gender || '',
                                        firstName: data.first_name,
                                        lastName: data.last_name,
                                        name: data.name,
                                        fullName: data.first_name + ' ' + data.last_name,
                                        //email: data.email,
                                        avatar: 'http://graph.facebook.com/' + data.id + '/picture?type=large',
                                        facebook: true
                                    })
                                    .then(function() {
                                        AnalyticsService.track('userProfileUpdate', {user: $rootScope.user.id});

                                        $ionicLoading.hide();

                                        goHome();
                                    }, function(e) {
                                        AnalyticsService.track('error', {code:  e.code, message: e.message, user: $rootScope.user.id});

                                        $ionicLoading.hide();

                                        goHome();
                                    });
                            }, function(e) {
                                _onLogin();

                                AnalyticsService.track('error', {code:  e.code, message: e.message});

                                $ionicLoading.hide();

                                goHome();
                            });
                    }, function(e) {
                        console.log(e, 'error 2');
                        AnalyticsService.track('error', {code:  e.code, message: e.message});

                        $ionicLoading.hide();

                        swal({text: e.message, title: 'Error', confirmButtonText: 'Ok', type: 'error'});
                    });
            }
        }

        $scope.facebookLogin = function() {
            Facebook
                .getLoginStatus(function(response) {
                    console.log('login status', response);
                    switch (response.status) {
                        case 'connected':
                            facebookLogin(response);
                            break;
                        default:
                            Facebook.login(function(response){
                                if(response.error){
                                    AnalyticsService.track('error', {code:  e.code, message: e.message});

                                    $timeout(function(){
                                        swal({text: 'No podemos conectar con tu cuenta de Facebook, por favor intenta de nuevo', title: 'Hay caramba!', confirmButtonText: 'Ok'});
                                    });
                                }else{
                                    facebookLogin(response);
                                }
                            }, AppConfig.FB.DEFAULT_SCOPE);
                            break;
                    }
                }, function(e) {
                    console.log('login error', e);
                    AnalyticsService.track('error', {code:  e.code, message: e.message});

                    $timeout(function(){
                        swal({text: 'No podemos conectar con tu cuenta de Facebook, por favor intenta de nuevo', title: 'Hay caramba!', confirmButtonText: 'Ok', type: 'error'});
                    });
                });
        };

        $scope.$on('$ionicView.enter', function(){
            $scope.enableLogin();

            if(!$scope.swiper){
                $scope.swiper = new Swiper('.swiper-container', {
                    speed: 1000,
                    spaceBetween: 100,
                    observer: true,
                    autoplay: 3000,
                    effect: 'fade'
                });
            }
        });
    });
