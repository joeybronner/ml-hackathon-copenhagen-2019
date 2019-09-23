sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller",
	'sap/mlf/retraining/util/formatter',
	"sap/ui/model/json/JSONModel",
	'sap/m/MessageToast',
], function(jQuery, Controller, formatter, JSONModel, MessageToast) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.Job", {
		formatter: formatter,

		onInit: function() {
			this._jobId = "";
			this._sAutoRefreshIntervalCallId = "";

			this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			this.oRouter.getRoute("Job").attachPatternMatched(this._onObjectMatched, this);

			var oJobModel = new JSONModel({
				startTime: ""
			});
			this.getView().setModel(oJobModel, "job");
			oJobModel.attachRequestCompleted(this.onJobCompleted.bind(this));
			oJobModel.attachRequestFailed(this.onJobFailed.bind(this));

			var oLogModel = new JSONModel({});
			oLogModel.setSizeLimit(9999);
			this.getView().setModel(oLogModel, "log");
			oLogModel.attachRequestCompleted(this.onLogCompleted.bind(this));

			var oViewModel = new JSONModel({
				isEnabledAutoRefresh: true,
				isPressedAutoRefresh: false
			});
			this.getView().setModel(oViewModel, "view")
		},

		// EVENTS
		onNavBack: function() {
			this.oRouter.navTo('Jobs');
			this._doBeforeLeaveView();
		},

		onBreadcrumbsPress: function(oEvent){
			this.oRouter.navTo("Jobs");
			this._doBeforeLeaveView();
		},

		onJobCompleted:function(){
			this.getView().getModel("job").refresh(true);

			if(this._isJobFinished()){
				jQuery.sap.clearIntervalCall(this._sAutoRefreshIntervalCallId);
				this.getView().getModel("view").setProperty("/isEnabledAutoRefresh", false);
				this.getView().getModel("view").setProperty("/isPressedAutoRefresh", false);
			}
		},

		onJobFailed: function(){
			this.oRouter.getTargets().display("NotFound");
		},

		onLogCompleted: function(){
			this.getView().getModel("log").refresh(true);
		},

		onNavToModel: function(){
			var oModel = this.getView().getModel("log"),
			sModelName = oModel.getProperty("/modelName"),
			sModelVersion = oModel.getProperty("/modelVersion");

			this.oRouter.navTo("Model",{
				modelName: sModelName,
				modelVersion: sModelVersion
			});

			this._doBeforeLeaveView();
		},

		isVisibleAvatar: function(sText){
			return sText == "";
		},

		isVisibleLogText: function(sText){
			return sText != "";
		},

		isVisibleModel: function(sModelName){
			return sModelName !== "" && sModelName !== undefined ? true: false;
		},

		isVisibleStartTime: function(sTime){
			return sTime !== undefined && sTime !== ''? true:false;
		},

		onPressAutoRefresh: function(oEvent){
			var bPressed = oEvent.getParameter("pressed");

			if(bPressed){
				this._sAutoRefreshIntervalCallId = jQuery.sap.intervalCall(30000, this, this._refresh);
				MessageToast.show(this.getView().getModel("i18n").getProperty("autoRefreshOn"));
			}else{
				jQuery.sap.clearIntervalCall(this._sAutoRefreshIntervalCallId)
				MessageToast.show(this.getView().getModel("i18n").getProperty("autoRefreshOff"));
			}
		},

		// PRIVATE
		_onObjectMatched: function(oEvent) {
				this._jobId = oEvent.getParameter("arguments").jobId;

				this.getView().getModel("view").setProperty("/isEnabledAutoRefresh", true);
				this.getView().getModel("view").setProperty("/isPressedAutoRefresh", false);

				this._refresh();
		},

		_doBeforeLeaveView: function(){
			jQuery.sap.clearIntervalCall(this._sAutoRefreshIntervalCallId);
			this.getView().getModel("view").setProperty("/isPressedAutoRefresh", false);
		},

		_refresh: function(){
			this._readJob();
			this._readLog();
		},

		_readJob: function(){
			var mHeaders = [],
					sAccessToken = this.getView().getModel("authentication").getProperty("/access_token"),
					oModel = this.getView().getModel("job"),
					sJobUrl = "/mlretrainingapp/jobs/" + this._jobId;

			mHeaders['token-value'] = sAccessToken;
			mHeaders['contentType'] = "application/json";
			oModel.loadData(sJobUrl, "", true, 'GET', false, false, mHeaders);
		},

		_readLog: function(){
			var sLogUrl = "/mlretrainingapp/logs";
			jQuery.ajax({
					type: 'GET',
					url: sLogUrl,
					data: {
						prefix: this._jobId
					}
				}).done(this._onReadLogDone.bind(this)).fail(this._onReadLogFail.bind(this));
		},

		_onReadLogDone: function(data){
			var oModel = this.getView().getModel("log"),
					sModelName = "",
					sModelVersion = "";

			var index = data.indexOf("Model is uploaded to repository with name ");
			if(index > -1){
				var sLastLineInLog = data.substring(index);
				var aSplittedLine = sLastLineInLog.split(" ");
				sModelName = aSplittedLine[7];
				sModelVersion = aSplittedLine[10].split(".")[0];
			}

			oModel.setData({
				text: data,
				modelName: sModelName,
				modelVersion: sModelVersion});
		},

		_onReadLogFail: function(){
			var oModel = this.getView().getModel("log");
			oModel.setData({text: ""});
		},

		_isJobFinished: function(){
			var sStatus = this.getView().getModel('job').getProperty("/status");
			return sStatus == 'SUCCEEDED' || sStatus == 'FAILED'? true: false;
		}

	});
});
