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
        AppConfig,
        AnalyticsService) {

        var _signup = false;

        $scope.user = {};
        $scope.master = {};

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
            var settings = User.current().get('settings');

            //Set root user
            $rootScope.user = User.current();

            if(!_.isEmpty(settings)){
                $rootScope.settings = settings;
            }else{
                $rootScope.settings = AppConfig.SETTINGS;
                $rootScope.save('settings', $rootScope.settings);
            }

            AnalyticsService.track('login', {user: $rootScope.user.id});
        }

        $scope.login = function(form) {
            if (!form.$invalid) {
                $timeout(function(){
                    $ionicLoading.show('autenticando...');
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
                        $state.go('app.home');
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
        }

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
                        })
                        $state.go('app.home');
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
        }

        $scope.checkForm = function(form){
            var isEqual = ($scope.user.password === $scope.user.passwordConfirmation);

            return !(form.$valid && isEqual);
        };

        if (Parse.User.current()) {
            $state.go('app.home');

            return;
        }

        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();
        $scope.enableLogin();

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

                //Login
                Parse.FacebookUtils
                    .logIn(authData)
                    .then(function() {
                        //Set root user
                        $rootScope.user = User.current();

                        _onLogin();

                        Facebook
                            .api("me", ["public_profile", "email", "user_friends"], function(data) {
                                $rootScope.user.save({
                                        gender: data.gender || '',
                                        firstName: data.first_name,
                                        lastName: data.last_name,
                                        name: data.name,
                                        fullName: data.first_name + ' ' + data.last_name,
                                        email: data.email,
                                        avatar: 'http://graph.facebook.com/' + data.id + '/picture?type=large',
                                        facebook: true
                                    })
                                    .then(function() {
                                        AnalyticsService.track('userProfileUpdate', {user: $rootScope.user.id});

                                        $state.go('app.home');
                                    }, function(e) {
                                        AnalyticsService.track('error', {code:  e.code, message: e.message, user: $rootScope.user.id});

                                        $state.go('app.home');
                                    });
                            }, function(e) {
                                AnalyticsService.track('error', {code:  e.code, message: e.message});

                                $state.go('app.home');
                            });
                    }, function(e) {
                        AnalyticsService.track('error', {code:  e.code, message: e.message});

                        swal({text: e.message, title: 'Error', confirmButtonText: 'Ok', type: 'error'});
                    });
            }
        };

        $scope.facebookLogin = function() {
            Facebook
                .getLoginStatus(function(response) {
                    console.log(response, 'get login status');
                    switch (response.status) {
                        case 'connected':
                            facebookLogin(response);
                            break;
                        default:
                            Facebook.login(function(response){
                                console.log(response);
                                if(response.error){
                                    AnalyticsService.track('error', {code:  e.code, message: e.message});

                                    $timeout(function(){
                                        swal({text: 'No podemos conectar con tu cuenta de Facebook, por favor intenta de nuevo', title: 'Hay caramba!', confirmButtonText: 'Ok', title: 'error'});
                                    });
                                }else{
                                    facebookLogin(response);
                                }
                            }, AppConfig.FB.DEFAULT_SCOPE);
                            break;
                    }
                }, function(e) {
                    AnalyticsService.track('error', {code:  e.code, message: e.message});

                    $timeout(function(){
                        swal({text: 'No podemos conectar con tu cuenta de Facebook, por favor intenta de nuevo', title: 'Hay caramba!', confirmButtonText: 'Ok', type: 'error'});
                    });
                });
        };
    });
