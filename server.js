/**************
 SYSTEM INCLUDES
**************/
var	http = require('http');
var sys = require('sys');
var	async = require('async');
var sanitizer = require('sanitizer');
var compression = require('compression');
var express = require('express');
var conf = require('./config.js').server;
var ga = require('./config.js').googleanalytics;

/**************
 LOCAL INCLUDES
**************/
var	data	= require('./lib/data.js').db;

/**************
 GLOBALS
**************/
//Map of sids to user_names
var sids_to_user_names = [];

/**************
 SETUP EXPRESS
**************/
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');

app.use(compression());
app.use(conf.baseurl, router);
app.use(bodyParser.json());

app.locals.ga = ga.enabled;
app.locals.gaAccount = ga.account;

router.use(express.static(__dirname + '/client'));

var server = require('http').Server(app);
server.listen(conf.port);

console.log('Server running at http://127.0.0.1:' + conf.port + '/');

/**************
 SETUP Socket.IO
**************/
var io = require('socket.io')(server, {
	path: conf.baseurl == '/' ? '' : conf.baseurl + "/socket.io"
});

const defaultNamespace = io.of('/');

/**************
 ROUTES
**************/
router.get('/', function(req, res) {
	//console.log(req.header('host'));
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('home.jade', {
		url: url,
		connected: clientsCount
	});
});


router.get('/demo', function(req, res) {
	res.render('index.jade', {
		pageTitle: 'scrumblr - demo',
		demo: true
	});
});

router.get('/:id', function(req, res){
	res.render('index.jade', {
		pageTitle: ('scrumblr - ' + req.params.id)
	});
});

app.post('/:id/card', async function(req, res) {
	const clean_data = req.body
	const room = `/${req.params.id}`
	
	createCard(room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour);

	message_out = {
		action: 'createCard',
		data: clean_data
	};

	io.to(room).send(message_out)
	res.send(200, {status: 'ok'})
})


/**************
 SOCKET.I0
**************/
defaultNamespace.on('connection', function (client) {
	//santizes text
	function scrub( text ) {
		if (typeof text != "undefined" && text !== null)
		{
			//clip the string if it is too long
			if (text.length > 65535)
			{
				text = text.substr(0,65535);
			}
			return sanitizer.sanitize(text);
		}
		else
		{
			return null;
		}
	}

	client.on('message', function( message ){
		var clean_data = {};
		var clean_message = {};
		var message_out = {};

		if (!message.action)	return;

		const room = Object.keys(client.rooms).filter(room => room.startsWith('/'))[0]
		switch (message.action)
		{
			case 'initializeMe':
				initClient(client);
				break;

			case 'joinRoom':
				client.join(message.data, (err) => {
					client.json.send( { action: 'roomAccept', data: '' } );
				})
				break;

			case 'moveCard':
				//report to all other browsers
				message_out = {
					action: message.action,
					data: {
						id: scrub(message.data.id),
						position: {
							left: scrub(message.data.position.left),
							top: scrub(message.data.position.top)
						}
					}
				};

				client.to(room).send(message_out)
				db.cardSetXY( room , message.data.id, message.data.position.left, message.data.position.top);
				break;

			case 'createCard':
				data = message.data;
				clean_data = {};
				clean_data.text = scrub(data.text);
				clean_data.id = scrub(data.id);
				clean_data.x = scrub(data.x);
				clean_data.y = scrub(data.y);
				clean_data.rot = scrub(data.rot);
				clean_data.colour = scrub(data.colour);
				createCard( room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour);
				message_out = {
					action: 'createCard',
					data: clean_data
				};

				client.to(room).emit('message', message_out)
				break;

			case 'editCard':
				clean_data = {};
				clean_data.value = scrub(message.data.value);
				clean_data.id = scrub(message.data.id);
				db.cardEdit( room , clean_data.id, clean_data.value );
				message_out = {
					action: 'editCard',
					data: clean_data
				};

				client.to(room).send(message_out)
				break;

			case 'deleteCard':
				clean_message = {
					action: 'deleteCard',
					data: { id: scrub(message.data.id) }
				};
				db.deleteCard ( room, clean_message.data.id );
				client.to(room).send(clean_message)
				break;

			case 'createColumn':
				clean_message = { data: scrub(message.data) };
				db.createColumn( room, clean_message.data, function() {} );
				client.to(room).send(message_out)
				break;

			case 'deleteColumn':
				db.deleteColumn(room);
				client.to(room).send({ action: 'deleteColumn' })
				break;

			case 'updateColumns':
				var columns = message.data;
				if (!(columns instanceof Array))
					break;
				var clean_columns = [];
				for (var i in columns)
				{
					clean_columns[i] = scrub( columns[i] );
				}
				db.setColumns( room, clean_columns );
				client.to(room).send( { action: 'updateColumns', data: clean_columns })
				break;

			case 'changeTheme':
				clean_message = {};
				clean_message.data = scrub(message.data);
				db.setTheme( room, clean_message.data );
				clean_message.action = 'changeTheme';
				client.to(room).send(clean_message)
				break;

			case 'setUserName':
				clean_message = {};
				clean_message.data = scrub(message.data);
				setUserName(client, clean_message.data);

				var msg = {};
				msg.action = 'nameChangeAnnounce';
				msg.data = { sid: client.id, user_name: clean_message.data };
				client.to(room).send(msg)
				break;

			case 'addSticker':
				var cardId = scrub(message.data.cardId);
				var stickerId = scrub(message.data.stickerId);
				db.addSticker( room , cardId, stickerId );
				client.to(room).send({ action: 'addSticker', data: { cardId: cardId, stickerId: stickerId }});
				break;

			case 'setBoardSize':
				var size = {};
				size.width = scrub(message.data.width);
				size.height = scrub(message.data.height);
				db.setBoardSize( room, size );
				client.to(room).send({ action: 'setBoardSize', data: size } );
				break;

			default:
				//console.log('unknown action');
				break;
		}
	});

	client.on('disconnect', function() {
			leaveRoom(client);
	});
  //tell all others that someone has connected
  //client.broadcast('someone has connected');
});


