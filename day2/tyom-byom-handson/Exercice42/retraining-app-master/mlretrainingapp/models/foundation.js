'use strict';
const winston = require('winston');

// Logger Config
winston.level = 'info';

/**
 *********************************************************************************************************************************
 ********************************************************** DEPLOYMENTS **********************************************************
 *********************************************************************************************************************************
 **/

function undeployModel(url, token, id, cb) {
	//TODO change the comment for v2 version
	/** Responses from DELETE /v1/deployments/{id}
	 * url (Environment) - token (Bearer oAuth) - id (id of deployed Model e.g. 65e6df5d-415c-43d1-88d8-064455a514bc)
	 * 204 No content
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 404 Authentication Error: The resource with the specified id does not exist
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [202, 204, 400, 401, 404, 500];
	winston.log('info', 'Undeploy Model', {
		url: url,
		id: id
	});
	const request = require('request');
	var options = {
		method: 'DELETE',
		url: url + '/' + String(id),
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		dataType: 'json'
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function deployModel(url, token, params, cb) {
	//TODO change the comment for v2 version
	/** Responses from POST /v1/deployments
	 * url (Environment) - token (Bearer oAuth) - params (request body:
	 *    {
	 *      "modelName": "inception",
	 *      "modelVersion": "1"
	 *    })
	 * 202 Accepted e.g. {  "id": "f6b34f68-6bf0-4fe8-98f5-9f9a4310a9b8"  }
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 404 Authentication Error: Authentication Error: The specified model name or model version does not exist
	 * 409 Conflict: The request could not be completed, due to a conflict with an already existing deployment request
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [202, 400, 401, 404, 409, 500];
	winston.log('info', 'Deploy Model', {
		url: url,
		modelName: params.modelName,
		modelVersion: params.modelVersion,
		namespace: params.namespace,
		resourcePlan: params.resourcePlan
	});
	const request = require('request');
	var options = {
		method: 'POST',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		body: params,
		json: true
	};
	request(options, function(error, response, body) {
		if (codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function getDeployedModels(url, token, cb) {
	//TODO change the comment for v2 version
	/** Responses from GET /v1/deployments
	 * url (Environment) - token (Bearer oAuth)
	 * 200 OK
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [200, 400, 401, 500];
	winston.log('info', 'Get Deployed Models', {
		url: url
	});
	const request = require('request');
	var options = {
		method: 'GET',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

/**
 *********************************************************************************************************************************
 ********************************************************** TRAINING JOBS ********************************************************
 *********************************************************************************************************************************
 **/

function getTrainingJobs(url, token, cb) {
	/** Responses from GET /v1/jobs
	 * url (Environment) - token (Bearer oAuth)
	 * 200 OK
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [200, 400, 401, 500];
	winston.log('info', 'Get Training Jobs', {
		url: url
	});
	const request = require('request');
	var options = {
		method: 'GET',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function getTrainingJob(url, token, cb) {
	const codes = [200, 400, 401, 500];
	winston.log('info', 'Get Job', {
		url: url
	});
	const request = require('request');
	var options = {
		method: 'GET',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function deleteTrainingJob(url, token, id, cb) {
	/** Responses from DELETE /v1/jobs/{id}
	 * url (Environment) - token (Bearer oAuth) - id (Job ID e.g. brands-2018-01-29t1322z)
	 * 204 No Content
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [202, 204, 400, 401, 500];
	winston.log('info', 'Delete a training Job', {
		url: url,
		id: id
	});
	const request = require('request');
	var options = {
		method: 'DELETE',
		url: url + '/' + String(id),
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
        dataType: 'json'
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function startTrainingJob(url, token, params, cb) {
	/** Responses from POST /v1/jobs
	 * url (Environment) - token (Bearer oAuth) - params (request body:
	 *    {
	 *       "mode": "image",
	 *       "options": {
	 *           "dataset": "flowers",
	 *           "modelName": "flowers"
	 *       }
	 *    })
	 * 202 Accepted e.g. {  "id": "brands-2018-02-01t1050z"  }
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [202, 400, 401, 500];
	winston.log('info', 'Start a training Job', {
		url: url,
		modelName: params.modelName,
		dataset: params.dataset
	});
	const request = require('request');
	var options = {
		method: 'POST',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		body: params,
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

/**
 *********************************************************************************************************************************
 ************************************************************* MODELS ************************************************************
 *********************************************************************************************************************************
 **/

function getModelDetails(url, token, modelName, cb) {
	//TODO change comment to v2
	/** Responses from GET /v1/models/{modelName}
	 * url (Environment) - token (Bearer oAuth) - modelName (Model Name)
	 * 200 OK
	 * 400 Bad Request: The request could not be completed, probably due to missing or incorrect parameters
	 * 401 Authentication Error: The request could not be authenticated with the supplied credentials
	 * 404 Authentication Error: The requested resource does not exist
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [200, 400, 401, 404, 500];
	winston.log('info', 'Start Get Details Model', {
		url: url,
		modelName: modelName
	});
	const request = require('request');
	var options = {
		method: 'GET',
		url: url + '/' + String(modelName) + '/versions',
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function getModelVersion(model_url, deployment_url, version, token, callback) {
	const codes = [200, 400, 401, 500];
	winston.log('info', 'Get model version', {
		url: model_url
	});
	const request = require('request');
	
	var oModelOptions = {
		method: 'GET',
		url: model_url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	
	var oDeploymentOptions = {
			method: 'GET',
			url: deployment_url,
			headers: {
				'cache-control': 'no-cache',
				'content-type': 'application/json',
				authorization: 'Bearer ' + token
			},
			json: true
		};
	
	Promise.all([requestAsync(oModelOptions), requestAsync(oDeploymentOptions)])
    .then(function(allData) {
        // All data available here in the order it was called.
		var oModel = {};
		for (var i = 0; i < allData[0][1]["versions"].length; i++) {
			var oVersion = allData[0][1]["versions"][i];
			if(version === oVersion.version) {
				oModel = {
					"modelName": oVersion.modelName,
					"modelVersion": oVersion.version,
					"createdAt": oVersion.createdAt,
					"updatedAt": oVersion.updatedAt
				};
			}
		}

		var oDeployment;
		for (var j = 0; j < allData[1][1]['deployments'].length; j++) {
			oDeployment = allData[1][1]['deployments'][j];
			if (oModel.modelName == oDeployment.modelName) {
				if (oModel.modelVersion == oDeployment.modelVersion) {
					oModel.status = oDeployment.status;
					oModel.deploymentId = oDeployment.id;
				} else {
					if (["SUCCEEDED", "FAILED", "PENDING"].includes(oDeployment["status"]["state"])) {
						oModel.deployedVersion = {
								"version": oDeployment.modelVersion,
								"deploymentId": oDeployment.id,
								"status": oDeployment.status
						}
					}
				}
			}
		}
		if (!oModel.status) {
			oModel.status = {
				"state": "",
				"description": "",
				"deploymentId": ""
			};
		}
		callback(undefined, allData[0][0], oModel);
    }, function(error) {
    	
    });
}

function getModels(url, token, callback) {
	const codes = [200, 400, 401, 404, 500];
	winston.log('info', 'Start Get Details Model', {
		url: url
	});
	const request = require('request');
	var options = {
		method: 'GET',
		url: url,
		headers: {
			'cache-control': 'no-cache',
			'content-type': 'application/json',
			authorization: 'Bearer ' + token
		},
		json: true
	};
	request(options, function(error, response, body) {
		winston.log('debug', options, {});
		if (!error && codes.includes(response.statusCode)) {
			callback(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

function requestAsync(options) {
    return new Promise(function(resolve, reject) {
        const request = require('request');
        request(options, function(err, res, body) {
            if (err) {
            	return reject(err);
            }
            return resolve([res, body]);
        });
    });
}

function mergeModelDeployment(model_url, deployment_url, token, callback){
    const codes = [200, 400, 401, 404, 500];
    // winston.log('info', 'Start Get Details Model', {
    //     url: url
    // });
    const request = require('request');
    var modelOptions = {
        method: 'GET',
        url: model_url,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Bearer ' + token
        },
        json: true
    };
    var deployOptions = {
        method: 'GET',
        url: deployment_url,
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            authorization: 'Bearer ' + token
        },
        json: true
    };

    Promise.all([requestAsync(modelOptions), requestAsync(deployOptions)])
        .then(function(allData) {
            // All data available here in the order it was called.
			var aModels = [];
			for (var i = 0; i < allData[0][1]['models'].length; i++) {
				var oModel = {};
				for (var j = 0; j < allData[0][1]['models'][i].versions.length; j++) {
					var oVersion = allData[0][1]['models'][i].versions[j];
					oModel = {
						"modelName": oVersion.modelName,
						"modelVersion": oVersion.version,
						"createdAt": oVersion.createdAt
					};
					aModels.push(oModel);
				}
			}

			var oModel;
			var oDeployment;
			var numberOfDeployments = 0;
			for (var i = 0; i < aModels.length; i++) {
				oModel = aModels[i];
				for (var j = 0; j < allData[1][1]['deployments'].length; j++) {
					oDeployment = allData[1][1]['deployments'][j];
					if (oModel.modelName == oDeployment.modelName) {
						if (oModel.modelVersion == oDeployment.modelVersion) {
							oModel.status = oDeployment.status;
							oModel.deploymentId = oDeployment.id;
						} else {
							if (["SUCCEEDED", "FAILED", "PENDING"].includes(oDeployment["status"]["state"])) {
								oModel.deployedVersion = {
										"version": oDeployment.modelVersion,
										"deploymentId": oDeployment.id,
										"status": oDeployment.status
								}
							}
						}
					}
				}
				if (!oModel.status) {
					oModel.status = {
						"state": "",
						"description": "",
						"deploymentId": ""
					};
				}
			}
			// var modelDeployed = {};
			// for(var k=0 ; k < aModels.length ; k++){
			// 	modelDeployed ={
			// 		"modelName": aModels[k]["modelName"],
			// 		"versions": aModels[k]["modelVersion"]
			// 	}
			// }
			callback(undefined, allData[0][0], aModels);
        }, function(error) {
        	
        });
}



/**
 *********************************************************************************************************************************
 ********************************************************** AUTHENTICATION *******************************************************
 *********************************************************************************************************************************
 **/

function getToken(url, clientId, clientSecret, cb) {
	/** Responses from GET /oauth/token?grant_type=client_credentials
	 * url (Environment) - clientId () - clientSecret ()
	 * 200 OK
	 * 500 Internal Server Error: The request could not be submitted due to an internal server error
	 **/
	const codes = [200, 500];
	const request = require('request');
	var auth = 'Basic ' + new Buffer(clientId + ':' + clientSecret).toString('base64');
	var headers = {
		'Authorization': auth
	};
	var options = {
		method: 'GET',
		url: url,
		headers: headers,
		json: true
	};

	request(options, function(error, response, body) {
		winston.log('debug', options, {});

		if (!error && codes.includes(response.statusCode)) {
			cb(error, response, body);
		} else {
			winston.log('error', error);
		}
	});
}

module.exports = {
	//Exposed APIs from ML FOUNDATION

	/**
	 ********************************************* MODEL API  *******************************************
	 * getModelDetails: GET /v1/models/{modelName} Get all model versions of {modelName}
	 * deleteModel: DELETE /v1/models/{modelName}/versions/{modelVersion} Delete a model version
	 **/
	getModelDetails: getModelDetails,
	getModelVersion: getModelVersion,
	getModels: getModels,
    mergeModelDeployment: mergeModelDeployment,

	/**
	 ********************************************* JOBS API  ********************************************
	 * getTrainingJobs: GET /v1/jobs Get information about retraining jobs
	 * deployModel: POST /v1/deployments Deploy a retrained model
	 * undeployModel: DELETE /v1/deployments/{id} Undeploy a deployed model
	 **/
	getTrainingJobs: getTrainingJobs,
	startTrainingJob: startTrainingJob,
	deleteTrainingJob: deleteTrainingJob,

	getTrainingJob: getTrainingJob,

	/**
	 ***************************************** DEPLOYMENT API  *****************************************
	 * getModels: GET /v1/deployments Returns a list of all deployed models and their status
	 * deployModel: POST /v1/deployments Deploy a retrained model
	 * undeployModel: DELETE /v1/deployments/{id} Undeploy a deployed model
	 **/
	getDeployedModels: getDeployedModels,
	deployModel: deployModel,
	undeployModel: undeployModel,

	/**
	 *************************************** AUTHENTICATION API  ***************************************
	 * getModels: GET /v1/deployments Returns a list of all deployed models and their status
	 * deployModel: POST /v1/deployments Deploy a retrained model
	 * undeployModel: DELETE /v1/deployments/{id} Undeploy a deployed model
	 **/
	getToken: getToken

}
