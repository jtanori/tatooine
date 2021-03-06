// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js

angular.module('jound.controllers', []);
angular.module('jound.services', []);
angular.module('jound.directives', []);

angular.module('jound',
  [
    'ng',
    'ionic',
    'ngSanitize',
    'ionic.rating',
    'ngIOS9UIWebViewPatch',
    'uiGmapgoogle-maps',
    'toastr',
    'facebook',
    '720kb.socialshare',
    'geolocation',
    'ngLodash',

    'jound.controllers',
    'jound.services',
    'jound.directives'
  ]
)

.constant('AUTH_EVENTS', {
  notAuthenticated: 'auth-not-authenticated',
  notAuthorized: 'auth-not-authorized'
})

.constant('USER_ROLES', {
  admin: 'admin_role',
  public: 'public_role'
})

.constant('VENUE_DEFAULT_IMAGE', {
    small: 'img/venue_default.jpg',
    large: 'img/venue_default_large.jpg'
})

.constant('NEW_VENUE_MASTER', {
    image: '',
    name: '',
    phone: '',
    owner: false
})

.constant('BASE_64', {
    JPG: "data:image/jpeg;base64,",
    PNG: "data:image/png;base64,"
})

.constant('VERIFICATION_LEVELS', {
    'DEFAULT': undefined,
    'VERIFIED': 1,
    'NON_VERIFIED': 2,
    'CONFLICTING': 3
})

.constant('WEEKDAYS', {
    0: {name: 'Lunes', capital: 'L'},
    1: {name: 'Master', capital: 'M'},
    2: {name: 'Miercoles', capital: 'Mi'},
    3: {name: 'Jueves', capital: 'J'},
    4: {name: 'Viernes', capital: 'V'},
    5: {name: 'Sabado', capital: 'S'},
    6: {name: 'Domingo', capital: 'D'}
})

.constant('EARTHRADIUS', 6378137)

.constant('TUTORIAL', [
    {
        title: 'Ubicate',
        src: '/img/tutorial/tutorial-1.jpg',
        text: 'Puedes activar o desactivar la geolocalización en cualquier momento'
    },
    {
        title: 'Explora',
        src: '/img/tutorial/tutorial-2.gif',
        text: 'Explora el mundo en estilo libre, captura un centro geográfico al tocar la bolita verde'
    },
    {
        title: 'Busca',
        src: '/img/tutorial/tutorial-3.gif',
        text: 'Busca libremente o selecciona alguna de nuestras categorías'
    },
    {
        title: 'Guiate',
        src: '/img/tutorial/tutorial-4.jpg',
        text: 'Traza tu ruta, comparte y encuentra los mejores establecimientos'
    },
    {
        title: 'Listo',
        src: '/img/tutorial/tutorial-5.gif',
        text: 'Brofist! Estas más que listo para explorar, ¡bienvenido!'
    }
])

.constant('HOME_SLIDESHOW', [
    '/img/home-slideshow/0.jpg',
    '/img/home-slideshow/1.jpg',
    '/img/home-slideshow/2.jpg',
    '/img/home-slideshow/3.jpg',
    '/img/home-slideshow/4.jpg',
    '/img/home-slideshow/5.jpg',
    '/img/home-slideshow/6.jpg',
    '/img/home-slideshow/7.jpg',
    '/img/home-slideshow/8.jpg',
    '/img/home-slideshow/9.jpg',
    '/img/home-slideshow/10.jpg',
    '/img/home-slideshow/11.jpg',
    '/img/home-slideshow/12.jpg'
])

