angular
    .module('jound.controllers')
    .filter('unsafe', function($rootScope, $sce) {
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    })
    .controller('VenueCtrl', function(
        $scope,
        $rootScope,
        $stateParams,
        $timeout,
        $cordovaInAppBrowser,
        $state,
        $cordovaSocialSharing,
        $ionicModal,
        $ionicHistory,
        $cordovaDialogs,
        $cordovaProgress,
        toastr,
        $ionicSlideBoxDelegate,
        $ionicScrollDelegate,
        VenuesService,
        LinksService,
        ShareService,
        Facebook,
        AppConfig,
        //CameraService,
        AnalyticsService,
        venue,
        User,
        WEEKDAYS
    ) {
        AnalyticsService.track('loadVenue', {venue: venue.id});

        $scope.venue = venue;
        $scope.basicData = venue.getBasicData();
        $scope.logo = $scope.basicData.logo;
        $scope.banner = $scope.basicData.banner;
        $scope.coverVideo = venue.get('cover_video');

        $scope.images = [];
        $scope.page = venue.get('page') ? venue.get('page').toJSON() : undefined;
        $scope.videos = [];
        $scope.videoInfo = {};
        $scope.socialImages = [];
        $scope.twitts = [];
        $scope.lastTweet = undefined;
        $scope.firstTweet = undefined;
        $scope.firstImage = undefined;
        $scope.lastImage = undefined;
        $scope.videoPageToken = true;
        $scope.rating = venue.get('rating') || 0;
        $scope.max = 5;
        $scope.user = $rootScope.user.toJSON();
        $scope.user.avatar = $rootScope.user.getAvatar();
        $scope.enableUserPhotos = venue.get('enableUserPhotos') === false ? false : true;
        $scope.twentyFourSeven = false;
        $scope.serviceHours = [];
        $scope.timeline = [];
        $scope.claimMaster = {
            name: '',
            surname: '',
            phone: '',
            comments: '',
            phoneContact: false
        };
        $scope.bugMaster = {
            comments: '',
            problemType: 0
        };
        $scope.bug = angular.copy($scope.bugMaster);
        $scope.zoomMin = 1;

        $timeout(function() {
            $scope.$apply(function() {
                $scope.images.push($scope.banner);

                if(venue.get('images') && venue.get('images').length){
                    $scope.images = $scope.images.concat(venue.get('images').map(function(i){return {url: i};}));
                }
            });
        })

        var serviceHours = [];
        var master_day = {name: '', capital: ''};
        var currentDay, everyDay;

        if(venue.get('service_hours')){
            serviceHours = venue.get('service_hours');

            twentyFourSeven = serviceHours.filter(function(d){
                if(d.days === "*" && d.hours === "*"){
                    return true;
                }
            }).length;

            if(!twentyFourSeven){
                everyDay = serviceHours.filter(function(d){
                    if(d.days === "*"){
                        return true;
                    }
                }).length;

                if(everyDay){
                    serviceHours = WEEKDAYS.map(function(d){
                        return angular.extend({}, d, {hours: serviceHours[0].hours});
                    });

                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.serviceHours = serviceHours;
                        });
                    });
                }else{
                    serviceHours = serviceHours.map(function(r){


                        if(_.isArray(r.days)){
                            r = r.map(function(d){
                                return angular.extend({}, WEEKDAYS[d], {hours: r.hours});
                            });
                        }else if(_.isNumber(r.days) && WEEKDAYS[r.days]){
                            r = angular.extend({}, WEEKDAYS[r.days], {hours: r.hours});
                        }


                    });

                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.serviceHours = serviceHours;
                        });
                    });
                }
            }else{
                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.twentyFourSeven = twentyFourSeven;
                    });
                });
            }
        }

        $scope.getVideos = function(){
            $scope.refreshVideos();
        };

        $scope.refreshVideos = function(pageToken){
            var config = $scope.page.videoFeed;
            //Check if we want to paginate instead
            if(pageToken && _.isString(pageToken)){
                config = angular.extend({}, config, {pageToken: pageToken});
            }

            AnalyticsService.track('refreshVideos', {venue: venue.id});

            VenuesService
                .getChannel(config)
                .then(function(response){
                    $scope.videos = $scope.videos.concat(response.data.items);
                    $scope.videoPageToken = response.data.nextPageToken;
                    $scope.videoInfo = response.data.info;
                }, function(){
                    $scope.videosError = 'No pudimos cargar los videos';
                })
                .finally(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                });
        };

        $scope.canLoadVideos = function(){
            return !!$scope.videoPageToken;
        };

        $scope.refreshImages = function(minId){
            var config = $scope.page.photoFeed;

            if(minId){
                config.minId = minId;
            }

            if(_isLoadingImages) return;

            AnalyticsService.track('refreshImages', {venue: venue.id, minId:  minId});

            _isLoadingImages = true;
            $scope.imagesError = '';

            VenuesService
                .getChannel(config)
                .then(function(data){
                    //Save instagram id for future usage if not present
                    if(!$scope.page.photoFeed.id){
                        $scope.page.photoFeed.id = data.id;

                        VenuesService.updatePage($scope.page.id, 'photoFeed', $scope.page.photoFeed);
                    }

                    if(data && data.results && data.results.length){
                        $scope.socialImages = data.results.concat($scope.socialImages);
                        $scope.firstImage = _.first($scope.socialImages).id;
                    }
                }, function(e){
                    AnalyticsService.track('error', {type: 'refreshImages', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.refreshComplete');
                    _isLoadingImages = false;
                });
        };

        $scope.loadImages = function(maxId){
            var config = $scope.page.photoFeed;

            if(maxId){
                config.maxId = maxId;
            }

            if(_isLoadingImages) return;

            _isLoadingImages = true;
            $scope.imagesError = '';

            VenuesService
                .getChannel(config)
                .then(function(data){
                    //Save instagram id for future usage if not present
                    if(!$scope.page.photoFeed.id){
                        $scope.page.photoFeed.id = data.id;

                        VenuesService.updatePage($scope.page.id, 'photoFeed', $scope.page.photoFeed);
                    }

                    if(data && data.results && data.results.length){
                        $scope.socialImages = data.results.concat($scope.socialImages);
                        $scope.lastImage = _.last($scope.socialImages).id;
                        $scope.firstImage = _.first($scope.socialImages).id;
                        _canLoadImages = true;
                    }else if($scope.socialImages.length){
                        $scope.imagesError = 'No hay mas imagenes para cargar';
                        _canLoadImages = false;
                    }else{
                        $scope.imagesError = 'No encontramos imagenes';
                        _canLoadImages = false;
                    }

                    AnalyticsService.track('loadImages', {type: 'success', venue: venue.id, canLoadMore:  _canLoadImages});
                }, function(e){
                    if($scope.socialImages.length){
                        $scope.imagesError = 'No pudimos cargar las imagenes';
                    }else{
                        $scope.imagesError = 'No encontramos imagenes';
                    }
                    _canLoadImages = false;

                    AnalyticsService.track('error', {type: 'loadImages', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                    _isLoadingImages = false;
                });
        };

        var _isLoadingImages = false;
        var _canLoadImages = true;
        $scope.canLoadImages = function(){
            return !_isLoadingImages && _canLoadImages;
        }

        $scope.refreshTwitter = function(minId){
            var config = angular.extend({}, $scope.page.twitter, {type: 'twitter'});

            if(minId){
                config.minId = minId;
            }

            if(_isLoadingTwitter) return;

            AnalyticsService.track('refreshTwitter', {id: venue.id});

            _isLoadingTwitter = true;
            $scope.twitterError = '';

            VenuesService
                .getChannel(config)
                .then(function(response){
                    if(response && response.data && response.data.length){
                        $scope.twitts = response.data.concat($scope.twitts);
                        $scope.firstTweet = _.first($scope.twitts).id;
                    }

                    AnalyticsService.track('refreshTwitter', {type: 'success', venue: venue.id, firstTweet: $scope.firstTweet});
                }, function(e){
                    AnalyticsService.track('error', {type: 'refreshTwitter', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.refreshComplete');
                    _isLoadingTwitter = false;
                });
        };

        $scope.loadTwitter = function(maxId){
            var config = angular.extend({}, $scope.page.twitter, {type: 'twitter'});

            if(maxId){
                config.maxId = maxId;
            }

            if(_isLoadingTwitter) return;

            _isLoadingTwitter = true;
            $scope.twitterError = '';

            VenuesService
                .getChannel(config)
                .then(function(response){
                    if(response && response.data && response.data.length){
                        $scope.twitts = $scope.twitts.concat(response.data);
                        $scope.firstTweet = _.first($scope.twitts).id;
                        $scope.lastTweet = _.last($scope.twitts).id;
                    }else if($scope.twitts.length){
                        $scope.twitterError = 'No hay mas status para cargar';
                        _canLoadTwitter = false;
                    }else{
                        $scope.twitterError = 'No encontramos twitts para cargar';
                        _canLoadTwitter = false;
                    }

                    AnalyticsService.track('loadTwitter', {type: 'success', venue: venue.id, canLoadMore:  _canLoadTwitter, firstTweet: $scope.firstTweet, lastTweet: $scope.lastTweet});

                }, function(e){
                    if($scope.twitts.length){
                        $scope.twitterError = 'No hay mas status para cargar';
                    }else{
                        $scope.twitterError = 'No encontramos twitts para cargar';
                    }
                    _canLoadTwitter = false;

                    AnalyticsService.track('error', {type: 'loadTwitter', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                    _isLoadingTwitter = false;
                });
        };

        var _isLoadingTwitter = false;
        var _canLoadTwitter = true;
        $scope.canLoadTwitter = function(){
            return !_isLoadingTwitter && _canLoadTwitter;
        };

        $scope.timeline = [];
        $scope.refreshFacebook = function(){
            var config = angular.extend({}, $scope.page.facebook, {type: 'facebook'});

            if(_isLoadingFacebook) return;

            _isLoadingFacebook = true;
            $scope.facebookError = '';

            VenuesService
                .getChannel(config)
                .then(function(response){
                    $scope.facebookPrev = response.paging.previous || false;
                    $scope.facebookNext = response.paging.next || false;

                    $scope.timeline = response.results;

                    AnalyticsService.track('refreshFacebook', {type: 'success', venue: venue.id});
                }, function(e){
                    if(!timeline.length){
                        $scope.facebookError = 'No pudimos actualizar la pagina :(';
                    }else{
                        $scope.facebookError = 'No pudimos cargar la pagina :(';
                    }

                    AnalyticsService.track('error', {type: 'refreshFacebook', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.refreshComplete');
                    _isLoadingFacebook = false;
                });
        };

        $scope.loadFacebook = function(maxId){
            var config = angular.extend({}, $scope.page.facebook, {type: 'facebook', next: $scope.facebookNext});

            if(_isLoadingFacebook) return;

            _isLoadingFacebook = true;
            $scope.facebookError = '';

            VenuesService
                .getChannel(config)
                .then(function(response){
                    AnalyticsService.track('loadFacebook', {type: 'success', venue: venue.id, facebook:  $scope.page.facebook.id});

                    $scope.facebookPrev = response.paging.previous || false;
                    $scope.facebookNext = response.paging.next || false;

                    if(response && response.results && response.results.length){
                        $scope.timeline = $scope.timeline.concat(response.results);
                    }else if($scope.twitts.length){
                        $scope.facebookError = 'No hay mas status para cargar';
                        _canLoadFacebook = false;
                    }else{
                        $scope.twitterError = 'No encontramos datos para cargar';
                        _canLoadFacebook = false;
                    }

                }, function(e){
                    _canLoadFacebook = false;

                    if(!timeline.length){
                        $scope.facebookError = 'No pudimos cargar la pagina :(';
                    }else{
                        $scope.facebookError = 'No pudimos cargar mas detalles :(';
                    }

                    AnalyticsService.track('error', {type: 'loadFacebook', venue: venue.id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                    _isLoadingFacebook = false;
                });
        };

        var _isLoadingFacebook = false;
        var _canLoadFacebook = true;
        $scope.canLoadFacebook = function(){
            return !_isLoadingFacebook && _canLoadFacebook;
        };

        $scope.shareFacebook = function(link, venueId) {
            var onShare = function() {
                AnalyticsService.track('shareFacebook', {link:  link, venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'shareFacebook', code:  e.code, message: e.message, venue: venue.id});
            };

            AnalyticsService.track('beforeShare', {venue: venue.id, link:  link});

            var msg = 'Mira lo que encontre en Facebook ' + link + ' #jound';

            $cordovaSocialSharing.share(
                msg,
                null,
                null,
                link
            ).then(onShare, onShareError);
        };

        $scope.playVideo = function(id){
            AnalyticsService.track('playVideo', {venue: venue.id, video: id});

            $scope.openExternalApp('youtube:video', id);
        };

        $scope.openUrl = function(url){
            AnalyticsService.track('openUrl', {venue: venue.id, url: url});

            LinksService.open(url);
        };

        $scope.openExternalApp = function(type, identifier, subIdentifier){
            AnalyticsService.track('openExternalApp', {venue: venue.id, type:  type, identifier:  identifier, subIdentifier:  subIdentifier});
            LinksService.openExternalApp(type, identifier, subIdentifier);
        };

        $scope.aboutUs = function(){
            $state.go('app.venueAbout', {inherith:true, venueId: $scope.venue.id});
        };

        $scope.products = function(){
            $state.go('app.venueProducts', {inherith:true, venueId: $scope.venue.id});
        };

        $scope.deals = function(){
            $state.go('app.venuePromos', {inherith:true, venueId: $scope.venue.id});
        };

        $scope.reviews = function(){
            $state.go('app.venueReviews', {inherith:true, venueId: $scope.venue.id});
        };

        $scope.events = function(){
            $state.go('app.venueEvents', {inherith:true, venueId: $scope.venue.id});
        };

        $scope.share = function(link, img, tags, venueId) {
            var onShare = function() {
                AnalyticsService.track('share', {link:  link, tags:  tags, venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'share', code:  e.code, message: e.message, venue: venue.id});
            };

            if(tags){
                tags = tags.map(function(t){return t.text || t;});
            }else{
                tags = [];
            }

            var msg = 'Hey mira lo que encontre via #jound http://www.jound.mx/venue/' + venueId + ' #' + tags.join(' #');

            AnalyticsService.track('beforeShare', {venue: venue.id, link:  link});

            $cordovaSocialSharing.share(
                msg,
                'Hey mira lo que encontre en #jound',
                img,
                link
            ).then(onShare, onShareError);
        };

        $scope.shareVenue = function() {
            var link = 'http://www.jound.mx/venue/' + venue.id;
            var keywords = venue.getTwitterHashtags();
            var text = venue.get('name') + ' en ' + $scope.basicData.city;

            ShareService.share($scope, {
                url: link,
                text: text,
                description: venue.get('name') + ' via ' + AppConfig.TWITTER.NAME,
                twitt: text + ' ' + link,
                hashtags: keywords
            });
        };

        $scope.shareInstagram = function(link, img, tags, venueId) {
            var onShare = function() {
                AnalyticsService.track('shareInstagram', {link:  link, tags:  tags, venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'shareInstagram', code:  e.code, message: e.message, venue: venue.id});
            };

            if(tags){
                tags = tags.map(function(t){return t.text || t;});
            }else{
                tags = [];
            }

            AnalyticsService.track('beforeShare', {venue: venue.id, link:  link});

            var msg = 'Cheka esta foto que encontre ' + link + ' http://www.jound.mx/venue/' + venueId + ' #jound #' + tags.join(' #');

            $cordovaSocialSharing.share(
                msg,
                null,
                img || null,
                link
            ).then(onShare, onShareError);
        };

        $scope.shareTwitter = function(link, img, tags, venueId) {
            var onShare = function() {
                AnalyticsService.track('shareTwitter', {link:  link, tags:  tags, venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'shareTwitter', code:  e.code, message: e.message, venue: venue.id});
            };

            if(tags){
                tags = tags.map(function(t){return t.text || t;});
            }else{
                tags = [];
            }

            AnalyticsService.track('beforeShare', {venue: venue.id, link:  link});

            var msg = 'Mira lo que estan twiteando ' + link + ' http://www.jound.mx/venue/' + venueId + ' #jound #' + tags.join(' #');

            $cordovaSocialSharing.share(
                msg,
                null,
                img || null,
                link
            ).then(onShare, onShareError);
        };

        $scope.shareCheckin = function(){
            var onShare = function() {
                AnalyticsService.track('shareCheckin', {venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'shareCheckin', code:  e.code, message: e.message, venue: venue.id});
            };

            var tags = $scope.venue.get('keywords').map(function(t){return t;});
            var link = 'http://www.jound.mx/venue/' + $scope.venue.id;

            AnalyticsService.track('beforeShare', {venue: venue.id});

            $cordovaSocialSharing.share(
                'Hice Check-In en ' + $scope.venue.get('name') + '#' + $scope.venue.getCityName() + ' via #jound ' + tags.join(' #'),
                $scope.venue.getLogo(),
                null,
                link
            ).then(onShare, onShareError);
        };

        $scope.shareVideo = function(link, img, title, venueId) {
            var msg = 'Hey mira el video de '+ $scope.venue.get('name') + ' ' + link + ' http://www.jound.mx/venue/' + venueId + ' #jound';
            var onShare = function() {
                AnalyticsService.track('shareVideo', {link:  link, venue: venue.id});
            };
            var onShareError = function(e) {
                AnalyticsService.track('error', {type: 'shareVideo', code:  e.code, message: e.message, venue: venue.id});
            };

            AnalyticsService.track('beforeShare', {venue: venue.id, link:  link});

            $cordovaSocialSharing.share(
                msg,
                null,
                null,
                link
            ).then(onShare, onShareError);
        };


        $scope.back = function(){
            if($ionicHistory.backView() && $ionicHistory.backView().stateId === 'app.home'){
                window.history.back();
            }else{
                $state.go('app.home');
            }
        }

        $scope.checkingLoading = false;

        $scope.checkin = function(){
            $scope.checkinLoading = true;

            User
                .current()
                .checkIn($scope.venue.id)
                .then(function(response){
                    $scope.isCheckedIn = true;

                    $cordovaDialogs
                        .confirm('¿Deseas compartir tu Check-in?', 'Check-in', ['Si', 'No'])
                        .then(function(buttonIndex) {
                            // no button = 0, 'OK' = 1, 'Cancel' = 2
                            var btnIndex = buttonIndex;
                            switch(btnIndex){
                            case 1:
                                $scope.shareCheckin();
                                break;
                            }
                        });

                    AnalyticsService.track('checkin', {venue: venue.id, user: User.current().id});
                }, function(e){
                    $scope.isCheckedIn = false;
                    AnalyticsService.track('error', {type: 'checkin', venue: venue.id, user: User.current().id, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.checkinLoading = false;
                });
        };

        $scope.isCheckedIn = false;
        var _isCheckedIn = function(){
            var now = (new Date())*1;
            var sixteenHours = 16*60*60*1000;
            var checkinDate, checkinValidDate;

            $scope.checkinLoading = true;

            User
                .current()
                .checkUserCheckIn($scope.venue.id)
                .then(function(lastCheckin){
                    if(_.isEmpty(lastCheckin)){
                        $scope.isCheckedIn = false;
                    }else{
                        checkinDate = new Date(lastCheckin.createdAt);
                        checkinValidDate = new Date( (checkinDate*1) + sixteenHours);

                        if(now < checkinValidDate*1) {
                            $scope.isCheckedIn = true;
                        }else{
                            $scope.isCheckedIn = false;
                        }
                    }
                }, function(e){
                    $scope.isCheckedIn = false;
                })
                .finally(function(){
                    $scope.checkinLoading = false;
                });
        }

        var _checkClaimed = function(){
            VenuesService
                .isClaimed($scope.venue.id)
                .then(function(claims){
                    $timeout(function(){
                        $scope.$apply(function(){
                            if(claims && claims.length){
                                _isClaimed = true;
                            }else{
                                _isClaimed = false;
                            }
                        })
                    })
                });
        };
        var _isClaimed = false;

        $scope.isClaimed = function(){
            return _isClaimed;
        }

        $timeout(function(){
            $scope.$apply(function(){
                if($scope.page){
                    $scope.twitter = $scope.page.twitter ? $scope.page.twitter.account : false;
                    $scope.instagram = $scope.page.photoFeed && $scope.page.photoFeed.type === 'instagram' ? $scope.page.photoFeed.account : false;
                    $scope.facebook = $scope.page.facebook && $scope.page.facebook.id ? $scope.page.facebook.id : false;
                    $scope.pinterest = $scope.page.pinterest ? $scope.page.pinterest.account : false;
                    $scope.youtube = $scope.page.videoFeed ? $scope.page.videoFeed.account : false;
                }
            });
        });

        $ionicModal.fromTemplateUrl('templates/venue/claim.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.claimModal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/venue/bug.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.bugModal = modal;
        });

        $scope.startClaim = function(){
            $scope.claim = angular.copy($scope.claimMaster);
            $scope.claim.comments = 'Hola, me gustaria reclamar el negocio ' + $scope.basicData.name + ' ubicado en ' + $scope.basicData.address + ', ' + $scope.basicData.city;
            $scope.claimModal.show();
        }

        $scope.closeClaim = function(){
            _checkClaimed();
            $scope.claim = angular.copy($scope.claimMaster);
            $scope.claimModal.hide();
        }

        $scope.sendClaim = function(){
            $cordovaProgress.showSimpleWithLabelDetail(true, 'Enviando peticion');

            AnalyticsService.track('claim', {venue: venue.id, user: User.current().id});

            VenuesService
                .claim(venue.id, $scope.claim)
                .then(function(){
                    swal({title: 'Listo!', text: 'Se ha enviado una solicitud para asignarte el establecimiento en cuestion, gracias por usar Jound', type: "success", confirmButtonText: "Ok" });
                }, function(response){
                    var e = response.data.error;

                    switch(e.code){
                    case 405:
                        e.message = 'Ese establecimiento ya ha sido reclamado';
                    }

                    swal({text: e.message || 'Ha ocurrido un error, intenta de nuevo', title: 'Error', type: 'error', confirmButtonText: 'Ok'});
                })
                .finally(function(){
                    $cordovaProgress.hide();
                    $scope.closeClaim();
                })
        };

        $scope.reportBug = function(){
            $scope.bug = angular.copy($scope.bugMaster);
            $scope.bugModal.show();
        }

        $scope.closeBug = function(){
            $scope.bug = angular.copy($scope.bugMaster);
            $scope.bugModal.hide();
        }

        $scope.sendBug = function(){
            $cordovaProgress.showSimpleWithLabelDetail(true, 'Enviando Reporte');

            AnalyticsService.track('bug', {venue: venue.id, type: $scope.bug.problemType, user: User.current().id});

            VenuesService
                .report(venue.id, $scope.bug.comments, $scope.bug.problemType)
                .then(function(){
                    swal({text: 'Gracias por su reporte, es un placer atenderle', title: 'Listo', type: 'success', confirmButtonText: 'Ok'});
                }, function(e){
                    swal({text: e.message || 'Ha ocurrido un error, intenta de nuevo', title: 'Error', type: 'error', confirmButtonText: 'Ok'});
                })
                .finally(function(){
                    $cordovaProgress.hide();
                    $scope.closeBug();
                })
        };

        $scope.currentFSImage = undefined;
        //Create fullscreen image modal
        $ionicModal.fromTemplateUrl('templates/fsmodal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.fullScreenModal = modal;
        });

        $ionicModal.fromTemplateUrl('templates/fspreviewmodal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.fullScreenPreviewModal = modal;
        });

        $scope.openImage = function(url, index){
            $scope.currentFSImage = url;
            $scope.openFSModal();
        };

        $scope.openBusinessImage = function(data){
            $timeout(function(){
                $scope.$apply(function(){
                    $scope.businessImageSRC = data;
                    $cordovaProgress.hide();
                });
            });

            $scope.openFSImagePreviewModal();
        }

        $scope.openFSModal = function() {
            $scope.fullScreenModal.show();
        };

        $scope.openFSImagePreviewModal = function(){
            $scope.fullScreenPreviewModal.show();
        };

        $scope.closeFSModal = function() {
            $scope.fullScreenModal.hide();
            $scope.businessImageSRC = '';
        };

        $scope.closeFSImagePreviewModal = function(){
            $scope.fullScreenPreviewModal.hide();
        };

        $scope.openSlideshow = function(index){
            var message = 'Desliza hacia abajo para cerrar';
            $scope.activeSlide = index;

            if(!$scope.fullScreenSlideshowModal){
                $ionicModal.fromTemplateUrl('templates/fsslideshowmodal.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $scope.fullScreenSlideshowModal = modal;
                    $scope.fullScreenSlideshowModal.show();

                    toastr.info(message);
                });
            }else{
                $scope.fullScreenSlideshowModal.show();
                toastr.info(message);
            }
        }

        $scope.closeSlideshow = function(){
            if($scope.fullScreenSlideshowModal){
                $scope.fullScreenSlideshowModal.hide();
                $scope.fullScreenSlideshowModal.remove();
                $scope.fullScreenSlideshowModal = null;
            }
        }

        $scope.slideChanged = function(){
            //console.log('slide changed', arguments);
        }

        $scope.updateSlideStatus = function(slide) {
            var zoomFactor = $ionicScrollDelegate.$getByHandle('scrollHandle' + slide).getScrollPosition().zoom;

            if (zoomFactor == $scope.zoomMin) {
                $ionicSlideBoxDelegate.enableSlide(true);
            } else {
                $ionicSlideBoxDelegate.enableSlide(false);
            }
        };

        $scope.businessImageSRC = '';
        $scope.takePhoto = function(){
            $scope.businessImageSRC = '';

            CameraService
                .ready()
                .then(function(){
                    CameraService
                        .take({targetWidth:720, targetHeight: 400})
                        .then(function(image){
                            $cordovaProgress.showSimpleWithLabelDetail(true, 'Guardando imagen', 'Esperen un segundo');
                            //Save photo
                            VenuesService
                                .savePhotoForVenue(image, $scope.venue.id)
                                .then(function(url){
                                    $scope.images.push({url: url});
                                    $ionicSlideBoxDelegate.update();
                                    $cordovaProgress.hide();
                                    $timeout(function(){
                                        toastr.info('Imagen guardada, gracias :)');
                                        $ionicSlideBoxDelegate.slide($ionicSlideBoxDelegate.slidesCount()-1);
                                    });

                                    AnalyticsService.track('imageSavedForVenue', {venue: venue.id, image: url});
                                }, function(e){
                                    AnalyticsService.track('error', {venue: venue.id, code:  e.code, message: e.message});

                                    $cordovaProgress.hide();

                                    $timeout(function(){
                                        swal({text: e.message, type: 'error', title: 'Error'});
                                    });
                                });
                        }, function(e){
                            AnalyticsService.track('error', {venue: venue.id, code:  e.code, message: e.message});
                        });
                });
        };

        //Cleanup the modal when we're done with it!
        $scope.$on('$destroy', function() {
            $scope.fullScreenModal.remove();
        });
        // Execute action on hide modal
        $scope.$on('modal.hide', function() {
            // Execute action
        });
        // Execute action on remove modal
        $scope.$on('modal.removed', function() {
            // Execute action
        });
        $scope.$on('modal.shown', function() {
            //console.log('Modal is shown!');
        });

        $scope.$on('$ionicView.enter', function(){
            _isCheckedIn();
            _checkClaimed();
        });
    })
    .controller('VenueAboutCtrl', function($scope, $state, $sce, $ionicHistory, $stateParams, venue, AnalyticsService){
        $scope.basicData = venue.getBasicData();
        $scope.text = $sce.trustAsHtml(venue.get('page').get('about'));
        $scope.name = venue.get('name');
        $scope.venueId = $stateParams.venueId;

        AnalyticsService.track('aboutVenue', {venue: $scope.venueId});

        $scope.back = function(){
            $state.go('app.venue', {venueId: $scope.venueId});
        }
    })
    .controller('VenuePromosCtrl', function($scope, $state, $timeout, $stateParams, $ionicSlideBoxDelegate, $cordovaSocialSharing, $ionicHistory, VenuesService, LinksService, venue, AnalyticsService){
        var _canLoadMore = false;
        var _pageSize = 20;

        $scope.venueId = $stateParams.venueId;
        $scope.skip = 0;
        $scope.items = [];
        $scope.name = venue.get('name');
        $scope.loading = true;

        $scope.loadItems = function(id, skip){
            VenuesService
                .getDealsForVenue(id, skip)
                .then(function(items){
                    if(items.length < $scope.pageSize){
                        _canLoadMore = false;
                    }else{
                        _canLoadMore = true;
                        $scope.skip = _pageSize;
                    }

                    $scope.items = items;
                    $ionicSlideBoxDelegate.update();

                    AnalyticsService.track('loadPromoItems', {venue: $scope.venueId, count:  items.length});
                }, function(e){
                    //console.log('deals error', arguments);
                    _canLoadMore = false;
                    AnalyticsService.track('error', {type: 'loadPromoItems', venue: $scope.venueId, code:  e.code, message:  e.message});
                })
                .finally(function(){
                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.loading = false;
                        });
                    });
                });
        }

        $scope.openUrl = function(url){
            LinksService.open(url);
            AnalyticsService.track('openPromoURL', {venue: $scope.venueId, url: url});
        };

        $scope.canLoad = function(){
            return _canLoadMore;
        };

        $scope.share = function() {
            var index = $ionicSlideBoxDelegate.currentIndex();
            var promo = $scope.items[index];
            var img = promo.bannerUrl ? promo.bannerUrl : promo.file && promo.file.url;
            var link = 'http://www.jound.mx/venue/' + $scope.venueId + '/promo/' + promo.objectId;
            var msg = 'Hey mira la promo que encontre via #jound';

            $cordovaSocialSharing
                .share(msg, null, img, link)
                .then(function(){
                    AnalyticsService.track('sharePromo', {venue: $scope.venueId, url: link});
                }, function(e){
                    AnalyticsService.track('error', {type: 'sharePromo', venue: $scope.venueId, code:  e.code, message:  e.message, url: link});
                });

            AnalyticsService.track('beforeShare', {venue: $scope.venueId, url: link});
        };

        $scope.back = function(){
            $state.go('app.venue', {venueId: $scope.venueId});
        }

        $scope.$on('$ionicView.enter', function() {
            AnalyticsService.track('venuePromos', {venue: $scope.venueId});

            $scope.loadItems($scope.venueId);
        });
    })
    .controller('VenueEventsCtrl', function($scope, $state, $timeout, $stateParams, $ionicSlideBoxDelegate, $cordovaSocialSharing, $ionicHistory, VenuesService, LinksService, venue, AnalyticsService, ShareService, AppConfig){
        var _canLoadMore = false;
        var _pageSize = 20;

        $scope.venueId = $stateParams.venueId;
        $scope.skip = 0;
        $scope.items = [];
        $scope.name = venue.get('name');
        $scope.loading = true;

        VenuesService.current(venue);

        $scope.loadItems = function(id, skip){
            VenuesService
                .getEventsForVenue(id, skip)
                .then(function(items){
                    if(items.length < $scope.pageSize){
                        _canLoadMore = false;
                    }else{
                        _canLoadMore = true;
                        $scope.skip = _pageSize;
                    }

                    $scope.items = items;
                    $ionicSlideBoxDelegate.update();

                    AnalyticsService.track('loadEventItems', {venue: $scope.venueId, count:  items.length});
                }, function(){
                    //console.log('deals error', arguments);
                    _canLoadMore = false;
                    AnalyticsService.track('error', {type: 'loadEventItems', venue: $scope.venueId, code:  e.code, message:  e.message});
                })
                .finally(function(){
                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.loading = false;
                        });
                    });
                });
        }

        $scope.openUrl = function(url){
            LinksService.open(url);
            AnalyticsService.track('openEventURL', {venue: $scope.venueId, url: url});
        };

        $scope.canLoad = function(){
            return _canLoadMore;
        };

        $scope.share = function() {
            var index = $ionicSlideBoxDelegate.currentIndex();
            var ev = $scope.items[index];
            var msg = ev.description ? ev.description : 'Hey mira el evento que encontre via #jound';
            var img = ev.banner && _.isFunction(ev.banner.url) ? ev.banner.url() : ev.banner && _.isString(ev.banner.url) ? ev.banner.url : ev.bannerUrl;
            var link = 'http://www.jound.mx/venues/' + $scope.venueId + '/event/' + ev.objectId;

            ShareService
                .share($scope, {
                    text: msg,
                    url: img,
                    description: 'Evento de ' + venue.get('name') + ' en ' + AppConfig.TWITTER.name,
                    twitt: msg + ' ' + link + ' ' + venue.getTwitterHashtags().join(' '),
                    hashtags: venue.getTwitterHashtags()
                });
        };

        $scope.back = function(){
            $state.go('app.venue', {venueId: $scope.venueId});
        }

        $scope.$on('$ionicView.enter', function() {
            AnalyticsService.track('venueEvents', {venue: $scope.venueId});

            if(window.venueEvents) {
                $scope.loading = false;
                $scope.items = angular.copy(window.venueEvents);
                $ionicSlideBoxDelegate.update();

                window.venueEvents = null;

                AnalyticsService.track('serveEventItems', {venue: $scope.venueId, count:  $scope.items.length});
            }else{
                $scope.loadItems($scope.venueId);
            }
        });
    })
    .controller('VenueEventCtrl', function($scope, $state, $timeout, $stateParams, $ionicSlideBoxDelegate, $cordovaSocialSharing, $ionicHistory, VenuesService, LinksService, venue, AnalyticsService, ShareService, AppConfig){
        var _canLoadMore = false;
        var _pageSize = 20;

        $scope.venueId = $stateParams.venueId;
        $scope.eventId = $stateParams.eventId;
        $scope.venue = venue;

        VenuesService.current(venue);

        $scope.openUrl = function(url){
            LinksService.open(url);
            AnalyticsService.track('openEventURL', {venue: $scope.venueId, url: url});
        };

        $scope.share = function() {
            var ev = $scope.items[0];
            var msg = ev.description ? ev.description : 'Hey mira el evento que encontre via #jound';
            var img = ev.banner;
            var link = 'http://www.jound.mx/venues/' + $scope.venueId + '/event/' + $scope.eventId;

            ShareService
                .share($scope, {
                    text: msg,
                    url: img,
                    description: 'Evento de ' + venue.get('name') + ' en ' + AppConfig.TWITTER.name,
                    twitt: msg + ' ' + link + ' ' + venue.getTwitterHashtags().join(' '),
                    hashtags: venue.getTwitterHashtags()
                });
        };

        $scope.back = function(){
            $state.go('app.venueEvents', {venueId: $scope.venueId});
        }

        $scope.$on('$ionicView.enter', function() {
            AnalyticsService.track('venueEvent', {venue: $scope.venueId, eventId: $scope.eventId});

            if(window.venueEvent){
                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.items = [{
                            banner: window.venueEvent.banner ? window.venueEvent.banner.url : window.venueEvent.bannerUrl,
                            url: window.venueEvent.url,
                            description: window.venueEvent.description,
                            title: window.venueEvent.title
                        }];
                        $ionicSlideBoxDelegate.update();
                    });
                });
            }else{
                VenuesService
                    .getEventById($scope.eventId)
                    .then(function(ev){
                        $timeout(function(){
                            $scope.$apply(function(){
                                if(ev){
                                    var img;

                                    if(ev.get('banner') && ev.get('banner').url){
                                        img = ev.get('banner').url();
                                    }else{
                                        img = ev.get('bannerUrl');
                                    }

                                    $scope.items = [{
                                        banner: img,
                                        url: ev.get('url'),
                                        description: ev.get('description'),
                                        title: ev.get('title')
                                    }];
                                }else{
                                    $scope.error = 'error';
                                }
                            });
                        });
                    }, function(e){
                        $timeout(function(){
                            $scope.$apply(function(){
                                $scope.error = e.message;
                                AnalyticsService.track('error', {type: 'eventError', message: e.message, code: e.code});
                            });
                        });
                    })
            }
        });
    })
    .controller('VenueProductsCtrl', function($scope, $timeout, $state, $stateParams, $ionicHistory, $ionicModal, VenuesService, venue, AnalyticsService){
        var _canLoadMore = true;
        var _pageSize = 20;
        var _page = 0;

        $scope.venueId = $stateParams.venueId;
        $scope.skip = 0;
        $scope.items = [];
        $scope.name = venue.get('name');
        $scope.loading = true;

        $scope.loadItems = function(id, skip){
            VenuesService
                .getProductsForVenue(id, skip, _pageSize)
                .then(function(items){
                    if(items.length < _pageSize){
                        _canLoadMore = false;
                    }else{
                        _canLoadMore = true;
                        _page++;
                        $scope.skip = (_pageSize*_page)+1;
                    }

                    $scope.items = $scope.items.concat(items);
                    AnalyticsService.track('loadProductItems', {venue: $scope.venueId, count:  items.length});
                }, function(e){
                    _canLoadMore = false;
                    AnalyticsService.track('error', {type: 'loadProductItems', venue: $scope.venueId, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.loading = false;
                            $scope.$broadcast('scroll.infiniteScrollComplete');
                        });
                    });
                });
        }

        $scope.canLoad = function(){
            return _canLoadMore;
        };

        $scope.back = function(){
            $state.go('app.venue', {venueId: $scope.venueId});
        };

        $scope.currentFSImage = undefined;
        //Create fullscreen image modal
        $ionicModal.fromTemplateUrl('templates/fsproductmodal.html', {
            scope: $scope,
            animation: 'slide-in-up'
        }).then(function(modal) {
            $scope.fullScreenModal = modal;
        });

        $scope.openImage = function(item){
            var url = item.picture && item.picture.url ? item.picture.url : item.pictureUrl ? item.pictureUrl : false;

            if(url){
                $scope.currentFSImage = url;
            }

            $scope.currentItem = item;
            $scope.openFSModal();
        };

        $scope.openFSModal = function() {
            $scope.fullScreenModal.show();
        };

        $scope.closeFSModal = function() {
            $scope.fullScreenModal.hide();
        };
    })
    .controller('VenueReviewsCtrl', function($scope, $stateParams, $state, $cordovaProgress, $ionicHistory, VenuesService, User, venue, AnalyticsService){
        var _canLoadMore = true;
        var _pageSize = 20;
        var _page = 0;

        $scope.venueId = $stateParams.venueId;
        $scope.skip = 0;
        $scope.items = [];
        $scope.noReviews = false;
        $scope.rating = 0;
        $scope.max = 5;
        $scope.reviewText = '';
        $scope.userId = User.current().id;
        $scope.name = venue.get('name');

        VenuesService.current(venue);

        $scope.loadItems = function(id, skip){
            var sinceDate;
            var maxDate;

            if($scope.items.length){
                maxDate = _.last($scope.items).createdAt;
            }

            VenuesService
                .getReviewsForVenue(id, skip, _pageSize, null, maxDate)
                .then(function(items){
                    if(items.length < _pageSize){
                        _canLoadMore = false;
                    }else{
                        _canLoadMore = true;
                        _page++;
                        $scope.skip = (_pageSize*_page)+1;
                        $scope.noReviews = false;
                    }

                    $scope.items = $scope.items.concat(items.map(function(i){
                        var at = (new Date(i.createdAt));
                        i.displayDate = at.toLocaleDateString() + ' @ ' + at.toLocaleTimeString();
                        return i;
                    }));

                    if(!$scope.items.length) {
                        $scope.noReviews = true;
                    }

                    AnalyticsService.track('loadReviewItems', {venue: $scope.venueId, count:  items.length});
                }, function(e){
                    //console.log('error loading comments', arguments);
                    _canLoadMore = false;
                    AnalyticsService.track('error', {type: 'loadReviewItems', venue: $scope.venueId, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                });
        }

        $scope.refreshItems = function(id){
            var sinceDate;

            if($scope.items.length){
                sinceDate = _.first($scope.items).createdAt;
            }

            VenuesService
                .getReviewsForVenue(id, 0, _pageSize, sinceDate)
                .then(function(items){
                    if(items.length){
                        $scope.noReviews = false;
                        $scope.items = items.concat($scope.items);
                    }else if(!$scope.items.length){
                        $scope.noReviews = true;
                    }

                    AnalyticsService.track('refreshReviewItems', {venue: $scope.venueId, count:  items.length});
                }, function(e){
                    //console.log(arguments, 'error refreshing comments');
                    AnalyticsService.track('error', {type: 'refreshReviewItems', venue: $scope.venueId, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.$broadcast('scroll.refreshComplete');
                });
        };

        $scope.canLoad = function(){
            return _canLoadMore;
        }

        $scope.canReview = function(){
            var id = User.current().id;
            var hasReviewed = _.find($scope.items, function(i){
                return i.author.objectId === id;
            });

            return !_.isEmpty(hasReviewed);
        }

        $scope.canReply = function(){

        }

        $scope.saveReview = function(text, rating){
            $cordovaProgress.showSimpleWithLabelDetail(true, 'Guardando', 'Esperen un segundo');

            VenuesService
                .saveReview($scope.venueId, text, User.current().id, rating)
                .then(function(comment){
                    if(comment){
                        var at = (new Date(comment.createdAt));
                        comment.author = User.current().toJSON();
                        comment.author.avatar = User.current().getAvatar();
                        comment.venue = VenuesService.current();
                        comment.displayDate = at.toLocaleDateString() + ' @ ' + at.toLocaleTimeString();
                        $scope.items = [comment].concat($scope.items);
                        $scope.noReviews = false;

                        AnalyticsService.track('saveReview', {venue: $scope.venueId, user: User.current().id, type: 'success'});
                    }
                }, function(e){
                    AnalyticsService.track('error', {type: 'saveReview', venue: $scope.venueId, code:  e.code, message: e.message});
                })
                .finally(function(){
                    $scope.rating = 0;
                    $scope.reviewText = '';
                    $cordovaProgress.hide();
                })
        }

        $scope.back = function(){
            $state.go('app.venue', {venueId: $scope.venueId});
        }
    });
