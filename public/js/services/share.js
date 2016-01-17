angular.module('jound.services')

.factory('ShareService', function($q, $ionicModal, AppConfig, $location, LinksService){

    var global = {};
    var $modal;
    var options = {
        APP_ID: AppConfig.FB.ID,
        TWIITER_ID: AppConfig.TWITTER.NAME,
        HOST: AppConfig.HOST_URL
    };
    var $scope;

    global.share = function($scope, o){
        var scope = $scope.$new();
        $scope = scope;

        scope.socialShare = angular.extend({}, options, o);

        if($modal){
            $modal.show();
        }else{
            $ionicModal.fromTemplateUrl('templates/sharemodal.html', {
                scope: scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $modal = modal;
                $modal.show();

                scope.closeShareModal = function(){
                    $modal.hide();
                    $modal.remove();
                    $modal = null;
                    scope.socialShare = null;
                }
            });
        }
    };

    return global;
});
