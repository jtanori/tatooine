'use strict';

var _ = require('lodash');
var memjs = require('memjs');
var client = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});

var Categories = require('./Category');

var getCategories = function(){
    var promise = new Parse.Promise();

    client.get("categories", function (err, value, key) {
        if (!_.isEmpty(value)) {
            promise.resolve(JSON.parse(value));
        }else{
            var categories = new Categories.Query();
            //Try getting those damm categories
            categories.find({
                success: function(c){
                    c = c.map(function(category){
                        return category.toJSON();
                    });

                    client.set('categories', JSON.stringify(c));

                    promise.resolve(c);
                },
                error: function(e){
                    promise.reject(e);
                }
            });
        }
    });

    return promise;
};

module.exports = {
    client: client,
    getCategories: getCategories
};
