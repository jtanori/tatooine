angular
    .module('jound.services')
    .service('LinksService', function(AnalyticsService) {
        function openExternalApp(type, identifier, subIdentifier, fallbackURL) {
            var url, uriScheme, schemeUrl;

            var isIOS = ionic.Platform.isIOS();
            var isAndroid = ionic.Platform.isAndroid();

            switch (type) {
                case 'twitter':
                    uriScheme = isIOS ? 'twitter://' : 'com.twitter.android';
                    schemeUrl = 'twitter://user?screen_name=' + identifier;
                    url = 'https://twitter.com/' + identifier;
                    break;
                case 'twitter:media':
                    uriScheme = isIOS ? 'twitter://' : 'com.twitter.android';
                    schemeUrl = 'twitter://status?user_id=' + identifier + '&status_id=' + subIdentifier;
                    url = 'https://twitter.com/' + identifier + '/status/' + subIdentifier;
                    break;
                case 'twitter:hashtag':
                    uriScheme = isIOS ? 'twitter://' : 'com.twitter.android';
                    schemeUrl = 'twitter://search?query=' + identifier;
                    url = 'https://twitter.com/search?q=' + encodeURIComponent(identifier);
                    break;
                case 'twitter:tweet':
                    uriScheme = isIOS ? 'twitter://' : 'com.twitter.android';
                    schemeUrl = 'twitter://tweet?text=' + identifier + '&url=' + subIdentifier;
                    url = 'https://twitter.com/tweet?text=' + identifier + '&url=' + subIdentifier;
                    break;
                case 'fb':
                case 'facebook':
                    uriScheme = isIOS ? 'fb://' : 'com.facebook.katana';
                    schemeUrl = 'fb://profile/' + identifier;
                    url = 'https://facebook.com/' + identifier;
                    break;
                case 'facebook:status':
                case 'fb:status':
                    uriScheme = isIOS ? 'fb://' : 'com.facebook.katana';
                    schemeUrl = 'fb://post/' + subIdentifier + '?owner=' + identifier;
                    url = 'https://facebook.com/' + subIdentifier + '?owner=' + identifier;
                    break;
                case 'instagram':
                    uriScheme = isIOS ? 'instagram://' : 'com.instagram.android';
                    schemeUrl = 'instagram://user?username=' + identifier;
                    url = 'https://instagram.com/' + identifier;
                    break;
                case 'instagram:media':
                    uriScheme = isIOS ? 'instagram://' : 'com.instagram.android';
                    schemeUrl = 'instagram://media?id=' + identifier;
                    url = 'https://instagram.com/p/' + identifier;
                    break;
                case 'instagram:hashtag':
                    uriScheme = isIOS ? 'instagram://' : 'com.instagram.android';
                    schemeUrl = 'instagram://tag?name=' + identifier;
                    url = 'https://instagram.com/explore/tags/' + identifier;
                    break;
                case 'youtube':
                    uriScheme = isIOS ? type + '://' : 'com.google.android.youtube';
                    schemeUrl = 'vnd.youtube://user/' + identifier;
                    url = 'https://www.youtube.com/' + identifier;
                    break;
                case 'youtube:channel':
                    //TODO: Fix iOS youtube channel page open
                    uriScheme = isIOS ? '' : 'com.google.android.youtube';
                    schemeUrl = 'youtube://www.youtube.com/user/' + identifier;
                    url = 'https://www.youtube.com/channel/' + identifier;
                    break;
                case 'youtube:video':
                    uriScheme = isIOS ? 'youtube://' : 'com.google.android.youtube';
                    schemeUrl = 'vnd.youtube://' + identifier;
                    url = 'https://www.youtube.com/watch?v=' + identifier;
                    break;
                case 'pinterest':
                    uriScheme = isIOS ? 'pinterest://' : 'com.pinterest';
                    schemeUrl = 'pinterest://user/' + identifier;
                    url = 'https://www.pinterest.com/' + identifier;
                    break;
                case 'jound':
                    uriScheme = isIOS ? 'jound://' : 'mx.jound.app';
                    schemeUrl = 'jound://' + identifier + '/' + subIdentifier;
                    url = AppConfig.HOST_URL + identifirs + '/' + subIdentifier;
                    break; 
            }

            if(isAndroid || isIOS){
                if(isAndroid){
                    var intent = 'intent://' + schemeUrl.split('://')[1] + '#Intent;scheme=' + schemeUrl.split('://')[0] + ';package=' + uriScheme + ';S.browser_fallback_url=' + url + ';end';
                    window.open(intent, '_blank');
                }else{
                    window.open(schemeUrl, '_blank');

                    setTimeout(function() {
                        // If the user is still here, open the App Store
                        if (!document.webkitHidden) {
                            // Replace the Apple ID following '/id'
                            window.open(url, '_blank');
                        }
                    }, 1000);
                }
            }else{
                window.open(url, '_blank');
            }
        }

        function openURL(address){
            if(typeof address !== "string"){
                throw new Error('No valid address provided');
            }

            if(address.indexOf('http://') === -1 && address.indexOf('https://') === -1){
                address = 'http://' + address;
            }

            window.open(address, '_system');
        }

        return {
            openExternalApp: openExternalApp,
            open: openURL
        };
    });
