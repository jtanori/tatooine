angular.module('jound.services')

.factory('CategoriesService', function($q) {
    var Category = Parse.Object.extend({className: 'Category'});
    var Categories = Parse.Collection.extend({
        model: Category,
        query: (new Parse.Query(Category)).ascending('pluralized').equalTo('active', true).equalTo('primary', true),
        toKeywordsArray: function(){
            return _.memoize(function(){
                return this.map(function(c){return {keywords: c.get('keywords'), title: c.get('pluralized'), id: c.id, model: c, selected: true};});
            }.bind(this))();
        },
        toPlainArray: function(){
            return _.memoize(function(){
                return this.map(function(c){return c.get('keywords').map(function(k){return k + '__' + c.id;});}).reduce(function(cu, n){return cu.concat(n);}, []);
            }.bind(this))();
        }
    });

    return {
        get: function(){
            var categories = new Categories();
            var deferred = $q.defer();

            categories.fetch().then(function(c){
                if(c.length){
                    deferred.resolve(c);
                }else{
                    deferred.reject([]);
                }
            });

            return deferred.promise;
        },
        loadCategories: function(categories){
            var c = new Categories();

            c.add(categories);

            return c;
        }
    };
});
