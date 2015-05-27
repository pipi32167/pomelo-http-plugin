'use strict';
var pomelo = require('pomelo');
var httpPlugin = require('../../');
var path = require('path');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'example');

// app configuration
app.configure('development', 'gamehttp', function() {
	app.loadConfig('httpConfig', path.join(app.getBase(), 'config/http.json'));
	app.use(httpPlugin, {
		http: app.get('httpConfig')[app.getServerId()]
	});
});
// start app
app.start();

process.on('uncaughtException', function(err) {
	console.error(' Caught exception: ' + err.stack);
});