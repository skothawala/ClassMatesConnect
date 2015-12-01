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

	var usersRouter = express.Router();


	usersRouter.get('/', function(req, res) {
		return res.json({message: 'Hello Users'})
	})

	/**
		Login and get an authentication token valid for 24 hrs
		@param username
		@param password
	**/
	usersRouter.post('/authenticate', function(req, res) {

		if(!req.body.username || !req.body.password)
				return res.status(404).json({success: false, message: "Please fill out all the fields"});

	  // find the user
	  User.findOne({
	    username: req.body.username
	  }).select('name username password email').exec(function(err, user) {

	  	if(err)	  		
			return res.status(406).json({success: false, error: err});

	    // no user with that username was found
	    if (!user) {
	      res.json({ 
	      	success: false, 
	      	message: 'Authentication failed. User: ' + req.body.username + ' not found.' 
	    	});
	    } else if (user) {
	      // check if password matches
	      var validPassword = user.comparePassword(req.body.password);
	      if (!validPassword) {
	        res.json({ 
	        	success: false, 
	        	message: 'Authentication failed. Wrong password.' 
	      	});
	      } else {

	        // if user is found and password is right
	        // create a token
	        var token = jwt.sign({
	        	name: user.name,
	        	username: user.username
	        }, superSecret, {
	          expiresInMinutes: 1440 // expires in 24 hours
	        });

	        // return the information including token as JSON
	        res.json({
	          success: true,
	          message: 'Token: ' + token,
	          token: token
	        });
	      }   

	    }

	  });
	});
	
	/**
		Register by adding a new user to the db
		@param username
		@param email
		@param password
	**/
	usersRouter.route('/register').post(function(req, res) {
		if(!req.body.username || !req.body.password || !req.body.email){
			res.status(406).send({
		 		success: false,
		 		message: 'Please provide all the necessary fields'
		 	});
		}else{
			var user = new User();
			_.extend(user,req.body);
			user.save(function(err) {
				if (err) {
					// duplicate entry
					if (err.code == 11000) 
						return res.status(406).json({ success: false, message: 'A user with that username or email already exists. '});
					else 
						return res.status(406).json({success: false, error: err});
				}
				res.json({ message: 'User created!' });
			});
		}
		
	});
	
	/**
		Get a users profile
		@param username in the url
	**/
	usersRouter.get('/profile/:username', function(req, res){
		User.findOne({ 'username': req.params.username }, 'id username email bio created_at', function (err, user) {
		 	if(err)	  		
				return res.status(406).json({success: false, error: err});
			else if(!user)
				return res.status(404).json({success: false, message: "User not found"});
			else
				return res.status(200).json({success: true, user: user});
		})

	});

	// route middleware to verify a token for everything after this
	usersRouter.use(function(req, res, next) {

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

	//used for jwt
	usersRouter.get('/me', function(req, res) {		
		if(!req.decoded.username)
			return res.status(404).json({success: false, message: "Param username not found"});

		User.findOne({ 'username': req.decoded.username }, function (err, user) {
			if (err) {
				return res.send(err);
			}else if(!user){
				return res.status(404).json({success: false, message: "User not found"});
			}else{
				
				req.decoded.profile = user;				
				return res.send(req.decoded);
			}
		})
	});
	
	/**
		Add a course
		@param courseId -> courseID to add
	**/
	usersRouter.post('/addCourse', function(req, res){
		var username = req.decoded.username;
		var courseId = req.body.courseId;
		if(!username || !courseId)
			return res.status(404).json({success: false, message: "Params not found"});

		User.findOne({username: username}).select('courses').exec(function(err, user){
			if(err)
				return res.status(406).json({success: false, error: err});
	    	if(!user)
				return res.status(404).json({success: false, message: "User not found: " + username});

			Course.findById(courseId, function(err, course){
				if(err)
					return res.status(406).json({success: false, error: err});
	    		if(!course)
					return res.status(404).json({success: false, message: "Course not found: " + courseId});

				course.students.push(user.id);
				course.save(function(err){
					if(err)
						return res.status(406).json({success: false, error: err});
	    			user.courses.push(course.id);
	    			user.save(function(err){
	    				if(err)
							return res.status(406).json({success: false, error: err});
						else
							return res.status(200).json({success: true, message: "Course added"});
	    			});//end user save
				});//end course save
			});///course find
		});//end user find
	});//end post /addCourse
	
	/**
		Retrieves courses the logged in student is enrolled in
		@return array of courses
			{ "success": true, "message": { "_id": "", "courses": [ ... ] } }
	**/
	usersRouter.get('/myCourses', function(req, res){
		var username = req.decoded.username;
		if(!username)
			return res.status(404).json({success: false, message: "Params not found"});

		User.findOne({username: username}).select('courses').populate('courses').exec(function(err, user){
			if(err)
				return res.status(406).json({success: false, error: err});
	    	if(!user)
				return res.status(404).json({success: false, message: "User not found: " + username});

			return res.status(200).json({success: true, message: user});

		});
		
	});


	
	usersRouter.get('/settings', function(req, res){
		var username = req.decoded.username;
		if(!username)
			return res.status(404).json({success: false, message: "Params user not found" + username});

		User.findOne({ 'username': username }).select('settings bio').exec(function (err, user) {
			if (err) throw err;
	    	if(!user)
				return res.status(404).json({success: false, message: "User not found " + username});

			return res.status(200).json({success: true, settings: user.settings, bio: user.bio});
		});
	});


	usersRouter.post('/settings', function(req, res){
		console.log(req.body);
		var username = req.decoded.username;
		if(!username)
			return res.status(404).json({success: false, message: "Params user not found" + username});

		User.findOne({ 'username': username }).select('settings').exec(function(err, user) {
			if (err) 
				return res.status(406).json({success: false, error: err});
	    	
	    	if(!user)
				return res.status(404).json({success: false, message: "User not found: " + username});
			/*for (var i = req.body.settings.length - 1; i >= 0; i--) {
				for(var key in req.body.settings[i]){
					if(key != "type")				
						user.setSetting(key, req.body.settings[i][key])
						console.log(key + "\t" + req.body.settings[i][key]); //->key is printed
				}
			}*/
			if(req.body.bio.length <= 400)
				user.bio = req.body.bio;
			user.save();
			return res.status(200).json({success: true, message: "Settings have been updated"});
		});
	});

	/**
		Upload a user's avatar
	**/
	usersRouter.post('/avatar', multipartMiddleware, function(req, res){
		var username = req.decoded.username;
		if(!username)
			return res.status(404).json({success: false, message: "Params user not found" + username});

		var file = req.files.file;
		if(file.type.indexOf('image') == -1)
			return res.status(406).json({success: false, message: "Please upload an image"});

		fs.readFile(req.files.file.path, function (err, data) {
			if(err)
				return res.status(406).send(err);

			var newPath = __dirname + "/../../../uploads/" + req.decoded.username; //+ path.extname(file.name);
			fs.writeFile(newPath, data, function (err) {
				if(err)				
					return res.status(406).send(err);
				fs.unlink(req.files.file.path, function (err) {
					if (err) 
						throw err;//don't want to tell user that we had trouble deleteing temp file, just throw it
					return res.status(200).json({success: true, message: "Avatar has been updated"});
				});//end fs.unlink
			});//end fs.write
		});//end fs.read
	});//end /avatar

	/**
		Change your password
		@param password -> new password
	**/
	usersRouter.post('/password', function(req, res){
		var username = req.decoded.username;
		var password = req.body.username;
		if(!username || !password)
			return res.status(404).json({success: false, message: "Params not found" + username});

		User.findOne({username: username}).select('password email').exec(function(err, user){
			if(err)
				return res.status(406).json({success: false, error: err});
	    	if(!user)
				return res.status(404).json({success: false, message: "User not found: " + username});

			user.password = password;
			user.save(function (err){
				if(err)
					return res.status(406).json({success: false, error: err});

				return res.status(200).json({success: true, message: "Password changed"})
			});
		});
	});

	
	return usersRouter;
};


