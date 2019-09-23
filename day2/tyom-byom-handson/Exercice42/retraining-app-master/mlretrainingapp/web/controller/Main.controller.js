sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.Main", {

		onInit: function () {
      this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
    },

		onNavToJobs: function(){
			this.oRouter.navTo("Jobs");
		},
		onNavToModels: function(){
			this.oRouter.navTo("Models");
		},
		onNavToTrainingData: function(){
			this.oRouter.navTo("TrainingData");
		}
	});
});
