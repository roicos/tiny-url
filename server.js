'use strict';

// app prototype doesn't mind short url duplication, 

var fs = require('fs');
var validUrl = require('valid-url');
var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var dbAddress = "mongodb://roicos:atdoijSyicEtEz7@ds019482.mlab.com:19482/tinyurl";
var db;


// creating connection pull
MongoClient.connect(dbAddress, function(err, connection) {  
    if(err){
      console.log("Database connection error: " + err);
    }
    db = connection;
});


if (!process.env.DISABLE_XORIGIN) {
  app.use(function(req, res, next) {
    var allowedOrigins = ['https://narrow-plane.gomix.me', 'https://www.freecodecamp.com'];
    var origin = req.headers.origin || '*';
    if(!process.env.XORIG_RESTRICT || allowedOrigins.indexOf(origin) > -1){
         console.log(origin);
         res.setHeader('Access-Control-Allow-Origin', origin);
         res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
    next();
  });
}

app.use('/public', express.static(process.cwd() + '/public'));

app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
  });

app.use('/:shortUrl([0-9a-zA-Z]{5})',function(req, res, next){
    const urlToFind = { 'shortUrl': req.params.shortUrl };
    db.collection('urls').findOne(urlToFind, (err, url) => {
        if (err) {
          res.end('A database error has occurred: ' + err);
        } else {
          if(url == null){
            res.end("No such url in database");
          } else {
            res.redirect(url.url);
          }
        }
    });
});

app.use('/new/:url(*)',function(req, res, next){
  checkurl(req, res, next);
});
    
function checkurl(req, res, next){ 
  var url = req.params.url;
  if (validUrl.isUri(url)){
      return next();
  } else {
      res.end('Wrong url format, make sure you have a valid protocol and real site');
  }
}

app.get('/new/:url(*)', function (req, res){
    const urlToFind = { 'url': req.params.url };
    db.collection('urls').findOne(urlToFind, (err, url) => {
        if (err) {
          res.end('A database error has occurred: ' + err);
        } else {
          if(url == null){
            var jsonData = {};
            jsonData["original_url"] = req.params.url;
            var shortUrl = makeShortUrl();
            jsonData["short_url"] = shortUrl;
            const url = { url: req.params.url, shortUrl : shortUrl}
            db.collection('urls').insert(url, (err, results) => {
              if (err) { 
                res.end('An error inserting in database has occurred: '+ err ); 
              } else {
                res.status(200).json(jsonData);
              }
            });
          } else {
            res.end('This url is already exists');
          }
       }
    });
});
  

function makeShortUrl(){
  
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var shortUrl = ""; 

  for (var i = 0; i < 5; i++){
    shortUrl += possible.charAt(Math.floor(Math.random() * possible.length));
  }       
  
  return shortUrl;
}
  
app.route('/').get(function(req, res) {
		  res.sendFile(process.cwd() + '/views/index.html');
})

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});