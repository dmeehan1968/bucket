(function() {

    'use strict';

    var MongoClient = require('mongodb').MongoClient;
    var assert = require('assert');

    assert.notEqual(null, process.env.MONGOLAB_URI, 'NO MongoDb Uri');

    MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {

        assert.equal(null, err);

        var express = require('express');
        var parser = require('body-parser');

        var app = express();
        app.set('port', process.env.PORT || 5000);

        app.use(express.static(__dirname + '/public'));
        app.use(parser.json());

        app.get('/', function(req, res) {

            console.log('GET /');
            res.status(200).send('Hello World');

        });

        app.post('/report', function(req, res) {

            console.log('POST /report', req.body);

            db.collection('reports').insertOne(req.body, function(error, result) {

                assert.equal(null, error);

                console.log('report:', result.result);

                res.status(200).end();

            });

        });

        app.listen(app.get('port'), function() {
            console.log('Node app running on port', app.get('port'));
        });

        //db.close();

    });

})();