var express = require('express');
var router = express.Router();
var db = express.db
var request = require('request');

var tripList = function(req, res, next, layout) {

	db.any("select distinct on (trips.id) trips.* from users,trips,trips_guests where (users.id=$1) and ((trips.owner = users.id) or (trips_guests.trip=trips.id and trips_guests.guest=users.id))", req.user.id)
	.then(function(data) {
  		res.render(layout, { title: 'Your trips', user: req.user, trips:data });
	})
	.catch(function(error) {
		res.send('error getting trips');
		console.log(error)
	})
}

/* GET trips listing. */
router.get('/', function(req, res, next) {
	tripList(req, res, next, "trips")
  // res.send('list trips');
});

router.get('/current', function(req, res, next) {
	tripList(req, res, next, "current")
  // res.send('list trips');
});

router.get('/archive', function(req, res, next) {
	tripList(req, res, next, "archive")
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
	res.render('trip_plan', { title: 'Plan', user: req.user, trip:req.trip });
});

router.post('/:id/archive', checkTrip, function(req, res, next) {
	db.none("update trips set archived=not archived where id=$1", req.trip.id)
	.then(function(data) {
		res.redirect("/trips/"+req.trip.id+"/guests")
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
  
	db.any("select * from destinations where trip=$1", req.trip.id)
	.then(function(data) {
		
  		res.render('trip_destinations', { title: 'Destinations', user: req.user, trip:req.trip, destinations:data });
	})
	.catch(function(error) {
		res.send('error getting dests');
		console.log(error)
	})
});







///// shitty searching code heree


router.post('/:id/search', checkTrip, function(req, res, next) {
	var dest = req.param('destination');
	var out = req.param("outbound");
	var date = req.param('outdate');
	

	findDestinations(req, res, out, dest, function(out_ss, dest_ss) {
		if (out_ss === false) {
			res.render('trip_search', {title: "Search destinations", user: req.user, trip:req.trip, searchFailed:true});
			return;
		}

		console.log("Outbound data:", out_ss)
		console.log("Destination data:", dest_ss)

		var fields = {
			dest:dest_ss,
			out:out_ss,
			date:date
		}
		res.render('trip_search', {title: "Search destinations", user: req.user, trip:req.trip, fields:fields});
	})
})









// shitty code galore
function findDestinations(req, res, out, dest, callback) {
	var outties = null;
	var destties = null;

	request(
		"http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/UK/GBP/en-GB?query="
		+ encodeURIComponent(dest) + "&apiKey=" + express.sskey,

		function (error, response, body) {
	  		if (error || response.statusCode != 200) {
	  			callback(false);
	  			return
	  		}

	    	console.log("Destination code", body) // Show the HTML for the Google homepage. 

	    	destties = JSON.parse(body)
	    	if (destties == null) {
				callback(false);
	    		return
	    	}

	    	if (destties.Places == null) {
				callback(false);
	    		return
	    	}

	    	if (destties.Places[0] == null) {
				callback(false);
	    		return
	    	}



	    	// console.log(destties.Places)

	    	////////////////////////
			request(
				"http://partners.api.skyscanner.net/apiservices/autosuggest/v1.0/UK/GBP/en-GB?query="
				+ encodeURIComponent(out) + "&apiKey=" + express.sskey,

				function (error, response, body) {
			  		if (error || response.statusCode != 200) {
			  			callback(false);
			  			return
			  		}

			    	console.log("Outbound code", body) // Show the HTML for the Google homepage. 

			    	outties = JSON.parse(body)
			    	if (outties == null) {
						callback(false);
			    		return
			    	}

			    	if (outties.Places == null) {
						callback(false);
			    		return
			    	}

			    	if (outties.Places[0] == null) {
						callback(false);
			    		return
			    	}


			    	// console.log(outties.Places)

			    	
					callback(outties.Places[0], destties.Places[0]);
			  	}
			)
	  	}
	)
}
module.exports = router;
