var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var pgp = require('pg-promise')(/*options*/)

var db = pgp(require('./private.db.js'))
express.db = db
var index = require('./routes/index');
var auth = require('./routes/auth');
var trips = require('./routes/trips');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var sess = {
  secret: 'keyboard cat',
  cookie: {}
}
var session = require('express-session')
app.use(session(sess))


app.use(function(req, res, next) {


	if (req.session.uid == null) {
		req.session.uid = 1;
		//// HARDCODE LOGIN ABOVE////////////////////////////////
		next()
		return;
	}

	db.one('select * from users where id=$1', req.session.uid)
		.then(function(data) {
			req.user = data;
			next()
		})
		.catch(function(error) {
			req.session.uid = undefined
			res.redirect("/auth/login")
			return;
		})

	return;
})

var requireAuth = function(req, res, next) {
	if (req.user == null) {
		res.redirect("/")
		return;
	}
	next()
}

app.use('/', index);
app.use('/auth', auth)
app.use('/trips', requireAuth, trips)


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

/*

---- User
-------- Owns a trip
-------- Is a guest of a trip


---- Trips (has name, whether it's archived or not)
-------- Manage guests
-------- Destinations
-------- 


------ Destinations
----------- Create new (by searching through skyfucker)
----------- Existing ones listed below
----------- Comments on destinations?
*/