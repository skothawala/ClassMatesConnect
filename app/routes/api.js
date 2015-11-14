var bodyParser = require('body-parser');
var jwt        = require('jsonwebtoken');
var config     = require('../../config');
var _ = require('underscore');

// super secret for creating tokens
var superSecret = config.secret;

module.exports = function(app, express) {

	var apiRouter = express.Router();

	apiRouter.get('/', function(req, res) {
		res.json({ message: 'Hello' });	
	});
	
	var userRoutes = require(__dirname + "/api/users")(app, express);
	app.use('/api/users', userRoutes);
	
	var coursesRouter = require(__dirname + "/api/courses")(app, express);
	app.use('/api/courses', coursesRouter);
	
	return apiRouter;
};