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

exports.server = {
	port: argv.port || 8080,
	baseurl: argv.baseurl || '/'
};

exports.googleanalytics = {
	enabled: argv['gaEnabled'] || false,
	account: argv['gaAccount'] || "UA-2069672-4"
};

var redis_conf = argv.redis || '127.0.0.1:6379';
exports.database = {
	sock: argv['sock'] || false,
	type: 'redis',
	prefix: '#scrumblr#',
	host: redis_conf.split(':')[0] || '127.0.0.1',
	port: redis_conf.split(':')[1] || 6379
};

