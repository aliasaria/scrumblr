// This is based on PubSubCore
// https://github.com/PeterScott/pubsubcore/blob/master/pubsubcore.js

// PubSubCore: Simple pub/sub library for Node.js and Socket.IO

var util = require('util');
var sets = require('simplesets');
var io   = require('socket.io');
var net  = require('net');

//////////////////////////////
// Tracking who's in what room
//////////////////////////////

// Dict mapping room names with people to sets of client objects.
var rooms = {};
// Dict mapping room names with people to sets of usernames.
var room_users = {};
// Dict mapping sids to sets of rooms.
var sid_rooms = {};


// Add a client to a room and return the sid:client mapping.
exports.add_to_room = function (client, room, callback) {
    //console.log('Client ' + client.username + ' (' + client.id + ') added to room ' + room);

    if (!(sid_rooms.hasOwnProperty(client.id))) sid_rooms[client.id] = new sets.Set();
    sid_rooms[client.id].add(room);

    if (!(rooms.hasOwnProperty(room))) rooms[room] = new sets.Set();
    rooms[room].add(client);

    if (!(room_users.hasOwnProperty(room))) room_users[room] = new sets.Set();
    room_users[room].add(client.username);

    callback(rooms[room].array());
};

// Remove a client from all rooms and return the username:client
// mapping for everybody in those rooms.
exports.remove_from_all_rooms = function (client, callback) {
    var affected_clients = new sets.Set();
    if (sid_rooms.hasOwnProperty(client.id)) {
	var client_rooms = sid_rooms[client.id].array();
	for (var i = 0; i < client_rooms.length; i++) {
	    var room = client_rooms[i];
	    if (rooms.hasOwnProperty(room)) {
		rooms[room].remove(client);
		if (rooms[room].size() === 0)
		    delete rooms[room];
	    }
	    if (room_users.hasOwnProperty(room)) {
		room_users[room].remove(client.username);
		if (room_users[room].size() === 0)
		    delete room_users[room];
	    }
	    if (rooms.hasOwnProperty(room)) {
		var this_room = rooms[room].array();
		for (var j = 0; j < this_room.length; j++)
		    affected_clients.add(this_room[j]);
	    }
	}
    }
    //console.log('Client ' + client.username + ' (' + client.id + ') disconnected.');
    delete sid_rooms[client.id];
    callback(affected_clients.array());
};

// Remove a client from a room and return the username:client mapping
// for everybody in that room. Returns [] if the room does not exist,
// or if the client was not in the room to begin with.
function remove_from_room(client, room, callback) {
    if (!rooms.hasOwnProperty(room) || !rooms[room].has(client)) {
	callback([]);
	return;
    }

    // Delete from the room
    rooms[room].remove(client);
    if (rooms[room].size() === 0)
	delete rooms[room];
    if (room_users.hasOwnProperty(room)) {
	room_users[room].remove(client.username);
	if (room_users[room].size() === 0)
	    delete room_users[room];
    }

    callback(exports.room_clients(room));
}

// Return list of clients in the given room.
exports.room_clients = function(room) {
    return rooms.hasOwnProperty(room) ? rooms[room].array() : [];
};

// Return true if room contains the given client, false otherwise.
exports.client_in_room = function(room, client) {
    return rooms.hasOwnProperty(room) && rooms[room].has(client);
};

// Return list of usernames in given room
exports.users_in_room = function(room) {
    return room_users.hasOwnProperty(room) ? room_users[room].array() : [];
};

// Return list of usernames in given room
exports.room_clients_other_than_me = function(room, client) {
	if (rooms.hasOwnProperty(room))
	{
		var clients = rooms[room];
		//console.dir(clients.array());

		clients.remove(client);
		//console.dir(clients.array());
		return clients.array();
	}
	else
	{
		return [];
	}
};

//gets the current room of the client (assumes one room -- will select first one if in multiple)
exports.get_room = function (client) {
   var client_rooms = null;

   if (sid_rooms.hasOwnProperty(client.id))
	{
	    client_rooms = sid_rooms[client.id].array();
	}

	if ( client_rooms !== null )
		return client_rooms[0];
	else
		return null;
};


// Generic server code

exports.add_to_room_and_announce = function (client, room, msg) {

		// Add user info to the current dramatis personae
		exports.add_to_room(client, room, function(clients) {
		    // Broadcast new-user notification
		    for (var i = 0; i < clients.length; i++)
			{
				if (clients[i].id != client.id)
					clients[i].json.send(msg);
			}
		});
};

/*
exports.on_leave_room = function (client, room) {

   remove_from_room(client, room, function(clients) {
	console.log(client + ' disconnected, yo');
	console.log(clients);
	for (var i = 0; i < clients.length; i++)
	    clients[i].send({
		announcement: true,
		name: client.username || 'anonymous',
		action: 'disconnected'
	    });
    });

}*/

//remember that this announces to all rooms that this client was a member of
exports.remove_from_all_rooms_and_announce = function (client, msg) {
	exports.remove_from_all_rooms(client, function(clients) {
	    for (var i = 0; i < clients.length; i++)
		{
			if (clients[i].id != client.id)
				clients[i].json.send(msg);
		}
	});
};

//////////////////////////////
// Broadcasting functions
//////////////////////////////

// Broadcast message to all clients
exports.broadcast = function(msg) {
    if (socket) socket.broadcast(msg);
    net_server_streams.each(function(stream) {
	stream.write(JSON.stringify(msg)+'\r\n');
    });
};

// Broadcast message to all clients in a given room.
exports.broadcast_room = function(room, msg) {
    var clients = exports.room_clients(room);
    for (var i = 0; i < clients.length; i++)
	clients[i].json.send(msg);
};

// Broadcast message to all the other clients that are in rooms with this client
exports.broadcast_to_roommates = function (client, msg) {
	var roommates = new sets.Set();

   if (sid_rooms.hasOwnProperty(client.id))
	{
		var client_rooms = sid_rooms[client.id].array();
		for (var i = 0; i < client_rooms.length; i++)
		{
		   var room = client_rooms[i];
		   if (rooms.hasOwnProperty(room))
			{
				var this_room = rooms[room].array();
				for (var j = 0; j < this_room.length; j++)
					roommates.add(this_room[j]);
		   }
		}
	}

	//remove self from the set
	roommates.remove(client);
	roommates = roommates.array();

	//console.log('client: ' + client.id + " is broadcasting to: ");


   for (var k = 0; k < roommates.length; k++)
	{
		//console.log('  - ' + roommates[i].id);
		roommates[k].json.send(msg);
	}
};
