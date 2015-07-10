(function() {

    'use strict';

    var express = require('express');
    var app = express();

    app.set('port', process.env.PORT || 5000);

    app.use(express.static(__dirname + '/public'));

    app.get('/', function(req, res) {

        console.log('GET /');
        res.status(200).send('Hello World');

    });

    app.post('/report', function(req, res) {

        console.log('POST /report');

    });

    app.listen(app.get('port'), function() {
        console.log('Node app running on port', app.get('port'));
    });

})();