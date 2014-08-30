var should = require('should');
var dash = require('lodash');
var htmlparser = require("htmlparser");
var select = require('soupselect').select;
var jsdom = require('jsdom').jsdom;
var cheerio = require('cheerio');

var unit = require('../client/card.js');

describe('card rendering', function () {

	it('getCard returns a div with correct ID', function (done) {
		var card = unit.getCard(123, 'Hello World', 100, 120, 5, 'yellow', null);
		var doc = cheerio.load(card);
		var div = doc('div#123');
		div.length.should.eql(1);
		done();
	});

	it('getCard returns a div with correct classes', function (done) {
		var card = unit.getCard(123, 'Hello World', 100, 120, 5, 'yellow', null);
		var doc = cheerio.load(card);
		var div = doc('div.card');
		div.hasClass('yellow').should.be.true;
		div.hasClass('clearfix').should.be.true;
		div.hasClass('draggable').should.be.true;
		done();
	});

	it('getCard div contains a content div', function (done) {
		var card = unit.getCard(999, 'Hello World', 100, 120, 5, 'yellow', null);
		var doc = cheerio.load(card);
		var mainDiv = doc('div#999');
		var contentDiv = mainDiv.children('div');
		contentDiv.length.should.eql(1);
		contentDiv.attr('id').should.eql('content:999');
		contentDiv.hasClass('content').should.be.true;
		contentDiv.hasClass('stickertarget').should.be.true;
		contentDiv.hasClass('droppable').should.be.true;
		done();
	});

});
