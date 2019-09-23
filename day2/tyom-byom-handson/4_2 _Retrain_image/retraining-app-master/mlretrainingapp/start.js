'use strict';
const express = require('express');
const passport = require('passport');
const bodyParser = require('body-parser');
const Minio = require('minio');
const path = require('path');
const request = require('request');
const winston = require('winston');
const cfenv = require("cfenv");
const xsenv = "";
const JWTStrategy = "";

const models = require('./models/foundation');

require('request-debug')(request);

var env = undefined;
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

//Issue with Variables on CF - Define here what to do
//var use_uaa_and_pg = process.env.USE_UAA_AND_PG === "true";
var service_broker_name = process.env.SERVICE_BROKER_NAME;

winston.log('info', 'Config', {
    service_broker_name: service_broker_name
});

// Logger Config
winston.level = process.env.LOG_LEVEL_WINSTON || 'info';

env = _getServiceCredentials(service_broker_name);
winston.log('info', 'Binding to ML', {
    env: env
});

//app environment variables
var appEnv = _parseEnvVariables(env);

/**
 *************** Setup Minio Client ***************
 *
 **/

var s3Client;

models.getToken(appEnv.url, appEnv.clientId, appEnv.clientSecret, function(error, response, data) {
    var options = {
        method: 'GET',
        url: appEnv.url_storage,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Bearer ' + data.access_token
        },
        json: true
    };
    request(options, function(error, response, body) {
        console.log(body);
        s3Client = new Minio.Client({
            endPoint: body.endpoint,
            accessKey: body.accessKey,
            secretKey: body.secretKey

        });
        console.log(s3Client);
    });
})

var apiServerHost = 'https://image-classifier-sb-production.cfapps.eu10.hana.ondemand.com';

/**
 *************** Expose '/inference_sync' as destination ***************
 * POST
 * Issue#1 with Authorization Token being cut from CF > MLRETRAININGAPP > CF IMAGE CLASSIFIER
 *
 **/

app.post('/mlretrainingapp/inference_sync/:model/:version', function(req, res) {
    //Usage of another header to get pass Issue #1
    var token = req.get('token-value');
    var sModelName = req.params.model;
    var sModelVersion = req.params.version;
    var options = {
        url: appEnv.url_image_infer + "/models/" + sModelName + "/versions/" + sModelVersion,
        headers: {
            'authorization': 'Bearer ' + token
        }
    };
    req.pipe(request(options)).pipe(res);
});

app.post('/mlretrainingapp/generic_inference_sync', function(req, res) {
    //Usage of another header to get pass Issue #1
    var token = req.get('token-value');
    var options = {
        url: appEnv.url_image_infer,
        headers: {
            'authorization': 'Bearer ' + token
        }
    };
    req.pipe(request(options)).pipe(res);
});

/**
 *************** Expose '/metadata' as destination ***************
 * GET
 *
 **/

