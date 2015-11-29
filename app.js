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
	ownerID: String
}, {
	collection: 'items',
	versionKey: false
});
// Applying the above schema to 'Item' model
var Item = mongoose.model('Item', itemSchema);



// Defining a user schema and assigning to collection
var userSchema = mongoose.Schema({
	username: String,
	password: String
}, {
	collection: 'users',
	versionKey: false
});
// Applying the above schema to 'User' model
var User = mongoose.model('User', userSchema);

// User.create({
// 	username: "arrow7000",
//  password: "hi"
// });


/// Server configuration (only when database connection is complete)

// Sets the static file folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
// Sets views folder and engine
app.set('views', __dirname + '/views')
app.set('view engine', 'jade');

// Use cookie-parser
app.use(cookieParser());

// Use body parser
app.use(bodyParser.urlencoded({
	extended: false
}));




app.use(session({
	cookieName: 'session',
	secret: "3oajbycfzh04m3ng99a71qot",
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
}));


// Send & response function

// set port
var port = (process.env.PORT || 5000);
server.listen(port, function() {
	console.log('Server now running...');
});

// Universal handler
app.all('*', function(req, res, next) {
	res.cookie('username', 'arrow7000');
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
		username: req.body.username
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


app.get('/', function(req, res) {

	Item.find({}, function(err, docs) {
		docs.ownerID = "565838326b2bf4c424ce851d";
	});


	if (req.session && req.session.user) { // Check if session exists
		// lookup the user in the DB by pulling their email from the session
		User.findOne({
			username: req.session.user.username
		}, function(err, user) {
			if (!user) {
				// if the user isn't found in the DB, reset the session info and
				// redirect the user to the login page
				req.session.reset();
				res.redirect('/login');
			} else {
				// expose the user to the template
				res.locals.user = user;

				// render the home page
				console.log("Cookies: ", req.cookies)
				Item.find({
					ownerID: "565838326b2bf4c424ce851d"
				}, function(err, docs) {
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
			}
		});
	} else {
		res.redirect('/login');
	}


});
















// All other paths result in 404
app.get('*', function(req, res) {
	res.status(404).sendFile(__dirname + '/404.html');
});









/// Websocket connections and item change events

// Client connection event and content
io.on('connection', function(client) {
	console.log(model);
	console.log('Websocket connected...');

	// syncModels(from, to);

	// client.emit('connectionUpdate', model);


	// Item save event
	client.on('newItemSave', function(data) {
		console.log('Item submitted: ', data);
		Item.create({
			title: data.title,
			completed: false,
			archived: false
		}, function(err, result) {
			if (err) return handleError(err);
			console.log('Saved: ', data);
			console.log("Result ID: ", result.id);
			io.emit('newItemSaved', {
				title: data.title,
				_id: result.id,
				index: data.index,
				tempID: data.tempID
			});
		});
	});

	// Item edit event
	client.on('itemEdit', function(data) {
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
				io.emit('itemEdited', data);
				// client.broadcast.emit('coopItemEdited', data);
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
