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
const sfmcHelper = require('./routes/sfmchelper');
const sfmc = require('./routes/sfmc');
var session = require('express-session')
var app = express();

app.set('trust proxy', 1) // trust first proxy
app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: false
    }))
    // Configure Express
app.set('views', `${__dirname}/public/`);
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'html');

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
app.get('/demo', function(req, res) {
    console.log(req.session.token);
    console.log(security.getDecyptedObject(req.session.token));
    res.render('home/index.html');

});
app.get('xssEscape', security.xssEscape);
app.get('parseTojwtEncripted', security.parseTojwtEncripted);
app.get('getDecyptedObject', security.getDecyptedObject);

app.post('/sfmc/TokenContext', sfmc.TokenContext);
app.post('/sfmc/UpsertCampaignRow', sfmc.UpsertCampaignRow);
app.post('/sfmc/UpsertDecisionRow', sfmc.UpsertDecisionRow);
app.post('/sfmcHelper/authorize', sfmcHelper.authorize);
app.get('/sfmcHelper/refreshToken', sfmcHelper.refreshToken);
app.get('/sfmcHelper/createSoapClient', sfmcHelper.createSoapClient);
app.get('/sfmcHelper/simpleFilter', sfmcHelper.simpleFilter);
app.get('/sfmcHelper/getAccessToken', sfmcHelper.getAccessToken);
app.get('/sfmcHelper/retrieveRequest', sfmcHelper.retrieveRequest);
app.get('/sfmcHelper/getCompletedCampaigns', sfmcHelper.getCompletedCampaigns);
app.post('/sfmcHelper/CompletedCampaigns', sfmcHelper.CompletedCampaigns);
app.post('/sfmcHelper/CompletedJourneys', sfmcHelper.CompletedJourneys);
app.post('/sfmcHelper/ContactSynced', sfmcHelper.ContactSynced);
app.post('/sfmcHelper/getFeederCampaignRowByJourneyID', sfmcHelper.getFeederCampaignRowByJourneyID);
app.post('/sfmcHelper/searchRow', sfmcHelper.searchRow);
app.post('/sfmcHelper/completedWizard', sfmcHelper.completedWizard);
app.post('/sfmcHelper/insertRowSet', sfmcHelper.insertRowSet);
app.post('/sfmcHelper/rrDataExtensionForSplitData', sfmcHelper.rrDataExtensionForSplitData);
app.post('/sfmcHelper/upsertDecisionData', sfmcHelper.upsertDecisionData);
app.post('/sfmcHelper/rrDataExtensionForSplitDataByCity', sfmcHelper.rrDataExtensionForSplitDataByCity);
app.post('/sfmcHelper/searchByEmail', sfmcHelper.searchByEmail);

// HubExchange Routes

app.get('/login', routes.login);
app.get('/logout', routes.logout);


http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});