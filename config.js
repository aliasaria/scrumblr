/*exports.database = {
	type: 'mongodb',
	hostname: 'localhost',
	port: 27017,
	database: 'scrumblr'
};
*/

exports.database = {
	type: 'redis',
	prefix: '#scrumblr#'
};

