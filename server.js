/**************
 SYSTEM INCLUDES
**************/
var	http = require('http');
var util = require('util');
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
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
var router = express.Router();

app.use(compression());
app.use(conf.baseurl, router);

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


/**************
 ROUTES
**************/
router.get('/', function(req, res) {
	console.log(req.header('host'));
	url = req.header('host') + req.baseUrl;

	var connected = io.sockets.connected;
	clientsCount = Object.keys(connected).length;

	res.render('home.jade', {
		url: url,
		connected: clientsCount
	});
});

router.get('/register', function(req, res) {
	res.render('register.jade', {});
});

router.get('/profile/:username', function(req, res) {
	let username = req.params.username;
	db.getUser(username,function(user){
		let data = user ? user : {} ;
		res.render('profile.jade', {data:data});
	});
	
});

router.post('/doRegister', function(req, res){
	let user = {username:req.body.username,password:req.body.password,displayName:req.body.displayName};
	let db = new data(function() {
		db.checkIfUserExists(user, function(isExists) {
			if(isExists) {
				res.redirect('/register?userExists=true');
			}
			else {
				db.createUser(user, function() {
					console.log(user);
					res.redirect('/profile/'+user.username);
				});
				
			}
		});
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


/**************
 SOCKET.I0
**************/
io.sockets.on('connection', function (client) {
	//sanitizes text
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
		console.log(message.action + " -- " + util.inspect(message.data) );

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

						client.json.send( { action: 'roomAccept', data: '' } );

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
				clean_data.stickerId = scrub(data.stickerId);


				getRoom(client, function(room) {
					createCard( room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour, clean_data.stickerId);
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

				//send update to database
				getRoom(client, function(room) {
					db.cardEdit( room , clean_data.id, clean_data.value );
				});

				message_out = {
					action: 'editCard',
					data: clean_data
				};

				broadcastToRoom(client, message_out);

				break;

			case 'updateCard':
				data = message.data;
				clean_data = {};
				clean_data.text = scrub(data.text);
				clean_data.id = scrub(data.id);
				clean_data.x = scrub(data.x);
				clean_data.y = scrub(data.y);
				clean_data.rot = scrub(data.rot);
				clean_data.colour = scrub(data.colour);
				clean_data.stickerId = scrub(data.stickerId);


				getRoom(client, function(room) {
					updateCard( room, clean_data.id, clean_data.text, clean_data.x, clean_data.y, clean_data.rot, clean_data.colour, clean_data.stickerId);
				});

				message_out = {
					action: 'updateCard',
					data: clean_data
				};

				//report to all other browsers
				broadcastToRoom( client, message_out );
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
	console.log ('initClient Started');
	getRoom(client, function(room) {

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

		console.log('initialusers: ' + roommates);
		client.json.send(
			{
				action: 'initialUsers',
				data: roommates
			}
		);

		//showburndownchart;
		db.getAllCards(room, function(cards){
		
			var data = getBurndownchart(cards)
			client.json.send(
				{
					action: 'showburndownchart',
					data: data
				}
			);
		 })
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
	console.log (client.id + ' just left');
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
const WorkPriority = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2
}

const WorkStatus = {
    TODO: 0,
    INPROGRESS: 1,
    DONE: 2
}

function createCard( room, id, text, x, y, rot, colour, stickerId ) {
	var remainhrs = {
		time: new Date().format("yyyy-MM-dd hh:mm:ss"),
		rhrs: 100
	}

	var card = {
		id: id,
		userid: 0,
		colour: colour,
		rot: rot,
		x: x,
		y: y,
		summary: text,
		text: text,
		sprintno: 1,
		rhrs: 100,
		status: WorkStatus.TODO,
		priority: WorkPriority.LOW,
		createtime: new Date().format("yyyy-MM-dd hh:mm:ss"),
		sticker: stickerId
	};

	db.createCard(room, id, card);
	db.createRemainhrs(room, id, remainhrs);
}

function updateCard( room, id, text, x, y, rot, colour, stickerId ) {
	var card = {
		id: id,
		colour: colour,
		rot: rot,
		x: x,
		y: y,
		text: text,
		sticker: stickerId
	};

	db.cardUpdate(room, id, card);
}

function roundRand( max )
{
	return Math.floor(Math.random() * max);
}

// dateformat
Date.prototype.format = function(fmt){
	var o = {
	  "M+" : this.getMonth()+1,                 //月份
	  "d+" : this.getDate(),                    //日
	  "h+" : this.getHours(),                   //小时
	  "m+" : this.getMinutes(),                 //分
	  "s+" : this.getSeconds(),                 //秒
	  "q+" : Math.floor((this.getMonth()+3)/3), //季度
	  "S"  : this.getMilliseconds()             //毫秒
	};
  
	if(/(y+)/.test(fmt)){
	  fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
	}
		  
	for(var k in o){
	  if(new RegExp("("+ k +")").test(fmt)){
		fmt = fmt.replace(
		  RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));  
	  }       
	}
  
	return fmt;
  }

function DateToStr(date){
	var month =(date.getMonth() + 1).toString();
	var day = (date.getDate()).toString();
	var year = date.getFullYear();
	if (month.length == 1) {
		month = "0" + month;
	}
	if (day.length == 1) {
		day = "0" + day;
	}
	dateTime = year +"-"+ month +"-"+  day;
	return dateTime;
}

function strToDate(dateStr){
	var dateStr = dateStr.replace(/-/g, "/");//yyyy-MM-dd to yyyy/MM/dd
	var dateTime = Date.parse(dateStr);//将日期字符串转换为表示日期的秒数
	//Date.parse(dateStr)默认情况下只能转换：月/日/年 格式的字符串，但是经测试年/月/日格式的字符串也能被解析
	var data = new Date(dateTime);//将日期秒数转换为日期格式
	return data;
}

//dateformat to yyyy-MM-dd
function getDate(datetime)
{
	var time = new String(datetime);
	var datestring = time.substring(0, 10);
	var date = strToDate(datestring);
	return date;
}

//get interval days
function getDateInterval(firstday, lastday)
{
	var timesDiff = Math.abs(firstday.getTime() - lastday.getTime());
	var diffDays = Math.ceil(timesDiff / (1000 * 60 * 60 * 24));//向上取整
	return diffDays;
}

//----------------BURNDOWNCHART FUNCTIONS
function getBurndownchart(cards)
{
	var tempmap = new Map();
	var timearray = new Array();
	var temptimearray = new Array();
	var hrsarray = new Array();
	var data;
    //every date only one
    for(var i in cards){
		var card = cards[i];
		for(var j in card.remainhrs){
			var remainhr = card.remainhrs[j];
			var time = new String(remainhr.time);
			var date = time.substring(0, 10);
			if(!tempmap.has(date)){
				tempmap.set(date, remainhrs);
				temptimearray.push(date)
			}
		}
	}
	
	//----get date array
	temptimearray.sort();
	var firstday = strToDate(temptimearray[0]);
	var lastday = strToDate(temptimearray[temptimearray.length - 1]);
	var datep = strToDate(temptimearray[0]);

	var diffDays = getDateInterval(firstday, lastday);
	
	for(var i = 0; i <= diffDays; i++){
		timearray.push(datep.format("yyyy-MM-dd"));
		datep.setDate(datep.getDate() + 1);
		hrsarray.push(0);
	}

	//----get remainhrs array
	for(var i in cards){
		var card = cards[i];
		var cardfirstday = getDate(card.createtime);
		var pointer = getDateInterval(cardfirstday, firstday);
		var remainhrs;
		for(var j in card.remainhrs){
			var remainhr = card.remainhrs[j];
			remainhrs = remainhr.rhrs;
			var flagday = getDate(remainhr.time);
			var intervaldays = getDateInterval(flagday, firstday);
			while(pointer <= intervaldays){
				hrsarray[pointer] += remainhrs;
				pointer++;
			}
		}
		while(pointer <= diffDays){
			hrsarray[pointer] += remainhrs;
			pointer++;
		}
	}

	data = {date: timearray, rhrs: hrsarray};
	return data;
}

//------------ROOM STUFF
// Get Room name for the given Session ID
function getRoom( client , callback )
{
	room = rooms.get_room( client );
	console.log( 'client: ' + client.id + " is in " + room);
	callback(room);
}


function setUserName ( client, name )
{
	client.user_name = name;
	sids_to_user_names[client.id] = name;
	console.log('sids to user names: ');
	console.dir(sids_to_user_names);
}

function cleanAndInitializeDemoRoom()
{
	// DUMMY DATA
	db.clearRoom('/demo', function() {
		//db.createColumn( '/demo', 'Not Started' );
		//db.createColumn( '/demo', 'Started' );
		//db.createColumn( '/demo', 'Testing' );
		//db.createColumn( '/demo', 'Review' );
		//db.createColumn( '/demo', 'Complete' );


		//createCard('/demo', 'card1', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		//createCard('/demo', 'card2', 'Hello this is a new story.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'white');
		//createCard('/demo', 'card3', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		//createCard('/demo', 'card4', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');

		//createCard('/demo', 'card5', 'Hello this is fun', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		//createCard('/demo', 'card6', 'Hello this is a new card.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'yellow');
		//createCard('/demo', 'card7', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'blue');
		//createCard('/demo', 'card8', '.', roundRand(600), roundRand(300), Math.random() * 10 - 5, 'green');
	});
}

//

/**************
 SETUP DATABASE ON FIRST RUN
**************/
// (runs only once on startup)
var db = new data(function() {
	//cleanAndInitializeDemoRoom();
});
