/*exports.database = {
	type: 'mongodb',
	hostname: 'localhost',
	port: 27017,
	database: 'scrumblr'
};
*/

var argv = require('yargs')
	.usage('Usage: $0 [--port INTEGER [8080]] [--baseurl STRING ["/"]] [--redis STRING:INT [127.0.0.1:6379]] [--gaEnabled] [--gaAccount STRING [UA-2069672-4]]')
	.argv;

const REDIS_CONNECTION = argv.redis ? argv.redis : 'redis://localhost:6379'

exports.server = {
	port: argv.port || 8080,
	baseurl: argv.baseurl || '/'
};

exports.googleanalytics = {
	enabled: argv['gaEnabled'] || false,
	account: argv['gaAccount'] || "UA-2069672-4"
};

exports.database = {
	type: 'redis',
	prefix: '#scrumblr#',
	redis: REDIS_CONNECTION,
};

exports.redis = {
	host: REDIS_CONNECTION.match(/\/\/(.+):/)[1],
	port: REDIS_CONNECTION.match(/:(\d+)/)[1]
}	
