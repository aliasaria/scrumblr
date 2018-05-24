/**************
 SYSTEM INCLUDES
**************/
var sanitizer = require('sanitizer');
var compression = require('compression');
var express = require('express');
var conf = require('./config.js').server;
var ga = require('./config.js').googleanalytics;
var redisConfig = require('./config.js').redis;
const redis = require('redis')
const bluebird = require('bluebird')
const path = require('path');
const fs = require('fs')

/**************
 LOCAL INCLUDES
**************/
var data = require('./lib/data.js').db;

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

var server = require('http').Server(app);
server.listen(conf.port);

console.log('Server running at http://127.0.0.1:' + conf.port + '/');


/**************
 SETUP Redis
**************/

const retry_strategy = function (options) {
	if (options.error && (options.error.code === 'ECONNREFUSED' || options.error.code === 'ENOTFOUND')) {
		// End reconnecting on a specific error and flush all commands with a individual error
		return 10000
	}
	if (options.total_retry_time > 1000 * 60 * 60) {
		// End reconnecting after a specific timeout and flush all commands with a individual error
		return new Error('Retry time exhausted')
	}
	if (options.attempt > 20) {
		// End reconnecting with built in error
		return undefined
	}
	// reconnect after
	return Math.min(options.attempt * 100, 3000)
}

const cache = redis.createClient({
	host: redisConfig.host,
	port: redisConfig.port,
	retry_strategy
})

/**************
 SETUP Socket.IO
**************/
var io = require('socket.io')(server, {
	path: conf.baseurl == '/' ? '' : conf.baseurl + "/socket.io"
});
const defaultNamespace = io.of('/');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

/**************
 SETUP Socket.IO Redis Adapter
**************/
const ioredis = require('socket.io-redis');
io.adapter(ioredis({ host: redisConfig.host, port: redisConfig.port }));

/**************
 ROUTES
**************/
// router.get('/', function (req, res) {
// 	//console.log(req.header('host'));
// 	url = req.header('host') + req.baseUrl;

// 	var connected = io.sockets.connected;
// 	clientsCount = Object.keys(connected).length;
//    res.send()
// });

const uiPath = path.join(__dirname, 'react-ui/build')
const uiIndexPage = `${uiPath}/index.html`
if (!fs.existsSync(uiIndexPage)) {
	console.log('Please build the React UI using yarn run build:ui or npm run build:ui')
	process.exit(1)
}

app.use(express.static(uiPath));
// Handle React routing, return all requests to React app
app.get('*', function (req, res) {
	res.sendFile(uiIndexPage);
});

app.post('/:id/card', async function (req, res) {
	const clean_data = req.body
	const room = `/${req.params.id}`

	createCard(room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour);

	message_out = {
		action: 'createCard',
		data: clean_data
	};

	io.to(room).send(message_out)
	res.send(200, { status: 'ok' })
})


