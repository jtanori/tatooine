'use strict'; 

var Parse = require('parse').Parse;
var md5 = require('MD5');

//Extend Parse user
var User = Parse.User.extend({
	getDisplayName: function(){
		var name = this.escape('name') ? this.escape('name') : this.escape('username') ? this.escape('username') : 'Joundini';

		return name;
	},
	getAvatar: function(){
		if(this.get('avatar')){
			return this.get('avatar').get('file').url();
		}else{
			return '//www.gravatar.com/avatar/' + md5(this.get('username'))
		}
	},
	getBasicData: function(){
		var data = {
			id: this.id,
			username: this.get('username'),
			email: this.get('email'),
			displayName: User.prototype.getDisplayName.call(this),
			settings: this.get('settings'),
			avatar: User.prototype.getAvatar.call(this),
			name: this.get('name'),
			lastName: this.get('lastName')
		}

		return data;
	}
});

module.exports = User;