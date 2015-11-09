var express = require('express');
var fs = require('fs');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
require('handlebars');

var mongodb = require('mongodb');


var mongclient = mongodb.MongoClient;
var mongurl = "mongodb://test_user:purplera1n@ds051524.mongolab.com:51524/heroku_bksj92g6";

mongclient.connect(mongurl, function(err, db) {
	if (err) {
		console.log("Can't connect to MongoDB. Error: ", err);
	} else {
		console.log("Connection to MongoDB established. URL: ", mongurl);



		db.close();
	}
});




var itemsList = [];
// itemsList = getItems();


var itemTest = {
	title: "Buy milk"
}




io.on('connection', function(client) {

	console.log('Client connected...');

	client.on('save', function(data) {
		console.log('Saved: ' + data.text);
		client.emit('saved', data);
	});

});


app.use("/", express.static(__dirname + "/"));

app.get('*', function(req, res) {
	res.sendFile(__dirname + '/404.html');
});


var port = (process.env.PORT || 5000);

server.listen(port, function() {
	console.log('Server running...');
});
