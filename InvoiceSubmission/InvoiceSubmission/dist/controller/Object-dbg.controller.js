sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/m/MessageToast",
    'sap/m/MessageBox'
], function (BaseController, JSONModel, History, formatter, MessageToast,MessageBox) {
    "use strict";
    var totalDif = 0;
    var NetPriceAmount = 0;
    var deviation = 100 ;
    return BaseController.extend("ns.InvoiceSubmission.controller.Object", {

        formatter: formatter,

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        onInit : function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({
                    busy : true,
                    delay : 0,
                    PO: false
                });
                /*
            var oTable = this.byId("treeTable");
                
           var PoData = this._loadPurchaseOrders();
           //this.oOrdersModel.setData(PoData);
            var oModel = new JSONModel(PoData);
            oTable.setModel(oModel);

            //navigation service binding
            oTable.bindRows({
            path : "/value",
            sorter: {
                        path: 'PurchaseOrderItem',
                        descending: true
                    },
           filters : [
                        { path : 'Status', operator : 'EQ', value1 : 'Pending'}
                    ],
            parameters : {
            expand : "To_PurchaseOrderItems",
            navigation : {
            'value' : 'To_PurchaseOrderItems'
            }
            }
            });*/
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "objectView");
            
            
            
        },
        _loadPurchaseOrders: function () {
            var that = this;
            this._result = [];
            var oBundle = this.getResourceBundle();
            var bSuccess = false;
            
            sap.ui.core.BusyIndicator.show(0);
            $.ajax({
                type: "GET",
                url: "/nsInvoiceSubmission/ProcurementService/browse/PurchaseOrder?$filter=Status eq 'Pending' and Supplier eq 'USSU-VSF63'&$expand=To_PurchaseOrderItems($orderby=PurchaseOrderItem asc;$filter=Status eq 'Pending')",
                cache: false,
                dataType: "json",
                async: false,
                error: function (msg, textStatus) {
                    sap.ui.core.BusyIndicator.hide();
                    bSuccess = false;
                    var sMessage = oBundle.getText("msnDataBaseError");
                    that._addMessageManager(sMessage);
                },
                success: function (data) {
                    sap.ui.core.BusyIndicator.hide();
                    that._result = data;
                    bSuccess = true;
                }
            });
            var aResults = that._result;
            return aResults;
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * Event handler when the share in JAM button has been clicked
         * @public
         */
        onSubmitInvoice : function()
        {
            var isPO = this.getView().byId("switchPO").getState();
            var that = this;
            sap.ui.core.BusyIndicator.show(0);
            if(isPO)
            {
                //debugger
                var data = JSON.stringify({
                        "RuleServiceId": "6a832a7ae8c440eab3ab698cca900350",
                        "Vocabulary": [
                            {
                            "PoInvoiceDifference": {
                                "Percentage": deviation,
                                "Amount": 0,
                                "BusinessPartnerName" : this.getView().getBindingContext().getObject('SupplierName')
                            }
                            }
                        ]
                        });
                $.ajax({
                    type: "POST",
                    url: "/nsInvoiceSubmission/BUSINESS_RULES/rules-service/rest/v2/workingset-rule-services",
                    cache: false,
                    dataType: "json",
                    headers: {"Content-Type":"application/json"},
                    data : data,
                    async: false,
                    error: function (msg, textStatus) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(
                                'An error has occured. Status: '+textStatus
                            );
                    },
                    success: function (data) {
                        //sap.ui.core.BusyIndicator.hide();
                        that.onAfterCheck(data.Result[0].CloseInvoice.Status);
                    }
                });
            }else
            {
                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                MessageBox.confirm(
                        "This invoice doesn't have a PO and it will go through an internal approval process, are you sure you want to continue?", {
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                if(sAction == "OK")
                                {
                                    var invoiceNumber = that.byId("table").getBindingContext().sPath.split("'")[1]
                                    var context = JSON.stringify({
                                        "definitionId": "approvalinvoicestory",
                                        "context": {
                                            "type": "nonpo",
                                            "invoiceNumber": invoiceNumber
                                        }});
                                        ////debugger
                                    that.triggerWorkflow(context);

                                    MessageToast.show(
                                                    'Invoice without PO sent for approval'
                                                );
                                    }
                                else{
                                    sap.ui.core.BusyIndicator.hide();
                                }

                                //MessageToast.show("Action selected: " + sAction);
                            }
                        }
                    );
                
            }

        },
        onAfterCheck: function(ruleResult){
            var that = this;
            ////debugger
                if(ruleResult == "Error")
                {
                        var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.error(
                        "The net amount difference variance the selected invoice and the purchae order items is too high. ",
                        {
                            styleClass: bCompact ? "sapUiSizeCompact" : ""
                        });

                }else if(ruleResult == "Approval")
                {
                    var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                        MessageBox.warning(
                        "The net amount difference between the selected invoice and the purchae order items is above the allowed threshold and it will require to be approved by "+ 
                        "our purchasing department, do you want to continue?",
                        {
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                 if(sAction == "OK")
                                 {
                                     ////debugger
                                    var invoiceNumber = that.byId("table").getBindingContext().sPath.split("'")[1]
                                    var oTable = that.byId("treeTable");
                                    var selectedIndexes = oTable.getSelectedIndices();
                                    var POItems = [];
                                    
                                    for(var i=0;i<selectedIndexes.length;i++)
                                    {
                                        var oContext = oTable.getContextByIndex(selectedIndexes[i]);
                                        if(oContext != undefined)
                                        {
                                            
                                            var rowPath = String(oContext.sPath);
                                            if(rowPath.indexOf("To_PurchaseOrderItems") > 0)
                                            {
                                                POItems.push(String(oContext.getObject().ID));
                                            }
                                        }
                                    }  
                                    

                                    var context = JSON.stringify({
                                        "definitionId": "approvalinvoicestory",
                                        "context": {
                                            "type": "po",
                                            "invoiceNumber": invoiceNumber,
                                            "PONumber": oContext.getObject("DocNumber_DocNumber"),
                                            "POitems": POItems
                                        }});


                                    ////debugger
                                    that.triggerWorkflow(context);

                                    MessageToast.show(
                                                    'Invoice without PO sent for approval'
                                                );
                                 }else{
                                    sap.ui.core.BusyIndicator.hide();
                                }
                            }
                        });
                }else if(ruleResult == "Approved")
                {
                    MessageBox.warning(
                        "There is a variance between the invoce and the purchase order net amounts, "+ 
                        "do you want to continue?",
                        {
                            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                if(sAction == "OK")
                                {
                                    that.updateRecords("Done");
                                }else{
                                    sap.ui.core.BusyIndicator.hide();
                                }
                                //MessageToast.show("Action selected: " + sAction);
                                
                            }
                        });
                }else if(ruleResult == "Success")
                {
                    
                    MessageBox.confirm(
                        "This invoice will be received, are you sure you want to continue?", {
                            styleClass: bCompact ? "sapUiSizeCompact" : "",
                            onClose: function(sAction) {
                                if(sAction == "OK")
                                    that.updateRecords("Done");
                                else{
                                    sap.ui.core.BusyIndicator.hide();
                                }

                                //MessageToast.show("Action selected: " + sAction);
                            }
                        }
                    );
                }else{
                    MessageToast.show(
                                'Something went wrong'
                            );
                }

        },
        updateRecords: function(Status)
        {
            var selectedIndices = this.getView().byId("treeTable").getSelectedIndices();
            var ID ="";
            
            this.getView().byId("invoiceStatus").setText(Status);
            ////debugger
            for(var i = 0; i<selectedIndices.length; i++)
            {
                ID = this.getView().byId("treeTable").getContextByIndex(selectedIndices[i]).getObject().ID
                this.closeItems(ID,Status);
                
            }
            sap.ui.core.BusyIndicator.hide();
            this.onNavBack();

        },
        closeItems: function(ID,Status)
        {
            var data = JSON.stringify({
                        "Status" : Status
                    });
            $.ajax({
                    type: "PATCH",
                    url: "/ProcurementService/browse/PurchaseOrderItems("+ID+")",
                    cache: false,
                    dataType: "json",
                    headers: {"Content-Type":"application/json"},
                    data : data,
                    async: false,
                    error: function (msg, textStatus) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(
                                'An error has occured. Status: '+textStatus
                            );
                    },
                    success: function (data) {
                        sap.ui.core.BusyIndicator.hide();
                        //that.onAfterCheck(data.Result[0].CloseInvoice.Status);
                    }
                });
        },
        triggerWorkflow: function(context)
        {
            ////debugger
            var that = this;
            
            $.ajax({
                    type: "POST",
                    url: "/nsInvoiceSubmission/workflowService/workflow-service/rest/v1/workflow-instances",
                    cache: false,
                    dataType: "json",
                    headers: {"Content-Type":"application/json"},
                    data : context,
                    async: false,
                    error: function (msg, textStatus) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageToast.show(
                                'An error has occured. Status: '+textStatus
                            );
                    },
                    success: function (data) {
                        that.updateRecords("Approving");
                        MessageToast.show(
                            'Approval process has been initiated'
                        );
                    }
                });
        },
        onSwitchChange:function(event)
        {
            var oViewModel = this.getModel("objectView");
            oViewModel.setProperty("/PO", event.getParameter("state"));
            ////debugger
        },
        oRowSelection : function(oEvent)
        {
            
            var indexSelected = oEvent.getSource().getSelectedIndex();
            
            var oContext = oEvent.getSource().getContextByIndex(oEvent.getSource().getSelectedIndex());
            if(oContext != undefined)
            {
                
                var rowPath = String(oContext.sPath);
                
                if(rowPath.indexOf("To_PurchaseOrderItems") < 0)
                {
                    
                    var itemIndexText = rowPath.substring(7);
                    var itemIndex = parseInt(itemIndexText);
                    var itemLength = this.getView().byId("treeTable").getModel().getData().value[itemIndex].To_PurchaseOrderItems.length;
                   /* if(oEvent.getSource().isIndexSelected())
                    {*/
                        this.getView().byId("treeTable").addSelectionInterval(indexSelected+1,indexSelected+itemLength);
                        ////debugger
                   // }

                    
                }
            }
            ////debugger
                var items = oEvent.getSource().getSelectedIndices();
                var netPrice;
                var finalPrice = 0.0;
                //NetPriceAmount = parseFloat(this.getView().byId("invoiceAmount").getNumber());
                ////debugger
                for (var i =0;i<items.length;i++)
                {
                    var oContext = oEvent.getSource().getContextByIndex(items[i]);
                    if(oContext != undefined)
                    {
                        var rowPath = String(oContext.sPath);
                        var idPO = parseInt(rowPath.split("/")[2]);
                        var itemID = parseInt(rowPath.split("/")[4]);

                        var oValue = this.getView().byId("treeTable").getModel().getData().value[idPO].To_PurchaseOrderItems[itemID];
                        if(oValue != undefined)
                        {
                            netPrice = oValue.NetPriceAmount;
                            finalPrice += netPrice;
                        }
                    }
                    ////debugger
                }
                
                totalDif = NetPriceAmount - finalPrice;
                ////debugger
                this.updateNumber(totalDif);
                
                
            //}
        },
        updateNumber: function (totalDif)
        {
                this.getView().byId("difAmount").setValue(totalDif);

                if(totalDif<0)
                    this.getView().byId("difAmount").setIndicator("Up");
                else if(totalDif>0)
                    this.getView().byId("difAmount").setIndicator("Down");
                else
                    this.getView().byId("difAmount").setIndicator("None");

                deviation =   (totalDif*100)/NetPriceAmount;

                if(deviation > 50 || deviation <-50)
                    this.getView().byId("difAmount").setValueColor("Error");
                else if(deviation > 0 || deviation <0)
                    this.getView().byId("difAmount").setValueColor("Critical");
                else
                    this.getView().byId("difAmount").setValueColor("Good");
        },
        onNavBack: function () {
            var MaxValue = Math.max.apply(Math,this.getView().byId("treeTable").getSelectedIndices());
            var oViewModel = this.getModel("objectView");

            this.getView().byId("treeTable").removeSelectionInterval(0,MaxValue);
            oViewModel.setProperty("/PO", false);

                ////debugger
                this.getOwnerComponent()
                    .getRouter()
                    .navTo("worklist", {});
        },
        onShareInJamPress : function () {
            var oViewModel = this.getModel("objectView"),
                oShareDialog = sap.ui.getCore().createComponent({
                    name: "sap.collaboration.components.fiori.sharing.dialog",
                    settings: {
                        object:{
                            id: location.href,
                            share: oViewModel.getProperty("/shareOnJamTitle")
                        }
                    }
                });
            oShareDialog.open();
        },


        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched : function (oEvent) {
            var sObjectId =  oEvent.getParameter("arguments").objectId;
            this._bindView("/Invoice" + sObjectId);
            var oTable = this.byId("treeTable");
                
           var PoData = this._loadPurchaseOrders();
            var oModel = new JSONModel(PoData);
            oTable.setModel(oModel);

            //navigation service binding
            oTable.bindRows({
            path : "/value",
            sorter: {
                        path: 'PurchaseOrderItem',
                        descending: true
                    },
           filters : [
                        { path : 'Status', operator : 'EQ', value1 : 'Pending'}
                    ],
            parameters : {
            expand : "To_PurchaseOrderItems",
            navigation : {
            'value' : 'To_PurchaseOrderItems'
            }
            }
            });
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView : function (sObjectPath) {
            var oViewModel = this.getModel("objectView");
            var that = this;
            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                         ////debugger
                           
                            //totalDif = NetPriceAmount;
                            ////debugger;
                    }
                }
            });
        },

        _onBindingChange : function () {
            var oView = this.getView(),
                oViewModel = this.getModel("objectView"),
                oElementBinding = oView.getElementBinding();
           
            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }

            var oResourceBundle = this.getResourceBundle();
            var that = this;

            oView.getBindingContext().requestObject().then((function (oObject) {
                var sObjectId = oObject.DocNumber,
                    sObjectName = oObject.SupplierName;
                NetPriceAmount = parseFloat(oObject.NetPriceAmount);
                that.updateNumber(NetPriceAmount);
                     ////debugger;

                // Add the object page to the flp routing history
                this.addHistoryEntry({
                    title: this.getResourceBundle().getText("objectTitle") + " - " + sObjectName,
                    icon: "sap-icon://enter-more",
                    intent: "#InvoiceSubmission-display&/Invoice(" + sObjectId + ")"
                });

                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("saveAsTileTitle", [sObjectName]));
                oViewModel.setProperty("/shareOnJamTitle", sObjectName);
                oViewModel.setProperty("/shareSendEmailSubject",
                    oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
                oViewModel.setProperty("/shareSendEmailMessage",
                    oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
            }).bind(this));
        }

    });

});
