var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');
// Stuff for multiuser support
var cookieParser = require('cookie-parser');
var session = require('client-sessions');
var bodyParser = require("body-parser");



/// Variable assignments
// The model object! Contains all non-archived items, both complete and open
var model = {
	openItems: [],
	completedItems: [],
	archivedItems: []
};

// Connect toMongoDB  database via Mongoose
mongoose.connect('mongodb://heroku_bksj92g6:77ehmrlo36tj9hl2jae87kdohv@ds051524.mongolab.com:51524/heroku_bksj92g6', function(err) {
	if (err) {
		throw err;
	} else {
		console.log("Connected to DB");
	}
});
// Abbrev.
// var db = mongoose.connection;

// Defining an item schema and assigning to collection
var itemSchema = mongoose.Schema({
	title: String,
	completed: Boolean,
	archived: Boolean,
	ownerID: String,
	timeStored: Date
}, {
	collection: 'items',
	versionKey: false
});
// Applying the above schema to 'Item' model
var Item = mongoose.model('Item', itemSchema);



// Defining a user schema and assigning to collection
var userSchema = mongoose.Schema({
	username: String,
	password: String,
	email: String
}, {
	collection: 'users',
	versionKey: false
});
// Applying the above schema to 'User' model
var User = mongoose.model('User', userSchema);


/// Server configuration (only when database connection is complete)

// Sets the static file folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
// Sets views folder and engine
app.set('views', __dirname + '/views')
app.set('view engine', 'jade');

// Use cookie-parser
// app.use(cookieParser());

// Use body parser
app.use(bodyParser.urlencoded({
	extended: false
}));




// var session = expressSession({
// 	cookieName: 'session',
// 	secret: "3oajbycfzh04m3ng99a71qot",
// 	duration: 30 * 60 * 1000,
// 	activeDuration: 5 * 60 * 1000,
// });
// app.use(session);

// io.use(function(socket, next) {
// 	var handshake = socket.handshake;
// 	if (handshake.headers.cookie) {
// 		var str = handshake.headers.cookie;
// 		next();
// 	} else {
// 		next(new Error('Missing Cookies'));
// 	}
// });



var secret = "3oajbycfzh04m3ng99a71qot";

var sessCookie = session({
	cookieName: 'session',
	secret: secret,
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
});

app.use(sessCookie);







// Send & response function

// set port
var port = (process.env.PORT || 5000);
server.listen(port, function() {
	console.log('Server now running...');
});

app.use(function(req, res, next) {
	if (req.session && req.session.user) {
		User.findOne({
			email: req.session.user.email
		}, function(err, user) {
			if (user) {
				req.user = user;
				delete req.user.password; // delete the password from the session
				req.session.user = user; //refresh the session value
				res.locals.user = user;
			}
			// finishing processing the middleware and run the route
			next();
		});
	} else {
		next();
	}
});


// Universal handler
app.all('*', function(req, res, next) {
	// res.cookie('username', 'arrow7000');
	next();
})


// Loads the page on http request
app.get('/login', function(req, res) {
	res.render('login', {
		error: ''
	});
});

// Login POST handler
app.post('/login', function(req, res) {

	// Finds username in database and compares it to stored password
	User.findOne({
		$or: [{
			username: req.body.username
		}, {
			email: req.body.username
		}]
	}, function(err, user) {
		if (!user) {
			res.render('login', {
				error: 'Username or password wrong. Please try again.'
			});
		} else {
			if (req.body.password === user.password) {
				req.session.user = user;
				// Sends user to app front page
				res.redirect('/');
			} else {
				res.render('login', {
					error: 'Username or password wrong. Please try again.'
				});
			}
		}
	});
});

app.get('/logout', function(req, res) {
	req.session.reset();
	res.redirect('/');
});


