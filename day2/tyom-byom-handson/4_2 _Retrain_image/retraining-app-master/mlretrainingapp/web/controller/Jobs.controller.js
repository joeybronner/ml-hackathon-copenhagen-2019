sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller",
	'sap/mlf/retraining/util/formatter',
	"sap/ui/model/json/JSONModel",
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/ui/model/FilterType',
], function(jQuery, Controller, formatter, JSONModel, MessageBox, MessageToast, Filter, FilterOperator, FilterType) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.Jobs", {
		formatter: formatter,
		onInit: function() {
			// Variables
			this._oTable = this.byId("jobsTable");
			this._mTableFilters = {
				"succeeded": [new sap.ui.model.Filter("status", "EQ", "SUCCEEDED")],
				"pending": [new sap.ui.model.Filter("status", "EQ", "PENDING")],
				"running": [new sap.ui.model.Filter("status", "EQ", "RUNNING")],
				"failed": [new sap.ui.model.Filter("status", "EQ", "FAILED")],
				"all": []
			};
			this._oCreateModelDefaultData = {
				serviceType: "image",
				dataFolder: "",
				modelName: "",
				batchSize: 64,
				learningRate: 0.001,
				maxEpochs: 150,
				maxUnimprovedEpochs: 15,
				completionTime: 24,
				memory: 8192
			};
			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getRoute("Jobs").attachPatternMatched(this._onPatternMatched, this);

			this._setupModels();
		},

		// EVENTS
		onNavBack: function() {
			this.oRouter.navTo('Main');
		},

		onPressRetrainingJobsRefresh:function(){
			this._readJobs();
		},

		onJobsCompleted: function(oEvent){
			var aJobs = oEvent.getSource().getData().jobs;
			this._updateCounts(aJobs);
		},

		onQuickFilter: function(oEvent) {
			var oBinding = this._oTable.getBinding("items"),
					sKey = oEvent.getParameter("selectedKey");

			oBinding.filter(this._mTableFilters[sKey]);
		},

		onPressRetrainingJob: function(oEvent){
			var sId = this.getView().getModel().getProperty(oEvent.getSource().getBindingContext().getPath() + "/id");

			this.oRouter.navTo("Job", {
					jobId: sId
			});
		},

		onPressRetrainingJobsRefresh: function(){
			this._readJobs();
		},

		onSearch: function(oEvent){
			var sFilter = oEvent.getParameter("query"),
					oBinding = this._oTable.getBinding("items"),
					aFilters = [];

			if (sFilter) {
				aFilters.push(new Filter("id", FilterOperator.Contains, sFilter));
			}
			oBinding.filter(aFilters, FilterType.Application);
		},

		// Create Job - Begin
		onPressCreateJob: function(oEvent){
			var oView = this.getView();

			if (!this._oCreateJobDialog) {
				this._oCreateJobDialog = sap.ui.xmlfragment(oView.getId(), "sap.mlf.retraining.view.Retrain", this);
				oView.addDependent(this._oCreateJobDialog);
			}
			this._oCreateJobDialog.open();
		},

		onLoadDataFolders: function() {
			var oModel = this.oView.getModel("folders");
			oModel.loadData("/mlretrainingapp/files");
			oModel.refresh(true);
		},

		onPressCreateCreateJob: function(){
			this._oCreateJobDialog.close();
			this._submitNewTraining();
			this._clearFieldsCreateJobDialog();
		},

		onPressCancelCreateJob: function(){
			this._oCreateJobDialog.close();
			this._clearFieldsCreateJobDialog();
		},
		// Create Job - End


		// PRIVATE
		_readJobs: function(){
			var oModel = this.getView().getModel(),
					sAccessToken = this.getView().getModel("authentication").getProperty("/access_token");

			var mHeaders = [];
			mHeaders['token-value'] = sAccessToken;
			mHeaders['contentType'] = "application/json";
			oModel.loadData("/mlretrainingapp/retraining", "", true, 'GET', false, false, mHeaders);
			oModel.refresh(true);
		},

		_updateCounts: function(aJobs){
			var iSucceeded = 0,
					iPending = 0,
					iRunning = 0,
					iFailed = 0;

			this.getView().getModel("jobsView").setProperty("/countAll", aJobs.length);

			for(var i=0; i < aJobs.length; i++){
				var oJob = aJobs[i];
				if(oJob.status == 'SUCCEEDED'){
					iSucceeded++;
				}else if (oJob.status == 'PENDING') {
					iPending++;
				}else if (oJob.status == 'RUNNING'){
					iRunning++;
				}else if (oJob.status == 'FAILED') {
					iFailed++;
				}else{

				}
			}

			this.getView().getModel("jobsView").setProperty("/countPending", iPending);
			this.getView().getModel("jobsView").setProperty("/countRunning", iRunning);
			this.getView().getModel("jobsView").setProperty("/countSucceeded", iSucceeded);
			this.getView().getModel("jobsView").setProperty("/countFailed", iFailed);
		},

		_setupModels: function(){
			this.getView().setModel(new JSONModel({
				countAll: 0,
				countSucceeded: 0,
				countPending: 0,
				countFailed: 0
			}), "jobsView");

			var oJobsModel = new JSONModel();
			oJobsModel.setSizeLimit(9999);
			oJobsModel.attachRequestCompleted(this.onJobsCompleted.bind(this));
			this.getView().setModel(oJobsModel);

			var oCreateData = jQuery.extend({}, this._oCreateModelDefaultData);
			var oCreateModel = new JSONModel(oCreateData);
			this.getView().setModel(oCreateModel, "jobsViewCreateJob");

			var oFoldersModel = new JSONModel();
			oFoldersModel.setSizeLimit(1000);
			this.getView().setModel(oFoldersModel, "folders");
		},

		_onPatternMatched: function(){
			this._readJobs();
		},

		_submitNewTraining: function() {
			var oOptions = this._prepareSubmitJobOptions();

			this._fetchCsrfToken(oOptions, this._startJobRetraining.bind(this));
		},

		_prepareSubmitJobOptions: function(){
			var oModel = this.getView().getModel("jobsViewCreateJob"),
					sAccessToken = this.getView().getModel("authentication").getProperty("/access_token"),
					sDataFolder = oModel.getProperty("/dataFolder");
			if (sDataFolder.endsWith("/")) {
				sDataFolder = sDataFolder.substring(0, sDataFolder.length - 1);
			}
			var oOptions = {
						"token": sAccessToken,
						"params": {
							"dataset": sDataFolder,
							"modelName": oModel.getProperty("/modelName")
					}
				};

			if(parseInt(this._oCreateModelDefaultData.batchSize, 10) != parseInt(oModel.getProperty("/batchSize"), 10)){
				oOptions.params["batchSize"] = oModel.getProperty("/batchSize");
			}
			if(parseInt(this._oCreateModelDefaultData.learningRate, 10) != parseInt(oModel.getProperty("/learningRate"), 10)){
				oOptions.params["learningRate"] = oModel.getProperty("/learningRate");
			}
			if(parseInt(this._oCreateModelDefaultData.maxEpochs, 10) != parseInt(oModel.getProperty("/maxEpochs"), 10)){
				oOptions.params["maxEpochs"] = oModel.getProperty("/maxEpochs");
			}
			if(parseInt(this._oCreateModelDefaultData.maxUnimprovedEpochs, 10) != parseInt(oModel.getProperty("/maxUnimprovedEpochs"), 10)){
				oOptions.params["maxUnimprovedEpochs"] = oModel.getProperty("/maxUnimprovedEpochs");
			}
			if(parseInt(this._oCreateModelDefaultData.completionTime, 10) != parseInt(oModel.getProperty("/completionTime"), 10)){
				oOptions.params["completionTime"] = oModel.getProperty("/completionTime");
			}
			if(parseInt(this._oCreateModelDefaultData.memory, 10) != parseInt(oModel.getProperty("/memory"), 10)){
				oOptions.params["memory"] = oModel.getProperty("/memory");
			}

			return oOptions;
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
				});
		},

		_startJobRetraining: function(token, oOptions) {
			jQuery.ajax({
					url: '/mlretrainingapp/retraining',
					type: 'POST',
					headers: {
						'x-csrf-token': token
					},
					contentType: 'application/json',
					data: JSON.stringify(oOptions)
				})
				.done(this._onJobRetrainingDone.bind(this))
				.fail(this._onJobRetrainingFail.bind(this));
		},

		_onJobRetrainingDone: function(data){
			var sId = data.id,
			sMessage = this.getView().getModel("i18n").getProperty("messageJobCreated");

			MessageToast.show(sMessage, {duration: 500, onClose: this._onJobCreatedNotificationClosed.bind(this, sId)});
		},

		_onJobCreatedNotificationClosed: function(sId){
			this.oRouter.navTo("Job",{
				jobId: sId
			});
		},

		_onJobRetrainingFail: function(jqXHR, textStatus, errorThrown){
			MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
		},

		_clearFieldsCreateJobDialog: function(){
			var oModel = this.getView().getModel("jobsViewCreateJob"),
					oData = jQuery.extend({}, this._oCreateModelDefaultData);
			oModel.setData(oData);
			oModel.refresh(true);
		}
	});
});
