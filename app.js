var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

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




/// Server configuration (only when database connection is complete)

// Sets the static file folders
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));
// Sets views folder and engine
app.set('views', __dirname + '/views')
app.set('view engine', 'jade');
// Send & response function

// set port
var port = (process.env.PORT || 5000);
server.listen(port, function() {
	console.log('Server now running...');
});
app.get('/', function(req, res) {

	Item.find({}, function(err, docs) {
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



});

// All other paths result in 404
app.get('*', function(req, res) {
	res.status(404).sendFile(__dirname + '/404.html');
});









/// Websocket connections and item change events

// Client connection event and content
io.on('connection', function(client) {
	console.log('Websocket connected...');

	// syncModels(from, to);

	client.emit('connectionUpdate', model);
	// console.log(model);






	// New revamped events that occur on server when items are changed
	// client.on('newItemSave', function(data) {
	// 	// body...
	// });
	// client.on('itemChange', function(data) {
	// 	Item.update({
	// 		_id: data._id
	// 	}, {
	// 		$set: {
	// 			title: data.title
	// 		}
	// 	}, function(err, result) {
	// 		if (err) {
	// 			console.log("Error", err);
	// 		} else {
	// 			console.log("item updated.", data);
	// 			client.emit('itemEdited', data);
	// 			client.broadcast.emit('coopItemEdited', data);
	// 		}
	// 	});
	// });
	// client.on('itemDelete', function(data) {
	// 	// body...
	// });






	// Update server model
	// syncModels(from, to);

	// Send out updated model to all clients


	// Server job finished. Now client does the rest. 








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
