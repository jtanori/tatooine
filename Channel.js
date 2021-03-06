var Parse = require('parse').Parse;
var Twitter = require('twitter');
var https = require('https');
var ig = require('instagram-node').instagram();
var _ = require('lodash');
var Autolinker = require('autolinker');
var FB = require('fb');
var concat = require('concat-stream');
var moment = require('moment');

moment.locale('es');

//Configure instagram
ig.use({ client_id: process.env.INSTAGRAM_CLIENT_ID, client_secret: process.env.INSTAGRAM_CLIENT_SECRET });

//Create factory
function TwitterAggregator(){
	this.getClient();
};

TwitterAggregator.prototype.getClient = function(){
	if(!this._client){
		this._client = new Twitter({
			consumer_key:process.env.TWITTER_CONSUMER_KEY,
			consumer_secret:process.env.TWITTER_CONSUMER_SECRET,
			access_token_key:process.env.TWITTER_ACCESS_TOKEN,
			access_token_secret:process.env.TWITTER_ACCESS_TOKEN_SECRET
		});
	}

	return this._client;
};

TwitterAggregator.prototype.getTimeline = function(userName, sinceId, maxId){
	var client = this.getClient();
	var promise = new Parse.Promise();
	var config = {screen_name: userName};

	if(sinceId){
		config.since_id = sinceId;
	}

	if(maxId){
		config.max_id = maxId;
	}

	client.get('statuses/user_timeline', config, function(error, tweets, response){
		var items = {};

		if(error){
			promise.reject(error);
		}else{

			items = tweets.map(function(t){

				console.log(t.entities.hashtags, 'hashtags');

				return {
					id: t.id_str,
					text: _replaceLinks(t.text, 'twitter'),
					safeText: t.text,
					user: {
						id: t.user.id_str,
						screenName: t.user.screen_name,
						name: t.user.name,
						profilePicture: t.user.profile_image_url
					},
					favorited: t.favorited,
					retweeted: t.retweeted,
					retweetCount: t.retweet_count,
					favoriteCount: t.favorite_count,
					tags: t.entities.hashtags,
					urls: t.entities.urls.map(function(u){
						return {url: u.url, expandedUrl: u.expanded_url, displayUrl: u.display_url};
					}),
					media: t.entities.media ? t.entities.media.map(function(m){
						return {
							url: m.media_url,
							secureUrl: m.media_url_https,
							displayUrl: m.display_url,
							expandedUrl: m.expanded_url,
							type: m.type,
							sizes: m.sizes
						};
					}) : [],
					extendedMedia: t.extended_entities && t.extended_entities.media ? t.extended_entities.media.map(function(m){
						return {
							url: m.media_url,
							secureUrl: m.media_url_https,
							displayUrl: m.display_url,
							expandedUrl: m.expanded_url,
							type: m.type,
							sizes: m.sizes
						};
					}) : []
				};
			});


			promise.resolve(items);
		}
	});

	return promise;
};

TwitterAggregator.prototype.getBanner = function(userName){
	var client = this.getClient();
	var promise = new Parse.Promise();

	client.get('users/profile_banner', {screen_name: userName},function(error, banners, response){
		if(error){
			promise.reject(error);
		}else{
			promise.resolve(banners);
		}
	});

	return promise;
};

var youtube = function(url){
	var promise = new Parse.Promise();

	https.get(url, function(r) {
        var body = "";

        r.on('data', function (chunk) {
            body += chunk;
        });

        r.on('end', function () {
            var parsed = JSON.parse(body);
            var items;

            if(parsed.error){
                promise.reject(parsed.error);
            }else{
                //Get relevant data
                items = parsed.items.map(function(i){
                    return {
                        id: i.id.videoId,
                        description: _replaceLinks(i.snippet.description, 'youtube'),
                        safeText: i.snippet.description,
                        title: i.snippet.title,
                        thumbnails: i.snippet.thumbnails
                    }
                });

                promise.resolve({items: items, nextPageToken: parsed.nextPageToken, info: parsed.pageInfo});
            }
        });

    }).on('error', function(e) {
    	promise.reject(e);
    });

    return promise;
};

