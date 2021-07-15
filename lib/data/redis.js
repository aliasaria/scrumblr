// var conf = require('../../config.js').database;

var     redis = require("redis"),
  redisClient = null; //redis.createClient();

var async = require("async");
var sets = require('simplesets');
var nconf = require('nconf');


// If you want Memory Store instead...
// var MemoryStore = require('connect/middleware/session/memory');
// var session_store = new MemoryStore();

var REDIS_PREFIX = nconf.get('redis:prefix');

//For Redis Debugging


var db = function(callback) {
	console.log('Opening redis connection to ' + nconf.get('redis:url'));
	redisClient = redis.createClient(nconf.get('redis:url'));

	redisClient.on("connect", function (err) {
		callback && callback();
	});

	redisClient.on("error", function (err) {
		console.log("Redis error: " + err);
	});

};

db.prototype = {
  clearRoom: function(room, callback) {
		const keysToDelete = [
			REDIS_PREFIX + '-room:' + room + '-cards',
			REDIS_PREFIX + '-room:' + room + '-columns',
			REDIS_PREFIX + '-room:' + room + '-size',
			REDIS_PREFIX + '-room:' + room + '-theme',
			REDIS_PREFIX + '-room:' + room + '-bg',
			REDIS_PREFIX + '-room:' + room + '-users',
			REDIS_PREFIX + '-room:' + room + '-texts'
		];
		redisClient.del(keysToDelete, function (err, res) {
			callback && callback();
		});
	},

	// theme commands
	setTheme: function(room, theme, callback) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-theme', theme, function (err, res) {
		  callback && callback();
		});
	},

	getTheme: function(room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-theme', function (err, res) {
			callback && callback(res);
		});
	},

        getBg: function(room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-bg', function (err, res) {
			callback && callback(res);
		});
	},

        setBg: function(room, theme, callback) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-bg', theme, function (err, res) {
		  callback && callback();
		});
	},

	// Column commands
	createColumn: function(room, col, callback) {
    const colStr = JSON.stringify(col);
		redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', colStr,
			function (err, res) {
	      if (typeof callback != "undefined" && callback !== null) callback();
			}
		);
	},

	getAllColumns: function(room, callback) {
		redisClient.lrange(REDIS_PREFIX + '-room:' + room + '-columns', 0, -1, function(err, res) {
      var out = [];
      res.forEach(function(col){
        out.push(JSON.parse(col));
      });
			callback && callback(out);
		});
	},

	deleteColumn: function(room) {
		redisClient.rpop(REDIS_PREFIX + '-room:' + room + '-columns');
	},

	setColumns: function(room, columns, callback) {
		//1. first delete all columns
		redisClient.del(REDIS_PREFIX + '-room:' + room + '-columns', function () {
			//2. now add columns for each thingy
			async.forEachSeries(
				columns,
				function( item, callback ) {
					//console.log('rpush: ' + REDIS_PREFIX + '-room:' + room + '-columns' + ' -- ' + item);
          const stringCol = JSON.stringify(item);
					redisClient.rpush(REDIS_PREFIX + '-room:' + room + '-columns', stringCol,
						function (err, res) {
							callback && callback();
						}
					);
				},
				function() {
					callback && callback();
				}
			);
		});
	},

	// Card commands
	createCard: function(room, id, card, callback) {
		var cardString = JSON.stringify(card);
		redisClient.hset(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id,
			cardString,
			function (err, res) {
			  callback && callback();
			}
		);
	},

	getAllCards: function(room, callback) {
		redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-cards', function (err, res) {

			var cards = [];

			for (var i in res) {
				cards.push( JSON.parse(res[i]) );
			}
			//console.dir(cards);

			callback(cards);
		});
	},

  getAllUsers: function(room, callback) {
		redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-users', function (err, res) {

			var users = {};

			for (var i in res) {
        users[i] = JSON.parse(res[i]);
			}

			callback(users);
		});
	},

  addUser: function(room, username, userinfo, callback) {
		var userinfoStr = JSON.stringify(userinfo);
		redisClient.hset(
			REDIS_PREFIX + '-room:' + room + '-users',
			username,
			userinfoStr,
			function (err, res) {
			  callback && callback();
			}
		);
	},

  getCard: function(room, id, callback) {
    redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
      var card = JSON.parse(res);
      callback && callback(card);
    });
  },

  editCard: function(room, id, card, callback) {
    redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
      var storedCard = JSON.parse(res);
      if (storedCard === null){
        callback && callback(null);
      }
      else {
        const cardFields = ['colour', 'rot', 'x', 'y', 'text', 'type', 'sticker'];
        // Update only supplied fields
        cardFields.forEach(field => {
          if (card[field])
            storedCard[field] = card[field];
        });
        redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(storedCard), function(err, res) {
          callback && callback(storedCard);
        });
      }
    });
  },

  cardEdit: function(room, id, text, colour) {
    const card = {};
    if (text) card.text = text;
    if (colour) card.colour = colour;
    this.editCard(room, id, card);
  },

	cardSetXY: function(room, id, x, y) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', id, function(err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
				card.x = x;
				card.y = y;
				redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', id, JSON.stringify(card));
			}
		});
	},

	deleteCard: function(room, id, callback) {
		redisClient.hdel(
			REDIS_PREFIX + '-room:' + room + '-cards',
			id,
			function (){
			  callback && callback();
			}
		);
	},

	addSticker: function(room, cardId, stickerId) {
		redisClient.hget(REDIS_PREFIX + '-room:' + room + '-cards', cardId, function(err, res) {
			var card = JSON.parse(res);
			if (card !== null) {
                if (stickerId === "nosticker")
                {
                    card.sticker = null;

                    redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
                }
                else
                {
                    if (card.sticker !== null)
                        stickerSet = new sets.Set( card.sticker );
                    else
                        stickerSet = new sets.Set();

                    stickerSet.add(stickerId);

                    card.sticker = stickerSet.array();

                    redisClient.hset(REDIS_PREFIX + '-room:' + room + '-cards', cardId, JSON.stringify(card));
                }

			}
		});
	},

	setBoardSize: function(room, size, callback) {
		redisClient.set(REDIS_PREFIX + '-room:' + room + '-size', JSON.stringify(size), function (err, res) {
		  callback && callback();
		});
	},

	getBoardSize: function(room, callback) {
		redisClient.get(REDIS_PREFIX + '-room:' + room + '-size', function (err, res) {
			callback(JSON.parse(res));
		});
	},

	getAllTexts: function(room, callback) {
		redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-texts', function (err, res) {
			//console.log(res);
			var texts = [];

			for (var i in res) {
				texts.push( res[i] );
			}
			//console.dir(cards);

			callback(texts);
		});
	},

  getAllTextsMap: function(room, callback) {
    redisClient.hgetall(REDIS_PREFIX + '-room:' + room + '-texts', function (err, res) {
      callback && callback(res);
    });
  },

  setAllTextsMap: function(room, texts, callback) {
    redisClient.hmset(REDIS_PREFIX + '-room:' + room + '-texts', texts, function (err, res) {
      callback && callback();
    });
  },

	textEdit: function(room, id, text, callback) {

		if (text !== null) {
			redisClient.hset(REDIS_PREFIX + '-room:' + room + '-texts', id, text, function (err, res) {
			  callback && callback();
			});
		}

	}

};
exports.db = db;
