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
	});
	
	coursesRouter.get('/search/:searchTerm', function(req, res) {
		
		Course.find({course_title: {$regex : ".*"+ req.params.searchTerm +".*", $options: "i" } }, function (err, courses) { 
			if(err)
				res.send(err)
			else
				res.json({courses: courses});
		});
	});

		// route middleware to verify a token for everything after this
	coursesRouter.use(function(req, res, next) {

	  // check header or url parameters or post parameters for token
	  var token = req.body.token || req.headers['x-access-token'];

	  // decode token
	  if(token){
	    // verifies secret and checks exp
	    jwt.verify(token, superSecret, function(err, decoded) {      
	      if (err) {
	        res.status(403).send({ 
	        	success: false, 
	        	message: 'Failed to authenticate token.' 
	    	});  	   
	      } else { 
	        // if everything is good, save to request for use in other routes
	        req.decoded = decoded;
	        next(); // make sure we go to the next routes and don't stop here
	      }
	    });
	  } else {
	    // if there is no token
	    // return an HTTP response of 403 (access forbidden) and an error message
   	 	res.status(403).send({
   	 		success: false,
   	 		message: 'No token provided.'
   	 	});
	  }
	});

	/**
		View more information regarding a course, given a course id
		@param courseId -> in url
		@return
			With students enrolled if the logged in student is in the class
				or
			Without students enrolled if the logged in student is in the class
	**/
	coursesRouter.get('/:courseId', function(req, res) {
		var username = req.decoded.username;
		var courseId = req.params.courseId;
		if(!username || !courseId)
			return res.status(404).json({success: false, message: "Params not found"});

		Course.findById(courseId).populate('students').exec(function(err, course){
			if(err)
				return res.status(406).json({success: false, error: err});
    		if(!course)
				return res.status(404).json({success: false, message: "Course not found: " + courseId});
			for (var i = course.students.length - 1; i >= 0; i--)
				if(course.students[i].username == username)
					return res.status(200).json({success: true, course: course, classmates: course.students});

			//reset course students, we don't want students who aren't in the class to see who else is enrolled.
			course.students = [];
			return res.status(200).json({success: true, course: course});
		});
	});

	/**
		View who else is in the class with you
		@param courseId -> in url
		@prereq The logged in student must be in class
	**/
	coursesRouter.get('/:courseId/classmates', function(req, res) {
		var username = req.decoded.username;
		var courseId = req.params.courseId;
		if(!username || !courseId)
			return res.status(404).json({success: false, message: "Params not found"});

		Course.findById(courseId).populate('students').exec(function(err, course){
			if(err)
				return res.status(406).json({success: false, error: err});
    		if(!course)
				return res.status(404).json({success: false, message: "Course not found: " + courseId});
			for (var i = course.students.length - 1; i >= 0; i--)
				if(course.students[i].username == username)
					return res.status(200).json({success: true, course: course, classmates: course.students});
		
			return res.status(406).json({success: false, error: "You are not enrolled in that class"});
		});
	});

	/**
		View posts in a class
		@param courseId -> in url
		@prereq The logged in student must be in class
	**/
	coursesRouter.get('/:courseId/posts', function(req, res) {
		var username = req.decoded.username;
		var courseId = req.params.courseId;
		if(!username || !courseId)
			return res.status(404).json({success: false, message: "Params not found"});

		Course.findById(courseId).select('posts students').populate('students').exec(function(err, course){
			if(err)
				return res.status(406).json({success: false, error: err});
    		if(!course)
				return res.status(404).json({success: false, message: "Course not found: " + courseId});
			for (var i = course.students.length - 1; i >= 0; i--)
				if(course.students[i].username == username)
					return res.status(200).json({success: true, posts: course.posts});
		
			return res.status(406).json({success: false, error: "You are not enrolled in that class"});
		});
	});

	/**
		View posts in a class
		@param courseId -> in JSON body of the request
		@param postBody -> in JSON body of the request
		@prereq The logged in student must be in class
	**/
	coursesRouter.post('/post', function(req, res) {
		var username = req.decoded.username;
		var courseId = req.body.courseId;
		var postBody = req.body.postBody;
		if(!username || !courseId || !postBody)
			return res.status(404).json({success: false, message: "Params not found"});

		Course.findById(courseId).select('posts students').populate('students').exec(function(err, course){
			if(err)
				return res.status(406).json({success: false, error: err});
    		if(!course)
				return res.status(404).json({success: false, message: "Course not found: " + courseId});
			for (var i = course.students.length - 1; i >= 0; i--){
				if(course.students[i].username == username){					
					course.posts.push({
						message: postBody,
						poster: course.students[i].id
					});
					course.save(function(err){
						if(err)
							return res.status(406).json({success: false, error: err});
						return res.status(200).json({success: true, message: "Posted", posts: course.posts});
					});
				}
			}//end for students
			return res.status(406).json({success: false, error: "You are not enrolled in that class"});
		});
	});



	/*
		Commented out because we don't want anyone to be able to add courses
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
	})*/

	
	return coursesRouter;
};


