var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var config = require('../../config');


var PostsSchema = new Schema ({
	message: {type: String},
    poster: {type: Schema.ObjectId, ref: 'User'},
	date_posted: { type: Date, default: Date.now }
});

var CourseSchema   = new Schema({
	subject: {type: String},
	career: {type: String},
	catalog_number: {type: Number},
	section_number: {type: Number},
	course_title: {type: String},
	intstructor: {type: String},
	intstructor_email: {type: String},
	campus: {type: String},
	building: {type: String},
	room_number: {type: String},
	meeting_patern: {type: String},
	start_time: {type: String},
	end_time: {type: String},
	posts: [PostsSchema],
	students: [{type: Schema.ObjectId, ref: 'User'}],
	date_added: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);


