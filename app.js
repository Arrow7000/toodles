var express = require('express');
var fs = require('fs');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

mongoose.connect('mongodb://heroku_bksj92g6:77ehmrlo36tj9hl2jae87kdohv@ds051524.mongolab.com:51524/heroku_bksj92g6', function(err) {
	if (err) {
		throw err;
	} else {
		console.log("Connected to DB");
	}
});
var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));

var itemSchema = mongoose.Schema({
	title: String,
	completed: Boolean
}, {
	collection: 'items',
	versionKey: false
});

var Item = mongoose.model('Item', itemSchema);


var itemCol, userCol, database, dbItems, openItems, completedItems;



// Client connection event and content
io.on('connection', function(client) {
	console.log('Client connected...');




	// Item save event
	client.on('newItemSave', function(data) {
		console.log('Item submitted: ', data);
		Item.create({
			title: data.title,
			completed: false
		}, function(err, result) {
			if (err) return handleError(err);
			console.log('Saved: ', data);
			console.log("Result ID: ", result.id);
			client.emit('newItemSaved', {
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
		});
	});


	client.on('disconnect', function() {
		// Stuff to do on client disconnection event
		console.log("Client disconnected.");
	});

});




var itemsList = [];
// itemsList = getItems();








app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.set('views', __dirname + '/views')
app.set('view engine', 'jade');

app.get('/', function(req, res) {
	Item.find({}, function(err, docs) {
		dbItems = docs
	});
	openItems = dbItems.filter(function(obj) {
		return obj.completed === false;
	});

	completedItems = dbItems.filter(function(obj) {
		return obj.completed === true;
	});

	res.render('index', {
		openItems: openItems,
		completedItems: completedItems
	});
});


app.get('*', function(req, res) {
	res.sendFile(__dirname + '/404.html');
});


var port = (process.env.PORT || 5000);

server.listen(port, function() {
	console.log('Server now running...');
});
