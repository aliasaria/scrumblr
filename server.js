/**************
 SYSTEM INCLUDES
**************/
var	http = require('http');
var sys = require('util');
var	async = require('async');
var sanitizer = require('sanitizer');
var compression = require('compression');
var express = require('express');
var conf = require('./config.js').server;
var ga = require('./config.js').googleanalytics;

/**************
 LOCAL INCLUDES
**************/
var	rooms	= require('./lib/rooms.js');
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

app.set('view engine', 'pug');

app.use(compression());
app.use(conf.baseurl, router);

app.locals.ga = ga.enabled;
app.locals.gaAccount = ga.account;

router.use(express.static(__dirname + '/client'));

var server = require('http').Server(app);

/**************
 SETUP Socket.IO
**************/
// var io = require('socket.io')(server, {
// 	path: conf.baseurl == '/' ? '' : conf.baseurl + "/socket.io"
// });
// We move socket.io from it's default URL (/socket.io) to (/socketio) because during
// the upgrade to new socket.io, old clients on production server were hitting old
// URL and crashing the server.
const options = { path: '/socketio' };
const io = require('socket.io')(server, options);

server.listen(conf.port);
console.log('Server running at port:' + conf.port + '/');


/**************
 ROUTES
**************/
router.get('/', function(req, res) {
	//console.log(req.header('host'));
	var url = req.header('host') + req.baseUrl;

	var clientsCount = io.of("/").sockets.size;

	res.render('home.pug', {
		url: url,
		connected: clientsCount
	});
});


router.get('/demo', function(req, res) {
	res.render('index.pug', {
		pageTitle: 'scrumblr - demo',
		demo: true
	});
});

router.get('/:id', function(req, res){
	res.render('index.pug', {
		pageTitle: ('scrumblr - ' + req.params.id)
	});
});


