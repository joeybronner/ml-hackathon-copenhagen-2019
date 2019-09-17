// ---------------------------------------------------------------
// Import modules
// ---------------------------------------------------------------
var express     = require('express');
var path        = require('path');
var fs          = require('fs');
var request     = require('request');
var multer      = require('multer');
var dotenv      = require('dotenv');
var LML         = require("./ml-functions.js")

//we need some variables.
dotenv.config();

// ---------------------------------------------------------------
// Instantiate the app
// ---------------------------------------------------------------

var app = express();

var APIKey            = process.env.APIKey;
var clientID          = process.env.clientID;
var clientSecret      = process.env.clientSecret;
var authenticationURL = process.env.authenticationURL;
var baseURI           = process.env.baseURL;

// Serve 'dynamic' jsx content being transformed if needed
var srcDir = path.resolve(__dirname);
var file;

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname)
    }
});

var upload = multer({storage: storage}).single("image");

/*
Gets the thumbs for the gems example.
*/
app.get('/api/gems', function(req, res){
  var results = [];
  var itemsProcessed = 0;
  fs.readdir(srcDir + '/gems', (err, files) => {
    console.log(files)
    res.write(JSON.stringify(files));
    res.end();
  }) 
});

/*
Compare path for images.
*/
app.post("/api/imageCompare", function(req, res) {
   upload(req, res, function(err) {
       if (err) {
          console.log(err)
          return res.end("Something went wrong!");
       }
       var filePath =  req.file.path;
       LML.imageSearch(filePath, './features.json', function(data){
        res.send(data);
        res.end();
       });
   });
});

//the lightest HTTP server ever.
app.use('/', function (req, res) {
    file = srcDir + req.path;
    res.sendFile(file);
});

// ---------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------
var server = app.listen(process.env.PORT || 1666, function () {
    process.stdout.write('Started dashboard dev server on port ' + server.address().port + '\n');
});
