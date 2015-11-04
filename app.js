var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var redis = require('redis');
// var redisClient = redis.createClient();

io.on('connection', function(client) {
	console.log('Client connected...');
	client.emit('messages', {
		hello: 'world'
	});

	client.on('save', function(data) {
		console.log('Saved: ' + data.text);
		client.emit('saved', data);
	});
});


var storeMessage = function(name, data) {
	var message = JSON.stringify({});

}

app.get('*', function(req, res) {
	res.sendFile(__dirname + req.url);
});


server.listen(process.env.PORT);



////////////////////////////////
// Streamlined Heroku deployment


// var express = require('express');
// var server = require('http').Server(app);
// var app = express();
// var io = require('socket.io')(server);



// io.on('connection', function(client) {
// 	console.log('Client connected...');
// 	client.emit('messages', {
// 		hello: 'world'
// 	});

// 	client.on('save', function(data) {
// 		console.log('Saved: ' + data.text);
// 		client.emit('saved', data);
// 	});
// });



// app.set('port', (process.env.PORT || 5000));

// console.log(process.env);

// app.get('*', function(req, res) {
// 	res.sendFile(__dirname + req.url);
// });

// app.listen(app.get('port'), function() {
// 	console.log('Node app is running on port', app.get('port'));
// });
