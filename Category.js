var Category = Parse.Object.extend('Category');
var _ = require('lodash');

module.exports = {
    Category: Category,
    Query: function(){
        var query = new Parse.Query(Category);

        query.ascending('pluralized').equalTo('active', true).equalTo('primary', true);

        return query;
    },
    parseKeywords: function(k){
        return _.chain(k).uniq().sort().compact().value().join(' ');
    }
};
