'use strict';

module.exports = function(app, http, plugin) {

	if (plugin.useSSL) {

		http.get('/testHttps', function(req, res) {
			console.log(req.body);
			res.send('test success')
		});
	} else {

		http.get('/testHttp', function(req, res) {
			console.log(req.body);
			res.send('test success')
		});
	}
};