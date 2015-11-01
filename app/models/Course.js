var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var config = require('../../config');
 
var CourseSchema   = new Schema({

});


module.exports = mongoose.model('Course', CourseSchema);



