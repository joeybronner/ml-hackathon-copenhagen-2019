// ---------------------------------------------------------------
// Import modules
// ---------------------------------------------------------------
var express     = require('express');
var path        = require('path');
var fs          = require('fs');
var request     = require('request');
var multer      = require('multer');
var JSZip       = require("jszip");
var dotenv      = require('dotenv');

//we need some variables.
dotenv.config();
var APIKey            = process.env.APIKey;


exports.imageSearch = function(sourceImage, catalogPath , callback){
  console.log("imageSearch: " + sourceImage + "|" + catalogPath)
  extractFeatures(sourceImage, null, function(data){
    compare(catalogPath, data, callback);
  });
}


/*
Uploads a zip file and gets the features in a json file that we shouold save.
*/
var extractFeatures = function (filePath, outPath, cb){
  var formData = {
    files: fs.createReadStream(filePath)
  };
  sendAnyFile('https://sandbox.api.sap.com/ml/imagefeatureextraction/feature-extraction', filePath, cb, null);
}

var compare = function(predictionsPath, targetJSON, cb){
      var zip = new JSZip();

    //this is a function for uploading 
    function saveZipIfDone () { 
      zip
      .generateNodeStream({type:'nodebuffer',streamFiles:true})
      .pipe(fs.createWriteStream('predictions.zip'))
      .on('finish', function () {
          console.log("predictions.zip written.");
          var path = './predictions.zip';
          var options = {numSimilarVectors: 5};
          sendAnyFile('https://sandbox.api.sap.com/ml/similarityscoring/similarity-scoring', path, cb, options);
      });
    }

    //we can assume only one image for the moment
  var jsonTarget = JSON.parse(targetJSON).predictions[0];
  zip.file(jsonTarget.name + ".txt", JSON.stringify(jsonTarget.featureVectors));

    fs.readFile(predictionsPath, function(err, data){
    var predictions = JSON.parse(data).predictions;
    var itemsProcessed = 0;
    predictions.forEach(
      function(prediction, index, array){
        //TODO process the predictions here
        console.log("processing " + prediction.name + " length " + array.length + " index " + index)
        zip.file(prediction.name + ".txt", JSON.stringify(prediction.featureVectors));
        itemsProcessed++;
        if(itemsProcessed === array.length) {
          console.log("file created")
            saveZipIfDone();
        }
      }
    ); 
  })        
}

var sendAnyFile = function(url, zipPath, callback, options){
  console.log("sending ZIP to LML");
  var formData = {
    files: fs.createReadStream(zipPath)
  };

  if(options){
    formData.options = JSON.stringify(options);
  }

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
      callback(body);
  });
}

