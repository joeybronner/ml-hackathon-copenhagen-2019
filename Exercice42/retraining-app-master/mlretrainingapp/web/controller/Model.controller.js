sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller",
	'sap/mlf/retraining/util/formatter',
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/BusyDialog",
	"sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], function(jQuery, Controller, formatter, JSONModel, MessageBox, MessageToast, BusyDialog, Dialog, Button, Text) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.Model", {
		formatter: formatter,

		onInit: function() {
			this._sAutoRefreshIntervalCallId = "";

			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getRoute("Model").attachPatternMatched(this._onObjectMatched, this);

			var oModelModel = new JSONModel();
			this.getView().setModel(oModelModel, "model");
			oModelModel.attachRequestCompleted(this.onModelCompleted.bind(this));

			var oFileModel = new JSONModel();
			this.getView().setModel(oFileModel);
		},

		// EVENTS
		onNavBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
			 	this.oRouter.navTo('Main');
			}
			this._doBeforeLeaveView();
		},

		onBreadcrumbsPress: function() {
			this.oRouter.navTo("Models");
			this._doBeforeLeaveView();
		},

		onPressAutoRefresh: function(oEvent) {
			var bPressed = oEvent.getParameter("pressed");

			if(bPressed) {
				this._sAutoRefreshIntervalCallId = jQuery.sap.intervalCall(10000, this, this._refresh);
				MessageToast.show(this.getView().getModel("i18n").getProperty("autoRefreshOn"));
			} else {
				jQuery.sap.clearIntervalCall(this._sAutoRefreshIntervalCallId)
				MessageToast.show(this.getView().getModel("i18n").getProperty("autoRefreshOff"));
			}
		},

		onPressModelDeploy: function(oEvent) {
			var oButton = oEvent.getSource();
			var oModelModel = oButton.getModel("model");
			var oResourceBundle = oButton.getModel("i18n").getResourceBundle();
            var sToken = this.getView().getModel("authentication").getProperty("/access_token");

			var oOptions;
			oOptions = {
				"token": sToken,
				"params": {
					"modelName": oModelModel.getProperty("/modelName"),
					"modelVersion": oModelModel.getProperty("/modelVersion")
				}
			};
			var isDeployed = false;
			var oDeployedVersion = oModelModel.getProperty("/deployedVersion");
			if (oDeployedVersion) {
				isDeployed = true;
                var id = oDeployedVersion['deploymentId'];
                var dialog = new Dialog({
                	title: oResourceBundle.getText('confirm'),
                    type: 'Message',
                    content: new Text({ text: oResourceBundle.getText("confirmText") }),
                    beginButton: new Button({
                    	text: oResourceBundle.getText('submit'),
                    	press: function () {
                    		dialog.close();
                    		var oOptionsDelete = {
                    				"token": sToken,
									"params": {
										"id": id
									}
							};
							this._deleteDeployedModel(oOptionsDelete);
							this._iCounter = 3;
							this._sAutoRefreshAndSubmitIntervalCallId = jQuery.sap.intervalCall(30000, this, this._refreshAndSubmitNewDeployment, [oOptions]);
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
			if(!isDeployed){
                this._submitNewDeployment(oOptions);
			}
		},

        onPressModelUnDeploy: function(){
            var id = this.getView().getModel("model").getData()['deploymentId'];
            var oOptionsDelete = {
                "token": this.getView().getModel("authentication").getProperty("/access_token"),
                "params": {
                    "id": id
                }
            }
            this._deleteDeployedModel(oOptionsDelete);
        },

		onModelCompleted:function() {
			this.getView().getModel("model").refresh(true);
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
			if(oFiles[0].size > "1000000"){
				reader.abort();
                var dialog = new Dialog({
                    title: 'Warning',
                    type: 'Message',
                    state: 'Warning',
                    content: new Text({
                        text: this.getView().getModel("i18n").getProperty("warningImageUploadSize")
                    }),
                    beginButton: new Button({
                        text: 'OK',
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
			else {
                oModel.setProperty('/files', oFiles);
            }
		},

		onPressClassify: function() {
			if (this.getView().getModel().getProperty('/files')) {
				if (!this.oBusyDialog) {
					this.oBusyDialog = new BusyDialog({});
				}
				this.oBusyDialog.open();
	
				var oModelModel = this.getView().getModel("model");
				var sModelName = oModelModel.getProperty('/modelName');
				var sModelVersion = oModelModel.getProperty('/modelVersion');
				var oOptions = {
					"modelName": sModelName,
					"modelVersion": sModelVersion
				};
				var oForm = new FormData();
				var aFiles = this.getView().getModel().getProperty('/files');
				oForm.append("files", aFiles[0]);
				oForm.append("options", JSON.stringify(oOptions));
				this._fetchCsrfToken(oForm, this._doInference.bind(this));
				if (this.byId("genericInference").getSelected()) {
					var oGenericForm = new FormData();
					oGenericForm.append("files", aFiles[0]);
					this._fetchCsrfToken(oGenericForm, this._doGenericInference.bind(this));
				}
			} else {
				var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
				var dialog = new Dialog({
                    title: oResourceBundle.getText('warning'),
                    type: 'Message',
                    state: 'Warning',
                    content: new Text({ text: oResourceBundle.getText("inferenceWarningText") }),
                    beginButton: new Button({
                        text: oResourceBundle.getText('ok'),
                        press: function () {
                            dialog.close();
                        }.bind(this)
                    }),
                    afterClose: function() {
                        dialog.destroy();
                    }
                });

                dialog.open();
			}
		},

		onExit: function() {
			this._doBeforeLeaveView();
		},

        _deleteDeployedModel: function(oOptions) {
            /**
             *Get a Csrf Token and call back with start delete retrained Model
             **/

            this._fetchCsrfToken(oOptions, this._startDeleteDeployedModel.bind(this));
        },


		// PRIVATE
		_onObjectMatched: function(oEvent) {
			var oArguments = oEvent.getParameter("arguments");
			var sModelName = oArguments.modelName;
			var sModelVersion = oArguments.modelVersion;
			var sModelUrl = "/mlretrainingapp/models/" + sModelName + "/" + sModelVersion;
			var oModelModel = this.getView().getModel("model");

			this._readModel(sModelUrl);
		},

		_readModel: function(url) {
			var mHeaders = [],
					sAccessToken = this.getView().getModel("authentication").getProperty("/access_token"),
					oModel = this.getView().getModel("model");

			mHeaders['token-value'] = sAccessToken;
			mHeaders['contentType'] = "application/json";
			oModel.loadData(url, "", true, 'GET', false, false, mHeaders);
		},


		_refresh: function() {
			var oModelModel = this.getView().getModel("model");
			var sModelName = oModelModel.getProperty("/modelName");
			var sModelVersion = oModelModel.getProperty("/modelVersion");
			var sModelUrl = "/mlretrainingapp/models/" + sModelName + "/" + sModelVersion;
			this._readModel(sModelUrl);
		},

		_fetchCsrfToken: function(oOptions, callback) {
			jQuery.ajax({
				url: '/mlretrainingapp/users',
				type: 'HEAD',
				headers: {
					'x-csrf-token': 'fetch'
				}
			})
			.done(function(message, text, jqXHR) {
				callback(jqXHR.getResponseHeader('x-csrf-token'), oOptions);
			}.bind(this))
			.fail(function(jqXHR, textStatus, errorThrown) {
				alert('Error fetching CSRF token: ' + jqXHR.status + ' ' + errorThrown);
			});
		},

		_refreshAndSubmitNewDeployment: function (oOptions) {
			if (this._iCounter > 0) {
				this._refresh();
				if (!this.getView().getModel("model").getProperty("/deployedVersion")) {
					jQuery.sap.clearIntervalCall(this._sAutoRefreshAndSubmitIntervalCallId);
					this._submitNewDeployment(oOptions);
				}
			}
			if (this._iCounter == 1) {
				jQuery.sap.clearIntervalCall(this._sAutoRefreshAndSubmitIntervalCallId);
				if (this.getView().getModel("model").getProperty("/deployedVersion")) {
					var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
					var dialog = new Dialog({
	                    title: oResourceBundle.getText('warning'),
	                    type: 'Message',
	                    state: 'Warning',
	                    content: new Text({ text: oResourceBundle.getText("warningText") }),
	                    beginButton: new Button({
	                        text: oResourceBundle.getText('ok'),
	                        press: function () {
	                            dialog.close();
	                        }.bind(this)
	                    }),
	                    afterClose: function() {
	                        dialog.destroy();
	                    }
	                });

	                dialog.open();
				}
			}
			this._iCounter--;
		},
		
		_submitNewDeployment: function(oOptions) {
			/**
			 *Get the Csrf Token and call back with start retraining
			 **/
			this._fetchCsrfToken(oOptions, this._startNewDeployment.bind(this));
		},

		_startNewDeployment: function(token, oOptions) {
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
					var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageToast.show(oResourceBundle.getText("modelInDeploymentMsg"));
					this._refresh();

				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
		},

		_doInference: function(token, oOptions) {
			var oModel = this.getView().getModel();
			var sAccessToken = this.getView().getModel("authentication").getProperty("/access_token");
			var oHeaders = {
				'token-value': sAccessToken,
				'x-csrf-token': token //,'Authorization': 'Bearer ' + that.sAccessToken
			};
			var oModelModel = this.getView().getModel("model");
			var sModelName = oModelModel.getProperty("/modelName");
			var sModelVersion = oModelModel.getProperty("/modelVersion");

			$.ajax({
				url: '/mlretrainingapp/inference_sync/' + sModelName + "/" + sModelVersion,
				type: "POST",
				headers: oHeaders,
				data: oOptions,
				processData: false,
				contentType: false,
				success: function(data) {
					oModel.setProperty("/predictions", data.predictions[0].results);
					this.oBusyDialog.close();
				}.bind(this),
				error: function(request, status, error) {
					MessageBox.error(this.getView().getModel("i18n").getProperty("messageErrorInference"));
					this.oBusyDialog.close();
				}.bind(this)
			});
		},

		_doGenericInference: function(token, oOptions) {
			var oModel = this.getView().getModel();
			var sAccessToken = this.getView().getModel("authentication").getProperty("/access_token");
			var oHeaders = {
				'token-value': sAccessToken,
				'x-csrf-token': token //,'Authorization': 'Bearer ' + that.sAccessToken
			};

			$.ajax({
				url: '/mlretrainingapp/generic_inference_sync',
				type: "POST",
				headers: oHeaders,
				data: oOptions,
				processData: false,
				contentType: false,
				success: function(data) {
					oModel.setProperty("/predictionsGeneric", data.predictions[0].results);
					this.oBusyDialog.close();
				}.bind(this),
				error: function(request, status, error) {
					console.log(error);
					this.oBusyDialog.close();
				}.bind(this)
			});
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

		_doBeforeLeaveView: function(){
			if(this._sAutoRefreshIntervalCallId){
				jQuery.sap.clearIntervalCall(this._sAutoRefreshIntervalCallId);
			}
			var oModel = this.getView().getModel();
			var fileReader = this.getView().byId("fileUploader");
			fileReader.clear();
			fileReader.abort();
            oModel.setProperty('/image', undefined);
            oModel.setProperty('/files', undefined);
			oModel.setProperty("/predictions", undefined);
			oModel.setProperty("/predictionsGeneric", undefined);
		}

	});
});
