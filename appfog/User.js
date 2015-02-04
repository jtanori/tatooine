var Parse = require('parse').Parse;

//Extend Parse user
module.exports = Parse.User.extend({
	getPrivileges: function(){
		console.log('get privileges', this.toJSON());
		return true;
	}
});