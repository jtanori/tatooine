'use strict'; 

var Parse = require('parse').Parse;

//Extend Parse user
var User = Parse.User.extend({
	getDisplayName: function(){
		var name = this.escape('name') ? this.escape('name') : this.escape('username') ? this.escape('username') : 'Joundini';

		return name;
	},
	getBasicData: function(){
		var data = {
			id: this.id,
			username: this.get('username'),
			email: this.get('email'),
			displayName: User.prototype.getDisplayName.call(this),
			settings: this.get('settings'),
			avatar: this.get('avatar'),
			name: this.get('name'),
			lastName: this.get('lastName')
		}

		return data;
	}
});

module.exports = User;