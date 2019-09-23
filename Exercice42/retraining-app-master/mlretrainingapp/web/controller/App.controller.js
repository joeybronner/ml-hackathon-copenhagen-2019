sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	'sap/m/MessageBox',
	'sap/m/LightBoxItem',
	'sap/m/LightBox',
	"sap/m/Dialog",
	'sap/m/Text',
	'sap/m/Button',
	'sap/m/BusyDialog',
	'sap/ui/model/resource/ResourceModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/ui/model/FilterType',
	'sap/mlf/retraining/util/formatter'
], function(jQuery, Controller, MessageToast, JSONModel, MessageBox, LightBoxItem, LightBox, Dialog, Text, Button, BusyDialog,
	ResourceModel, Filter, FilterOperator, FilterType, formatter) {
	"use strict";
	logsDialog: null;
	busyDialog: null;

	var _imageParametersVisibility = [{
		"visible": false
	}, {
		"visible": false
	}, {
		"visible": false
	}, {
		"visible": false
	}, {
		"visible": false
	}, {
		"visible": false
	}];

	return Controller.extend("sap.mlf.retraining.controller.App", {

		formatter: formatter,

		onInit: function() {
			var sAccessToken = "";
			var oView = this.getView();

			oView.setModel(new ResourceModel({
				"bundleUrl": "../i18n/i18n.properties"
			}), "i18n");
			var oData = {
				retrainingType: "image",
				imageForm: {
					addOptParametersEnabled: true,
					params: [{
						type: "",
						value: ""
					}, {
						type: "",
						value: ""
					}, {
						type: "",
						value: ""
					}, {
						type: "",
						value: ""
					}, {
						type: "",
						value: ""
					}, {
						type: "",
						value: ""
					}],
					imageOptParameters: [{
						"text": "Batch Size",
						"key": "batchSize"
					}, {
						"text": "Max Epochs",
						"key": "maxEpochs"
					}, {
						"text": "Max Unimproved Epochs",
						"key": "maxUnimprovedEpochs"
					}, {
						"text": "Completion Time",
						"key": "completionTime"
					}, {
						"text": "Memory",
						"key": "memory"
					}, {
						"text": "Learning Rate",
						"key": "learningRate"
					}]
				}
			};
			var oModel = new JSONModel(oData);
			oView.setModel(oModel);

			var oUiProperties = {
				retrainingEnabled: false,
				jobDeleteEnabled: false,
				deploymentEnabled: false,
				undeployEnabled: false,
				retrainingCollection: [{
					"text": "Image Classification",
					"key": "image"
				}, {
					"text": "Text Classification",
					"key": "text"
				}, {
					"text": "Object Detection",
					"key": "object"
				}]
			};

			var oModel = new JSONModel(oUiProperties);
			this.getView().setModel(oModel, "ui");
			this._initialDataLoad();
			// this._loadS3Data();

			jQuery.sap.require("jquery.sap.storage");
			//Get Storage object to use
			this.oStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);

			if (this.oStorage.get("myLocalModels") === null) {
				var aModels = ["test"];
				this.oStorage.put("myLocalModels", aModels);
			}

			var foldersModel = new JSONModel("/mlretrainingapp/files");
			foldersModel.setSizeLimit(1000);
			oView.setModel(foldersModel, "folders");

			this._oUploadCollection = this.byId("UploadCollection");
			this._oBreadcrumbs = this.byId("breadcrumbs");
			this._oUploadCollection.bindItems({
				path: "folders>/",
				factory: this._uploadCollectionItemFactory.bind(this)
			});
			this._oUploadCollection.addEventDelegate({
				onAfterRendering: function() {
					var iCount = this._oUploadCollection.getItems().length,
						oBundle = this.oView.getModel('i18n').getResourceBundle();
					this._oBreadcrumbs.setCurrentLocationText(oBundle.getText('numberOfFolders', [iCount]));
				}.bind(this)
			});
		},

		// EVENTS
		onRetrainPress: function() {
			var oView = this.getView();

			if (!this._oRetrainDialog) {
				this._oRetrainDialog = sap.ui.xmlfragment(oView.getId(), "sap.mlf.retraining.view.Retrain", this);
				oView.addDependent(this._oRetrainDialog);
				oView.byId("SimpleFormParameters").bindElement("/imageForm");
				sap.ui.getCore().getMessageManager().registerObject(oView.byId("input-folder"), true);
				sap.ui.getCore().getMessageManager().registerObject(oView.byId("input-model"), true);
			}
			this._oRetrainDialog.open();
		},

		onRetrainConfirm: function() {
			this._oRetrainDialog.close();

			this.onPressRetraining();
		},

		onRetrainCancel: function() {
			this._oRetrainDialog.close();
		},

		onChangeIputFolder: function(oEvent) {
			var oInput = oEvent.getSource();
			oInput.getModel().setProperty("/imageForm/folderName", oInput.getSelectedItem().getText());
		},

		handleLoadFolders: function() {
			var foldersModel = this.oView.getModel("folders");
			foldersModel.loadData("/mlretrainingapp/files");
			foldersModel.refresh(true);
		},

		onUploadCollectionSearch: function(oEvent) {
			var sFilter = oEvent.getParameter("newValue"),
				oBinding = this.oView.byId("UploadCollection").getBinding("items"),
				aFilters = [];

			if (sFilter) {
				aFilters.push(new Filter("prefix", FilterOperator.Contains, sFilter));
			}
			oBinding.filter(aFilters, FilterType.Application);
		},


		onPressModelDeploy: function(oEvent) {
			var oButton = oEvent.getSource();
			var sBindingPath = oButton.getBindingContext().getPath();
			var oModel = oButton.getModel().getProperty(sBindingPath);
            var oResourceBundle = oButton.getModel("i18n").getResourceBundle();

			var oOptions;
			oOptions = {
				"token": this.sAccessToken,
				"params": {
					"modelName": oModel["modelName"],
					"modelVersion": oModel["modelVersion"]
				}
			};
			var deployedModel = oButton.getModel().getProperty("/retrainedModels");
			for(var i=0; i<deployedModel.length; i++) {
				if (deployedModel[i]["modelName"] === oModel["modelName"]) {
					if (["SUCCEEDED", "FAILED", "PENDING"].includes(deployedModel[i]["status"]["state"])) {
						var id = deployedModel[i]["deploymentId"];
                        var dialog = new Dialog({
                            title: oResourceBundle.getText('confirm'),
                            type: 'Message',
                            content: new Text({ text: oResourceBundle.getText("confirmText") }),
                            beginButton: new Button({
                                text: oResourceBundle.getText('submit'),
                                press: function () {
                                    dialog.close();
									var oOptionsDelete = {
										"token": this.sAccessToken,
										"params": {
											"id": id
										}
									};
									this._deleteDeployedModel(oOptionsDelete);
                                    this._submitNewDeployment(oOptions);
                                }.bind(this)
                            }),
                            endButton: new Button({
                                text: oResourceBundle.getText('cancel'),
                                press: function () {
                                    dialog.close();
                                }
                            }),
                            afterClose: function() {
                                dialog.destroy();
                            }
                        });

                        dialog.open();

					}
				}
			}

		},

		/** ******************************************************
		 ********************* RETRAINING TAB *********************
		 ****************************************************** **/

		onSelectTrainingType: function() {
			MessageToast.show("This feature is not yet implemented. Only Image is available for now");
		},

		onAddOptParameters: function() {
			for (var i = 0; i < _imageParametersVisibility.length; i++) {
				if (_imageParametersVisibility[i].visible === false) {
					var param = i + 1;
					var sSelect = "select-opt-param" + String(param);
					this.getView().byId(sSelect).setVisible(true);
					var sInput = "input-opt-param" + String(param);
					this.getView().byId(sInput).setVisible(true);
					var sButton = "button-opt-param" + String(param);
					this.getView().byId(sButton).setVisible(true);
					_imageParametersVisibility[i].visible = true;
					break;
				}
			}
		},

		onDeleteOptParameters: function(oEvent) {
			var sSource = oEvent.getSource().getId();
			var iSourceId = sSource[sSource.length - 1];
			var param = iSourceId - 1;
			_imageParametersVisibility[param].visible = false;
			var sSelect = "select-opt-param" + String(iSourceId);
			this.getView().byId(sSelect).setVisible(false);
			this.getView().byId(sSelect).setSelectedItem(null);
			var oModel = this.getView().getModel();
			var sPath = "/imageForm/params/" + String(param) + "/type";
			oModel.setProperty(sPath, "");
			var sInput = "input-opt-param" + String(iSourceId);
			this.getView().byId(sInput).setVisible(false);
			this.getView().byId(sInput).setValue("");
			var sButton = "button-opt-param" + String(iSourceId);
			this.getView().byId(sButton).setVisible(false);
		},

		onSelectParamChange: function(oEvent) {
			//TODO Bind a Type to the Input Field
			var oModel = this.getView().getModel();
			var sSource = oEvent.getSource().getId();
			var iSourceId = sSource[sSource.length - 1] - 1;
			var sPath = "/imageForm/params/" + String(iSourceId) + "/type";
			oModel.setProperty(sPath, oEvent.getParameter("selectedItem").getKey());
			var oView = this.getView();
			/*var oInput = oView.byId("input-opt-param1");
			var oFloat = new sap.ui.model.type.Float(
				  {
				     minFractionDigits: 2,
				     maxFractionDigits: 2
				  },
				  {
				     maximum: 10
				  }
					);
			oInput.bindValue("/imageForm/params/0/value", oFloat);*/
		},

		onPressRetraining: function() {
			/**
			 *Check Value States
			 *Avoid duplicates in Optional Parameters
			 *Display Confirm/Error Messages
			 *Call the retraining API
			 **/
			console.log(this.getView().getModel());
			//Add more buttons
			var bValidationError = this._getCheckInputStatus(["input-folder", "input-model"]);
			if (!bValidationError) {
				var oParams = this._getParameters();
				var myToken = this.sAccessToken;
				var oOptions = {
					"token": myToken,
					"params": oParams
				};
				console.log(oOptions);
				this._submitNewTraining(oOptions);
			} else {
				MessageBox.error("A validation error has occured. Review your parameters.");
			}
		},

		onPressRetrainingJob: function(oEvent) {
			var sPrefix = this.getView().getModel().getProperty(oEvent.getSource().getBindingContext().getPath()).id;
			var sTitle = 'Logs for ' + sPrefix;
			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/logs',
					data: {
						prefix: sPrefix
					}
				})
				.done(function(data, textStatus, jqXHR) {
					var oText = new Text({});
					oText.setText(data);
					oText.addStyleClass("sapUiSmallMargin");
					if (!this.logsDialog) {
						this.logsDialog = new Dialog({
							title: sTitle,
							//content: oText,
							beginButton: new Button({
								text: 'Close',
								press: function() {
									this.logsDialog.close();
								}.bind(this)
							})
						});
						//to get access to the global model
						this.getView().addDependent(this.pressDialog);
					}
					this.logsDialog.destroyContent();
					this.logsDialog.addContent(oText);
					this.logsDialog.setTitle(sTitle);
					this.logsDialog.open();
				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		onPressRetrainingJobsRefresh: function() {
			this._refreshJobs();
		},

		onDeleteRetrainingJob: function(oEvent) {
			var that = this;
			var myToken = this.sAccessToken;
			var sId = this.getView().getModel().getProperty(oEvent.getParameter("listItem").getBindingContextPath() + "/id");
			var oOptions = {
				"token": myToken,
				"params": {
					"job_id": sId
				}
			};
			MessageBox.confirm("Do you want to delete this job?", fnCallbackConfirm, "Confirmation");

			function fnCallbackConfirm(bResult) {
				console.log(oOptions);
				if (bResult === "OK") {
					that._deleteRetrainingJob(oOptions);
				}
			}
		},

		_deleteRetrainingJob: function(oOptions) {
			/**
			 *Get a Csrf Token and call back with start delete retrained Model
			 **/

			this._fetchCsrfToken(oOptions, this._startDeleteRetrainingJob);
		},

		_startDeleteRetrainingJob: function(token, oOptions, that) {
			/**
			 *Trigger a Deployment
			 **/
			jQuery.ajax({
					url: '/mlretrainingapp/retraining',
					type: 'DELETE',
					headers: {
						'x-csrf-token': token
					},
					contentType: 'application/json',
					data: JSON.stringify(oOptions)
				})
				.done(function() {
					MessageToast.show("Job successfully deleted");
					that._refreshJobs();
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
		},

		/** ******************************************************
		 *********************** MODEL TAB ************************
		 ****************************************************** **/

		onPressModelRefresh: function() {
			this._refreshModels();
		},

		_refreshModels: function() {
			/**
			 *Refresh Models
			 **/
			var oHeaders = {
				'token-value': this.sAccessToken,
				contentType: 'application/json'
			};
			//Get Existing Retrained Models
			jQuery.ajax({
				type: 'GET',
				url: '/mlretrainingapp/models',
				headers: oHeaders
			})
			.done(function(data, textStatus, jqXHR) {
				//TODO: Get deployed models and merge to deploy in models table: status, description
				var aModels = [];
				for (var i = 0; i < data.models.length; i++) {
                    var oModel = {};
					for (var j = 0; j < data.models[i].versions.length; j++) {
						var oVersion = data.models[i].versions[j];
						oModel = {
							"modelName": oVersion.modelName,
							"modelVersion": oVersion.version,
							"createdAt": oVersion.createdAt
						};
                        aModels.push(oModel);
					}
				}
				this.getView().getModel().setProperty("/retrainedModels", aModels);
				MessageToast.show("Retrained Models Loaded");

				//Get Existing Deployed Models
				jQuery.ajax({
						type: 'GET',
						url: '/mlretrainingapp/deployments',
						headers: oHeaders
					})
					.done(function(data, textStatus, jqXHR) {
						this.getView().getModel().setProperty("/deployedModels", data.deployments);
						MessageToast.show("Deployed Models Loaded");

						var aModels = this.getView().getModel().getProperty("/retrainedModels");
						var oModel;
						var aDeployments = this.getView().getModel().getProperty("/deployedModels");
						var oDeployment;
						var numberOfDeployments = 0;
						for (var i = 0; i < aModels.length; i++) {
							oModel = aModels[i];
							for (var j = 0; j < aDeployments.length; j++) {
								oDeployment = aDeployments[j];
								if (oModel.modelName == oDeployment.modelName && oModel.modelVersion == oDeployment.modelVersion) {
									oModel.status = oDeployment.status;
									oModel.deploymentId = oDeployment.id;
									numberOfDeployments++;
									break;
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
						this.getView().getModel().setProperty("/retrainedModels", aModels);
						this.getView().getModel().setProperty("/numberDeployments", numberOfDeployments);
					}.bind(this))
					.fail(function(jqXHR, textStatus, errorThrown) {
						MessageBox.error(textStatus + ": " + errorThrown);
					}.bind(this));
			}.bind(this))
			.fail(function(jqXHR, textStatus, errorThrown) {
				MessageBox.error(textStatus + ": " + errorThrown);
			}.bind(this));
		},

		_setPropertyToModel: function(sPath, sValue) {
			var oModel = this.getView().getModel();
			//		console.log(oModel);
			oModel.setProperty(sPath, sValue);
		},

		onJobIdChange: function(oEvent) {
			console.log(oEvent);
			this._setPropertyToModel('/retraining/job-id', oEvent.getParameters().value);
			console.log(this.getView().getModel());
			this._getDeleteJobButtonEnabled();
		},

		onPressDeleteJob: function() {
			var bValidationError = this._getCheckButtonStatus("input-job-id");
			// output result
			if (!bValidationError) {
				this._submitNewTraining();
			} else {
				MessageBox.alert("A validation error has occured. Complete your input first");
			}

		},

		_getDeleteJobButtonEnabled: function() {
			var oModel = this.getView().getModel();
			console.log(oModel);
			var sJobId = oModel.getProperty('/retraining/job-id').length;
			console.log(this.getView().getModel());
			if (sJobId !== 0) {
				var oUiModel = this.getView().getModel('ui');
				oUiModel.setProperty('/jobDeleteEnabled', true);
				console.log(oUiModel);
			}
		},

		_getAccessToken: function(fnSuccessCallback) {
			jQuery.ajax({
					url: '/mlretrainingapp/token',
					type: 'GET'
				})
				.done(function(data, textStatus, jqXHR) {
					this.sAccessToken = data.access_token;
					if (fnSuccessCallback) {
						fnSuccessCallback(data);
					}
				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		_deleteJobRetraining: function(token, dataset, modelname, learningrate, myToken, job_id) {

			console.log("in delete job retraining");

			console.log(token);
			console.log(dataset);
			console.log(modelname);
			console.log(learningrate);
			console.log(job_id);
			console.log(myToken);
			jQuery.ajax({
					url: '/mlretrainingapp/retraining',
					type: 'DELETE',
					headers: {
						'x-csrf-token': token
					},
					contentType: 'application/json',
					data: JSON.stringify({
						"token": myToken,
						"params": {
							"job_id": job_id
						}
					})
				})
				.done(function(data) {
					alert('success');
					console.log(data);
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					alert('Error: ' + jqXHR.status + ' ' + errorThrown);
					MessageBox.error(textStatus + ": " + errorThrown);
				});
		},

		_getJobs: function() {

			var oHeaders = {
				'token-value': data.access_token,
				contentType: 'application/json'
			};
			console.log("in get jobs");
			console.log(oHeaders);
			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/retraining',
					headers: oHeaders

				})
				.done(function(data, textStatus, jqXHR) {
					this.getView().getModel().setProperty("/retrainingjobs", data.status);
					MessageToast.show("Jobs Updated");
				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		onAddParameters: function(oEvent) {
			console.log(oEvent);
			var oInput = new sap.m.Label({
				text: "Phone:"
			});
			this.getView().byId("SimpleFormChange471").addContent(oInput);
		},

		onDeployedModelDelete: function(oEvent) {
			var that = this;
			var myToken = this.sAccessToken;
			var sId = this.getView().getModel().getProperty(oEvent.getParameter("listItem").getBindingContextPath() + "/id");
			var oOptions = {
				"token": myToken,
				"params": {
					"model_id": sId
				}
			};
			MessageBox.confirm("Do you want to delete this Model?", fnCallbackConfirm, "A Question");

			function fnCallbackConfirm(bResult) {

				console.log(oOptions);
				if (bResult === "OK") {
					that._deleteDeployedModel(oOptions);
				}

			}

		},

		_deleteDeployedModel: function(oOptions) {
			/**
			 *Get a Csrf Token and call back with start delete retrained Model
			 **/

			this._fetchCsrfToken(oOptions, this._startDeleteDeployedModel);
		},

		_startDeleteDeployedModel: function(token, oOptions) {
			/**
			 *Trigger a Deployment
			 **/
			console.log("in delete deployed model model cb");
			console.log(oOptions);
			jQuery.ajax({
                url: '/mlretrainingapp/deployments',
                type: 'DELETE',
                headers: {
                    'x-csrf-token': token
                },
                contentType: 'application/json',
				data: JSON.stringify(oOptions),
				success: function(data){
                    MessageToast.show("Model successfully undeploy");
				},
				error: function(){
                    MessageToast.show("Model not successfully undeploy");
				}
            })

		},


		_getCheckInputStatus: function(aElements) {
			/**
			 *Get Input Elements
			 *Check Value State
			 **/
			var oView = this.getView();
			var aInputs = [];
			for (var i = 0; i < aElements.length; i++) {
				aInputs.push(oView.byId(aElements[i]));
			}
			console.log(aInputs);
			var bValidationError = false;
			// check that inputs are not empty
			// this does not happen during data binding as this is only triggered by changes
			jQuery.each(aInputs, function(i, oInput) {
				if (!oInput.getValue()) {
					bValidationError = true;
				}
			});
			return bValidationError;
		},

		_getParameters: function() {
			/**
			 *Check for Duplicate Optional Parameters
			 *Get Parameters
			 **/
			var oModel = this.getView().getModel();

			var aParams = oModel.getProperty('/imageForm/params');
			var valueArr = aParams.map(function(item) {
				return item.type;
			});
			valueArr = valueArr.filter(function(value) {
				return value !== "";
			});
			var isDuplicate = valueArr.some(function(item, idx) {
				return valueArr.indexOf(item) !== idx;
			});

			console.log(isDuplicate);

			if (!isDuplicate) {
				var sFolder = oModel.getProperty("/imageForm/folderName");
				var sModel = oModel.getProperty('/imageForm/modelName');
				var sRate = oModel.getProperty('/imageForm/learningRate');
				var oParams = {
					"dataset": String(sFolder),
					"modelName": String(sModel)
				};
				var aOptParams = aParams.filter(function(value) {
					if (value.value !== "") {
						return value;
					}
				});
				for (var i = 0; i < aOptParams.length; i++) {
					oParams[aOptParams[i].type] = aOptParams[i].value;
				}
				//
				console.log(oParams);
				return oParams;
			}

		},
		_submitNewDeployment: function(oOptions) {
			/**
			 *Get the Csrf Token and call back with start retraining
			 **/
			this._fetchCsrfToken(oOptions, this._startNewDeployment);
		},

		_startNewDeployment: function(token, oOptions, that) {
			/**
			 *Trigger a Deployment
			 **/
			console.log("in deployment");
			console.log(oOptions);

			jQuery.ajax({
					url: '/mlretrainingapp/deployments',
					type: 'POST',
					headers: {
						'x-csrf-token': token
					},
					contentType: 'application/json',
					data: JSON.stringify(oOptions)
				})
				.done(function(data) {
					MessageToast.show("Model in deployment");
					that._refreshModels();

				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
		},

		_submitNewTraining: function(oOptions) {
			/**
			 *Get the Csrf Token and call back with start retraining
			 **/
			this._fetchCsrfToken(oOptions, this._startJobRetraining);
		},

		_fetchCsrfToken: function(oOptions, callback) {
			/**
			 *Fetch X-csrf Token
			 **/

			var that = this;

			jQuery.ajax({
					url: '/mlretrainingapp/users',
					type: 'HEAD',
					headers: {
						'x-csrf-token': 'fetch'
					}
				})
				.done(function(message, text, jqXHR) {
					console.log("got header");
					callback(jqXHR.getResponseHeader('x-csrf-token'), oOptions, that);
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					alert('Error fetching CSRF token: ' + jqXHR.status + ' ' + errorThrown);
				});
		},

		_startJobRetraining: function(token, oOptions, that) {
			/**
			 *Trigger a retraining Job
			 *On Success -> post Job ID into Database
			 **/
			console.log("in start job retraining");
			console.log(oOptions);
			console.log(that);

			jQuery.ajax({
					url: '/mlretrainingapp/retraining',
					type: 'POST',
					headers: {
						'x-csrf-token': token
					},
					contentType: 'application/json',
					data: JSON.stringify(oOptions)
				})
				.done(function(data) {
					MessageToast.show("Job successfully started with ID: " + data.id);

					that._refreshJobs();
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
		},

		_refreshJobs: function() {
			/**
			 *Refresh Jobs
			 **/
			var oHeaders = {
				'token-value': this.sAccessToken,
				contentType: 'application/json'
			};
			//Refresh Existing Jobs
			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/retraining',
					headers: oHeaders
				})
				.done(function(data, textStatus, jqXHR) {
					this.getView().getModel().setProperty("/retrainingjobs", data.jobs);
					MessageToast.show("Submitted jobs loaded");
				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		onPressViewImage: function(oEvent) {
			var oModel = this.getView().getModel();
			var sPath = oEvent.getSource().getParent().getParent().getBindingContext().getPath();
			var sPrefix = oModel.getProperty(sPath).name;
			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/image',
					data: {
						prefix: sPrefix
					}
				})
				.done(function(data, textStatus, jqXHR) {
					console.log(data);
					var oImage = new sap.m.LightBoxItem({
						"imageSrc": data.imageSrc,
						"alt": "This is an image"
					});
					var oImageBox = new sap.m.LightBox();
					oImageBox.addImageContent(oImage);
					oImageBox.open();

				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		onChangeImageUpload: function(oEvent) {
			var oModel = this.getView().getModel();
			var reader = new FileReader();
			reader.onloadend = function() {
				oModel.setProperty('/image', reader.result);
				oModel.refresh();
			};
			reader.readAsDataURL(oEvent.getParameters().files[0]);

			var oFiles = oEvent.getParameter("files");
			oModel.setProperty('/files', oFiles);

		},

		onPressClassify: function() {
			if (!this.busyDialog) {
				this.busyDialog = new BusyDialog({});
			}
			this.busyDialog.open();

			var oModel = this.getView().getModel();
			var sModel = oModel.getProperty('/inference-model');
			var sVersion = oModel.getProperty('/inference-version');
			var oOptions = {
				"modelName": sModel,
				"modelVersion": sVersion
			};
			var form = new FormData();
			var oFiles = oModel.getProperty('/files');
			form.append("files", oFiles[0]);
			//form.append("files", oFiles);
			form.append("options", JSON.stringify(oOptions));
			this._fetchCsrfToken(form, this._doInference);
		},

		_doInference: function(token, oOptions, that) {
			/**
			 *Do an Inference
			 **/

			console.log("in Inference cb");
			console.log(oOptions);
			var oModel = that.getView().getModel();
			var oHeaders = {
				'token-value': that.sAccessToken,
				'x-csrf-token': token //,'Authorization': 'Bearer ' + that.sAccessToken
			};

			$.ajax({
				url: '/mlretrainingapp/inference_sync',
				type: "POST",
				headers: oHeaders,
				data: oOptions,
				processData: false,
				contentType: false,
				success: function(data) {
					console.log(data);
					oModel.setProperty("/predictions", data.predictions[0].results);
					that.busyDialog.close();
				},
				error: function(request, status, error) {
					console.log(error);
					that.busyDialog.close();
				}
			});

		},

		onToggleOpenState: function(oEvent) {
			var iItemIndex = oEvent.getParameter("itemIndex");
			var oItemContext = oEvent.getParameter("itemContext");
			var bExpanded = oEvent.getParameter("expanded");

			var oTree = this.getView().byId("Tree");
			var oModel = this.getView().getModel();
			var sPath = oItemContext.getPath();
			var bChildIsDummyNode = oModel.getProperty(sPath + "/nodes/0").dummy === true;
			var sPrefix = oModel.getProperty(sPath).prefix;

			if (bExpanded && bChildIsDummyNode) {
				this._loadS3Data(oModel, sPath, oTree.getItems()[iItemIndex].getLevel(), sPrefix);
			}
		},

		_loadS3Data: function(oModel, sPath, iLevel, sPrefix) {
			var oTree = this.getView().byId("Tree");
			var oModel = this.getView().getModel();
			// In this example we are just pretending to load data from the backend.
			oTree.setBusy(true);

			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/files',
					data: {
						prefix: sPrefix
					}
				})
				.done(function(data, textStatus, jqXHR) {

					//Generate a dummy node if size = 0 to get expand + additional infos
					for (var i = 0; i < data.length; i++) {
						if (data[i].size === 0) {
							data[i].ref = "sap-icon://folder-blank";
							data[i].iconEnabled = false;
							data[i].nodes = [{
								text: "",
								dummy: true
							}];
						} else {
							data[i].ref = "sap-icon://attachment-photo";
							data[i].iconEnabled = true;
						}
					}

					oModel.setProperty(sPath ? sPath + "/nodes" : "/s3data", data);
					oTree.setBusy(false);
				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		_initialDataLoad: function(fnSuccessCallback) {
			/**
			 * Get Access Token then
			 * >Get Jobs Data from API
			 * >Get Deployed Models Data from API
			 * >Get Retrained Models Data from DB (workaround as no API available to get All models)
			 * >> If no details call the Model API then saved in DB
			 **/
			jQuery.ajax({
					url: '/mlretrainingapp/token',
					type: 'GET'
				})
				.done(function(data, textStatus, jqXHR) {
					var oHeaders = {
						'token-value': data.access_token,
						contentType: 'application/json'
					};
					this.sAccessToken = data.access_token;

					// Get jobs
					this._refreshJobs();

					// Get models
					this._refreshModels();

				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + errorThrown);
				}.bind(this));
		},

		// Private Functions
		_deleteJobTraining: function() {
			this._fetchCsrfToken(this._deleteJobRetraining);
		},

		_uploadCollectionItemFactory: function(id, context) {
			var oItem = new sap.m.UploadCollectionItem(id, {
				enableEdit: false,
				enableDelete: false,
				documentId: "{folders>prefix}",
				fileName: "{folders>prefix}",
				mimeType: "",
				thumbnailUrl: "sap-icon://folder-blank",
				url: ""
			});

			return oItem;
		},

		onPressInference: function(oEvent) {
			var oItem = oEvent.getSource();
			var oModel = this.getView().getModel();
			var sModelName = oModel.getProperty(oItem.getBindingContext().getPath() + "/modelName");
			var sVersion = oModel.getProperty(oItem.getBindingContext().getPath() + "/modelVersion");
			oModel.setProperty('/inference-model', sModelName);
			oModel.setProperty('/inference-version', sVersion);

			var oPageLayout = this.byId("ObjectPageLayout");
			var sSectionId = oPageLayout.getParent().getId() + "--inference";
			oPageLayout.setSelectedSection(sSectionId);
		}

	});
});
