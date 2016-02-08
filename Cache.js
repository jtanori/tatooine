'use strict';

var _ = require('lodash');
var memjs = require('memjs');
var client = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});

var Categories = require('./Category');

var getCategories = function(all){
    var promise = new Parse.Promise();

    client.get("categories", function (err, value, key) {
        if (!_.isEmpty(value)) {
            var categories = JSON.parse(value);

            categories = categories.map(Categories.parseCategory);

            promise.resolve(categories);
        }else{
            var categories = new Categories.Query(all);
            //Try getting those damm categories
            categories.find({
                success: function(c){
                    c = c.map(Categories.parseCategory);

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

var getAllCategories = function(){
    return getCategories(true);
};

module.exports = {
    client: client,
    getCategories: getCategories,
    getAllCategories: getAllCategories
};
