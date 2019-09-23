sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/mvc/Controller",
    "sap/mlf/retraining/util/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
  	"sap/m/MessageToast",
  	"sap/m/Dialog",
  	"sap/m/Button",
  	"sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/FilterType"
], function(jQuery, Controller, formatter, JSONModel, MessageBox, MessageToast, Dialog, Button, Text, Filter, FilterOperator, FilterType) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.Models", {
		formatter : formatter,

    onInit: function() {
      this._oTable = this.byId("idRetrainedModelsTable");
      this._mTableFilters = {
          "succeeded": [new sap.ui.model.Filter("status/state", "EQ", "SUCCEEDED")],
          "pending": [new sap.ui.model.Filter("status/state", "EQ", "PENDING")],
          "failed": [new sap.ui.model.Filter("status/state", "EQ", "FAILED")],
          "undeploy": [new sap.ui.model.Filter("status/state", "EQ", "")],
          "all": []
        };

			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      this.oRouter.getRoute("Models").attachPatternMatched(this._onPatternMatched, this);
      this._setupModels();
      this._authenticate(this.onAuthenticationDone.bind(this));
		},

    // EVENTS
		onNavBack: function() {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			}else{
			 	this.oRouter.navTo('Main');
			}
		},

    onAuthenticationDone: function(data){
        this._accessToken = data.access_token;

        this._readModels();
    },

    onPressModelRefresh:function(){
        this._readModels();
    },

    onSearch: function(oEvent){
      var sFilter = oEvent.getParameter("query"),
          oBinding = this._oTable.getBinding("items"),
          aFilters = [];

      if (sFilter) {
        aFilters.push(new Filter("modelName", FilterOperator.Contains, sFilter));
      }
      oBinding.filter(aFilters, FilterType.Application);
    },

    onModelsComplete: function(oEvent){
    	this.getView().getModel().refresh(true);
    	var oModel = oEvent.getSource();
        var aModels = oModel.getData();
        this._updateCounts(aModels);
    },

    onQuickFilter: function(oEvent) {
        var oBinding = this._oTable.getBinding("items"),
            sKey = oEvent.getParameter("selectedKey");

        oBinding.filter(this._mTableFilters[sKey]);
    },

    onPressModelDeploy: function(oEvent) {
			var oButton = oEvent.getSource();
			var sBindingPath = oButton.getBindingContext().getPath();
			var oModel = oButton.getModel().getProperty(sBindingPath);
            var oResourceBundle = oButton.getModel("i18n").getResourceBundle();

			var oOptions;
			oOptions = {
				"token": this._accessToken,
				"params": {
					"modelName": oModel["modelName"],
					"modelVersion": oModel["modelVersion"]
				}
			};
			var deployedModels = oButton.getModel().getData();
			var isDeployed = false;
			for(var i=0; i< Object.keys(deployedModels).length; i++) {
				if (deployedModels[i]["modelName"] === oModel["modelName"]) {
					if (["SUCCEEDED", "FAILED", "PENDING"].includes(deployedModels[i]["status"]["state"])) {
                        isDeployed = true;
						var id = deployedModels[i]["deploymentId"];
                        var dialog = new Dialog({
                            title: oResourceBundle.getText('confirm'),
                            type: 'Message',
                            content: new Text({ text: oResourceBundle.getText("confirmText") }),
                            beginButton: new Button({
                                text: oResourceBundle.getText('submit'),
                                press: function () {
                                    dialog.close();
									var oOptionsDelete = {
										"token": this._accessToken,
										"params": {
											"id": id
										}
									};
									this._deleteDeployedModel(oOptionsDelete);
									this._iCounter = 3;
									this._sAutoRefreshAndSubmitIntervalCallId = jQuery.sap.intervalCall(30000, this, this._refreshAndSubmitNewDeployment, [sBindingPath, oOptions]);
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
                        break;
					}
				}
			}
			if(!isDeployed){
                this._submitNewDeployment(oOptions);
			}
		},

		onPressModel: function(oEvent) {
			var oItem = oEvent.getSource();
			var oModel = oItem.getModel().getProperty(oItem.getBindingContext().getPath());

			this.oRouter.navTo("Model", {
				modelName: oModel["modelName"],
				modelVersion: oModel["modelVersion"]
			});
		},

        // PRIVATE
        _readModels: function() {
            /**
             *Refresh Models
             **/
            var oModel = this.getView().getModel();
            var token = this._accessToken;
            var oHeaders = {
                'token-value': token,
                contentType: 'application/json'
            };
            oModel.loadData("/mlretrainingapp/modeldeployed", "", true, 'GET', true, false, oHeaders);
        },

        _deleteDeployedModel: function(oOptions) {
			/**
			 *Get a Csrf Token and call back with start delete retrained Model
			 **/

			this._fetchCsrfToken(oOptions, this._startDeleteDeployedModel.bind(this));
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
		
		_refreshAndSubmitNewDeployment: function (sBindingPath, oOptions) {
			if (this._iCounter > 0) {
				this._readModels();
				if (!this.getView().getModel().getProperty(sBindingPath)["deployedVersion"]) {
					jQuery.sap.clearIntervalCall(this._sAutoRefreshAndSubmitIntervalCallId);
					this._submitNewDeployment(oOptions);
				}
			}
			if (this._iCounter == 1) {
				jQuery.sap.clearIntervalCall(this._sAutoRefreshAndSubmitIntervalCallId);
				if (this.getView().getModel().getProperty(sBindingPath)["deployedVersion"]) {
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
					this._readModels();

				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
		},

        _updateCounts: function(aModels){
            var iUndeploy = 0,
				iSucceeded = 0,
                iPending = 0,
                iFailed = 0;

            this.getView().getModel("modelsView").setProperty("/countAll", Object.keys(aModels).length);

            for(var i=0; i < Object.keys(aModels).length; i++){
                switch(aModels[i].status['state']){
                    case '':
                        iUndeploy++;
                        break;
                    case 'SUCCEEDED':
                        iSucceeded++;
                        break;
                    case 'PENDING':
                        iPending++;
                        break;
                    case 'FAILED':
                        iFailed++;
                        break;
                    default:
                        break;
                }

            }
            this.getView().getModel("modelsView").setProperty("/countUndeploy", iUndeploy);
            this.getView().getModel("modelsView").setProperty("/countSucceeded", iSucceeded);
            this.getView().getModel("modelsView").setProperty("/countPending", iPending);
            this.getView().getModel("modelsView").setProperty("/countFailed", iFailed);
        },

        _authenticate: function(fnSuccessCallback) {
            jQuery.ajax({
                url: '/mlretrainingapp/token',
                type: 'GET'
            })
                .done(function(data, textStatus, jqXHR) {
                    if (fnSuccessCallback) {
                        fnSuccessCallback(data);
                    }
                }.bind(this))
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
					console.log("got header");
					callback(jqXHR.getResponseHeader('x-csrf-token'), oOptions);
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					alert('Error fetching CSRF token: ' + jqXHR.status + ' ' + errorThrown);
				});
		},

        _setupModels: function(){
            this.getView().setModel(new JSONModel({
                countAll: 0,
                countSucceeded: 0,
                countPending: 0,
                countFailed: 0
            }), "modelsView");

            var oModelsModel = new JSONModel();
            oModelsModel.setSizeLimit(9999);
            oModelsModel.attachRequestCompleted(this.onModelsComplete.bind(this));
            this.getView().setModel(oModelsModel);
        },

        _onPatternMatched: function(){
          this._accessToken = this.getView().getModel("authentication").getProperty("/access_token");
          this._readModels();
        }
    });
});
