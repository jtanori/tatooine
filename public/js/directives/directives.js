angular
	.module('jound.directives')
	.directive('integer', function(){
	    return {
	        require: 'ngModel',
	        link: function(scope, ele, attr, ctrl){
	            ctrl.$parsers.unshift(function(viewValue){
	                return parseInt(viewValue, 10);
	            });
	        }
	    };
	})
	.directive('focusOn', function() {
	   return function(scope, elem, attr) {
	      scope.$on('focusOn', function(e, name) {
	        if(name === attr.focusOn) {
	          elem[0].focus();
	        }
	      });
	   };
	})
	.directive('blurOn', function() {
	   return function(scope, elem, attr) {
	      scope.$on('blurOn', function(e, name) {
	        if(name === attr.focusOn) {
	          elem[0].blur();
	        }
	      });
	   };
	})
	.factory('focus', function ($rootScope, $timeout) {
	  return function(name) {
	    $timeout(function (){
	      $rootScope.$broadcast('focusOn', name);
	    });
	  }
	})
	.factory('blur', function ($rootScope, $timeout) {
	  return function(name) {
	    $timeout(function (){
	      $rootScope.$broadcast('blurOn', name);
	    });
	  }
	})
    .directive('dynamic', function ($compile) {
        return {
            restrict: 'A',
            replace: true,
            link: function (scope, ele, attrs) {
                scope.$watch(attrs.dynamic, function(html) {
                    ele.html(html);
                    $compile(ele.contents())(scope);
                });
            }
        };
    })
    .directive('sameAs', [function() {
        'use strict';

        return {
            require: 'ngModel',
            restrict: 'A',
            link: function(scope, element, attrs, ctrl) {
                var modelToMatch = element.attr('sameAs');      
                ctrl.$validators.match = function(modelValue, viewValue) {
                    return viewValue === scope.$eval(modelToMatch);
                };
            }
        };
    }])
    .directive('onEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if(event.which === 13) {
                    scope.$apply(function (){
                        scope.$eval(attrs.myEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    })
    .directive('defaultNavBackButton', function ($ionicHistory, $state, $stateParams, $ionicConfig, $ionicViewSwitcher, $ionicPlatform) {

        return {
            link: link,
            restrict: 'EA'
        };

        function link(scope, element, attrs) {

            scope.backTitle = function() {
                var defaultBack = getDefaultBack();
                if ($ionicConfig.backButton.previousTitleText() && defaultBack) {
                    return $ionicHistory.backTitle() || defaultBack.title;
                }
            };

            scope.goBack = function() {
                if ($ionicHistory.backView()) {
                    $ionicHistory.goBack();
                } else {
                    goDefaultBack();
                }
            };

            scope.$on('$stateChangeSuccess', function() {
                element.toggleClass('hide', !getDefaultBack());
            });

            $ionicPlatform.registerBackButtonAction(function () {
                if ($ionicHistory.backView()) {
                    $ionicHistory.goBack();
                } else if(getDefaultBack()) {
                    goDefaultBack();
                } else {
                    navigator.app.exitApp();
                }
            }, 100);

        }

        function getDefaultBack() {
            return ($state.current || {}).defaultBack;
        }

        function goDefaultBack() {
            $ionicViewSwitcher.nextDirection('back');
            $ionicHistory.nextViewOptions({
                disableBack: true,
                historyRoot: true
            });

            var params = {};

            if (getDefaultBack().getStateParams) {
                params = getDefaultBack().getStateParams($stateParams);
            }

            $state.go(getDefaultBack().state, params);
        }
    });