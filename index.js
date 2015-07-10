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

        var reminders = process.env.REMINDERS || 12;

        console.log(reminders, 'Reminders between', startHour, 'and', endHour);

        var interval = new Date(((endHour - startHour) / reminders) * (1000 * 60 * 60));

        console.log('interval:', interval.getHours(), 'hours', interval.getMinutes(), 'minutes', interval.getSeconds(), 'seconds');

        var reminderProc = PoissonProcess.create(interval.valueOf(), function() {

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

            //requestPromise.get({
            //
            //    uri: 'https://maker.ifttt.com/trigger/reminder/with/key/cXEKfmsT9_V-J4Q_3EJpcb',
            //    method: 'POST',
            //    json: true,
            //    body: { value1: topic }
            //
            //}).catch(console.error);

        });

        reminderProc.start();

        var express = require('express');
        var parser = require('body-parser');

        var app = express();
        app.set('port', process.env.PORT || 5000);

        app.use(express.static(__dirname + '/public'));
        app.use(parser.json());

        app.get('/', function(req, res) {

            res.status(200).send('Hello World');

        });

        app.post('/report', function(req, res) {

            console.log('POST /report', req.body);

            var report = req.body;

            var found = report.timestamp.match(/^(\w+) (\d+), (\d+) at (\d+):(\d+)(\w+)$/);

            var month = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(found[1]) + 1;
            var day = Number(found[2]);
            var year = Number(found[3]);
            var hour = Number(found[4]);
            var minute = Number(found[5]);
            hour = hour + ([ 0, 12 ][[ 'AM', 'PM' ].indexOf(found[6])]);

            report.timestamp = new Date(year, month, day, hour, minute);
            report.items = report.message.match(/(\w+)/g).map(function(item) {
                return item.toLowerCase();
            });
            delete report.message;

            console.log('report:', report);

            db.collection('reports').insertOne(req.body, function(error) {

                assert.equal(null, error);

                var body = { 'value1': report.items.join(', ') };

                requestPromise.get({

                    uri: 'https://maker.ifttt.com/trigger/thanks/with/key/cXEKfmsT9_V-J4Q_3EJpcb',
                    method: 'POST',
                    json: true,
                    body: body

                }).catch(console.error);

                res.status(200).end();

            });

        });

        app.listen(app.get('port'), function() {
            console.log('Node app running on port', app.get('port'));
        });

    });

})();