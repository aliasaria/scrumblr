var should = require('should');
var dash = require('lodash');
var unit = require('../lib/scrubber');

describe('MMM sanitize library', function () {

	it('plain string returns unaltered', function (done) {
		var toScrub = 'this is a string';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(toScrub);
		done();
	});

	it('long string is truncated at 65535', function (done) {
		var toScrub= 'a';
		for (i = 0; i<70000; i++) {
			toScrub += 'a';
		}

		var scrubbed = unit.scrub(toScrub);
		scrubbed.length.should.eql(65535);
		done();
	});

	it('null returns empty string', function (done) {
		var toScrub = null;
		var scrubbed = unit.scrub(toScrub);
		should.not.exist(scrubbed);
		done();
	});

	it('undefined returns empty string', function (done) {
		var scrubbed = unit.scrub();
		should.not.exist(scrubbed);
		done();
	});

	it('links dont get re-written - may be bad!!', function (done) {
		var toScrub = 'with a link <a href="http://myhost.somewhere/test">myhost</a> in here';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(toScrub);
		done();
	});

	it('line breaks dont get re-written', function (done) {
		var toScrub = 'this is a string<br>';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(toScrub);
		done();
	});

	it('text that appears to start with jira link in it gets re-written', function (done) {
		var toScrub = 'ALCHEMY-246 in here';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql('<a href="https://jira.corp.peer1.net/browse/ALCHEMY-246">ALCHEMY-246</a><br> in here');
		done();
	});

	it('carriage returns get re-written to break tags', function (done) {
		var toScrub = 'first line\nsecond line';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql('first line<br>second line');
		done();
	});

	it('integers do not get re-written', function (done) {
		var toScrub = 12345;
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(12345);
		done();
	});

	it('floats do not get re-written', function (done) {
		var toScrub = 12345.12345;
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(12345.12345);
		done();
	});

	it('strings containing only floats do not get re-written', function (done) {
		var toScrub = '12345.12345';
		var scrubbed = unit.scrub(toScrub);
		scrubbed.should.eql(12345.12345);
		done();
	});


});