.constant('AppConfig', {
    PARSE: {
        appId: window.PARSE_APP_ID,
        jsKey: window.PARSE_JS_KEY
    },
    FB: {
        DEFAULT_PERMISSIONS: ["public_profile", "email", "user_friends", "publish_actions"],
        DEFAULT_SCOPE: 'public_profile,email,user_friends,publish_actions',
        ID: window.FACEBOOK_ID
    },
    TWITTER: {
        NAME: '@joundmx'
    },
    API_URL: window.API_URL,
    HOST_URL: window.HOST_URL,
    MAX_DISTANCE_TO_REFRESH: 500,
    GEO: {
        DEFAULT: {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        },
        DEFAULT_CENTER: {
            coords: {
                latitude: 19.432608,
                longitude: -99.133208
            }
        },
        DEFAULT_ZOOM: 6,
        DEFAULT_WATCH_OPTIONS: {
            timeout : 10000,
            enableHighAccuracy: true
        }
    },
    RADIUS: {
        DEFAULT: {
            radius: 1000,
            fill: {
                color: '#0000FF',
                opacity: 0.05
            },
            stroke: {
                color: '#0000FF',
                weight: 1,
                opacity: 0.5
            },
            visible: true
        }
    },
    MAP: {
        DEFAULT: {
            backgroundColor: 'white',
            streetViewControl: false,
            zoom: 14,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: 'BOTTOM_RIGHT'
            },
            panControl: true,
            panControlOptions: {
                position: 'BOTTOM_CENTER'
            },
            zoomControl: true,
            zoomControlOptions: {
                position: 'BOTTOM_RIGHT'
            }
        }
    },
    SETTINGS: {
        autoSearch: false,
        autoFocus: true,
        mapAnimation: true,
        searchRadius: 1000,//meters
        usingGeolocation: true,
        position: null
    },
    QUERY: {
        VENUE_DEFAULT_FIELDS: [
            'avatar',
            'activity_description',
            'block',
            'building',
            'building_floor',
            'category',
            'claimed_by',
            'cover',
            'cover_video',
            'exterior_letter',
            'email_address',
            'exterior_number',
            'enableUserPhotos',
            'featured',
            'federal_entity',
            'images',
            'internal_letter',
            'internal_number',
            'keywords',
            'locality',
            'logo',
            'municipality',
            'name',
            'page',
            'phone_number',
            'position',
            'postal_code',
            'rating',
            'road_name',
            'road_name_1',
            'road_name_2',
            'road_name_3',
            'road_type',
            'road_type_1',
            'road_type_2',
            'road_type_3',
            'service_hours',
            'settling_name',
            'settling_type',
            'shopping_center_name',
            'shopping_center_store_number',
            'shopping_center_type',
            'verificationLevel',
            'www'
        ]
    },
    DATE: {
        DAY: [
            'Domingo',
            'Lunes',
            'Martes',
            'Miercoles',
            'Jueves',
            'Viernes',
            'Sabado'
        ]
    },
    GOOGLE: {
        MAPS_WEB_KEY: 'AIzaSyDzZII1NdMzWZaRPfTFntVwaGt6p5hnesQ'
    },
    MARKERS: {
        LOCATION: {
            url: '/img/marker_location.png',
            size: {
                width: 20,
                height: 20
            }
        },
        LOCATION_CUSTOM: {
            url: '/img/marker_location_custom.png',
            size: {
                width: 20,
                height: 20
            }
        },
        LOCATION_CUSTOM_PIN: {
            url: '/img/marker_location_custom_pin.png',
            size: {
                width: 32.5,
                height: 35
            }
        },
        VENUE_FEATURED: {
            url: '/img/marker_venue.png',
            size: {
                width: 30,
                height: 43
            }
        },
        VENUE_SELECTED_FEATURED: {
            url: '/img/marker_venue_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        VENUE: {
            url: '/img/marker_d.png',
            size: {
                width: 30,
                height: 43
            }
        },
        VENUE_SELECTED: {
            url: '/img/marker_d_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        A: {
            url: '/img/marker_a.png',
            size: {
                width: 30,
                height: 43
            }
        },
        A_SELECTED: {
            url: '/img/marker_a_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        B: {
            url: '/img/marker_b.png',
            size: {
                width: 30,
                height: 43
            }
        },
        B_SELECTED: {
            url: '/img/marker_b_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        C: {
            url: '/img/marker_c.png',
            size: {
                width: 30,
                height: 43
            }
        },
        C_SELECTED: {
            url: '/img/marker_c_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        D: {
            url: '/img/marker_d.png',
            size: {
                width: 30,
                height: 43
            }
        },
        D_SELECTED: {
            url: '/img/marker_d_selected.png',
            size: {
                width: 30,
                height: 43
            }
        },
        E: {
            url: '/img/marker_e.png',
            size: {
                width: 30,
                height: 43
            }
        },
        E_SELECTED: {
            url: '/img/marker_e_selected.png',
            size: {
                width: 30,
                height: 43
            }
        }
    },
    ROUTES: {
        A: {
            'color' : '#387ef5',
            'weight': 10
        },
        B: {
            'color' : '#ef473a',
            'weight': 10
        },
        C: {
            'color' : '#444',
            'weight': 10
        }
    }
})

