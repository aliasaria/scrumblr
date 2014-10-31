var fs = require('fs');

exports.database = {
	type: 'redis',
	prefix: '#scrumblr#'
};

/*
	Create a conf directory containing a file config.js
	
	In here, configure your jira connection details like so:
	
	exports.additionalConfig = {
		jiraUrl: 'https://jira.url/',
		jiraUser: 'username',
		jiraPass: 'password'
}

*/

if (fs.existsSync('./conf/config.js')) {
	exports.config = require('./conf/config.js').additionalConfig;
}
