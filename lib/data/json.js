var fs = require('fs');

var db = function(callback) {

	fs.writeFile('/cihwrk/ECPSScrumblr/save-data/write-test.txt', 'Should be deleted!', function(err) {
		if(err) {
			console.log(err);
		}
	});
	
	fs.unlink('/cihwrk/ECPSScrumblr/save-data/write-test.txt', (err) => {
		if (err) {
			console.log(err);
		}
		// Remove comment if you want to create the demo room on startup
		//callback();
	});
};

db.prototype = {
	clearRoom: function(room, callback) {
		fs.unlink('/cihwrk/ECPSScrumblr/save-data' + room, function(err) {
			if (err) {
				console.log(err);
			}
			callback();
		});
		
	},
	
	// password commands
	setPassword: function(room, theme) {
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/password.json', theme, function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	getPassword: function(room, callback) {
		fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/password.json', 'utf8', function (err, data) {
			if (err) {
				callback(null);
				return console.log('No password.json file found to load for the room ' + room);
			}
			
			callback(data);
		});
	},
	
	clearPassword: function(room, callback) {
		fs.unlink('/cihwrk/ECPSScrumblr/save-data' + room + '/password.json', function(err) {
			if (err) {
				console.log(err);
			}
			if (typeof callback != "undefined" && callback !== null) callback();
		});
	},

	// theme commands
	setTheme: function(room, theme) {
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/theme.json', theme, function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	getTheme: function(room, callback) {
		fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/theme.json', 'utf8', function (err, data) {
			if (err) {
				callback(null);
				return console.log('No theme.json file found to load for the room ' + room);
			}
			
			callback(data);
		});
	},
	
	// font commands
	setFont: function(room, font) {
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/font.json', JSON.stringify(font), function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	getFont: function(room, callback) {
		fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/font.json', 'utf8', function (err, data) {
			if (err) {
				callback(null);
				return console.log('No font.json file found to load for the room ' + room);
			}
			
			callback(JSON.parse(data));
		});
	},

	// Column commands
	createColumn: function(room, name, callback) {
		if (fs.exists('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json')) {
			
			fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', 'utf8', function (err, data) {
				if (err) {
					return console.log('Unable to read the columns.json file for the room ' + room);
				}
			
				var columns = JSON.stringify(data);
				columns.push(name);
				
				fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', JSON.stringify(columns), function(err) {
					if(err) {
						console.log(err);
					}
					
					if (typeof callback != "undefined" && callback !== null) callback();
				});
			});
		}
	},

	getAllColumns: function(room, callback) {
		fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', 'utf8', function (err, data) {
			if (err) {
				callback([]);
				return console.log('No columns.json file found to load for the room ' + room);
			}

			callback(JSON.parse(data));
		});
	},

	deleteColumn: function(room) {
		if (fs.exists('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json')) {
			
			fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', 'utf8', function (err, data) {
				if (err) {
					return console.log('Unable to read the columns.json file for the room ' + room);
				}
			
				var columns = JSON.stringify(data);
				columns.pop();
				
				fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', JSON.stringify(columns), function(err) {
					if(err) {
						console.log(err);
					}
					
					if (typeof callback != "undefined" && callback !== null) callback();
				});
			});
		}
	},

	setColumns: function(room, columns) {
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/columns.json', JSON.stringify(columns), function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	// Card commands
	createCard: function(room, id, card) {
		var cardString = JSON.stringify(card);
		
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/cards/' + id + '.json', cardString, function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	getAllCards: function(room, callback) {
		var dir = '/cihwrk/ECPSScrumblr/save-data' + room + '/cards';
		var cards = [];
		
		fs.readdir(dir, (err, files) => {
			
			if (err) {
				// Attempt to make the card directory
				console.log('Creating the save data directory for ' + room);
				fs.mkdir('/cihwrk/ECPSScrumblr/save-data' + room);
				fs.mkdir(dir);
			}
			
			if (files == null || files.length == 0) {
				callback(cards);
				return console.log('There were no cards found to load for ' + room);
			}
			
			files.forEach(file => {
			
				fs.readFile(dir + '/' + file, 'utf8', function (err, data) {
					if (err) {
						console.log(err);
					}
				
					cards.push(JSON.parse(data));
					callback(cards);
				});
			});
		})
	},

	cardEdit: function(room, id, text) {
		var dir = '/cihwrk/ECPSScrumblr/save-data' + room + '/cards/';
		
		fs.readFile(dir + id + '.json', 'utf8', function (err, data) {
			if (err) {
				return console.log('Unable to locate the card ' + id + ' for the room ' + room);
			}
			
			var card = JSON.parse(data);
			if (card !== null) {
				
				card.text = text;
				
				fs.writeFile(dir + id + '.json', JSON.stringify(card), function(err) {
					if(err) {
						console.log(err);
					}
				});
			}
		});
	},

	cardSetXY: function(room, id, x, y) {
		var dir = '/cihwrk/ECPSScrumblr/save-data' + room + '/cards/';
		
		fs.readFile(dir + id + '.json', 'utf8', function (err, data) {
			if (err) {
				return console.log('Unable to locate the card ' + id + ' for the room ' + room);
			}
			
			var card = JSON.parse(data);
			if (card !== null) {
				
				card.x = x;
				card.y = y;
				
				fs.writeFile(dir + id + '.json', JSON.stringify(card), function(err) {
					if(err) {
						console.log(err);
					}
				});
			}
		});
	},

	deleteCard: function(room, id) {
		fs.unlink('/cihwrk/ECPSScrumblr/save-data' + room + '/cards/' + id + '.json', (err) => {
			if (err) {
				console.log(err);
			}
		});
	},

	addSticker: function(room, cardId, stickerId) {
		var dir = '/cihwrk/ECPSScrumblr/save-data' + room + '/cards/';
		
		fs.readFile(dir + cardId + '.json', 'utf8', function (err, data) {
			if (err) {
				return console.log('Unable to locate the card ' + cardId + ' for the room ' + room);
			}
			
			var card = JSON.parse(data);
			if (card !== null) {
				if (stickerId === "nosticker") {
					card.sticker = null;
				} else {
					
					var stickerSet = [];
					
					if (card.sticker !== null) {
						stickerSet = card.sticker;
					}
					
					stickerSet.push(stickerId);
					card.sticker = stickerSet;
				}
				
				fs.writeFile(dir + cardId + '.json', JSON.stringify(card), function(err) {
					if(err) {
						console.log(err);
					}
				});
			}
		});
	},

	setBoardSize: function(room, size) {
		fs.writeFile('/cihwrk/ECPSScrumblr/save-data' + room + '/size.json', JSON.stringify(size), function(err) {
			if(err) {
				console.log(err);
			}
		});
	},

	getBoardSize: function(room, callback) {
		fs.readFile('/cihwrk/ECPSScrumblr/save-data' + room + "/size.json", 'utf8', function (err, data) {
			if (err) {
				callback(null);
				return console.log('No size.json file found to load for the room ' + room);
			}
			
			callback(JSON.parse(data));
		});
	}

};
exports.db = db;
