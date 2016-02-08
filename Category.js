var Category = Parse.Object.extend('Category');
var _ = require('lodash');

module.exports = {
    Category: Category,
    Query: function(all){
        var query = new Parse.Query(Category);

        query.ascending('pluralized').equalTo('primary', true);

        if(!all){
            query.equalTo('active', true);
        }

        return query;
    },
    parseCategory: function(category){
        return {
            active: category.get('active'),
            displayName: category.get('displayName'),
            keywords: category.get('keywords'),
            hasSubcategory: category.get('hasSubcategory'),
            name: category.get('name'),
            pluralized: category.get('pluralized'),
            updateHistory: category.get('updateHistory'),
            updatedAt: category.get('updatedAt'),
            id: category.id
        };
    },
    parseKeywords: function(k){
        return _.chain(k).uniq().sort().compact().value().join(' ');
    }
};
