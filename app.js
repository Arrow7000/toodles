var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

// Connect toMongoDB  database via Mongoose
mongoose.connect('mongodb://heroku_bksj92g6:77ehmrlo36tj9hl2jae87kdohv@ds051524.mongolab.com:51524/heroku_bksj92g6', function(err) {
	if (err) {
		throw err;
	} else {
		console.log("Connected to DB");
	}
});
// Abbrev.
var db = mongoose.connection;

// Defining a schema and assigning to collection
var itemSchema = mongoose.Schema({
	title: String,
	completed: Boolean,
	archived: Boolean
}, {
	collection: 'items',
	versionKey: false
});
// Applying the above schema to 'Item' model
var Item = mongoose.model('Item', itemSchema);


var openItems, completedItems;



// Client connection event and content
io.on('connection', function(client) {
	console.log('Websocket connected...');




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
			client.emit('newItemSaved', {
				title: data.title,
				_id: result.id
			});
			// console.log(io.broadcast.emit);
			client.broadcast.emit('coopNewItemSaved', {
				title: data.title,
				_id: result.id
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
				client.emit('itemEdited', data);
				client.broadcast.emit('coopItemEdited', data);
			}
		});
	});

	// Item delete event
	client.on('itemDelete', function(data) {
		Item.remove({
			_id: data._id
		}, function() {
			console.log("Item " + data.title + " deleted.");
			client.emit('itemDeleted', data);
			client.broadcast.emit('coopItemDeleted', data);
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
			client.emit('itemTicked', data);
			client.broadcast.emit('coopItemTicked', data);
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
			client.emit('itemUnticked', data);
			client.broadcast.emit('coopItemUnticked', data);
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
			client.emit('itemArchived', data);
			client.broadcast.emit('coopItemArchived', data);
		});
	});


	client.on('disconnect', function() {
		// Stuff to do on client disconnection event
		console.log("Websocket disconnected.");
	});

});







// Sets the static file folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));




// Sets views folder and engine
app.set('views', __dirname + '/views')
app.set('view engine', 'jade');

// Send/response function
app.get('/', function(req, res) {
	Item.find({
		archived: false
	}, function(err, docs) {
		openItems = docs.filter(function(obj) {
			return obj.completed === false;
		});
		completedItems = docs.filter(function(obj) {
			return obj.completed === true;
		});

		// Actually renders and sends the page
		res.render('index', {
			openItems: openItems,
			completedItems: completedItems
		});

	});


});

// All other paths result in 404
app.get('*', function(req, res) {
	res.status(404).sendFile(__dirname + '/404.html');
});


var port = (process.env.PORT || 5000);

server.listen(port, function() {
	console.log('Server now running...');
});