app.get('/mlretrainingapp/users', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
    var isAuthorized = true;
    if (isAuthorized) {
        res.status(200).json({
            "version": "0.0.1"
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

/**
 *************** Expose '/model_details' as destination ***************
 * GET / DELETE
 *
 **/

app.get('/mlretrainingapp/token', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
    var isAuthorized = true;
    winston.log('info', 'In GET Express Token', {
        authorization: isAuthorized
    });
    if (isAuthorized) {
        models.getToken(appEnv.url, appEnv.clientId, appEnv.clientSecret, function(error, response, data) {
            res.status(response.statusCode).json(data);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

/**
 *************** Expose '/model_details' as destination ***************
 * GET / DELETE
 *
 **/

app.get('/mlretrainingapp/models', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
	var isAuthorized = true;
    winston.log('info', 'In GET Express Model Details', {
        authorization: isAuthorized
    });
    if (isAuthorized) {
        //Get the Token from the Header
        var token = req.get('token-value');
        models.getModels(appEnv.url_models, token, function(error, response, data) {
            res.status(response.statusCode).json(data);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

app.get('/mlretrainingapp/models/:name/:version', function(req, res) {
    var token = req.get('token-value'),
        name = req.params.name,
        version = req.params.version,
        model_url = appEnv.url_models + "/" + name + "/versions",
        deployment_url = appEnv.url_deploy;
    winston.log('info', model_url);
    models.getModelVersion(model_url, deployment_url, version, token, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

app.get('/mlretrainingapp/modeldeployed', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
	var isAuthorized = true;
    winston.log('info', 'In GET Express Model Details', {
        authorization: isAuthorized
    });
    if (isAuthorized) {
        //Get the Token from the Header
        var token = req.get('token-value');
        console.log("enter the my func");
        models.mergeModelDeployment(appEnv.url_models, appEnv.url_deploy, token, function(error,response, data) {
            res.status(response.statusCode).json(data);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});


/**
 *************** Expose '/retraining' as destination ***************
 * GET / POST / DELETE
 *
 **/

app.get('/mlretrainingapp/retraining', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
	var isAuthorized = true;
    winston.log('info', 'In GET Express Retraining', {
        authorization: isAuthorized
    });
    if (isAuthorized) {
        //Get the Token from the Header
        var token = req.get('token-value');
        models.getTrainingJobs(appEnv.url_retraining, token, function(error, response, data) {
            res.status(response.statusCode).json(data);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/mlretrainingapp/retraining', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Update');
	var isAuthorized = true;
    winston.log('info', 'In POST Express Retraining', {
        authorization: isAuthorized
    });
    if (!isAuthorized) {
        res.status(403).json('Forbidden');
        return;
    }

    var token = req.body.token;
    var params = req.body.params;

    models.startTrainingJob(appEnv.url_retraining, token, params, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

app.delete('/mlretrainingapp/retraining', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Update');
	var isAuthorized = true;
    winston.log('info', 'In DELETE Express Retraining', {
        authorization: isAuthorized
    });
    if (!isAuthorized) {
        res.status(403).json('Forbidden');
        return;
    }
    var token = req.body.token;
    var id = req.body.params.job_id;
    models.deleteTrainingJob(appEnv.url_retraining, token, id, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

app.get('/mlretrainingapp/jobs/:id', function(req, res) {
    var token = req.get('token-value'),
        id = req.params.id,
        url = appEnv.url_retraining + "/" + id;
    winston.log('info', url);
    models.getTrainingJob(url, token, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

/**
 *************** Expose '/models' as destination ***************
 * GET / POST / DELETE
 *
 **/

app.get('/mlretrainingapp/deployments', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Display');
	var isAuthorized = true;
    winston.log('info', 'In GET Express Models', {
        authorization: isAuthorized
    });
    if (isAuthorized) {
        //Get the Token from the Header
        var token = req.get('token-value');
        models.getDeployedModels(appEnv.url_deploy, token, function(error, response, data) {
            res.status(response.statusCode).json(data);
        });
    } else {
        res.status(403).send('Forbidden');
    }
});

app.post('/mlretrainingapp/deployments', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Update');
	var isAuthorized = true;
    winston.log('info', 'In POST Express Models', {
        authorization: isAuthorized
    });
    if (!isAuthorized) {
        res.status(403).json('Forbidden');
        return;
    }
    var token = req.body.token;
    var params = req.body.params;
    winston.log('debug', 'params', {
        params: params
    });
    models.deployModel(appEnv.url_deploy, token, params, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

app.delete('/mlretrainingapp/deployments', function(req, res) {
//    var isAuthorized = (use_uaa_and_pg === false) ? true : req.authInfo.checkScope('$XSAPPNAME.Update');
	var isAuthorized = true;
    winston.log('info', 'In DELETE Express Models', {
        authorization: isAuthorized
    });
    if (!isAuthorized) {
        res.status(403).json('Forbidden');
        return;
    }
    var token = req.body.token;
    var deploymentId = req.body.params.id;
    winston.log('debug', 'params', {
        deploymentId: deploymentId
    });
    models.undeployModel(appEnv.url_deploy, token, deploymentId, function(error, response, data) {
        res.status(response.statusCode).json(data);
    });
});

//Create a folder
app.post('/mlretrainingapp/folders', function(req, res) {
  var iContentLength = 1,
      sPrefix = req.get('Prefix'),
      sFileName = sPrefix + "/dummy",
      sContentType = "text/plain",
      oBuffer = new Buffer(iContentLength);
  
  s3Client.putObject('data', sFileName, oBuffer, iContentLength, sContentType, function(error) {
    if (error) {
      winston.log('error', 'During creation of folder ' + sPrefix, {
          error: error
      });
      res.status(500).send();
    } else {
      res.status(204).send();
    }
  });
});

// Upload a File
app.post('/mlretrainingapp/files', function(req, res) {
  var iContentLength = parseInt(req.get('Content-Length'), 10),
      sPrefix = req.get('Prefix'),
      sFileName = sPrefix + req.get('File-Name'),
      sContentType = req.get('Content-Type'),
      oBuffer = new Buffer(iContentLength),
      aData = [];
  
  req.on('data', function(chunk) {
    aData.push(chunk)
  });
  req.on('end', function(){
    var oImageBuffer = Buffer.concat(aData);
    s3Client.putObject('data', sFileName, oImageBuffer, iContentLength, sContentType, function(e) {
      if (e) {
        winston.log('error', 'During File Upload of ' + sFileName, {
            error: e
        });
        res.status(500).send();
      }else{
        res.status(204).send();
      }
    });
  });
});

// Delete a File
app.delete('/mlretrainingapp/files/:id', function(req, res) {
  var sFileName = req.params.id,
      sPrefix = req.get('Prefix'),
      sFile = sPrefix+sFileName;

  s3Client.removeObject('data', sFile, function(e) {
    if (e) {
      winston.log('error', 'Cannot delete file ' + sFile, {
          error: e
      });
      res.status(500).send();
    }else{
      res.status(204).send();
    }
  });
});

/**
 *************** Expose '/files' as destination ***************
 * GET the list of "folders" and then files from S3 one level at a time
 *
 **/

app.get('/mlretrainingapp/files', function(req, res) {
    /** https://docs.minio.io/docs/javascript-client-api-reference#listObjects
     * bucketName	string	Name of the bucket.
     * prefix	string	The prefix of the objects that should be listed (optional, default '').
     * recursive	bool	true indicates recursive style listing and false indicates directory style listing delimited by '/'. (optional, default false).
     *
     **/

        //TODO More work on the results need to be done (E.g. Add Object Type (Folders vs. Images vs. Logs)) before sending back to the UI
    var prefix = req.query.prefix;
    var aObjects = [];
    winston.log('info', 'In GET Express Files', {
        prefix: prefix
    });
    var objectsStream = s3Client.listObjects('data', prefix, false);

    objectsStream.on('data', function(obj) {
        aObjects.push(obj)
        winston.log('debug', 'data', {
            data: obj
        });
    });
    objectsStream.on('end', function(obj) {
        res.status(200).send(aObjects)
    });
    objectsStream.on('error', function(e) {
        winston.log('error', 'Object Stream on Error', {
            error: e
        });
        //Streaming Errors on S3 - Don't send back until the end
        //res.status(500).send({"error": e});
    });
});

/**
 *************** Expose '/image' as destination ***************
 * GET a BASE 64 encoded Image
 *
 **/

app.get('/mlretrainingapp/image', function(req, res) {
    /** https://docs.minio.io/docs/javascript-client-api-reference#getObject
     * bucketName	        string	    Name of the bucket.
     * objectName	        string	    Name of the object.
     * callback(err, stream)	function	Callback is called with err in case of error. stream is the object content stream. If no callback is passed, a Promise is returned.
     **/

    var prefix = req.query.prefix;
    var bufs = [];
    var size = 0;
    winston.log('info', 'In GET Express Image', {
        prefix: prefix
    });
    s3Client.getObject('data', prefix, function(err, dataStream) {
        if (err) {
            res.status(500).send({
                "error": err
            });
            return console.log(err)
        }
        dataStream.on('data', function(chunk) {
            winston.log('debug', 'data', {
                chunk: chunk
            });
            bufs.push(chunk);
        })
        dataStream.on('end', function() {
            var buffed_Image = Buffer.concat(bufs);
            var imageSrc = 'data:image/jpg;base64, ' + buffed_Image.toString('base64');
            res.status(200).send({
                "imageSrc": imageSrc
            });
        })
        dataStream.on('error', function(err) {
            winston.log('error', 'Object Stream on Error', {
                error: err
            });
            //Streaming Errors on S3 - Don't send back until the end
            //res.status(500).send({"error": err});
        })
    });
});

/**
 *************** Expose '/logs' as destination ***************
 * GET a TEXT log from a Job
 *
 **/

app.get('/mlretrainingapp/logs', function(req, res) {
    /** https://docs.minio.io/docs/javascript-client-api-reference#getObject
     * bucketName	        string	    Name of the bucket.
     * objectName	        string	    Name of the object.
     * callback(err, stream)	function	Callback is called with err in case of error. stream is the object content stream. If no callback is passed, a Promise is returned.
     **/

        //TODO Check if objectName /<JOB_ID>/retraining.log is the same for others retrainable services
    var prefix = req.query.prefix + '/retraining.log';
    var textChunk = "";
    var size = 0;
    winston.log('info', 'In GET Express Logs', {
        prefix: prefix
    });
    s3Client.getObject('data', prefix, function(err, dataStream) {
        if (err) {
            res.status(500).send({
                "error": err
            });
            return console.log(err)
        }
        dataStream.on('data', function(chunk) {
            winston.log('debug', 'data', {
                chunk: chunk
            });
            textChunk += chunk.toString('utf8');
        })
        dataStream.on('end', function() {
            res.status(200).send(textChunk);
        })
        dataStream.on('error', function(err) {
            winston.log('error', 'Object Stream on Error', {
                error: err
            });
            //Streaming Errors on S3 - Don't send back until the end
            //res.status(500).send({"error": err});
        })
    });
});

/**
 *************** HELPERS ***************
 * _parseEnvVariables(env)
 * _getServiceCredentials(sServiceInstanceName)
 **/

function _parseEnvVariables(oEnv) {
    var sImageRetrainUrl = 'IMAGE_RETRAIN_API_URL';
    var sImageClassification = 'IMAGE_CLASSIFICATION_URL';

    var oAppEnv = {
    		"url": oEnv.url + "/oauth/token?grant_type=client_credentials",
    		"url_retraining": oEnv.serviceurls[sImageRetrainUrl] + "/jobs",
    		"url_models": oEnv.serviceurls[sImageRetrainUrl] + "/models",
    		"url_deploy": oEnv.serviceurls[sImageRetrainUrl] + "/deployments",
    		"url_image_infer": oEnv.serviceurls[sImageClassification],
    		"clientId": oEnv.clientid,
    		"clientSecret": oEnv.clientsecret,
    		"url_storage": oEnv.serviceurls[sImageRetrainUrl] + "/storage"
    }
    return oAppEnv;
}

function _getServiceCredentials(sServiceInstanceName) {
	var oCreds = cfenv.getAppEnv().getServiceCreds(sServiceInstanceName);
	return oCreds;
}

/**
 *************** RUNNING THE APP ***************
 *
 **/
app.use('/', express.static(path.join(__dirname, 'web')));

app.listen(port, function() {
    winston.log('info', 'App is running on port ' + port, {});
    winston.log('debug', 'VARIABLES', {
        environment: process.env
    });

});
