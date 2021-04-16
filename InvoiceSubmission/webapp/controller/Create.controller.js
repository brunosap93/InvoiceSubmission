sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	"sap/m/MessageToast",
	"sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
	"use strict";
    var invoiceObj = null;
    var counterCalls = 0;
    var dataPDF;
    var invoiceFile;
    //var waitingCalls = 0;
	return Controller.extend("ns.InvoiceSubmission.controller.Create", {
		onInit: function () {
			this._wizard = this.byId("CreateInvoiceWizard");
			this._oNavContainer = this.byId("wizardNavContainer");
			this._oWizardContentPage = this.byId("wizardContentPage");

			Fragment.load({
				name: "ns.InvoiceSubmission.view.ReviewPage",
				controller: this
			}).then(function (oWizardReviewPage) {
				this._oWizardReviewPage = oWizardReviewPage;
				this._oNavContainer.addPage(this._oWizardReviewPage);
            }.bind(this));
            
            var model = new JSONModel();
			model.setData({
				invoiceState: "None",
                companyState: "None",
                documentState: "None",
                amountState: "None",
                currencyState: "None",
                pdfView : false

			});
            this.getView().setModel(model, "objectView");
            var modelPro = new JSONModel();
			modelPro.setData({
				disValue: "0%",
                value: "0",
                visible: false
			});
            this.getView().setModel(modelPro, "progressBar");

                                    
            this.modelForm = new JSONModel();
			this.modelForm.setData({
				DocNumber: "",
                SupplierName: "",
                DocumentDate: "",
                NetPriceAmount: null,
                DocumentCurrency: "",
                To_InvoiceItems:[
                    {
                        InvoiceItem : "",
                        Material : "",
                        Description: "",
                        InvoiceQuantity: null,
                        UnitPrice: null,
                        NetPriceAmount: null
                    }
                ]

            });
            
            this.getView().setModel(this.modelForm)

			
        },
        onAfterRendering: function () {
            var oID = this.createId("pdfViewer");
            var oPDF = this.createId("previewInv");
            var that = this;
			//handle the event when a new picture is uploaded or a new pictures was taken using the camera
			document
				.getElementById(this.createId("file"))
				.addEventListener("change", function () {
                    

					//check if there is an image
					if (this.files && this.files[0]) {
                        
                        invoiceFile = this.files[0]; 
                        sap.ui.core.BusyIndicator.show(0);                        
                        //document.getElementById(oPDF).source = this.files[0].name;
						var previewPDF = document.getElementById(oID);
                        var reader = new FileReader();
                        var fileType = this.files[0].type;

                        var oProgressBar = that.getView().getModel("progressBar");
                        oProgressBar.setProperty("/value", "20");
                        oProgressBar.setProperty("/disValue", "20%");
                        oProgressBar.setProperty("/visible", true);
                        
                        that.processPDF(this.files[0]);

						reader.onload = function (e) {
                            dataPDF = e.target.result;
						};
                        reader.readAsDataURL(this.files[0]);

					}
				});
        },
        onSwitchChange: function(event)
        {
            var state = event.getParameter("state");
            this.getView().getModel("objectView").setProperty("/pdfView", state);
            if(state)  
            {          
                var oID = this.createId("pdfViewer");
                var previewPDF = document.getElementById(oID);
                previewPDF.data = dataPDF;
            }
            
                
            debugger
        },
        onUploadInvoice: function () {
			//trigger click event for the input field to open camera
			var fileUploader = document.getElementById(this.createId("file"));
			fileUploader.click();
        },
		setProductType: function (evt) {
			var productType = evt.getSource().getTitle();
			this.model.setProperty("/productType", productType);
			this.byId("ProductStepChosenType").setText("Chosen product type: " + productType);
			this._wizard.validateStep(this.byId("InvoiceUploadStep"));
		},

		setProductTypeFromSegmented: function (evt) {
			var productType = evt.getParameters().item.getText();
			this.model.setProperty("/productType", productType);
			this._wizard.validateStep(this.byId("InvoiceUploadStep"));
		},
        processPDF : function(file)
        {
            //var id = response.ID
            //var file = this.dataURItoBlob(file);
            var that = this;
            var data = new FormData();
            var oProgressBar = this.getView().getModel("progressBar");
            
            data.append("options", "{\n  \"extraction\": {\n    \"headerFields\": [\n      \"barcode\",\n      \"documentNumber\",\n      \"taxId\",\n      \"taxName\",\n      \"purchaseOrderNumber\",\n      \"shippingAmount\",\n      \"netAmount\",\n      \"grossAmount\",\n      \"currencyCode\",\n      \"receiverContact\",\n      \"documentDate\",\n      \"taxAmount\",\n      \"taxRate\",\n      \"receiverName\",\n      \"receiverAddress\",\n      \"receiverTaxId\",\n      \"deliveryDate\",\n      \"paymentTerms\",\n      \"deliveryNoteNumber\",\n      \"senderBankAccount\",\n      \"senderAddress\",\n      \"senderName\",\n      \"dueDate\",\n      \"discount\"\n    ],\n    \"lineItemFields\": [\n      \"description\",\n      \"netAmount\",\n      \"quantity\",\n      \"unitPrice\",\n      \"materialNumber\",\n      \"unitOfMeasure\"\n    ]\n  },\n  \"clientId\": \"default\",\n  \"documentType\": \"invoice\",\n  \"receivedDate\": \"2020-02-17\",\n  \"enrichment\": {\n    \"sender\": {\n      \"top\": 5,\n      \"type\": \"businessEntity\",\n      \"subtype\": \"supplier\"\n    },\n    \"employee\": {\n      \"type\": \"employee\"\n    }\n  }\n}");
            data.append("file",file);

			var xhr = new XMLHttpRequest();
			xhr.withCredentials = true;

			xhr.addEventListener("readystatechange", function () {
				if (this.readyState === 4) {
                    
                    if(this.status == 201)
                    {
                        
                        oProgressBar.setProperty("/value", "60");
                        oProgressBar.setProperty("/disValue", "60%");
                        oProgressBar.setProperty("/visible", true);

                        that.waitComplete(JSON.parse(this.response).id,0);
                    }
				}

			});

			xhr.open("POST", "/doxDest/document/jobs");
            xhr.send(data);
        },
        waitComplete : function(requestID,waitingCalls){
            
            //var oBundle = this.getResourceBundle();
            var bSuccess = false;
            var that = this;

			$.ajax({
				type: "GET",
				url: "/doxDest/document/jobs/"+requestID,
				cache: false,
				dataType: "json",
				async: false,
				error: function (msg, textStatus) {
					sap.ui.core.BusyIndicator.hide();
					bSuccess = false;
					//var sMessage = oBundle.getText("msnDataBaseError");
					//that._addMessageManager(sMessage);
				},
				success: function (data) {
                    if(data.status != "DONE")
                    {
                            
                            if(waitingCalls>= 50)
                            {
                               sap.ui.core.BusyIndicator.hide();
                               waitingCalls = 0;
                               MessageToast.show(
                                    'Docuemtn Information Extraction is taking too long, please try again.'
                                );
                            }
                            else
                            {
                                that.jumpWait(requestID,waitingCalls);
                            }
                            //that.sleep(2000);
                    }else
                    {
                        waitingCalls = 0;
                        that.fillForm(data);
					    sap.ui.core.BusyIndicator.hide();
                        //debugger;
                    }
					bSuccess = true;
				}
			});
        },
        jumpWait: async function(requestID,waitingCalls)
        {
            await new Promise(function(resolve){setTimeout(resolve, 7500)});
            waitingCalls++;
            this.waitComplete(requestID,waitingCalls);
        },
        fillForm: function(data)
        {   var oProgressBar = this.getView().getModel("progressBar");
            oProgressBar.setProperty("/value", "80");
            oProgressBar.setProperty("/disValue", "80%");
            oProgressBar.setProperty("/visible", true);

            var invoiceData = this._createJsonDOX(data);
            
            var modelForm = new JSONModel();
			modelForm.setData(invoiceData);
            this.getView().setModel(modelForm);

            oProgressBar.setProperty("/value", "100");
            oProgressBar.setProperty("/disValue", "100%");
            oProgressBar.setProperty("/visible", true);
            //debugger
            this._wizard.validateStep(this.byId("InvoiceUploadStep"));
        },
        _createJsonDOX: function(data)
        {
            var headerFileds = data.extraction.headerFields
            var lineItemFields = data.extraction.lineItems
            var invoiceHeader = {};
            var lineItemDetails = {};
            var lineItems = [];
            var attributeName;
            //var itemValue = "";
            //debugger
            for(var i = 0; i<headerFileds.length; i++)
            {   //debugger
                if(headerFileds[i].name == 'documentNumber')
                    attributeName = "DocNumber";
                else if(headerFileds[i].name == 'documentDate')
                    attributeName = "DocumentDate";
                else if(headerFileds[i].name == 'senderName')
                    attributeName = "SupplierName";
                else if(headerFileds[i].name == 'netAmount')
                    attributeName = "NetPriceAmount";
                else if(headerFileds[i].name == 'currencyCode')
                    attributeName = "DocumentCurrency";
                else
                    attributeName = "None";
               // debugger
                if(attributeName != "None")
                {
                    if(attributeName == "NetPriceAmount")
                        headerFileds[i].value = String(headerFileds[i].value);

                        invoiceHeader[attributeName] =  headerFileds[i].value;
                }
            }
            invoiceHeader["Status"] =  "Pending";
            for(var i = 0; i<lineItemFields.length; i++)
            {
                var lineItemDetails = {};

                lineItemDetails["InvoiceItem"] =  i+1;
                for(var j = 0; j<lineItemFields[i].length; j++)
                {
                    if(lineItemFields[i][j].name == 'description')
                        attributeName = "Description";
                    else if(lineItemFields[i][j].name == 'materialNumber')
                        attributeName = "Material";
                    else if(lineItemFields[i][j].name == 'quantity')
                        attributeName = "InvoiceQuantity";
                    else if(lineItemFields[i][j].name == 'netAmount')
                        attributeName = "NetPriceAmount";
                    else if(lineItemFields[i][j].name == 'unitPrice')
                        attributeName = "UnitPrice";
                    else
                    attributeName = "None";
                    // debugger
                    if(attributeName != "None")
                    {
                         //itemValue = lineItemFields[i][j].value;
                        if(attributeName == "NetPriceAmount" || attributeName == "UnitPrice")
                            lineItemFields[i][j].value = String(lineItemFields[i][j].value);
                        //else
                        lineItemDetails[attributeName] =  lineItemFields[i][j].value;
                    }
                }
                lineItemDetails["Status"] =  "Pending";
                lineItemDetails["QuantityUnit"] =  "NA";
                lineItems.push(lineItemDetails);
            }
            
            invoiceHeader["To_InvoiceItems"] = lineItems;
            //debugger
            return invoiceHeader;
            //debugger
        },
		additionalInfoValidation: function () {
            var InvoiceNumber = this.byId("InvoiceNumber").getValue();
            var CompanyName = this.byId("CompanyName").getValue();
            var DocumentDate = this.byId("DocumentDate").getValue();
            var NetAmount = this.byId("NetAmount").getValue();
            var Currency = this.byId("Currency").getValue();
            var oObjectView = this.getView().getModel("objectView");
			//var weight = parseInt(this.byId("ProductWeight").getValue());

			if (NetAmount.length < 1) {
				oObjectView.setProperty("/NetAmount", "Error");
			} else {
				oObjectView.setProperty("/NetAmount", "None");
			}

			if (InvoiceNumber.length < 1) {
				oObjectView.setProperty("/InvoiceNumber", "Error");
			} else {
				oObjectView.setProperty("/InvoiceNumber", "None");
            }
            
            if (CompanyName.length < 1) {
				oObjectView.setProperty("/SupplierName", "Error");
			} else {
				oObjectView.setProperty("/SupplierName", "None");
            }
            
            if (DocumentDate.length < 1) {
				oObjectView.setProperty("/DocumentDate", "Error");
			} else {
				oObjectView.setProperty("/DocumentDate", "None");
            }
            
            if (Currency.length < 1) {
				oObjectView.setProperty("/Currency", "Error");
			} else {
				oObjectView.setProperty("/Currency", "None");
			}
            
			if (InvoiceNumber.length < 1 || DocumentDate.length < 1 || CompanyName.length < 1 || Currency.length < 1 || NetAmount.length < 1) {
				this._wizard.invalidateStep(this.byId("InvoiceReadingStep"));
			} else {
				this._wizard.validateStep(this.byId("InvoiceReadingStep"));
            }
           // debugger
		},

		onNavBack: function () {
            
			if (this._wizard.getProgressStep() != this.byId("InvoiceUploadStep")) {
                this._wizard.previousStep();
                //debugger
			}else{
                // apply content density mode to root view
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("worklist", {});
                    //debugger
            }
        },cancelWizard: function () {

                this._handleNavigationToStep(0);
                this._wizard.discardProgress(this._wizard.getSteps()[0]);
                // apply content density mode to root view
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("worklist", {});
        },createRecord: function()
        {
            sap.ui.core.BusyIndicator.show(0);
            //this.cancelWizard();  
            var fullPayload = this.getView().getModel().getData();
            var items = fullPayload["To_InvoiceItems"];
            delete fullPayload["To_InvoiceItems"];   
            var header =   fullPayload; 
            var lastItem = false;

            header.DocNumber = header.DocNumber+"-"+Date.now();
            
            this.sendRequestCreate(items.length,header,items);

            

            //debugger
        },sendRequestCreate: function(itemsLength,header,items)
        {
            var that = this;
            var url;
            var payload;
            var finalDocNumber = header.DocNumber;

            if(counterCalls == 0)
            {
                url = "/ProcurementService/browse/Invoice";
                payload = header;
            }
            else
            {
                url = "/ProcurementService/browse/InvoiceItems";
                payload = items[counterCalls-1];
                payload.DocNumber_DocNumber = finalDocNumber;
                
            }

            $.ajax({
                    type: "POST",
                    url: url,
                    cache: false,
                    data: JSON.stringify(payload),
					dataType: "json",
                    headers:{"Content-Type":"application/json;IEEE754Compatible=true"},
                    async: false,
                    error: function (msg, textStatus) {
                        sap.ui.core.BusyIndicator.hide();
                        counterCalls=0;
                        MessageToast.show(
                            'An error has occured. Status: '+textStatus
                        );
                        //bSuccess = false;
                        //var sMessage = oBundle.getText("msnDataBaseError");
                        //that._addMessageManager(sMessage);
                    },
                    success: function (data) {
                        if(itemsLength == counterCalls)
                        {
                            
                            counterCalls=0;
                            that.uploadInvoicePDF(header.DocNumber);
                            
                        }else{
                            counterCalls++;
                            that.sendRequestCreate(itemsLength,header,items);
                            
                        }
                        //sap.ui.core.BusyIndicator.hide();
                        //that._result = data;
                        //bSuccess = true;
                    }
                });  
        },uploadInvoicePDF: function (fileName) {
                
                var that = this;
                var data = new FormData();
                
                data.append("file", invoiceFile);
                data.append("cmisaction", "createDocument");
                data.append("propertyId[0]", "cmis:objectTypeId");
                data.append("propertyValue[0]", "cmis:document");
                data.append("propertyId[1]", "cmis:name");
                data.append("succinct", "true");
                data.append("propertyValue[1]", fileName+".pdf");
                
                var xhr = new XMLHttpRequest();
                xhr.withCredentials = true;

                xhr.addEventListener("readystatechange", function () {
                    if (this.readyState === 4) {
                        
                        if(this.status == 201)
                        {
                            MessageToast.show(
                            'A new invoice has been created.'
                            );
                            that.cancelWizard();

                        }else if(this.status == 200)
                        {
                            MessageToast.show(
                            'A new invoice has been created.'
                            );
                        }else
                        {
                            var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
                            MessageBox.error(
                        "A new invoice has been created but we couldn't save the pdf file. Error: "+this.status,
                            {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            });
                        }
                        sap.ui.core.BusyIndicator.hide();
                    }

                });

                xhr.open("POST", "/DocManagement/browser/<<Your Repository ID>>/root/Invoices");
                xhr.send(data);
            },   
		optionalStepActivation: function () {
			MessageToast.show(
				'This event is fired on activate of Step3.'
			);
		},

		optionalStepCompletion: function () {
			MessageToast.show(
				'This event is fired on complete of Step3. You can use it to gather the information, and lock the input data.'
			);
		},

		pricingActivate: function () {
			this.model.setProperty("avApiEnabled", true);
		},

		pricingComplete: function () {
			this.model.setProperty("avApiEnabled", false);
		},

		scrollFrom4to2: function () {
			this._wizard.goToStep(this.byId("InvoiceInfoStep"));
		},

		goFrom4to3: function () {
			if (this._wizard.getProgressStep() === this.byId("PricingStep")) {
				this._wizard.previousStep();
			}
		},

		goFrom4to5: function () {
			if (this._wizard.getProgressStep() === this.byId("PricingStep")) {
				this._wizard.nextStep();
			}
		},

		wizardCompletedHandler: function () {
			this._oNavContainer.to(this._oWizardReviewPage);
		},

		backToWizardContent: function () {
			this._oNavContainer.backToPage(this._oWizardContentPage.getId());
		},

		editStepOne: function () {
			this._handleNavigationToStep(0);
		},

		editStepTwo: function () {
			this._handleNavigationToStep(1);
		},

		editStepThree: function () {
			this._handleNavigationToStep(2);
		},

		editStepFour: function () {
			this._handleNavigationToStep(3);
		},

		_handleNavigationToStep: function (iStepNumber) {
			var fnAfterNavigate = function () {
				this._wizard.goToStep(this._wizard.getSteps()[iStepNumber]);
				this._oNavContainer.detachAfterNavigate(fnAfterNavigate);
			}.bind(this);

			this._oNavContainer.attachAfterNavigate(fnAfterNavigate);
			this.backToWizardContent();
		},

		_handleMessageBoxOpen: function (sMessage, sMessageBoxType) {
            var that = this;
			MessageBox[sMessageBoxType](sMessage, {
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.YES) {
                        if(sMessageBoxType == "warning")
                            this.cancelWizard();
                        else
                            this.createRecord();
						/*this._handleNavigationToStep(0);
						this._wizard.discardProgress(this._wizard.getSteps()[0]);*/
					}
				}.bind(this)
			});
		},

		_setEmptyValue: function (sPath) {
			this.model.setProperty(sPath, "n/a");
		},

		handleWizardCancel: function () {
			this._handleMessageBoxOpen("Are you sure you want to cancel your invoice?", "warning");
		},

		handleWizardSubmit: function () {
			this._handleMessageBoxOpen("Are you sure you want to create your invoice?", "confirm");
		},

		productWeighStateFormatter: function (val) {
			return isNaN(val) ? "Error" : "None";
		},

		discardProgress: function () {
			this._wizard.discardProgress(this.byId("InvoiceUploadStep"));

			var clearContent = function (content) {
				for (var i = 0; i < content.length; i++) {
					if (content[i].setValue) {
						content[i].setValue("");
					}

					if (content[i].getContent) {
						clearContent(content[i].getContent());
					}
				}
			};

			this.model.setProperty("/productWeightState", "Error");
			this.model.setProperty("/productNameState", "Error");
			clearContent(this._wizard.getSteps());
		}
	});
});
