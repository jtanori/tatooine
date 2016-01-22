angular
    .module('jound.controllers')
    .controller('MenuCtrl', function(
        $scope,
        $rootScope,
        $state,
        $ionicPlatform,
        $ionicSideMenuDelegate,
        $timeout,
        $localStorage,
        $ionicModal,
        $ionicSlideBoxDelegate,
        $ionicHistory,
        AppConfig,
        LinksService,
        AnalyticsService,
        User,
        AnonymousUser
    ) {
        $scope.usingGeolocation = User.current() && User.current().get('settings') ? User.current().get('settings').usingGeolocation : true;
        $ionicSideMenuDelegate.canDragContent(false);

        var options = {
            location: 'no',
            clearcache: 'yes',
            toolbar: 'yes'
        };

        function updateGeolocationButton(val) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.usingGeolocation = val;
                });
            });
        };

        $scope.$on('change:usingGeolocation', function(e, val) {
            updateGeolocationButton(val);
        });

        $rootScope.$watch('settings.usingGeolocation', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
                updateGeolocationButton(val);
                $rootScope.user.save('settings', $rootScope.settings);
            }
        });

        $rootScope.$watch('settings.mapAnimation', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
                $rootScope.user.save('settings', $rootScope.settings);
            }
        });

        $rootScope.$watch('settings.autoSearch', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
                $rootScope.user.save('settings', $rootScope.settings);
            }
        });

        $rootScope.$watch('settings.autoFocus', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
                $rootScope.user.save('settings', $rootScope.settings);
            }
        });

        $rootScope.$watch('settings.searchRadius', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
                $rootScope.user.save('settings', $rootScope.settings);
            }
        });

        $scope.toggleGeolocation = function() {
            console.log('toggle geolocation');
            $rootScope.settings.usingGeolocation = !$rootScope.settings.usingGeolocation;
        };

        $scope.home = function(){
            $scope.closeLeft();
            $state.go('app.home');
        };

        $scope.about = function() {
            $cordovaInAppBrowser.open('http://app.jound.mx/acerca-de-jound.html');
        };

        $scope.privacy = function() {
            $cordovaInAppBrowser.open('http://www.jound.mx/privacy');
        };

        $scope.help = function() {
            $cordovaInAppBrowser.open('http://www.jound.mx/ayuda');
        };

        $scope.business = function(){
            $rootScope.$broadcast('venue:new:frommenu');
            $scope.newBusinessStarted = true;
            $scope.closeLeft();
        };

        $scope.newBusinessStarted = false;
        $rootScope.$on('venue:new', function(){
            $scope.newBusinessStarted = true;
        });

        $rootScope.$on('venue:new:cancel', function(){
            $scope.newBusinessStarted = false;
        });

        $scope.openVideo = function(id){
            AnalyticsService.track('openSidebarVideo', {video: id});
            LinksService.openExternalApp('youtube:video', id);
        };

        $scope.openExternalApp = function(type, identifier, subIdentifier){
            AnalyticsService.track('openSidebarExternalApp', {type:  type, identifier:  identifier, subIdentifier:  subIdentifier});
            LinksService.openExternalApp(type, identifier, subIdentifier);
        };

        $scope.openUrl = function(url){
            AnalyticsService.track('openDrawerURL', {url: url});
            LinksService.open(url);
        };

        $scope.tutorial = function(){
            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=true;
            }

            $ionicModal.fromTemplateUrl('templates/tutorial.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $rootScope.tutorialModal = modal;
                $rootScope.tutorialModal.show();

                $rootScope.$watch('mainMap', function(){
                    if($rootScope.tutorialModal && $rootScope.tutorialModal.isShown() && $rootScope.mainMap){
                        $rootScope.mainMap.disabled=true;
                    }
                });

                if($rootScope.mainMap){
                    $rootScope.mainMap.disabled=true;
                }

                AnalyticsService.track('openTutorial', {});
            });
        };

        $scope.closeTutorial = function(){
            $rootScope.tutorialModal
                .remove()
                .then(function(){
                    if($rootScope.mainMap){
                        $rootScope.mainMap.disabled=false;
                    }
                });
        }

        var _left = false;
        $scope.openLeft = function() {
            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=true;
            }
            $ionicSideMenuDelegate.toggleLeft(false);
            _left = true;
        };

        $scope.isLeftOpen = function(){
            return _left;
        };

        var _right = false;
        $scope.openRight = function() {
            $ionicSideMenuDelegate.toggleRight(false);
            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=true;
            }
            _right = true;
        };

        $scope.isRightOpen = function(){
            return _right;
        }

        $scope.closeLeft = function() {
            $ionicSideMenuDelegate.toggleLeft();
            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=false;
            }
            _left = false;
        };

        $scope.closeRight = function() {
            $ionicSideMenuDelegate.toggleRight();
            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=false;
            }
            _right = false;
        };

        $scope.logout = function() {
            $ionicHistory.clearCache();
            $ionicHistory.clearHistory();

            if ($ionicSideMenuDelegate.isOpenLeft()) {
                $ionicSideMenuDelegate.toggleLeft(true);
                _left = false;
            }

            if ($ionicSideMenuDelegate.isOpenRight()) {
                $ionicSideMenuDelegate.toggleRight(true);
                right = false;
            }

            if($rootScope.mainMap){
                $rootScope.mainMap.disabled=true;
            }

            AnalyticsService.track('logout', {user: $rootScope.user.id});

            $rootScope.user = null;
            $rootScope.settings = null;

            if(User.current()){
                User.logOut();
            }else {
                AnonymousUser.logOut();
            }

            $state.go('login');
        }

        $scope.helpVideos = [];

        $scope.signup = function(){
            $ionicModal.fromTemplateUrl('templates/loginmodal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                modal.show();
            });
        };

        $scope.facebookLogin = function(){
            console.log('facebook login');
        };

        Parse.Config
            .get()
            .then(function(c){
                $scope.helpVideos = c.get('helpVideos');
                $scope.twitter = c.get('twitterUsername');
                $scope.instagram = c.get('instagramUsername');
                $scope.fbID = c.get('facebookPageID');
                $scope.www = c.get('www');
            },function(){
                //Report error
            });

        $ionicPlatform.ready(function() {
            if (ionic.Platform.isIOS()) {
                options.presentationstyle = 'fullscreen';
                options.transitionstyle = 'fliphorizontal';
                options.toolbarposition = 'top';
                options.disallowoverscroll = 'yes';
            }

            if(!$localStorage.get('tutorial')) {
                Parse.Config
                    .get()
                    .then(function(c){
                        if(c.get('showHelpVideos')){
                            $scope.tutorial();
                            $localStorage.set('tutorial', true);
                        }
                    });
            }
        });
    });
