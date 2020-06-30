'use strict';
// Module Dependencies
// -------------------
var express = require('express');
var bodyParser = require('body-parser');
var errorhandler = require('errorhandler');
var http = require('http');
var path = require('path');
var request = require('request');
const routes = require('./routes');
const security = require('./routes/security');
var app = express();

// Configure Express
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.raw({ type: 'application/jwt' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: 'application/json' }));

//app.use(express.methodOverride());
//app.use(express.favicon());

app.use(express.static(path.join(__dirname, 'public')));

// Express in Development Mode
if ('development' == app.get('env')) {
    app.use(errorhandler());
}
app.get('xssEscape', security.xssEscape);
app.get('parseTojwtEncripted', security.parseTojwtEncripted);
app.get('getDecyptedObject', security.getDecyptedObject);



// HubExchange Routes

app.get('/login', routes.login);
app.get('/logout', routes.logout);

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});