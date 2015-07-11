(function() {

    'use strict';

    var MongoClient = require('mongodb').MongoClient;
    var assert = require('assert');
    var requestPromise = require('request-promise');
    var PoissonProcess = require('poisson-process');

    assert.notEqual(null, process.env.MONGOLAB_URI, 'NO MongoDb Uri');

    MongoClient.connect(process.env.MONGOLAB_URI, function(err, db) {

        assert.equal(null, err);

        var startHour = process.env.START_HOUR || 7;
        var endHour = process.env.END_HOUR || 22;

        assert.ok(endHour > startHour, "END_HOUR Must be Greater Than START_HOUR");

        var reminderProc;

        if (process.env.REMINDERS !== '0') {

            var reminders = process.env.REMINDERS || 12;

            console.log(reminders, 'Reminders between', startHour, 'and', endHour);

            var interval = new Date(((endHour - startHour) / reminders) * (1000 * 60 * 60));

            console.log('interval:', interval.getHours(), 'hours', interval.getMinutes(), 'minutes', interval.getSeconds(), 'seconds');

            reminderProc = PoissonProcess.create(interval.valueOf(), function() {

                var now = new Date();

                if (now.getHours() < startHour || now.getHours() > endHour) {
                    return;
                }

                var topics = [
                    'Wearing',
                    "Company",
                    "Activity"
                ];

                var topic = topics[Math.floor(Math.random()*topics.length)];

                console.log('Requesting Reminder:', topic);

                requestPromise.get({

                    uri: 'https://maker.ifttt.com/trigger/reminder/with/key/cXEKfmsT9_V-J4Q_3EJpcb',
                    method: 'POST',
                    json: true,
                    body: { value1: topic }

                }).catch(console.error);

            });

            reminderProc.start();

        }
        var express = require('express');
        var parser = require('body-parser');

        var app = express();
        app.set('port', process.env.PORT || 5000);

        app.use(express.static(__dirname + '/public'));
        app.use(parser.json());
        app.use(parser.urlencoded({ extended: true }));

        app.get('/', function(req, res) {

            res.status(200).send('Hello World');

        });

        app.post('/report', function(req, res) {

            //console.log('query:', req.query);
            //console.log('params:', req.params);
            //console.log('body:', req.body);

            var report = {
                message: req.body.Body,
                timestamp: new Date()
            };

            report.items = report.message.match(/(\w+)/g).map(function(item) {
                return item.toLowerCase();
            });

            console.log('report:', report);

            db.collection('reports').insertOne(report, function(error) {

                assert.equal(null, error);

                var body = { 'value1': report.message };

                requestPromise.get({

                    uri: 'https://maker.ifttt.com/trigger/thanks/with/key/cXEKfmsT9_V-J4Q_3EJpcb',
                    method: 'POST',
                    json: true,
                    body: body

                }).catch(console.error);

                res.
                    set('Content-Type', 'text/xml')
                    .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

            });

        });

        app.post('/reporter', function(req, res) {

            console.log(req.body);

            requestPromise.get({

                uri: req.body.uri,
                json: true

            }).then(function(report) {

                console.log(report);

                db.collection('reporter').insertOne(report, function(error) {

                    assert.equal(null, error);

                });

            }).catch(console.error);

            res.status(200).end();

        });

        var server = app.listen(app.get('port'), function() {
            console.log('Node app running on port', app.get('port'));
        });

        function shutdown() {

            console.log('Shutdown...');

            server.close(function() {

                reminderProc && reminderProc.stop();
                db.close();

                process.exit(0);

            });

            var timeout = setTimeout(function() {

                console.log('Server failed to shutdown in normal time, terminating...');

                process.exit(0);

            }, 10 * 1000);

            timeout.unref();

        }

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    });

})();