var http = require('http'),
	express = require('express'),
	connect = require('connect');

var sys = require('sys');

var app = express.createServer();

var async = require('async');

var rooms = require('./lib/rooms.js');
var data = require('./lib/data.js').db;

var sanitizer = require('sanitizer');

//Map of sids to user_names
var sids_to_user_names = [];

app.configure(function () {
	app.use(express.static(__dirname + '/client'));
	app.use(express.bodyParser());
	//app.use(express.cookieParser());

	//Cookies are not really needed... but may be in the future?
	app.use(express.cookieParser());
	app.use(
		express.session({
			key : "scrumscrum-cookie",
			secret : "kookoorikoo",
//			store: session_store,
			cookie : { path : '/', httpOnly : true, maxAge : 14400000 }
		})
	);

});

app.get('/', function (req, res) {
	//console.log(req.header('host'));
	url = req.header('host');
	res.render('home.jade', {
		layout : false,
		locals : {url : url}
	});
});

app.get('/demo', function (req, res) {
	res.render('index.jade', {
		locals : {pageTitle : 'scrumblr - demo', demo : true}
	});
});

app.get('/:id', function (req, res) {

	res.render('index.jade', {
		locals : {pageTitle : ('scrumblr - ' + req.params.id) }
	});
});

//SETUP ROUTES
app.post('/edit-card/:id', function (req, res) {
	//do nothing
	res.send(req.body.value);
});

app.post('/edit-column', function (req, res) {
	//do nothing
	res.send(req.body.value);
});

module.exports = app;