/**************
 FUNCTIONS
**************/
function initClient ( client )
{
	//console.log ('initClient Started');
	const room = Object.keys(client.rooms).filter(room => room.startsWith('/'))[0]
		db.getAllCards( room , function (cards) {
			client.json.send(
				{
					action: 'initCards',
					data: cards
				}
			);

		});

		db.getAllColumns ( room, function (columns) {
			client.json.send(
				{
					action: 'initColumns',
					data: columns
				}
			);
		});

		db.getTheme( room, function(theme) {
			if (theme === null) theme = 'bigcards';

			client.json.send(
				{
					action: 'changeTheme',
					data: theme
				}
			);
		});

		db.getBoardSize( room, function(size) {
			if (size !== null) {
				client.json.send(
					{
						action: 'setBoardSize',
						data: size
					}
				);
			}
		});
		// send all users in a room to the client
}


function joinRoom (client, room, successFunction)
{
	var msg = {};
	msg.action = 'join-announce';
	msg.data = { sid: client.id, user_name: client.user_name };
	rooms.add_to_room_and_announce(client, room, msg);
	successFunction();
}

function leaveRoom (client)
{
	var msg = {};
	msg.action = 'leave-announce';
	msg.data = { sid: client.id };
	// TODO - implement leaving a room - rooms.remove_from_all_rooms_and_announce(client, msg);

	delete sids_to_user_names[client.id];
}

//----------------CARD FUNCTIONS
function createCard( room, id, text, x, y, rot, colour ) {
	var card = {
		id: id,
		colour: colour,
		rot: rot,
		x: x,
		y: y,
		text: text,
		sticker: null
	};

	db.createCard(room, id, card);
}

function roundRand( max )
{
	return Math.floor(Math.random() * max);
}


function setUserName ( client, name )
{
	client.user_name = name;
	sids_to_user_names[client.id] = name;
	//console.log('sids to user names: ');
	console.dir(sids_to_user_names);
}

function cleanAndInitializeDemoRoom()
{
	// DUMMY DATA
	db.clearRoom('/demo', function() {
		db.createColumn( '/demo', 'Not Started' );
		db.createColumn( '/demo', 'Started' );
		db.createColumn( '/demo', 'Testing' );
		db.createColumn( '/demo', 'Review' );
		db.createColumn( '/demo', 'Complete' );


		createCard('/demo', 'card1', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card2', 'Hello this is a new story.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'white');
		createCard('/demo', 'card3', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('/demo', 'card4', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');

		createCard('/demo', 'card5', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card6', 'Hello this is a new card.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card7', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('/demo', 'card8', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');
	});
}
//

/**************
 SETUP DATABASE ON FIRST RUN
**************/
// (runs only once on startup)
var db = new data(function() {
	cleanAndInitializeDemoRoom();
});
