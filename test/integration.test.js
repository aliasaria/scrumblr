//var app = require('../app');
var server = require('../server');
var request = require('supertest');
var server;

describe('User API',function(){

	it('GET /users should return 200',function(done){
		request(server)
			.get('/dfsafsaff')
			.expect(200, function(err, data){
				console.log(data)
				done(err);
			});
	});

//	it('POST /users should return 200',function(done){
//		request()
//			.post('/users')
//			.set('Content-Type','application/json')
//			.write(JSON.stringify({ username: 'test', password: 'pass' }))
//			.expect(200,done);
//	});
});