.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider, $httpProvider, $locationProvider, $compileProvider) {
    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider

        .state('app', {
            url: "",
            abstract: true,
            templateUrl: "templates/menu.html",
            controller: 'MenuCtrl'
        })

        .state('app.tutorial', {
            url: "/tutorial",
            views: {
                'app': {
                    templateUrl: "templates/tutorial.html",
                    controller: 'TutorialCtrl'
                }
            }
        })

        .state('app.home', {
            url: "/venues",
            views: {
                'app': {
                    templateUrl: "templates/home.html",
                    controller: 'HomeCtrl'
                }
            }
        })

        .state('app.search', {
            url: "/venues?q&lat&lng&category&radius",
            views: {
                'app': {
                    controller: 'HomeCtrl',
                    templateUrl: 'templates/home.html'
                }
            }
        })

        .state('app.venue', {
            url: "/venues/:venueId",
            views: {
                'app': {
                    templateUrl: "templates/venue.html",
                    controller: 'VenueCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.home'
            }
        })

        .state('app.venueAbout', {
            url: "/venues/:venueId/about",
            views: {
                'app': {
                    templateUrl: "templates/venue/about.html",
                    controller: 'VenueAboutCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venuePromos', {
            url: "/venues/:venueId/promos",
            views: {
                'app': {
                    templateUrl: "templates/venue/promos.html",
                    controller: 'VenuePromosCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venuePromo', {
            url: "/venues/:venueId/promos/:promoId",
            views: {
                'app': {
                    templateUrl: "templates/venue/promos.html",
                    controller: 'VenuePromosCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venueProducts', {
            url: "/venues/:venueId/products",
            views: {
                'app': {
                    templateUrl: "templates/venue/products.html",
                    controller: 'VenueProductsCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venueProduct', {
            url: "/venues/:venueId/products/:productId",
            views: {
                'app': {
                    templateUrl: "templates/venue/product.html",
                    controller: 'VenueProductCtrl'
                }
            },
            resolve: {
                productData: function($stateParams, VenuesService) {
                    return VenuesService.getProductById($stateParams.venueId, $stateParams.productId);
                }
            },
            defaultBack: {
                state: 'app.venueProducts'
            }
        })

        .state('app.venueReviews', {
            url: "/venues/:venueId/reviews",
            views: {
                'app': {
                    templateUrl: "templates/venue/reviews.html",
                    controller: 'VenueReviewsCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venueEvents', {
            url: "/venues/:venueId/events",
            views: {
                'app': {
                    templateUrl: "templates/venue/events.html",
                    controller: 'VenueEventsCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venue'
            }
        })

        .state('app.venueEvent', {
            url: "/venues/:venueId/event/:eventId",
            views: {
                'app': {
                    templateUrl: "templates/venue/events.html",
                    controller: 'VenueEventCtrl'
                }
            },
            resolve: {
                venue: function($stateParams, VenuesService) {
                    return VenuesService.getById($stateParams.venueId);
                }
            },
            defaultBack: {
                state: 'app.venueEvents'
            }
        })

        .state('login', {
            url: "/login",
            templateUrl: "templates/login.html",
            controller: 'LoginCtrl'
        })

        .state('forgot', {
            url: "/forgot-password",
            templateUrl: "templates/forgot-password.html",
            controller: 'ForgotPasswordCtrl'
        })

        .state('start', {
            url: '/start',
            templateUrl: 'templates/start.html',
            controller: 'StartCtrl'
        });

    // if none of the above states are matched, use this as the fallback
    //TODO: Load loading controller first to avoid displaying login screen in android
    $urlRouterProvider.otherwise(function ($injector, $location) {
        var $state = $injector.get("$state");
        $state.go("start");
    });

    $ionicConfigProvider.tabs.position('bottom');

    $locationProvider.html5Mode(true);

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|jound):/);
})

.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
  return {
    responseError: function (response) {
      $rootScope.$broadcast({
        401: AUTH_EVENTS.notAuthenticated,
        403: AUTH_EVENTS.notAuthorized
      }[response.status], response);
      return $q.reject(response);
    }
  };
})

.config(function(uiGmapGoogleMapApiProvider, $httpProvider, AppConfig, FacebookProvider) {
    uiGmapGoogleMapApiProvider.configure({
        //    key: 'your api key',
        key: AppConfig.GOOGLE.MAPS_WEB_KEY,
        v: '3.20', //defaults to latest 3.X anyhow
        libraries: 'weather,geometry,visualization'
    });

    $httpProvider.interceptors.push('AuthInterceptor');

    FacebookProvider.init(AppConfig.FB.ID);
})

.factory('User', function($q, $http, AppConfig, lodash){
    var _ = lodash;

    return Parse.User.extend({
        checkUserCheckIn: function(id){
            var deferred = $q.defer();

            if(!id){
                deferred.reject('No venue id provided for checkin');
            }else {
                $http
                    .post(AppConfig.API_URL + 'checkUserCheckIn', {id: id, userId: this.id})
                    .then(function(response){
                        deferred.resolve(response.data.results || []);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        checkIn: function(id){
            var deferred = $q.defer();

            if(!id){
                deferred.reject('No venue id provided for checkin');
            }else {
                $http
                    .post(AppConfig.API_URL + 'checkIn', {id: id, userId: this.id})
                    .then(function(response){
                        deferred.resolve(response);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        getDisplayName: function(){
            var name = this.escape('name') ? this.escape('name') : this.escape('username') ? this.escape('username') : 'Joundini';

            return name;
        },
        getAvatar: function(){
            var a = this.get('avatar');

            if(Parse._.isString(a)){
                return a;
            }else if(this.get('avatar') && this.get('avatar').get('file')){
                return this.get('avatar').get('file').url();
            }else{
                return 'http://www.gravatar.com/avatar/' + CryptoJS.MD5(this.get('username'));
            }
        },
        isAnonimous: function(){
            return false;
        },
        getBasicData: function(){
            return {
                id: this.id,
                username: this.get('username'),
                email: this.get('email'),
                displayName: this.getDisplayName(),
                settings: this.get('settings'),
                avatar: this.getAvatar(),
                name: this.get('name'),
                lastName: this.get('lastName'),
                facebook: this.get('facebook')
            };
        }
    });
})

.factory('AnonymousUser', ['$localStorage', 'AppConfig', 'lodash', function($localStorage, AppConfig, lodash){
    var _current;
    var _ = lodash;
    var User = (function () {
        var instance;

        function createInstance() {
            var object = function(initialAttributes){
                if(!_.isEmpty($localStorage.getObject('anon-user'))){
                    this.attributes = $localStorage.getObject('anon-user');
                }else{
                    this.attributes = initialAttributes;
                    this.save();
                }
            };

            object.prototype = {
                save: function(key, value){
                    var $self = this;
                    //Want to save current attributes?
                    if(_.isEmpty(key)){
                        $localStorage.setObject('anon-user', this.attributes);
                    }else{
                        var c = $localStorage.getObject('anon-user') || {};

                        if(_.isObject(key)){
                            _.each(key, function(k, v){
                                c[v] = k;
                                $self.attributes[v] = k;
                            });
                        }else{
                            c[key] = value;
                            this.attributes[key] = value;
                        }

                        $localStorage.setObject('anon-user', c);
                    }

                    return c;
                },
                get: function(key){
                    return this.attributes[key];
                },
                set: function(key, value){
                    var c = this.attributes;

                    if(_.isObject(key)){
                        _.each(key, function(k, v){
                            c[v] = k;
                        });
                    }else{
                        c[key] = value;
                    }

                    return c;
                },
                toJSON: function(){
                    return this.attributes;
                },
                getAvatar: function(){
                    var a = this.get('avatar');

                    if(_.isString(a)){
                        return a;
                    }else if(this.get('avatar') && this.get('avatar').get('file')){
                        return this.get('avatar').get('file').url();
                    }else{
                        return 'http://www.gravatar.com/avatar/anonymous';
                    }
                },
                isAnonimous: function(){
                    return true
                },
                id: 'anonymous',
                getBasicData: function(){
                    return {
                        id: this.id,
                        username: 'anonimous',
                        displayName: 'Anonimo',
                        settings: this.get('settings'),
                        avatar: this.getAvatar(),
                        name: 'Anonimo'
                    };
                }
            };

            return new object({settings: AppConfig.SETTINGS});
        }

        return {
            current: function () {
                if (!instance) {
                    instance = createInstance();
                }
                return instance;
            },
            exists: function(){
                if(instance || !_.isEmpty($localStorage.getObject('anon-user'))){
                    return true;
                }

                return false;
            },
            logOut: function(){
                $localStorage.removeItem('anon-user');
                instance = null;

                return instance;
            }
        };
    })();

    return User;
}])

.factory('$localStorage', ['$window', function($window) {
    return {
        set: function(key, value) {
            $window.localStorage[key] = value;
        },
        get: function(key, defaultValue) {
            return $window.localStorage[key] || defaultValue;
        },
        setObject: function(key, value) {
            $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function(key) {
            return JSON.parse($window.localStorage[key] || '{}');
        },
        removeItem: function(item){
            $window.localStorage.removeItem(item);
        }
    };
}])

.run(function($rootScope, User, AnonymousUser, $localStorage, $state, AppConfig, lodash){
    //Initialize Parse
    var _ = lodash;
    window._ = lodash;

    $rootScope.HOST_URL = AppConfig.HOST_URL;

    Parse.initialize(AppConfig.PARSE.appId, AppConfig.PARSE.jsKey);
    //Get user
    var u = User.current();

    //Set user in root
    $rootScope.user = null;
    $rootScope.settings = null;
    //Load settings
    if(u){
        var settings = u.get('settings');

        //Assign global objects
        $rootScope.user = u;

        if(!_.isEmpty(settings)){
            $rootScope.settings = settings;
        }else{
            u.save('settings', AppConfig.SETTINGS);
            $rootScope.settings = AppConfig.SETTINGS;
        }
    }else if(AnonymousUser.exists()){
        $rootScope.user = AnonymousUser.current();
        $rootScope.settings = AnonymousUser.current().get('settings');
    }

    $rootScope.$on('$stateChangeStart', function (event, next, nextParams, fromState) {
        if (_.isEmpty($rootScope.user)) {
            if (next.name !== 'login') {
                event.preventDefault();
                $state.go('login');
            }
        }
    });

    var checmFrame = document.getElementById('schemeCheck');

    checmFrame.src = window.schemeURL;
})

.controller('StartCtrl', function($state, $rootScope, $localStorage){
    //Redirect to proper page
    if(!!$rootScope.user){
        if(!$localStorage.get('tutorial')){
            $state.go('app.tutorial');
        }else{
            $state.go('app.home');
        }
    }else{
        $state.go('login');
    }
});
