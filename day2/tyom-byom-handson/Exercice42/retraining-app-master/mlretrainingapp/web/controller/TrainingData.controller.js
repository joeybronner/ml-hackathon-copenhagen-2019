sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/ui/model/FilterType',
	'sap/m/ObjectAttribute',
	"sap/mlf/retraining/util/formatter",
	"sap/m/LightBoxItem",
	"sap/m/LightBox",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/UploadCollectionParameter"
], function(Controller, JSONModel, Filter, FilterOperator, FilterType, ObjectAttribute, formatter, LightBoxItem, LightBox, MessageBox, MessageToast, UploadCollectionParameter) {
	"use strict";


	return Controller.extend("sap.mlf.retraining.controller.TrainingData", {

		formatter : formatter,

		onInit: function () {
      this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			// this.oResourceBundle = this.getView().getModel('i18n').getResourceBundle();

			var foldersModel = new JSONModel("/mlretrainingapp/files");
			foldersModel.setSizeLimit(9999);
			this.getView().setModel(foldersModel, "folders");
			foldersModel.attachRequestCompleted(this.onFolderLoaded.bind(this));

			this.getView().setModel(new JSONModel({
				currentLocationText: "Training Data", //todo
				history: [],
				maximumFileSize:10
			}),"view")

			this._oUploadCollection = this.byId("UploadCollection");
			this._oBreadcrumbs = this.byId("breadcrumbs");
			this._bindUploadCollectionItems("folders>/");
			this._oUploadCollection.addEventDelegate({
				onAfterRendering: function() {
					var iCount = this._oUploadCollection.getItems().length,
						oBundle = this.getView().getModel('i18n').getResourceBundle();
					this._oBreadcrumbs.setCurrentLocationText(this._getCurrentLocationText()+ " (" + iCount + ")");
				}.bind(this)
			});
    },

		onNavBack: function() {
			this.oRouter.navTo('Main');
		},

		onUploadCollectionSearch: function(oEvent){
			var sFilter = oEvent.getParameter("query"),
					oBinding = this.getView().byId("UploadCollection").getBinding("items"),
					aFilters = [];

			if (sFilter) {
				aFilters.push(new Filter("prefix", FilterOperator.Contains, sFilter));
			}
			oBinding.filter(aFilters, FilterType.Application);
		},

		onBreadcrumbPress: function(event) {
			var oLink = event.getSource(),
					oModel = this.getView().getModel("view"),
					oFoldersModel = this.getView().getModel("folders");
			var iIndex = this._oBreadcrumbs.indexOfLink(oLink);

			var sPath = oModel.getProperty("/history")[iIndex].path;
			var sCurrentFolderPath = sPath.substring(0, sPath.lastIndexOf("/"));
			var oParameters={"prefix": sPath};
			oFoldersModel.loadData("/mlretrainingapp/files", oParameters);

			// remove the sub folders
			var aHistory = oModel.getProperty("/history");
			aHistory.splice(iIndex);
			oModel.setProperty("/history", aHistory);
			oModel.setProperty("/currentPath", sPath);
			
			// reset the current location folder
			this._oBreadcrumbs.setCurrentLocationText(oLink.getText());
		},

		onBeforeUploadStarts: function(oEvent) {
			var oCustomHeaderFileName = new UploadCollectionParameter({
				name: "File-Name",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomHeaderFileName);

			var oCustomHeaderPrefix = new UploadCollectionParameter({
				name: "Prefix",
				value: this.getView().getModel("view").getProperty("/currentPath")
			});
			oEvent.getParameters().addHeaderParameter(oCustomHeaderPrefix);
		},

		onUploadComplete: function(oEvent){
			var oUploadCollection = this.byId("UploadCollection"),
					oData = oUploadCollection.getModel("folders").getData(),
					sPrefix = this.getView().getModel("view").getProperty("/currentPath"),
					sFileName = oEvent.getParameter("files")[0].fileName,
					sFullName = sPrefix+''+sFileName,
					that = this;

			oData.unshift({
				"name": sFullName,
				"size": 1,
				"lastModified": new Date()
			});
			this.getView().getModel("folders").refresh();

			if(this._sRefreshTimeoutId){
				clearTimeout(this._sRefreshTimeoutId);
			}

			this._sRefreshTimeoutId = setTimeout(function() {
				that._refresh();
			}, 2000);

		},

		onFileSizeExceed: function(){
			MessageToast.show(this.getView().getModel('i18n').getProperty("messageFileSizeExceed"));
		},

		onFileDeleted: function(oEvent){
			 var sItemId = oEvent.getSource().sDeletedItemId,
			 		 oBindingContext = this.byId(sItemId).getBindingContext("folders"),
					 sFullName = oBindingContext.getModel().getProperty(oBindingContext.getPath()+'/name'),
					 sFileName = this._extractFileName(sFullName),
					 sPrefix = this.getView().getModel("view").getProperty('/currentPath');

			 jQuery.ajax({
 					type: 'DELETE',
 					url: '/mlretrainingapp/files/' + sFileName,
					headers: {
						"Prefix": sPrefix
					}
 				}).done(this.onFileDeletedBackend.bind(this));
		},

		onFileDeletedBackend: function(){
			this._refresh();
		},

		onPressCreateFolder: function() {
			var oView = this.getView();

			if (!this._oCreateFolderDialog) {
				this._oCreateFolderDialog = sap.ui.xmlfragment(oView.getId(), "sap.mlf.retraining.view.CreateFolder", this);
				oView.addDependent(this._oCreateFolderDialog);
			}
			this._oCreateFolderDialog.open();
		},

		onPressCreateCreateFolder: function() {
			this._oCreateFolderDialog.close();

			var oModel = this.getView().getModel("view");
			var sCurrentPath = oModel.getProperty("/currentPath");
			var sFolderName = oModel.getProperty("/newFolder");

			if (sFolderName) {
				var sPrefix = "";
				if (sCurrentPath) {
					sPrefix = sCurrentPath;
				}
				sPrefix = sPrefix + sFolderName;

				oModel.setProperty("/newFolder", "");

				jQuery.ajax({
					url: "/mlretrainingapp/folders",
					type: "POST",
					headers: {
						"Prefix": sPrefix
					},
					contentType: "application/json"
				})
				.done(function(data) {
					var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageToast.show(oResourceBundle.getText("folderCreatedMsg"));
					this._refresh();

				}.bind(this))
				.fail(function(jqXHR, textStatus, errorThrown) {
					MessageBox.error(textStatus + ": " + jqXHR.status + ' ' + errorThrown);
				});
			}
		},

		onPressCancelCreateFolder: function() {
			this._oCreateFolderDialog.close();
			this.getView().getModel("view").setProperty("/newFolder", "");
		},

		onFolderLoaded: function() {
			this.byId("UploadCollection").setBusy(false);
		},

		// Private

		_refresh: function(){
			var oFoldersModel = this.getView().getModel("folders"),
					sPrefix = this.getView().getModel("view").getProperty("/currentPath"),
					oParameters = {"prefix": sPrefix};

			oFoldersModel.loadData("/mlretrainingapp/files", oParameters);
		},

		_uploadCollectionItemFactory: function(id, oContext) {
			var oObject = oContext.getObject(),
					oItem = {},
					oBundle = this.getView().getModel("i18n").getResourceBundle();

			if(oObject.size == 0){
				oItem = new sap.m.UploadCollectionItem(id, {
					visibleDelete: false,
					visibleEdit: false,
					documentId: "{folders>prefix}",
					fileName: "{folders>prefix}",
					thumbnailUrl: "sap-icon://folder"
				});
				oItem.attachPress(this._onFolderPress, this);
			}else{
				var sFileName = this._extractFileName(oObject.name),
						sMimeType = this._extractMimeType(sFileName);

				if(sMimeType.indexOf("image/") >=0){
					oItem = new sap.m.UploadCollectionItem(id, {
						visibleDelete: true,
						visibleEdit: false,
						documentId: "{folders>prefix}",
						fileName: sFileName,
						mimeType: sMimeType,
						attributes:[
							new ObjectAttribute({
								text: this.formatter.dateTime(oObject.lastModified),
								title: "{i18n>updateTime}"
							}),
							new ObjectAttribute({
								text: oBundle.getText("fileSizeOf", [oObject.size]),
								title: "{i18n>fileSize}"
							})
						],
						press: this._onPressImage.bind(this)
					});
				}else{
					oItem = new sap.m.UploadCollectionItem(id, {
						visibleDelete: true,
						visibleEdit: false,
						documentId: "{folders>prefix}",
						fileName: sFileName,
						mimeType: sMimeType,
						attributes:[
							new ObjectAttribute({
								text: this.formatter.dateTime(oObject.lastModified),
								title: "{i18n>updateTime}"
							}),
							new ObjectAttribute({
								text: oBundle.getText("fileSizeOf", [oObject.size]),
								title: "{i18n>fileSize}"
							})
						]
					});
				}
			}

			return oItem;
		},

		_extractFileName: function(sFullName){
			var sResult = "";
			if(sFullName != ""){
				var aParts = sFullName.split("/");
				sResult = aParts[aParts.length-1];
			}
			return sResult;
		},

		_extractMimeType: function(sFileName){
			var sMimeType = "",
					mFileTypeToMimeTypes={
						"jpg": "image/jpeg",
						"jpeg": "image/jpeg",
						"jpe": "image/jpeg",
						"gif": "image/gif",
						"bmp": "image/bmp"
					};

			if(sFileName != ""){
				var aParts = sFileName.split(".");
				var sFileType = aParts[aParts.length-1].toLowerCase();
				if(mFileTypeToMimeTypes.hasOwnProperty(sFileType)){
					sMimeType = mFileTypeToMimeTypes[sFileType];
				}
			}
			return sMimeType;
		},

		_onFolderPress: function(oEvent) {
			// Set busy indicator with short delay so that users cannot
			// navigate into a folder more than once in a row
			this.byId("UploadCollection").setBusy(true);
			this.byId("UploadCollection").setBusyIndicatorDelay(80);

			var sDestination = oEvent.getSource().getBinding("fileName").getValue(),
					oFoldersModel = this.getView().getModel("folders"),
					oModel = this.getView().getModel("view"),
					oParameters = {"prefix": sDestination},
			 		sCurrentFolder = this._getCurrentLocationText(),
			 		aHistory = oModel.getProperty("/history"),
					sCurrentLocation = this._convertDestinationToName(sDestination),
					sHistoryPath = this._createHistoryPath(),
					sHistoryName = sCurrentFolder;

			aHistory.push({
				name: sHistoryName,
				path: sHistoryPath
			});
			oModel.setProperty("/history", aHistory);
			oModel.setProperty("/currentPath", sDestination);
			this._oBreadcrumbs.setCurrentLocationText(sCurrentLocation);

			// Empty search filed and remove filter
			this.byId("searchField").setValue("");
			this.byId("UploadCollection").getBinding("items").aApplicationFilters = [];

			oFoldersModel.loadData("/mlretrainingapp/files", oParameters);
		},

		_createHistoryPath: function(){
			var sCurrentLocationText = this._getCurrentLocationText(),
					aHistory = this.getView().getModel("view").getProperty("/history"),
					aHistoryLength = aHistory.length,
				  sPath = "";

			if(sCurrentLocationText =="Training Data"){ //todo

				return sPath;
			}

			if(aHistory[aHistoryLength-1].path != ""){
				sPath = aHistory[aHistoryLength-1].path + "" + sCurrentLocationText + "/";
			}else{
				sPath = sCurrentLocationText + "/";
			}

			return sPath;
		},

		_bindUploadCollectionItems: function(path) {
			this._oUploadCollection.bindItems({
				path: path,
				factory: this._uploadCollectionItemFactory.bind(this)
			});
		},

		_convertDestinationToName: function(sDestination){
			var aFolders = sDestination.split("/");
			return aFolders[aFolders.length - 2];
		},

		_getCurrentLocationText: function() {
			// Remove the previously added number of items from the currentLocationText in order to not show the number twice after rendering.
			var sText = this._oBreadcrumbs.getCurrentLocationText().replace(/\s\([0-9]*\)/, "");
			return sText;
		},

		_onPressImage: function(oEvent){
			var oContext = oEvent.getSource().getBinding("documentId").getContext(),
			sFile = oContext.getProperty("name");

			jQuery.ajax({
					type: 'GET',
					url: '/mlretrainingapp/image',
					data: {
						prefix: sFile
					}
				})
				.done(this._onImageLoaded.bind(this));
		},

		_onImageLoaded:function(data, textStatus, jqXHR){
				var oImage = new LightBoxItem({
					"imageSrc": data.imageSrc,
					"alt": "This is an image"
				});
				var oImageBox = new LightBox();
				oImageBox.addImageContent(oImage);
				oImageBox.open();
		}
	});
});
