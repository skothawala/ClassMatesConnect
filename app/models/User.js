var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var config = require('../../config');
var bcrypt = require('bcrypt-nodejs');


var UserSchema   = new Schema({
	username: { type: String, required: true, index: { unique: true } },
	password: { type: String, required: true, select: false },
	email: { type: String, required: true, index: { unique: true } },
	bio: { type: String, default: "" },
	gender: {type: String, default: ""},
	major: {type: String, default: ""},
	created_at: { type: Date, default: Date.now },
  	updated_at: { type: Date, default: Date.now },
  	last_login: { type: Date, default: Date.now },
  	password_reset_hash: {type: String, default: ""},
  	number_of_logins: { type: Number, default: 0 },
  	account_status: { type: String, default: "new" }
});

// hash the password before the user is saved
UserSchema.pre('save', function(next) {
	var user = this;
	if (!user.isModified('password')) return next();
	now = new Date();
	this.updated_at = now;

	bcrypt.hash(user.password, null, null, function(err, hash) {
		if (err) return next(err);
		user.password = hash;
		next();
	});
});

UserSchema.methods.comparePassword = function(password) {
	var user = this;
	return bcrypt.compareSync(password, user.password);
};

module.exports = mongoose.model('User', UserSchema);


