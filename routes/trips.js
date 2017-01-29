var express = require('express');
var router = express.Router();
var db = express.db

/* GET trips listing. */
router.get('/', function(req, res, next) {

	db.any("select distinct on (trips.id) trips.* from users,trips,trips_guests where (users.id=$1) and ((trips.owner = users.id) or (trips_guests.trip=trips.id and trips_guests.guest=users.id))", req.user.id)
	.then(function(data) {
  		res.render('trips', { title: 'Your trips', user: req.user, trips:data });
	})
	.catch(function(error) {
		res.send('error getting trips');
		console.log(error)
	})
  // res.send('list trips');
});

router.get('/new', function(req, res, next) {
  res.render('trips_new', { title: "New trip", user: req.user });
});

var checkTrip = function(req, res, next) {
	var num = parseInt(req.params.id);
	if (isNaN(num)) {
		next('route')
		return;
	}

	db.one('select * from trips where id=$1', num)
		.then(function(data) {
			req.trip = data;
			next()
		})
		.catch(function(error) {
			console.log(error)
			next('route')
			return;
		})

	return;
}

router.get('/:id/', checkTrip, function(req, res, next) {
	res.redirect("/trips/"+req.params.id+"/guests")
});

router.get('/:id/guests', checkTrip, function(req, res, next) {
  
	db.any("select distinct on (users.id) users.* from users,trips,trips_guests where (trips.id=$1) AND ((trips.owner = users.id) or ((trips_guests.trip=$1)and(trips_guests.guest=users.id)))", req.trip.id)
	.then(function(data) {
		for (var i = data.length - 1; i >= 0; i--) {
			var guest = data[i];
			if (req.trip.owner == guest.id) {
				guest.isOwner = true;
			}
			if (req.user.id == guest.id) {
				guest.isMe = true;
			}
		}
  		res.render('trips_guests', { title: 'Your trips', user: req.user, trip:req.trip, guests:data });
	})
	.catch(function(error) {
		res.send('error getting guests');
		console.log(error)
	})


});
router.get('/:id/destinations', checkTrip, function(req, res, next) {
  res.send('trip ' + req.params.id + " destinations");
});

module.exports = router;
