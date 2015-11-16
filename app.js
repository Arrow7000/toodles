var express = require('express');
var fs = require('fs');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
require('handlebars');

// MongoDB prerequisites
var mongodb = require('mongodb');
var mongclient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var mongurl = "mongodb://heroku_bksj92g6:77ehmrlo36tj9hl2jae87kdohv@ds051524.mongolab.com:51524/heroku_bksj92g6";

var itemCol, userCol, database, dbItems;



// Client connection event and content
io.on('connection', function(client) {
	console.log('Client connected...');

	// Connect to MongoDB
	mongclient.connect(mongurl, function(err, db) {
		database = db;
		if (err) {
			console.log("Can't connect to MongoDB. Error: ", err);
		} else {
			console.log("Connection to MongoDB established.");
			// Set collections
			itemCol = db.collection('items');
			userCol = db.collection('users');




			itemCol.find({
				// all - filtering will happen at client
			}).toArray(function(err, docs) {
				dbItems = docs;
				console.log('Item fetch success: ', docs);
				client.emit('pageLoadItemLoad', {
					list: dbItems
				});

			});






			// Item save event
			client.on('newItemSave', function(data) {
				console.log('Item submitted: ', data);

				itemCol.insert({
					title: data.title,
					completed: false
				}, function(err, result) {
					// console.log(result.ops);
					console.log('Saved: ', data);
					client.emit('newItemSaved', data);
				});
			});

			client.on('itemEdit', function(data) {
				itemCol.updateOne({
					_id: ObjectID(data._id)
				}, {
					$set: {
						title: data.title
					}
				}, function(err, result) {
					if (err) {
						console.log("Error", err);
					} else {
						console.log("item updated.");
						client.emit('itemEdited', data);
					}
				});
			});

			client.on('itemDelete', function(data) {
				itemCol.deleteOne({
					_id: ObjectID(data._id)
				}, function() {
					console.log("Item " + data.title + " deleted.");
					client.emit('itemDeleted', data);
				});
			});

			client.on('itemTick', function(data) {
				itemCol.updateOne({
					_id: ObjectID(data._id)
				}, {
					$set: {
						completed: true
					}
				}, function() {
					console.log("Item " + data.title + " ticked.");
					client.emit('itemTicked', data);
				});
			});


		}
	});
	client.on('disconnect', function() {
		// Stuff to do on client disconnection event
		console.log("Client disconnected.");
	});
});



var itemsList = [];
// itemsList = getItems();


var itemTest = {
	title: "Buy milk"
}







app.use("/", express.static(__dirname + "/"));

app.get('*', function(req, res) {
	res.sendFile(__dirname + '/404.html');
});


var port = (process.env.PORT || 5000);

server.listen(port, function() {
	console.log('Server now running...');
});
