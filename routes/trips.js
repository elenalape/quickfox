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

router.post('/new', function(req, res, next) {
	db.one("insert into trips (\"owner\", \"name\") values ($1, $2) returning id", [req.user.id, req.param("name")])
	.then(function(data) {
		res.redirect("/trips/"+data.id);
	})
	.catch(function(error) {
		console.log(error);
		res.send('error creating the shit')
	})
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
			console.log("not exist", error)
			next('route')
			return;
		})

	return;
}

router.get('/:id/', checkTrip, function(req, res, next) {
	res.redirect("/trips/"+req.params.id+"/guests")
});

router.post('/:id/archive', checkTrip, function(req, res, next) {
	db.none("update trips set archived=not archived where id=$1", req.trip.id)
	.then(function(data) {
		res.redirect("/trips/"+req.trip.id)
	})
	.catch(function(error) {
		console.log(error);
		res.send('failed to flip archive state');
	})
})

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
  		res.render('trip_guests', { title: 'Guests', user: req.user, trip:req.trip, guests:data });
	})
	.catch(function(error) {
		res.send('error getting guests');
		console.log(error)
	})
});

router.post('/:id/guests/add', checkTrip, function(req, res, next) {
	db.none("insert into trips_guests (\"trip\", \"guest\") values ($1,(select users.id from users where users.email=$2 limit 1))", [req.trip.id, req.param("email")])
	.then(function(data) {
		res.redirect("/trips/"+req.trip.id+"/guests")
	})
	.catch(function(error) {
		res.send('error adding guest');
		console.log(error)
	})
});

router.get('/:id/guests/del/:gd', checkTrip, function(req, res, next) {
	db.none("delete from trips_guests where trip=$1 and guest=$2", [req.trip.id, parseInt(req.params.gd)])
	.then(function(data) {
		res.redirect("/trips/"+req.trip.id+"/guests")
	})
	.catch(function(error) {
		res.send('error delling guests');
		console.log(error)
	})
});

router.get('/:id/destinations', checkTrip, function(req, res, next) {
	res.render('trip_destinations', { title: 'Destinations', user: req.user, trip:req.trip });
});

module.exports = router;
