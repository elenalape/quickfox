var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	if (req.user == null) {
		res.redirect("/auth/login")
		return;
	}

	res.redirect("/trips")
});

module.exports = router;
