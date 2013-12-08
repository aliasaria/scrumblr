var Db = require('mongodb').Db;
    Server = require('mongodb').Server,
    BSON = require('mongodb').BSONNative,
    conf = require('../../config.js').database;

var db = function(callback)
{
	this.rooms = false;
	var t = this;

	var db = new Db(conf.database, new Server(conf.hostname, conf.port), {native_parser:true});
	db.open(function(err, db) {
		db.collection('rooms', function(err, collection) {
		// make sure we have an index on name
		collection.ensureIndex([['name',1]],false,function() {});
		t.rooms = collection;
	});
	callback();
	});
}

db.prototype = {
	clearRoom: function(room, callback)
	{
		this.rooms.remove({name:room},callback);
	},

	// theme commands
	setTheme: function(room, theme)
	{
		this.rooms.update(
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
		this.rooms.update(
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
		this.rooms.update(
			{name:room},
			{$pop:{columns:1}}
		);
	},

	setColumns: function(room, columns)
	{
		this.rooms.update(
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
		this.rooms.update(
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
		this.rooms.update(
			{name:room},
			{$set:doc}
		);
	},

	cardSetXY: function(room, id, x, y)
	{
		var doc = {};
		doc['cards.'+id+'.x'] = x;
		doc['cards.'+id+'.y'] = y;
		this.rooms.update(
			{name:room},
			{$set:doc}
		);
	},

	deleteCard: function(room, id)
	{
		var doc = {};
		doc['cards.'+id] = true;
		this.rooms.update(
			{name:room},
			{$unset:doc}
		);
	},

	addSticker: function(room, cardId, stickerId)
	{
		var doc = {};
		doc['cards.'+cardId+'.sticker'] = stickerId;
		this.rooms.update(
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
		this.rooms.update(
			{name:room},
			{$set:{'size':size}}
		);
	}
};
exports.db = db;
