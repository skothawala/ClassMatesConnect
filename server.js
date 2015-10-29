var express    = require('express');
var app        = express();
var bodyParser = require('body-parser');
var mongoose   = require('mongoose');
var config     = require('./config');
var path       = require('path');
var fs 		   = require('fs');


// use body parser to grab information from POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure our app to handle CORS requests
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
  next();
});


//make sure database connection is active and connect
mongoose.connect(config.database);


// API ROUTES ------------------------
var apiRoutes = require('./app/routes/api')(app, express);
app.use('/api', apiRoutes);


//evrything else
app.get('*', function(req, res) {
	res.json({ message: 'Use Endpoint: /api' });	
});


//start the server
var port = process.env.PORT || config.port;//for heroku
app.listen(port);
console.log('Server running at: http://localhost:' + port);


