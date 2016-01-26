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
        $scope.usingGeolocation = $rootScope.settings.usingGeolocation;
        $scope.helpVideos = [];
        $ionicSideMenuDelegate.canDragContent(false);

        var options = {
            location: 'no',
            clearcache: 'yes',
            toolbar: 'yes'
        };

        $rootScope.$watch('settings.usingGeolocation', function(val, oldVal) {
            if (val !== undefined && val !== oldVal) {
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
                $rootScope.$broadcast('updateFeatured', val > oldVal);
            }
        });

        $scope.toggleGeolocation = function() {
            if(window.initialVenues){
                delete window.initialVenues;
            }
            
            $rootScope.settings.usingGeolocation = !$rootScope.settings.usingGeolocation;
        };

        $scope.home = function(){
            $scope.closeLeft();
            $state.go('app.home');
        };

        $scope.about = function() {
            LinksService.open('http://app.jound.mx/acerca-de-jound.html');
        };

        $scope.privacy = function() {
            LinksService.open('http://www.jound.mx/privacy');
        };

        $scope.help = function() {
            LinksService.open('http://www.jound.mx/ayuda');
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
        };

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
        };

        $scope.helpVideos = [];

        $scope.signup = function(){
            $scope.closeLeft();
            $state.go('login');
        };

        Parse.Config
            .get()
            .then(function(c){
                $scope.helpVideos = c.get('helpVideos');
                $scope.twitter = c.get('twitterUsername');
                $scope.instagram = c.get('instagramUsername');
                $scope.fbID = c.get('facebookPageID');
                $scope.www = c.get('www');
            });
    })
    .controller('TutorialCtrl', function($scope, $timeout, $rootScope, $ionicSlideBoxDelegate, $ionicPlatform, $ionicHistory, $localStorage, $state, TUTORIAL){
        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();

        $scope.tutorialItems = TUTORIAL;
        $localStorage.set('tutorial', true);

        $scope.closeTutorial = function(){
            $state.go('app.home');
        };

        $scope.next = function() {
            $ionicSlideBoxDelegate.$getByHandle('tutorialSlideboxHandle').next();
        };

        $scope.previous = function() {
            $ionicSlideBoxDelegate.$getByHandle('tutorialSlideboxHandle').previous();
        };

        $scope.slideTo = function(index){
            $ionicSlideBoxDelegate.$getByHandle('tutorialSlideboxHandle').slide(index);
        };

        $scope.canPrev = function(){
            return $ionicSlideBoxDelegate.$getByHandle('tutorialSlideboxHandle').currentIndex();
        };

        $scope.canNext = function(){
            var index = $ionicSlideBoxDelegate.$getByHandle('tutorialSlideboxHandle').currentIndex();

            return index < $scope.tutorialItems.length-1;
        };
    });
