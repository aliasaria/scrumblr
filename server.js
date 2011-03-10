var	http = require('http'), 
		io = require('socket.io'), // for npm, otherwise use require('./path/to/socket.io') 
		express = require('express'),
		connect = require('connect');
		
var 	redis = require("redis"),
		redisClient = redis.createClient();
		
var 	sys = require('sys');
	
var 	app = express.createServer();

var	async = require('async');

var	rooms	= require('./lib/rooms.js');

var 	sanitizer = require('sanitizer');

// If you want Memory Store instead...
// var MemoryStore = require('connect/middleware/session/memory');
// var session_store = new MemoryStore();

var 	RedisStore = require('connect-redis');
var 	session_store = new RedisStore( );

//Map of sids to user_names
var sids_to_user_names = [];

var REDIS_PREFIX = '#scrumscrum#';

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
			store: session_store,
			cookie: { path: '/', httpOnly: true, maxAge: 14400000 }
		})
	);

	
});


//For Redis Debugging
redisClient.on("error", function (err) {
    console.log("Redis error: " + err);
});


app.get('/', function(req, res) {
	res.render('home.jade', {
		 layout: false 
	});
});

app.get('/:id', function(req, res){
	res.render('index.jade', {
		locals: {pageTitle: 'scrumblr'}
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

app.listen(process.argv[2]);


// socket.io SETUP
var socket = io.listen(app); 
socket.on('connection', function(client){ 
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
	
	//clip the string if it is too long
	if (text.length > 65535)
	{
		text = text.substr(0,65535);
	}
	
	return sanitizer.sanitize(text);
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
					cardSetXY( room , message.data.id, message.data.position.left, message.data.position.top)
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
				
				//send update to Redis
				getRoom(client, function(room) {
					cardEdit( room , clean_data.id, clean_data.value );
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
					deleteCard ( room, clean_message.data.id );
				});
				
				//report to all other browsers
				broadcastToRoom( client, clean_message );

				break;
				
			case 'createColumn':	
				var clean_message = { data: scrub(message.data) };
				
				getRoom( client, function(room) {
					createColumn( room, clean_message.data, function() {} );
				});
				
				broadcastToRoom( client, clean_message );
				
				break;
			
			case 'deleteColumn':
				getRoom( client, function(room) {
					deleteColumn();
				});
				broadcastToRoom( client, { action: 'deleteColumn' } );
				
				break;
				
			case 'updateColumns':				
				//@TODO -- scrub each column
				getRoom( client, function(room) {
					setColumns( room, message.data );
				});
				
				broadcastToRoom( client, message );

				break;
				
			case 'changeTheme':
				//@TODO -- scrub 
				message.data = scrub(message.data);
				
				getRoom( client, function(room) {
					setTheme( room, message.data );
				});
				
				broadcastToRoom( client, message );
				break;
				
			case 'setUserName':
				//@TODO -- scrub 
				name = scrub(message.data);
				
				setUserName(client, name);
				
				var msg = {};
				msg.action = 'nameChangeAnnounce';
				msg.data = { sid: client.sessionId, user_name: name };
				broadcastToRoom( client, msg );
				break;
				
			case 'addSticker':
				var cardId = scrub(message.data.cardId);
				var stickerId = scrub(message.data.stickerId);
				
				getRoom(client, function(room) {
					addSticker( room , cardId, stickerId );
				});
				
				broadcastToRoom( client, { action: 'addSticker', data: { cardId: cardId, stickerId: stickerId }});
							
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
		
		
		getAllCards( room , function (cards) { 
			
			client.send( 
				{
					action: 'initCards',
					data: cards
				}
			);
	
		});
		
		
		getAllColumns ( room, function (columns) {
			client.send( 
				{
					action: 'initColumns',
					data: columns
				}
			);
		});
		

		getTheme( room, function(theme) {
			
			if (theme == null) theme = 'bigcards';
			
			client.send( 
				{
					action: 'changeTheme',
					data: theme 
				}
			);
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

function getTheme ( room , callbackFunction )
{
	redisClient.get(REDIS_PREFIX + '-room:' + room + '-theme', function (err, res) {
		callbackFunction(res);
	});
}

function setTheme ( room, theme )
{
	redisClient.set(REDIS_PREFIX + '-room:' + room + '-theme', theme);
}

//----------------COL FUNCTIONS
function getAllColumns ( room, callbackFunction ) {
	redisClient.lrange(REDIS_PREFIX + '-room:' + room + '-columns', 0, -1, function(err, res) {
		callbackFunction(res);
	});
}

function createColumn ( room, name, callback ) {
	console.log('rpush: ' + REDIS_PREFIX + '-room:' + room + '-columns' + " -- " + name);
	redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', name, 
		function (err, res) {
				if (typeof callback != "undefined" && callback !== null) callback();
		}
	);
}

function deleteColumn ( room ) {
	redisClient.rpop(REDIS_PREFIX + '-room:' + room + '-columns');
}

function setColumns ( room, columns ) {
	console.dir('SetColumns:');
	console.dir(columns);
	
	//1. first delete all columns
	redisClient.del(REDIS_PREFIX + '-room:' + room + '-columns', function () {
		//2. now add columns for each thingy
		async.forEachSeries(
			columns,
			function( item, callback ) {
				//console.log('rpush: ' + REDIS_PREFIX + '-room:' + room + '-columns' + ' -- ' + item);
				item = sanitizer.sanitize(item);
				
				redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', item, 
					function (err, res) {
						callback();
					});
				},
			function() {
				//this happens when the series is complete
			}
		);
	});
}


//----------------CARD FUNCTIONS
function createCard( room, id, text, x, y, rot, colour ) {
	//console.log ('create card in ' + room);
	var card = { 
		id: id,
		colour: colour,
		rot: rot,
		x: x,
		y: y,
		text: text,
		stickerId: null
	};
	
	var cardString = JSON.stringify(card);

	redisClient.hset(
		REDIS_PREFIX + '-room:' + room + '-cards',
		id,
		cardString
	)
	
	//console.log(JSON.stringify(cards));
}

function cardSetXY( room, id, x, y )
{
	redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
		var card = JSON.parse(res);
		if (card !== null)
		{
			card.x = x;
			card.y = y;
			redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
		}
		
	});
}

function cardEdit( room , id, text) {
	redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
		var card = JSON.parse(res);
		if (card !== null)
		{
			card.text = text;
			redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
		}
		
	});
}

function deleteCard( room, id ) {
	//console.log('deletecard in redis: ' + id);
	redisClient.hdel(
		REDIS_PREFIX + '-room:' + room + '-cards',
		id
	)
}

function getAllCards( room, callbackFunction ) {
	console.log('getall from: ' + REDIS_PREFIX + '-room' + room + '-cards');
	redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-cards', function (err, res) {
		
		var cards = Array();
		
		for (i in res)
		{
			cards.push( JSON.parse(res[i]) );
		}
		console.dir(cards);
		
		
		callbackFunction (cards);
	});
}

function addSticker( room, cardId, stickerId ) {
	redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', cardId, function(err, res) {
		var card = JSON.parse(res);
		if (card !== null)
		{
			card.sticker = stickerId;
			redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
		}

	});
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




// DUMMY DATA
redisClient.del(REDIS_PREFIX + '-room:/demo-cards', function (err, res) {
	redisClient.del(REDIS_PREFIX + '-room:/demo-columns', function (err, res) {
		createColumn( '/demo', 'Not Started' );
		createColumn( '/demo', 'Started' );
		createColumn( '/demo', 'Testing' );
		createColumn( '/demo', 'Review' );
		createColumn( '/demo', 'Complete' );


		createCard('/demo', 'card1', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card2', 'Hello this is a new story.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'white');
		createCard('/demo', 'card3', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('/demo', 'card4', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');

		createCard('/demo', 'card5', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card6', 'Hello this is a new card.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		createCard('/demo', 'card7', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		createCard('/demo', 'card8', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');
	});
});
// 