var _replaceLinks = function(text, type){

	var linkedText = Autolinker.link( text, {
	    replaceFn : function( autolinker, match ) {
	        switch( match.getType() ) {
	            case 'url' :

                    return '<a ng-click="openUrl(\'' + match.getAnchorHref() + '\')">' + match.getAnchorText() + '</a>';

	            case 'twitter' :
	                var twitterHandle = match.getTwitterHandle();
	                var url;

	                if(type === 'twitter'){
	                	url = '<a ng-click="openExternalApp(\'twitter\', \'' + twitterHandle + '\')">' + twitterHandle + '</a>';
	                } else if(type === 'instagram'){
	                	url = '<a ng-click="openExternalApp(\'twitter\', \'' + twitterHandle + '\')">' + twitterHandle + '</a>';
	                } else if(type === 'pinterest'){
	                	url = '<a ng-click="openExternalApp(\'pinterest\', \'' + twitterHandle + '\')">' + twitterHandle + '</a>';
	                } else if(type === 'youtube'){
	                	url = '<a ng-click="openExternalApp(\'youtube\', \'' + twitterHandle + '\')">' + twitterHandle + '</a>';
	                }

	                return url;

	            case 'hashtag' :
	                var hashtag = match.getHashtag();
	                var url;

	                if(type === 'twitter'){
	                	url = '<a ng-click="openExternalApp(\'twitter:hashtag\', \'' + hashtag + '\')">' + hashtag + '</a>';
	                } else if(type === 'instagram'){
	                	url = '<a ng-click="openExternalApp(\'twitter:hashtag\', \'' + hashtag + '\')">' + hashtag + '</a>';
	                } else if(type === 'pinterest'){
	                	url = '<a ng-click="openExternalApp(\'pinterest:hashtag\', \'' + hashtag + '\')">' + hashtag + '</a>';
	                } else if(type === 'youtube'){
	                	url = '<a ng-click="openExternalApp(\'youtube:hashtag\', \'' + hashtag + '\')">' + hashtag + '</a>';
	                }

	                return url;
	        }
	    }
	} );

	return linkedText;

};

var _parseInstagramResult = function(r){
	return {
		videos: !_.isEmpty(r.videos) ? {
			lowRes: r.videos.low_resolution.url,
			lowBand: r.videos.low_bandwidth.url,
			standard: r.videos.standard_resolution.url
		} : {},
		tags: r.tags,
		comments: r.comments.count ? r.comments.data.map(function(c){
			return {
				text: c.text,
				user: c.from.username,
				userPicture: c.from.profile_picture,
				id: c.from.id
			};
		}) : {},
		likes: r.likes.count,
		images: !_.isEmpty(r.images) ? {
			lowRes: r.images.low_resolution.url,
			lowBand: r.images.thumbnail.url,
			standard: r.images.standard_resolution.url
		} : {},
		text: r.caption && r.caption.text ? _replaceLinks(r.caption.text, 'instagram') : '',
		safeText: r.caption && r.caption.text ? r.caption.text : '',
		type: r.type,
		id: r.id,
		user: r.user,
		link: r.link,
		mediaHash: _.chain(r.link).split('/').compact().last().value()
	}
};

var instagram = function(userName, userID, minId, maxId){
	var promise = new Parse.Promise();
	var config = {};

	if(minId){
		config.min_id = minId;
	}

	if(maxId){
		config.max_id = maxId;
	}

	if(userID){
		ig.user_media_recent(userID, config, function(err, result, remaining, limit) {
			if(err){
				promise.reject(err);
			}else{
				result = result.map(_parseInstagramResult);
				//Resolve results
				promise.resolve({results: result});
			}
		});
	}else{
		ig.user_search(userName, {}, function(err, users, remaining, limit) {
			if(err){
				promise.reject(err);
			}else if(users.length){
				users = users.filter(function(u){
					if(u.username === userName){
						return u;
					}
				});

				ig.user_media_recent(users[0].id, config, function(err, result, remaining, limit) {
					if(err){
						promise.reject(err);
					}else{
						result = result.map(_parseInstagramResult);
						//Send back results
						promise.resolve({id: users[0].id, results: result});
					}
				});

			}else{
				promise.reject({message: 'No user found', code: 400});
			}
		});
	}

	return promise;
}

var facebook = function(pageId, token, next){
	var promise = new Parse.Promise();
	var params;

	console.log(pageId, token, next);

    //If we want to page instead
    if(next && _.isString(next)){
    	params = next;
    }else{
    	params = {
	        hostname: 'graph.facebook.com',
	        port: 443,
	        path: '/v2.0/' + pageId + '/feed?access_token=' + token,
	        method: 'GET'
	    };
    }

    https.get(params, function (response) {
        //response is a stream so it is an EventEmitter
        response.setEncoding("utf8");

        //More compact
        response.pipe(concat(function (data) {
        	data = JSON.parse(data);

        	data.data = data.data.map(function(d){
        		d.created_time = moment(d.created_time).format("Do MMMM YYYY, h:mm a");

        		return d;
        	});

            promise.resolve(data);
        }));

        response.on("error", function(e){
        	promise.reject(e);
        });
    });

	return promise;
}

module.exports = {
	youtube: youtube,
	twitter: new TwitterAggregator(),
	instagram: instagram,
	facebook: facebook
}
