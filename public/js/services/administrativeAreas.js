angular.module('jound.services')

.factory('AdministrativeAreaService', ['$q','$http',
  function ($q,$http) {

    var global = {};  
    var Country = Parse.Object.extend('Country');
    var State = Parse.Object.extend('State');

    var getByType = function(adds, type){
      adds = adds || [];
      type = type.split('|');
      type = type.length > 1 ? type : type[0];

      adds = adds.filter(function(a){
        if(_.isString(type)){
          return _.contains(a.types, type);
        }else{
          return !!_.intersection(a.types, type).length;
        }
      });

      return _.first(adds);
    };

    global.getByType = getByType;

    global.getComponents = function(place){
      
      var q=$q.defer();
      var countryQuery = new Parse.Query(Country);
      var stateQuery = new Parse.Query(State);
      var c, s, country, state;

      c = getByType(place.address_components, 'country');
      s = getByType(place.address_components, 'administrative_area_level_1|administrative_area_level_2');

      if(c && s){
        //Try finding county
        countryQuery
          .equalTo('code', c.short_name)
          .first()
          .then(function(country){

            if(country){
              //Fetch state for given country
              stateQuery
                .equalTo('code', s.short_name)
                .equalTo('country', country)
                .first(function(state){
                  
                  if(state){
                    q.resolve({country: country, state: state});
                  }else{
                    //Create new state if it does not exists
                    state = new State({country: country, name: s.long_name, code: s.short_name});
                    state
                      .save()
                      .then(function(){
                        q.resolve({country: country, state: state});
                      }, function(e){
                        q.reject(e);
                      });
                  }

                }, function(e){
                  q.reject(e);
                });
            }else{
              //Create new country if this does not exists
              country = new Country({code: c.short_name, name: c.long_name})
              country
                .save()
                .then(function(){
                  //Create new state with new country
                  state = new State({country: country, name: s.long_name, code: s.short_name});
                  state
                    .save()
                    .then(function(){
                      q.resolve({country: country, state: state});
                    }, function(e){
                      q.reject(e);
                    });
                }, function(e){
                  q.reject(e);
                });
            }
          }, function(e){
            q.reject(e);
          });
      }else{
        q.reject({message: 'No country/state found in the place given.'});
      }

      return q.promise;
    };


    return global;

}]);