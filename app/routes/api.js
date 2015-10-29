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

	
	return apiRouter;
};