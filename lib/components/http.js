'use strict';

var express = require('express');
var http = require('http');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

module.exports = function(app, opts) {
  return new Http(app, opts);
};

var DEFAULT_HOST = '127.0.0.1';
var DEFAULT_PORT = 3001;

var createLogger = function(logger) {
  return express.logger({
    format: 'short',
    stream: {
      write: function(str) {
        if (!!logger) {
          logger.debug(str);
        } else {
          console.log(str);
        }
      }
    },
  })
};

var Http = function(app, opts) {
  opts = opts || {};
  this.app = app;
  this.http = express();
  // console.log('Http opts:', opts);
  this.host = opts.host || DEFAULT_HOST;
  this.port = opts.port || DEFAULT_PORT;

  this.http.set('port', this.port);
  this.http.set('host', this.host);
  this.http.use(createLogger(opts.logger));
  this.http.use(express.urlencoded());
  this.http.use(express.json());
  this.http.use(express.methodOverride());
  this.http.use(this.http.router);

  var self = this;
  this.app.configure('development', function() {
    self.http.use(express.errorHandler());;
  });
  this.loadRoutes();
  this.server = null;
};

Http.name = '__Http__';

Http.prototype.loadRoutes = function() {
  this.http.get('/', function(req, res) {
    res.send('pomelo-http-plugin ok!');
  });

  var routesPath = path.join(this.app.getBase(), 'app/servers', this.app.getServerType(), 'route');
  // console.log(routesPath);
  assert.ok(fs.existsSync(routesPath), 'Cannot find route path: ' + routesPath);

  var self = this;
  fs.readdirSync(routesPath).forEach(function(file) {
    if (/.js$/.test(file)) {
      var routePath = path.join(routesPath, file);
      // console.log(routePath);
      require(routePath)(self.app, self.http);
    }
  });
}

Http.prototype.start = function(cb) {
  var self = this;

  console.log('Http start', self.app.getServerId(), 'url: http://' + self.host + ':' + self.port);

  this.server = http.createServer(this.http).listen(this.port, this.host, function() {
    console.log('Http start success');
    process.nextTick(cb);
  });
}

Http.prototype.afterStart = function(cb) {
  console.log('Http afterStart');
  process.nextTick(cb);
}

Http.prototype.stop = function(force, cb) {
  this.server.close(function() {
    console.log('Http stop');
    cb();
  });
}