/**************
 SOCKET.I0
**************/
defaultNamespace.on('connection', async function (client) {
	console.log('client connected', client.id)

	function scrub(text) {
		if (typeof text != "undefined" && text !== null) {
			//clip the string if it is too long
			if (text.length > 65535) {
				text = text.substr(0, 65535);
			}
			return sanitizer.sanitize(text);
		}
		else {
			return null;
		}
	}

	client.on('message', async function (message) {
		console.log(message)
		var clean_data = {};
		var clean_message = {};
		var message_out = {};

		if (!message.action) return;

		switch (message.action) {
			case 'initializeMe':
				initClient(client, message.data.room);
				break;
			case 'joinRoom':
				// figure out if the user is able to join this room
				// TODO send username as part of the joinRoom action and set it

				client.join(message.data, async (err) => {
					// to get initial roommates
					const roommates = await Object.keys(io.sockets.adapter.rooms[message.data].sockets).map(async (sid) => {
						if (client.id !== sid)
							return await getUserName(sid).then((res) => {
								return { sid: sid, user_name: res ? res : sid }
							})

					});

					Promise.all(roommates).then((res) => {
						client.json.send(
							{
								action: 'roomAccept',
								users: res.filter(n => (n != null)),
								room: message.data
							}
						);
					})

					var msg = {};
					msg.action = 'join-announce';
					msg.data = { sid: client.id, user_name: client.user_name, room: message.data };
					client.to(message.data).emit('message', msg)
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
						},
						room: message.data.room
					}
				};

				client.to(message.data.room).send(message_out)
				db.cardSetXY(message.data.room, message.data.id, message.data.position.left, message.data.position.top);
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
				clean_data.room = data.room
				createCard(data.room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour);
				message_out = {
					action: 'createCard',
					data: clean_data
				};

				client.to(data.room).emit('message', message_out)
				break;

			case 'editCard':
				clean_data = {};
				clean_data.value = scrub(message.data.value);
				clean_data.id = scrub(message.data.id);
				db.cardEdit(message.data.room, clean_data.id, clean_data.value);
				message_out = {
					action: 'editCard',
					data: clean_data,
					room: message.data.room
				};

				client.to(message.data.room).send(message_out)
				break;

			case 'deleteCard':
				clean_message = {
					action: 'deleteCard',
					data: {
						id: scrub(message.data.id),
						room: scrub(message.data.room)
					}
				};
				db.deleteCard(message.data.room, clean_message.data.id);
				client.to(clean_message.data.room).send(clean_message)
				break;

			case 'createColumn':
				clean_message = { text: scrub(message.data.text), room: scrub(message.data.room) };
				db.createColumn(clean_message.room, clean_message.text, function () { });
				client.to(clean_message.room).send({ action: 'createColumn', data: clean_message })
				break;
			case 'deleteColumn':
				const room = scrub(message.data.room)
				db.deleteColumn(room);
				client.to(room).send({ action: 'deleteColumn', room: room })
				break;
			case 'updateColumns':
				var columns = message.data.columns;
				if (!(columns instanceof Array))
					break;
				var clean_columns = [];
				for (var i in columns) {
					clean_columns[i] = scrub(columns[i]);
				}
				db.setColumns(message.data.room, clean_columns);
				client.to(message.data.room).send({ action: 'updateColumns', data: clean_columns, room: message.data.room })
				break;

			case 'changeTheme':
				clean_message = {};
				clean_message.data = scrub(message.data);
				db.setTheme(room, clean_message.data);
				clean_message.action = 'changeTheme';
				client.to(room).send(clean_message)
				break;

			case 'setUserName':
				clean_message = {};
				clean_message.room = scrub(message.data.room);
				clean_message.name = scrub(message.data.name)
				setUserName(client, clean_message.name);


				Object.keys(client.rooms).filter(r => r.startsWith('/')).forEach(room => {
					var msg = {};
					msg.action = 'nameChangeAnnounce';
					msg.data = { room: clean_message.room, sid: client.id, user_name: clean_message.name };
					client.to(room).send(msg)
				})

				break;

			case 'addSticker':
				var cardId = scrub(message.data.cardId);
				var stickerId = scrub(message.data.stickerId);
				db.addSticker(message.data.room, cardId, stickerId);
				client.to(message.data.room).send({ action: 'addSticker', data: { cardId: cardId, stickerId: stickerId } });
				break;

			case 'setBoardSize':
				var size = {};
				size.width = scrub(message.data.width);
				size.height = scrub(message.data.height);
				db.setBoardSize(message.data.room, size);
				client.to(message.data.room).send({ action: 'setBoardSize', data: size, room: message.data.room });
				break;
			case 'setzIndex':
				db.cardsetzIndex(message.data.room, message.data.cardId, message.data.zindex)
				client.to(message.data.room).send({
					action: 'setzIndex',
					data: {
						cardId: message.data.cardId,
						room: message.data.room,
						zindex: message.data.zindex
					}
				})
				break;
			case 'startEditingCard':
				client.to(message.data.room).send({
					action: 'cardStartEditing',
					data: {
						room: message.data.room, cardId: message.data.cardId, sid: client.id
					}
				})
				break;
			case 'endEditingCard':
				client.to(message.data.room).send({
					action: 'cardEndEditing',
					data: {
						room: message.data.room, cardId: message.data.cardId, sid: client.id
					}
				})
				break;
			default:
				//console.log('unknown action');
				break;
		}

	});

	client.on('disconnect', function () {
		leaveRoom(client);
	});
	//tell all others that someone has connected
	//client.broadcast('someone has connected');
});


/**************
 FUNCTIONS
**************/
const getUserName = async (sid) => {
	const user_name = await cache.getAsync(`user_name_${sid}`).then((res) => {
		return res ? res : sid
	});

	return user_name
}

async function initClient(client, room) {
	//console.log ('initClient Started');
	//const room = Object.keys(client.rooms).filter(room => room.startsWith('/'))[0]
	db.getAllCards(room, function (cards) {
		client.json.send(
			{
				action: 'initCards',
				cards: cards,
				room: room
			}
		);

	});

	db.getAllColumns(room, function (columns) {
		client.json.send(
			{
				action: 'initColumns',
				columns: columns,
				room: room
			}
		);
	});

	db.getTheme(room, function (theme) {
		if (theme === null) theme = 'bigcards';

		client.json.send(
			{
				action: 'changeTheme',
				data: theme
			}
		);
	});

	db.getBoardSize(room, function (size) {
		if (size !== null) {
			client.json.send(
				{
					action: 'setBoardSize',
					data: size,
					room: room
				}
			);
		}
	});


}


function leaveRoom(client) {
	try {
		const [, r] = client.request.headers.referer.match(/https?:\/\/[\w\.:\d]+\/(\w+)/)
		const room = `/${r}`
		var msg = {};
		msg.action = 'leave-announce';
		msg.data = { sid: client.id, room: room };
		client.to(room).emit('message', msg)
	}
	catch (err) {
		console.log(err)
	}
}

//----------------CARD FUNCTIONS
function createCard(room, id, text, x, y, rot, colour) {
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

function roundRand(max) {
	return Math.floor(Math.random() * max);
}


function setUserName(client, name) {
	client.user_name = name;
	cache.setex(`user_name_${client.id}`, 38400, name)
}

function cleanAndInitializeDemoRoom() {
	// DUMMY DATA
	db.clearRoom('/demo', function () {
		db.createColumn('/demo', 'Not Started');
		db.createColumn('/demo', 'Started');
		db.createColumn('/demo', 'Testing');
		db.createColumn('/demo', 'Review');
		db.createColumn('/demo', 'Complete');


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
var db = new data(function () {
	cleanAndInitializeDemoRoom();
});
