// Created by D064906
// For Workshop use only


sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'jquery.sap.global',
    'sap/m/MessageToast',
    'sap/m/MessageBox'
], function(Controller, $, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("D064906.Sentimental-UI.controller.main", {
        handleContinue : function (evt) {
            var view = this.getView();
            var inputs = [
                view.byId("text_scan")
            ];
            jQuery.each(inputs, function (i, input) {
                if (!input.getValue()) {
                    input.setValueState("Error");
                } else {
                    input.setValueState("None");
                }
            });
            var canContinue = true;
            jQuery.each(inputs, function (i, input) {
                if ("Error" === input.getValueState()) {
                    canContinue = false;
                    return false;
                }
            });

            if (canContinue) {
                this.generateRequest();
            } else {
                jQuery.sap.require("sap.m.MessageBox");
                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                MessageBox.error(
                    "Every field needs to be filled!",
                    {
                        styleClass: bCompact? "sapUiSizeCompact" : "",
                        actions: sap.m.MessageBox.Action.CLOSE
                    }
                );
            }
        },

        generateRequest: function(oEvent) {
            var text = $('#__xmlview0--text_scan-inner').val();

            var settings = {
                "async": true,
                "crossDomain": true,
                "url": "/do_inference",
                "method": "POST",
                "headers": {
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "Postman-Token": "be0df83e-356e-4609-a984-592c5fb3e42f"
                },
                "processData": false,
                "data": JSON.stringify({
                    "text": text
                })
            };

            $('.resultTitle').hide();
            $('.errorTitle').hide();
            $('.errorTxt').hide();
            $('.result').hide();
            $('.probability').hide();
            $('.rating').hide();
            $('.loader').fadeIn();
            $.ajax(settings).done(function (response) {
                $('.loader').hide();
                setTimeout(function() {
                    if(JSON.parse(response).positive < 0.5) {
                        $('.thumbsDown').fadeIn().css("display","block");
                        $('.probability').text("Probability: " + JSON.parse(response).negative);
                    } else {
                        $('.thumbsUp').fadeIn().css("display","block");
                        $('.probability').text("Probability: " + (Math.round(JSON.parse(response).positive * 10000) / 100).toString() + "%");
                    }
                    $('.probability').fadeIn().css("display","block");
                    $('.resultTitle').fadeIn().css("display","block");
                    $('.result').fadeIn().css("display","block");
                }, 400);
            }).fail(function (jqXHR, textStatus) {
                $('.loader').hide();
                setTimeout(function() {
                    $('.errorTitle').fadeIn().css("display","block");
                    $('.errorTxt').fadeIn().css("display","block");
                }, 400);
            });
        }
    });
});