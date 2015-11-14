var bodyParser = require('body-parser');
var User       = require('../../models/User');
var Course       = require('../../models/Course');
var jwt        = require('jsonwebtoken');
var config     = require('../../../config');
var _ 		   = require('underscore');
var util       = require('util');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var fs = require('fs');
var path = require('path');
// super secret for creating tokens
var superSecret = config.secret;


module.exports = function(app, express) {

	var coursesRouter = express.Router();


	coursesRouter.get('/', function(req, res) {
		return res.json({message: 'Hello Courses'})
	})
	
	coursesRouter.get('/search/:searchTerm', function(req, res) {
		
		Course.find({course_title: {$regex : ".*"+ req.params.searchTerm +".*", $options: "i" } }, function (err, courses) { 
			if(err)
				res.send(err)
			else
				res.json({courses: courses});
		})
		
	})

	coursesRouter.post('/add', function (req, res) {
		var course = new Course();
			_.extend(course,req.body);
			course.save(function(err) {
				if (err) {
					// duplicate entry
					return res.status(406).json({success: false, error: err});
				}
				res.json({ message: 'Course created!' });
			});
	})

	
	return coursesRouter;
};


