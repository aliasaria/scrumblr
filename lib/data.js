var conf = require('../config.js').database;

exports.db = require('./data/'+conf.type+'.js').db;

/*
var db = function(callback) { }

db.prototype = {
  clearRoom: function(room, callback) { },

  // theme commands
  setTheme: function(room, theme) { },

  getTheme: function(room, callback) { },

  // Column commands
  createColumn: function(room, name, callback) { },

  getAllColumns: function(room, callback) { },

  deleteColumn: function(room) { },

  setColumns: function(room, columns) { },

  // Card commands
  createCard: function(room, id, card) { },

  getAllCards: function(room, callback) { },

  cardEdit: function(room, id, text) { },

  cardSetXY: function(room, id, x, y) { },

  deleteCard: function(room, id) { },

  addSticker: function(room, cardId, stickerId) { }
};
exports.db = db;
*/
