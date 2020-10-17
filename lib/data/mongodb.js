var Db = require('mongodb').Db;
BSON = require('mongodb').BSONNative,
conf = require('../../config.js').database;
const MongoClient = require('mongodb').MongoClient;

var db = function(callback)
{
	this.rooms = false;
	this.users = false;
	var t = this;

	const client = new MongoClient(conf.connUrl, { useNewUrlParser: true });
	client.connect(err => {
		const collection = client.db("scrumblr").collection("rooms");
		const users = client.db("scrumblr").collection("users");
		collection.createIndex([['name',1]],false,function() {});
		t.rooms = collection;
		t.users = users;
		callback();
	});
}

db.prototype = {
	// Users commands
	createUser(user, callback) {
		this.users.updateOne(
			{username:user.username},
			{$set:{password:user.password,displayName:user.displayName}},
			{upsert:true},
			callback
		);
	},
	getUser: function(username, callback)
	{
		this.users.findOne(
			{username:username},
			function(err, user) {
				if(user) {
					callback(user);
				} else {
					callback();
				}
			}
		);
	},
	checkIfUserExists: function(user, callback)
	{
		let userInput = user;
		console.log(user);
		this.users.findOne(
			{username:userInput.username},
			function(err, user) {
				console.log(user);
				if(user) {
					console.log("user found");
					callback(true);
				} else {
					console.log("user not found");
					callback(false);
				}
			}
		);
	},

	clearRoom: function(room, callback)
	{
		this.rooms.deleteOne({name:room},callback);
	},

	// theme commands
	setTheme: function(room, theme)
	{
		this.rooms.updateOne(
			{name:room},
			{$set:{theme:theme}}
		);
	},

	getTheme: function(room, callback)
	{
		this.rooms.findOne(
			{name:room},
			{theme:true},
			function(err, room) {
				if(room) {
					callback(room.theme);
				} else {
					callback();
				}
			}
		);
	},

	// Column commands
	createColumn: function(room, name, callback)
	{
		this.rooms.updateOne(
			{name:room},
			{$push:{columns:name}},
			{upsert:true}
			,callback
		);
	},

	getAllColumns: function(room, callback)
	{
		this.rooms.findOne({name:room},{columns:true},function(err, room) {
			if(room) {
				callback(room.columns);
			} else {
				callback();
			}
		});
	},

	deleteColumn: function(room)
	{
		this.rooms.updateOne(
			{name:room},
			{$pop:{columns:1}}
		);
	},

	setColumns: function(room, columns)
	{
		this.rooms.updateOne(
			{name:room},
			{$set:{columns:columns}},
			{upsert:true}
		);
	},

	// Card commands
	createCard: function(room, id, card)
	{
		var doc = {};
		doc['cards.'+id] = card;
		this.rooms.updateOne(
			{name:room},
			{$set:doc},
			{upsert:true}
		);
	},

	cardUpdate: function(room, id, card)
	{
		var doc = {};
		doc['cards.'+id] = card;
		this.rooms.updateOne(
			{name:room},
			{$set:doc},
			{upsert:true}
		);
	},

	getAllCards: function(room, callback)
	{
		this.rooms.findOne({name:room},{cards:true},function(err, room) {
			if(room) {
				callback(room.cards);
			} else {
				callback();
			}
		});
	},

	cardEdit: function(room, id, text)
	{
		var doc = {};
		doc['cards.'+id+'.text'] = text;
		this.rooms.updateOne(
			{name:room},
			{$set:doc}
		);
	},

	cardSetXY: function(room, id, x, y)
	{
		var doc = {};
		doc['cards.'+id+'.x'] = x;
		doc['cards.'+id+'.y'] = y;
		this.rooms.updateOne(
			{name:room},
			{$set:doc}
		);
	},

	deleteCard: function(room, id)
	{
		var doc = {};
		doc['cards.'+id] = true;
		this.rooms.updateOne(
			{name:room},
			{$unset:doc}
		);
	},

	addSticker: function(room, cardId, stickerId)
	{
		var doc = {};
		doc['cards.'+cardId+'.sticker'] = stickerId;
		this.rooms.updateOne(
			{name:room},
			{$set:doc}
		);
	},
	getBoardSize: function(room, callback) {
		this.rooms.findOne(
			{name:room},
			function(err, room) {
				if(room) {
					callback(room.size);
				} else {
					callback();
				}
			}
		);		
	},
	setBoardSize: function(room, size) {
		this.rooms.updateOne(
			{name:room},
			{$set:{'size':size}}
		);
	}
};
exports.db = db;
