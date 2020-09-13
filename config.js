exports.database = {
	type: 'mongodb',
	connUrl: 'mongodb+srv://paullam:gkkxUUv6zbUEZKp1@cluster0.o8qql.mongodb.net/scrumblr?retryWrites=true&w=majority'
};

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

/*
exports.database = {
	type: 'redis',
	prefix: '#scrumblr#',
	redis: argv.redis || '//127.0.0.1:6379'
};*/