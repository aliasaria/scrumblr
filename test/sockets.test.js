var should = require('should');
var io = require('socket.io-client');

var socketURL = 'http://0.0.0.0:8124';

var options ={
	transports: ['websocket'],
	'force new connection': true
};

var user1 = {'name':'Matt'};
var user2 = {'name':'Adrian'};

describe.skip("Sockets",function(){

	it('Should ask to initialize as first action', function(done){
		var client1 = io.connect(socketURL, options);

		client1.on('connect', function(data){
			client1.emit('message', {action: 'initializeMe', data: ''});

		});

	});



});