app.get('/', requireLogin, function(req, res) {

	// if (req.session && req.session.user) { // Check if session exists
	// 	// lookup the user in the DB by pulling their email from the session
	// 	console.log(req.session);
	// 	User.findOne({
	// 		username: req.session.user.username
	// 	}, function(err, user) {
	// 		if (!user) {
	// 			// if the user isn't found in the DB, reset the session info and
	// 			// redirect the user to the login page
	// 			req.session.reset();
	// 			res.redirect('/login');
	// 		} else {
	// 			// expose the user to the template
	// 			res.locals.user = user;

	// render the home page
	// console.log("Cookies: ", req.cookies)
	Item.find({
		ownerID: req.user._id
	}).sort('timeStored').exec(function(err, docs) {
		/// First sets the model object
		var activeItems = docs.filter(function(obj) {
			return obj.archived === false;
		});
		// Open items
		model.openItems = activeItems.filter(function(obj) {
			return obj.completed === false;
		});
		// Completed items
		model.completedItems = activeItems.filter(function(obj) {
			return obj.completed === true;
		});
		// Archived items
		model.archivedItems = docs.filter(function(obj) {
			return obj.archived === true;
		});

		// Reverse the completed items array, so that recent items appear first
		// model.completedItems.reverse();
		// Actually renders and sends the page, with the model object as the data
		res.render('index', model);
	});
	// 		}
	// 	});
	// } else {
	// res.redirect('/login');
	// }


});





// All other paths result in 404
app.get('*', function(req, res) {
	res.status(404).sendFile(__dirname + '/404.html');
});











/// Websocket connections and item change events

// Client connection event and content
io.on('connection', function(client) {
	// console.log(model);
	console.log('Websocket connected...');
	// console.log(locals);

	// syncModels(from, to);

	// client.emit('connectionUpdate', model);
	// console.log(model);






	// Item save event
	client.on('newItemSave', function(data) {
		console.log('Item submitted: ', data);
		// console.log("Sender ID: ", senderID(client, secret));
		Item.create({
			title: data.title,
			completed: false,
			archived: false,
			ownerID: senderID(client, secret),
			timeStored: Date.now()

		}, function(err, result) {
			if (err) return handleError(err);
			console.log('Saved: ', data);
			console.log("Result ID: ", result._id);
			io.emit('newItemSaved', {
					title: data.title,
					_id: result._id,
					index: data.index,
					tempID: data.tempID,
					ownerID: senderID(client, secret),
				}
				// result
			);
		});
	});

	// Item edit event
	client.on('itemEdit', function(data) {
		io.emit('itemEdited', data);

		Item.update({
			_id: data._id
		}, {
			$set: {
				title: data.title
			}
		}, function(err, result) {
			if (err) {
				console.log("Error", err);
			} else {
				console.log("item updated.", data);
			}
		});
	});

	// Item delete event
	client.on('itemDelete', function(data) {
		Item.remove({
			_id: data._id
		}, function() {
			console.log("Item " + data.title + " deleted.");
			io.emit('itemDeleted', data);
		});
	});

	// Item tick event
	client.on('itemTick', function(data) {
		Item.update({
			_id: data._id
		}, {
			$set: {
				completed: true
			}
		}, function() {
			console.log("Item ticked: ", data.title);
			io.emit('itemTicked', data);
		});
	});

	// Item untick event
	client.on('itemUntick', function(data) {
		Item.update({
			_id: data._id
		}, {
			$set: {
				completed: false
			}
		}, function() {
			console.log("Item unticked: ", data.title);
			io.emit('itemUnticked', data);
		});
	});

	// Item archive event
	client.on('itemArchive', function(data) {
		Item.update({
			_id: data._id
		}, {
			$set: {
				archived: true
			}
		}, function() {
			console.log("Item archived: ", data.title);
			io.emit('itemArchived', data);
		});
	});




	client.on('disconnect', function() {
		// Stuff to do on client disconnection event
		console.log("Websocket disconnected.");
	});

});










function syncModels(from, to) {
	to.openItems = from.openItems;
	to.completedItems = from.completedItems;
	to.archivedItems = from.archivedItems;
}

function genID() {
	var string = '';
	var chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
	for (var i = 0; i < 24; i++) {
		string += chars[Math.floor(Math.random() * chars.length)]
	}
	console.log(chars.length);
	return string;
}


function requireLogin(req, res, next) {
	if (!req.user) {
		res.redirect('/login');
	} else {
		next();
	}
};

function senderID(client, secret) {
	try {
		var sessionCookieString = client.request.headers.cookie.split("session=")[1];
		console.log("sessionCookieString: ", sessionCookieString);
		var user = session.util.decode({
			cookieName: "session",
			secret: secret
		}, sessionCookieString);
		console.log("user: ", user);

		// console.log("Cookie stored: Username: ", user.content.user.username);
		console.log("Cookie stored: User ID: ", user.content.user._id);
		return user.content.user._id;
	} catch (err) {
		console.log("No cookie stored.");
	}
}
