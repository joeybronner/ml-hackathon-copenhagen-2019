sap.ui.define([
	"jquery.sap.global",
	"sap/ui/core/mvc/Controller"
], function(jQuery, Controller) {
	"use strict";

	return Controller.extend("sap.mlf.retraining.controller.NotFound", {
		onLinkPressed : function () {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("Main");
		}
	});
});
