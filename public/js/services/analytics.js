angular.module('jound.services')

.factory('AnalyticsService', function($q, $ionicPlatform, $cordovaDevice, $http, AppConfig, User){

    var global = {};

    function getDeviceData(e){
        var d = {
            web: true,
            platform: navigator.platform,
            ua: navigator.userAgent,
            parseVersion: Parse.VERSION,
            parseInstallation: Parse._installationId,

        };

        if(_.isObject(e)){
            d = angular.extend(d, e);
        }

        return d;
    };

    global.track = function(type, e){
        var deviceData = getDeviceData(e);
        var serverLogData = angular.extend({}, deviceData, {
            user: User.current() ? User.current().id : null,
            timestamp: new Date()*1,
            event: type
        });
        
        //Post device data to analytics service
        $http.post(AppConfig.API_URL + 'analytics', {data: serverLogData});

        _.each(deviceData, function(a, i){
            deviceData[i] = '' + a;
        });

        Parse.Analytics.track(type, deviceData);
    };
    
    return global;
});