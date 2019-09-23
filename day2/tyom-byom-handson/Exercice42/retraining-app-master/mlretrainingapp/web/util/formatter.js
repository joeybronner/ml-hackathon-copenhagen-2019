sap.ui.define([
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/MessageType",
	"sap/ui/core/ValueState"
], function(DateFormat, MessageType, ValueState) {
	"use strict";

	return {

		/**
		 * Returns the date with medium format
		 *
		 * @public
		 * @param {object} oValue value to be formatted
		 * @returns {string} formatted date with medium format
		 */
		dateTime: function(sValue) {
			if (sValue) {
				var oDate = new Date(sValue);
				return DateFormat.getDateTimeInstance({
					style: "short"
				}).format(oDate);
			}
			return "";
		},

		formatState: function(status) {
			var sState = ValueState.None;

			if (status === "SUCCEEDED") {
				sState = ValueState.Success;
			} else if (status === "FAILED") {
				sState = ValueState.Error;
			} else if (status === "RUNNING") {
				sState = ValueState.Warning;
			} else {
			}
			return sState;
		},

		formatModelState: function(status) {
			var sState = ValueState.None;

			if (status === "SUCCEEDED") {
				sState = ValueState.Success;
			} else if (status === "FAILED") {
				sState = ValueState.Error;
			} else if (status === "Pending") {
				sState = ValueState.Warning;
			} else {
			}
			return sState;
		},

		formatHighlight: function(status) {
			var sState = MessageType.None;

			if (status === "SUCCEEDED") {
				sState = MessageType.Success;
			} else if (status === "FAILED") {
				sState = MessageType.Error;
			} else if (status === "RUNNING") {
				sState = MessageType.Warning;
			} else {

			}
			return sState;
		},

		formatModelHighlight: function(status) {
			var sState = MessageType.None;

			if (status === "SUCCEEDED") {
				sState = MessageType.Success;
			} else if (status === "FAILED") {
				sState = MessageType.Error;
			} else if (status === "PENDING") {
				sState = MessageType.Warning;
			} else {
			}
			return sState;
		},

		formatStatusIcon: function(status){
			var sIcon = "sap-icon://status-inactive";

			if (status === "SUCCEEDED") {
				sIcon = "sap-icon://status-completed";
			} else if (status === "FAILED") {
				sIcon = "sap-icon://status-error";
			} else if (status === "RUNNING") {
				sIcon = "sap-icon://status-in-process";
			} else {
			}
			return sIcon;
		},

		isDeployable: function(sValue) {
			if (["SUCCEEDED", "FAILED", "PENDING"].includes(sValue)) {
				return false;
			}
			return true;
        },

        isUndeployable: function(sValue){
            if (["SUCCEEDED", "FAILED"].includes(sValue)) {
                return true;
            }
            return false;
		},

		isDeployed: function(sValue) {
			return sValue === "SUCCEEDED";
		},

		isNotPending: function(sValue) {
			return sValue !== "PENDING";
		},

		isEnabledAutoRefresh: function(sStatus){
			return sStatus !== "" && sStatus !== "SUCCEEDED" && sStatus !== "FAILED";
		},

		isVisibleAvatar: function(sText){
			return sText == "";
		},

		isVisibleLogText: function(sText){
			return sText != "";
		},
		
		hasPredictions: function(sValue) {
			if (sValue) {
				return true;
			}
			return false;
		}

	};

});
