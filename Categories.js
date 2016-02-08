var Cache = require('./Cache.js');
var Categories = require('./Category');
var _ = require('lodash');

module.exports = {
    get: function(req, res){
        /*var categories = Cache.getCategories();
        Cache
            .getAllCategories()
            .then(function(categories){
                if(!_.isEmpty(categories)){
                    res.status(200).json({ status: 'success', results: categories});
                }else{
                    res.status(404).json({ message: 'No categories found', code: 404 });
                }
            }, function(e){
                res.status(404).json({ message: 'No categories found', code: 404 });
            });*/

        var categories = new Categories.Query(true);
        var promise = new Parse.Promise();

        console.log('categories get');

        categories.find({
            success: function(c){
                if(c){
                    c = c.map(Categories.parseCategory);

                    res.status(200).json({ status: 'success', results: c});
                }else{
                    res.status(404).json({ message: 'No categories found', code: 400 });
                }
            },
            error: function(e){
                res.status(404).json({ message: e.message, code: e.code });
            }
        });
    },
    getById: function(req, res){
        var data = req.params;

        if(data && data.id){
            var c = new Categories.Category;

            c.id = data.id;
            c
                .fetch()
                .then(function(category){
                    if(category){
                        res.status(200).json({ status: 'success', results: Categories.parseCategory(category)});
                    }else{
                        res.status(500).json({ message: 'No category found for: ' + data.id, code: 500 });
                    }
                }, function(e){
                    res.status(404).json({ message: e.message, code: e.code });
                });
        }else{
            res.status(500).json({ message: 'No category id provided', code: 500 });
        }
    }
}
