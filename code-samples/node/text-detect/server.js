// ---------------------------------------------------------------
// Import modules
// ---------------------------------------------------------------
var express     = require('express');
var path        = require('path');
var fs          = require('fs');
var request     = require('request');
var multer      = require('multer');
var dotenv      = require('dotenv');

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

app.post('/api/sceneTextRecognition', upload, (req, res, next) => {   
  sendImage('https://sandbox.api.sap.com/ml/scenetextrecognition/scene-text-recognition', req.file.path, 
    function(data){
      res.send(data);
    });
});

/*
  url: the service to use
  path: the path to the file to upload
  callback: if you want the data ... its up to you
*/
function sendImage(url, path, callback, options){
  console.log("sending image to LML");

  if(!options){
    options = {};
  }

  var formData = {
    files: fs.createReadStream(path),
    options: JSON.stringify(options)
  };

  request.post({
    url: url, 
    formData: formData,
    headers: {
        "Accept": "application/json",
        "APIKey": APIKey
      }
  }, function optionalCallback(err, httpResponse, body) {
      if (err) {
        return console.error('upload failed:', err);
      }
      if(callback)
        callback(body);
  });
}

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