/**************
 SOCKET.I0
**************/
io.on('connection', (client) => {
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
		//console.log(message.action + " -- " + sys.inspect(message.data) );

		var clean_data = {};
		var clean_message = {};
		var message_out = {};

		if (!message.action)	return;

		switch (message.action)
		{
			case 'initializeMe':
				initClient(client);
				break;

			case 'joinRoom':
				joinRoom(client, message.data, function(clients) {

						client.send( { action: 'roomAccept', data: '' } );

				});

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


				broadcastToRoom( client, message_out );

				// console.log("-----" + message.data.id);
				// console.log(JSON.stringify(message.data));

				getRoom(client, function(room) {
					db.cardSetXY( room , message.data.id, message.data.position.left, message.data.position.top);
				});

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
				clean_data.type = scrub(data.type);


				getRoom(client, function(room) {
					createCard( room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour, clean_data.type);
				});

				message_out = {
					action: 'createCard',
					data: clean_data
				};

				//report to all other browsers
				broadcastToRoom( client, message_out );
				break;

			case 'editCard':

				clean_data = {};
				clean_data.value = scrub(message.data.value);
				clean_data.id = scrub(message.data.id);
				clean_data.colour = scrub(message.data.colour);

				// console.log("cardupdate:");
				// console.log(clean_data);

				//send update to database
				getRoom(client, function(room) {
					db.cardEdit( room , clean_data.id, clean_data.value, clean_data.colour );
				});

				message_out = {
					action: 'editCard',
					data: clean_data
				};

				broadcastToRoom(client, message_out);

				break;


			case 'deleteCard':
				clean_message = {
					action: 'deleteCard',
					data: { id: scrub(message.data.id) }
				};

				getRoom( client, function(room) {
					db.deleteCard ( room, clean_message.data.id );
				});

				//report to all other browsers
				broadcastToRoom( client, clean_message );

				break;

			case 'createColumn':
				clean_message = { data: scrub(message.data) };

				getRoom( client, function(room) {
					db.createColumn( room, clean_message.data, function() {} );
				});

				broadcastToRoom( client, clean_message );

				break;

			case 'deleteColumn':
				getRoom( client, function(room) {
					db.deleteColumn(room);
				});
				broadcastToRoom( client, { action: 'deleteColumn' } );

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
				getRoom( client, function(room) {
					db.setColumns( room, clean_columns );
				});

				broadcastToRoom( client, { action: 'updateColumns', data: clean_columns } );

				break;

			case 'changeTheme':
				clean_message = {};
				clean_message.data = scrub(message.data);

				getRoom( client, function(room) {
					db.setTheme( room, clean_message.data );
				});

				clean_message.action = 'changeTheme';

				broadcastToRoom( client, clean_message );
				break;

			case 'setUserName':
				clean_message = {};

				clean_message.data = scrub(message.data);

				setUserName(client, clean_message.data);

				var msg = {};
				msg.action = 'nameChangeAnnounce';
				msg.data = { sid: client.id, user_name: clean_message.data };
				broadcastToRoom( client, msg );
				break;

			case 'addSticker':
				var cardId = scrub(message.data.cardId);
				var stickerId = scrub(message.data.stickerId);

				getRoom(client, function(room) {
					db.addSticker( room , cardId, stickerId );
				});

				broadcastToRoom( client, { action: 'addSticker', data: { cardId: cardId, stickerId: stickerId }});
				break;

			case 'setBoardSize':

				var size = {};
				size.width = scrub(message.data.width);
				size.height = scrub(message.data.height);

				getRoom(client, function(room) {
					db.setBoardSize( room, size );
				});

				broadcastToRoom( client, { action: 'setBoardSize', data: size } );
				break;

			case 'editText':
				var text = "";
				text = scrub(message.data.text);

				//shorten string in case it is long
				text = text.substring(0,64);

				//save Board Name to DB @TODO
				getRoom(client, function(room) {
					db.textEdit( room, 'board-title', text );
				});

				var msg = {};
				msg.action = 'editText';
				msg.data = { item: 'board-title', text: text };
				broadcastToRoom( client, msg );
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
	getRoom(client, function(room) {

		db.getAllCards( room , function (cards) {

			client.send(
				{
					action: 'initCards',
					data: cards
				}
			);

		});


		db.getAllColumns ( room, function (columns) {
			client.send(
				{
					action: 'initColumns',
					data: columns
				}
			);
		});


		db.getTheme( room, function(theme) {

			if (theme === null) theme = 'bigcards';

			client.send(
				{
					action: 'changeTheme',
					data: theme
				}
			);
		});

		db.getBoardSize( room, function(size) {

			if (size !== null) {
				client.send(
					{
						action: 'setBoardSize',
						data: size
					}
				);
			}
		});

		//Right now this only gets one object (board title) but we will extend it later
		//to handle an array of all text we want to sync
		db.getAllTexts( room , function (texts) {
			if (texts) {
				client.send(
					{
						action: 'editText',
						data: { item: "board-title", text: texts }
					}
				);
			}
		});

		roommates_clients = rooms.room_clients(room);
		roommates = [];

		var j = 0;
		for (var i in roommates_clients)
		{
			if (roommates_clients[i].id != client.id)
			{
				roommates[j] = {
					sid: roommates_clients[i].id,
					user_name:  sids_to_user_names[roommates_clients[i].id]
					};
				j++;
			}
		}

		//console.log('initialusers: ' + roommates);
		client.send(
			{
				action: 'initialUsers',
				data: roommates
			}
		);

	});
}


function joinRoom (client, room, successFunction)
{
	var msg = {};
	msg.action = 'join-announce';
	msg.data		= { sid: client.id, user_name: client.user_name };

	rooms.add_to_room_and_announce(client, room, msg);
	successFunction();
}

function leaveRoom (client)
{
	//console.log (client.id + ' just left');
	var msg = {};
	msg.action = 'leave-announce';
	msg.data	= { sid: client.id };
	rooms.remove_from_all_rooms_and_announce(client, msg);

	delete sids_to_user_names[client.id];
}

function broadcastToRoom ( client, message ) {
	rooms.broadcast_to_roommates(client, message);
}

//----------------CARD FUNCTIONS
function createCard( room, id, text, x, y, rot, colour, type ) {
	var card = {
		id: id,
		colour: colour,
		rot: rot,
		x: x,
		y: y,
		text: text,
		type: type,
		sticker: null
	};

	db.createCard(room, id, card);
}

function roundRand( max )
{
	return Math.floor(Math.random() * max);
}



//------------ROOM STUFF
// Get Room name for the given Session ID
function getRoom( client , callback )
{
	room = rooms.get_room( client );
	//console.log( 'client: ' + client.id + " is in " + room);
	callback(room);
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
