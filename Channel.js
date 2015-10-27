var Parse = require('parse').Parse;
var Twitter = require('twitter');
var https = require('https');
var ig = require('instagram-node').instagram();
var _ = require('lodash');

//Configure instagram
console.log(process.env.INSTAGRAM_CLIENT_ID, process.env.INSTAGRAM_CLIENT_SECRET);
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

				return {
					id: t.id_str,
					text: t.text,
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
					tags: t.hashtags,
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
                        description: i.snippet.description,
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
		text: r.caption.text,
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

module.exports = {
	youtube: youtube,
	twitter: new TwitterAggregator(),
	instagram: instagram
}