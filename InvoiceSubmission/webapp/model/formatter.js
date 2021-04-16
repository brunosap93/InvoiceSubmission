sap.ui.define([] , function () {
	"use strict";

	return {

		/**
		 * Rounds the number unit value to 2 digits
		 * @public
		 * @param {string} sValue the number string to be rounded
		 * @returns {string} sValue with 2 digits rounded
		 */
		numberUnit : function (sValue) {
			if (!sValue) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},state: function (value) {
			if (value == "Done") {
				return "Success";
            }else if(value == "Approving")
            {
                return "Warning";
            }else if(value == "Rejected")
            {
                return "Error";
            }
			return "Information";
        },
        docNumber: function (value) {
            if(value.indexOf("-") > -1)
                return value.substring(0,value.indexOf("-"));
            else
                return value;
		},
        pdfURL: function (value) {
            
                return "/DocManagement/browser/<<Your Repository ID>>/root/Invoices/"+value+".pdf";
		}

	};

});
