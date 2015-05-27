'use strict';

module.exports = function(app, http) {

  http.get('/test', function(req, res) {
  	console.log(req.body);
    res.send('test success')
  });
};