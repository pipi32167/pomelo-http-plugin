'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var methodOverride = require('method-override');
var morgan = require('morgan')
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

module.exports = function(app, opts) {
  return new Http(app, opts);
};

var DEFAULT_HOST = '127.0.0.1';
var DEFAULT_PORT = 3001;

var createLogger = function(logger) {
  return morgan('short', {
    stream: {
      write: function(str) {
        logger.debug(str);
      }
    },
  })
};

var defaultLogger = function() {
  return {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
  }
}

var Http = function(app, opts) {
  opts = opts || {};
  this.app = app;
  this.http = express();
  // self.logger.info('Http opts:', opts);
  this.host = opts.host || DEFAULT_HOST;
  this.port = opts.port || DEFAULT_PORT;

  if (!!opts.isCluster) {
    var serverId = app.getServerId();
    var params = serverId.split('-');
    var idx = parseInt(params[params.length - 1], 10);
    if (/\d+\+\+/.test(this.port)) {

      this.port = parseInt(this.port.substr(0, this.port.length - 2));
    } else {
      assert.ok(false, 'http cluster expect http port format like "3000++"');
    }

    this.port = this.port + idx;
  }

  this.useSSL = !!opts.useSSL;
  this.sslOpts = {};
  if (this.useSSL) {
    this.sslOpts.key = fs.readFileSync(path.join(app.getBase(), opts.keyFile));
    this.sslOpts.cert = fs.readFileSync(path.join(app.getBase(), opts.certFile));
  }

  this.http.set('port', this.port);
  this.http.set('host', this.host);
  this.logger = opts.logger || defaultLogger();
  this.http.use(createLogger(this.logger));
  this.http.use(bodyParser.urlencoded({
    extended: false
  }));
  this.http.use(bodyParser.json());
  this.http.use(methodOverride());

  var self = this;
  this.app.configure('development', function() {
    self.http.use(errorhandler());;
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
  // self.logger.info(routesPath);
  assert.ok(fs.existsSync(routesPath), 'Cannot find route path: ' + routesPath);

  var self = this;
  fs.readdirSync(routesPath).forEach(function(file) {
    if (/.js$/.test(file)) {
      var routePath = path.join(routesPath, file);
      // self.logger.info(routePath);
      require(routePath)(self.app, self.http);
    }
  });
}

Http.prototype.start = function(cb) {
  var self = this;

  self.logger.info('Http start', self.app.getServerId(), 'url: http://' + self.host + ':' + self.port);

  if (this.useSSL) {
    this.server = https.createServer(this.sslOpts, this.http).listen(this.port, this.host, function() {
      self.logger.info('Http start success');
      process.nextTick(cb);
    });
  } else {
    this.server = http.createServer(this.http).listen(this.port, this.host, function() {
      self.logger.info('Http start success');
      process.nextTick(cb);
    });
  }
}

Http.prototype.afterStart = function(cb) {
  this.logger.info('Http afterStart');
  process.nextTick(cb);
}

Http.prototype.stop = function(force, cb) {
  var self = this;
  this.server.close(function() {
    self.logger.info('Http stop');
    cb();
  });
}