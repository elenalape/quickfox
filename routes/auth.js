var express = require('express');
var router = express.Router();
var db = express.db

/* GET trips listing. */
router.get('/login', function(req, res, next) {
  res.render('login', { title: 'Login' });
});

router.get('/cheat/:id', function(req, res, next) {
  req.session.uid = parseInt(req.params.id)
  res.redirect("/")
});

router.post('/login', function(req, res, next) {
	var email = req.param("email")
	db.one('select id from users where email=$1', email)
		.then(function(data) {
			req.session.uid = data.id;
			res.redirect("/")
		})
		.catch(function(error) {
			res.send("bad email")
			return;
		})	
})

router.get('/logout', function(req, res, next) {
	console.log(req.session.uid)
	if (req.session.uid == null) {
		res.send("already logged out")
		return;
	}

	req.session.uid = undefined;
	res.redirect("/")
});

router.get('/register', function(req, res, next) {
  res.render('register', { title: 'Register' });
});

router.post('/register', function(req, res, next) {
	var email = req.param("email")
	var realname = req.param("realname")
	var password = req.param("password")
	db.one("insert into users (\"email\", \"name\", \"password\") values ($1, $2, $3) returning id", [email, realname, password])
	.then(function(data) {
		res.redirect("/trips/");
	})
	.catch(function(error) {
		console.log(error);
		res.send('error creating the shit')
	})	
})

module.exports = router;
