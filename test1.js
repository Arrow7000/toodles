var express = require('express');
var fs = require('fs');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');
mongoose.connect('mongodb://heroku_bksj92g6:77ehmrlo36tj9hl2jae87kdohv@ds051524.mongolab.com:51524/heroku_bksj92g6');

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));



var itemSchema = mongoose.Schema({
	title: String,
	completed: Boolean
});


var Item = mongoose.model('Item', itemSchema, {
	collection: 'items'
});








app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.set('views', __dirname + '/views')
app.set('view engine', 'jade');

app.get('/', function(req, res) {
	Item.find({}, function(err, docs) {
		res.render('test', {
			names: docs
		});
	});

});


app.get('*', function(req, res) {
	res.sendFile(__dirname + '/404.html');
});


var port = (process.env.PORT || 5000);

server.listen(port, function() {
	console.log('Server now running...');
});
