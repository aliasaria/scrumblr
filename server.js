var	http = require('http'),
		express = require('express'),
		connect = require('connect');

var 	sys = require('sys');

var 	app = express.createServer();

var	async = require('async');

var	rooms	= require('./lib/rooms.js');
var	data	= require('./lib/data.js').db;

var 	sanitizer = require('sanitizer');

//Map of sids to user_names
var sids_to_user_names = [];

app.configure( function(){
	app.use(express.static(__dirname + '/client'));
	app.use(express.bodyParser());
	//app.use(express.cookieParser());

	//Cookies are not really needed... but may be in the future?
	app.use(express.cookieParser());
	app.use(
		express.session({
			key: "scrumscrum-cookie",
			secret: "kookoorikoo",
//			store: session_store,
			cookie: { path: '/', httpOnly: true, maxAge: 14400000 }
		})
	);


});

app.get('/', function(req, res) {
	res.render('home.jade', {
		 layout: false
	});
});

app.get('/demo', function(req, res) {
	res.render('index.jade', {
		locals: {pageTitle: 'scrumblr - demo', demo: true}
	});
});

app.get('/:id', function(req, res){

	res.render('index.jade', {
		locals: {pageTitle: ('scrumblr - ' + req.params.id) }
	});
});

//SETUP ROUTES
app.post('/edit-card/:id', function(req, res){
    //do nothing
	res.send(req.body.value);
});

app.post('/edit-column', function(req, res) {
	//do nothing
	res.send(req.body.value);
});

app.listen(process.argv[2] || 8124);

//I limit the number of potential transports because xhr was causing trouble
//with frequent disconnects
var socketio_options = {
	transports: ['websocket', 'flashsocket', 'htmlfile', 'jsonp-polling']
};
// socket.io SETUP
var io = require('socket.io').listen(app);
io.configure(function () {
  io.set('transports', [
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
//    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});
io.sockets.on('connection', function (client) {
	// new client is here!
	//console.dir(client.request.headers);
		//
		// var cookie_string = client.request.headers.cookie;
		// var parsed_cookies = connect.utils.parseCookie(cookie_string);
		// console.log('parsed:'); console.dir(parsed_cookies);
		// var connect_sid = parsed_cookies['scrumscrum-sid'];
		// if (connect_sid) {
		//   session_store.get(connect_sid, function (error, session) {
		// 	 console.log('cookie:');
		//     console.dir(session);
		//   });
		// }

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
		console.log(message.action + " -- " + sys.inspect(message.data) );

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
				var messageOut = {
					action: message.action,
					data: {
						id: scrub(message.data.id),
						position: {
							left: scrub(message.data.position.left),
							top: scrub(message.data.position.top)
						}
					}
				};


				broadcastToRoom( client, messageOut );

				// console.log("-----" + message.data.id);
				// console.log(JSON.stringify(message.data));

				getRoom(client, function(room) {
					db.cardSetXY( room , message.data.id, message.data.position.left, message.data.position.top)
				});

				break;

			case 'createCard':
				data = message.data;
				var clean_data = {};
				clean_data.text = scrub(data.text);
				clean_data.id = scrub(data.id);
				clean_data.x = scrub(data.x);
				clean_data.y = scrub(data.y);
				clean_data.rot = scrub(data.rot);
				clean_data.colour = scrub(data.colour);

				getRoom(client, function(room) {
					createCard( room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour);
				});

				var message_out = {
					action: 'createCard',
					data: clean_data
				};

				//report to all other browsers
				broadcastToRoom( client, message_out );
				break;

			case 'editCard':

				var clean_data = {};
				clean_data.value = scrub(message.data.value);
				clean_data.id = scrub(message.data.id);

				//send update to database
				getRoom(client, function(room) {
					db.cardEdit( room , clean_data.id, clean_data.value );
				});

				var message_out = {
					action: 'editCard',
					data: clean_data
				};

				broadcastToRoom(client, message_out);

				break;


			case 'deleteCard':
				var clean_message = {
					action: 'deleteCard',
					data: { id: scrub(message.data.id) }
				}

				getRoom( client, function(room) {
					db.deleteCard ( room, clean_message.data.id );
				});

				//report to all other browsers
				broadcastToRoom( client, clean_message );

				break;

			case 'createColumn':
				var clean_message = { data: scrub(message.data) };

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

				for (i in columns)
				{
					clean_columns[i] = scrub( columns[i] );
				}
				getRoom( client, function(room) {
					db.setColumns( room, clean_columns );
				});

				broadcastToRoom( client, { action: 'updateColumns', data: clean_columns } );

				break;

			case 'changeTheme':
				var clean_message = {};
				clean_message.data = scrub(message.data);

				getRoom( client, function(room) {
					db.setTheme( room, clean_message.data );
				});

				clean_message.action = 'changeTheme';

				broadcastToRoom( client, clean_message );
				break;

			case 'setUserName':
				var clean_message = {};

				clean_message.data = scrub(message.data);

				setUserName(client, clean_message.data);

				var msg = {};
				msg.action = 'nameChangeAnnounce';
				msg.data = { sid: client.sessionId, user_name: clean_message.data };
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
				size.width = scrub(message.data.width);;
				size.height = scrub(message.data.height);
				
				getRoom(client, function(room) {
					db.setBoardSize( room, size );
				});
				
				broadcastToRoom( client, { action: 'setBoardSize', data: size } );
				break;

			default:
				console.log('unknown action');
				break;
		}
	});

	client.on('disconnect', function() {
			leaveRoom(client);
	});

  //tell all others that someone has connected
  //client.broadcast('someone has connected');
});







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

			if (theme == null) theme = 'bigcards';

			client.send(
				{
					action: 'changeTheme',
					data: theme
				}
			);
		});
		
		db.getBoardSize( room, function(size) {

			if (size != null) {
				client.send(
					{
						action: 'setBoardSize',
						data: size
					}
				);
			}
		});

		roommates_clients = rooms.room_clients(room);
		roommates = [];

		var j = 0;
		for (i in roommates_clients)
		{
			if (roommates_clients[i].sessionId != client.sessionId)
			{
				roommates[j] = {
					sid: roommates_clients[i].sessionId,
					user_name:  sids_to_user_names[roommates_clients[i].sessionId]
					};
				j++;
			}
		}

		console.log('initialusers: ' + roommates);
		client.send(
			{
				action: 'initialUsers',
				data: roommates
			}
		)

	});
}


function joinRoom (client, room, successFunction)
{
	var msg = {};
	msg.action = 'join-announce';
	msg.data		= { sid: client.sessionId, user_name: client.user_name };

	rooms.add_to_room_and_announce(client, room, msg);
	successFunction();
}

function leaveRoom (client)
{
	console.log (client.sessionId + ' just left');
	var msg = {};
	msg.action = 'leave-announce';
	msg.data	= { sid: client.sessionId };
	rooms.remove_from_all_rooms_and_announce(client, msg);

	delete sids_to_user_names[client.sessionId];
}

function broadcastToRoom ( client, message ) {
	rooms.broadcast_to_roommates(client, message);
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



//------------ROOM STUFF
// Get Room name for the given Session ID
function getRoom( client , callback )
{
	room = rooms.get_room( client );
	//console.log( 'client: ' + client.sessionId + " is in " + room);
	callback(room);
}


function setUserName ( client, name )
{
	client.user_name = name;
	sids_to_user_names[client.sessionId] = name;
	console.log('sids to user names: ');
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

var db = new data(function() {
	cleanAndInitializeDemoRoom();
});




