/* Cayan Service */
/* https://cayan.com/developers/transport/response-parameters#statuses */
	
var CayanService = {
		
		isConfigured : false,
		
		isSimulatorMode : false,
		
		init : function(){	
			
			this.STAGING_CALL_ENDPOINT = 'https://transport.merchantware.net/v4/transportService.asmx';
			this.CREDIT_ENDPOINT = 'https://ps1.merchantware.net/Merchantware/ws/RetailTransaction/v4/Credit.asmx';
			this.GIFT_ENDPOINT = 'https://ps1.merchantware.net/Merchantware/ws/ExtensionServices/v4/Giftcard.asmx';
			this.REPORT_ENDPOINT = 'https://genius.merchantware.net/v1/Reporting.asmx';
			
			this.REDIRECT_LOCATION = APP.SERVER_ENDPOINT_URL + '/jsp/cayan-response.jsp';
			
			this.MODE = 'CED'; // CED or HOSTED
			
			this.loadSettings();
			
			if(this.CED_IP_Address == '205.219.72.106' && this.MODE == 'CED')
			{
				this.STAGING_CALL_ENDPOINT = 'https://simulator-transport.merchantware.net/v4/transportService.asmx';
				this.REPORT_ENDPOINT = 'https://simulator-genius.merchantware.net/v1/reporting.asmx';
				this.isSimulatorMode = true;
				//this.CED_IP_Address = '205.219.72.106';
			}
		},
	    	    
	    loadSettings : function(){
	    	
	    	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	    	var truck_id = terminal['truck_id'];
	    	
	    	var truck = APP.TRUCK.getById( truck_id );
	    	this.BUSINESS_NAME = truck['name'];
	    	
	    	var sites = APP.CAYANSITE.search({'truck_id' : truck_id});
	    	
	    	if(sites.length == 0)
	    	{	    		
	    		this.isConfigured = false;
	    		return false;
	    	}
	    	
	    	var site = 	sites[0];	    	
	    	this.SITE_ID = site['siteid'];
	    	this.TERMINAL_ID = site['terminalid'] || APP.TERMINAL_KEY;
	    	
	    	var cayan_id = site['cayan_id'];	    	
	    	var cayan = APP.CAYAN.getById( cayan_id );
	    	
	    	this.MERCHANT_NAME = cayan['merchantname'];
	    	this.MERCHANT_KEY = cayan['merchantkey'];
	    	
	    	var settings = APP.CAYAN_SETTINGS.getSettings();
	    	
	    	this.isEnabled = settings['enableCayan'];
	    	this.CED_IP_Address = settings['ipAddress'];
	    	this.MODE = settings['mode'] || 'HOSTED';
	    	
	    	this.isConfigured = true;
	    	
	    	return true;
	    	
	    },
	    
	    /* The CreateTransaction web service method allows you to submit non-sensitive 
	     * payment information to the payment gateway and returns a unique key (TransportKey) 
	     * in the response which will be used for all subsequent steps to identify the transaction.
	     * Content-Type: text/xml; charset=utf-8
	     * SOAPAction: http://transport.merchantware.net/v4/CreateTransaction*/
	    stageTransaction : function( TransactionType, TransactionId, OrderNumber, ClerkId, Amount, Tax ){
	        
	        var dfd = new jQuery.Deferred();
	        /* call soap service and return TransportKey and ValidationKey */
	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://transport.merchantware.net/v4/CreateTransaction';
	        
	        var transportWebFields = '';
	        
	        if( this.MODE == 'HOSTED' ){
	        	
	        	transportWebFields = '<RedirectLocation>' + this.REDIRECT_LOCATION + '?origin=' + window.location.origin + '</RedirectLocation>' +
	        	'<EnablePartialAuthorization>false</EnablePartialAuthorization>' +
	        	'<EntryMode>KeyedSwiped</EntryMode>';
	        	
	        }
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'+
	            '<soap:Body>'+
	              '<CreateTransaction xmlns="http://transport.merchantware.net/v4/">'+
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                '<request>'+
	                  '<TransactionType>' + TransactionType + '</TransactionType>'+
	                  '<Amount>' + Amount + '</Amount>'+
	                  '<ClerkId>' + ClerkId + '</ClerkId>'+
	                  '<OrderNumber>' + OrderNumber + '</OrderNumber>'+
	                  '<Dba>' + this.BUSINESS_NAME + '</Dba>'+
	                  '<SoftwareName>Posterita Food POS</SoftwareName>'+
	                  '<SoftwareVersion>1.0.0.0</SoftwareVersion>'+
	                  //'<Cardholder>VISA TEST CARD</Cardholder>'+
	                  '<TransactionId>' + TransactionId + '</TransactionId>'+
	                  '<ForceDuplicate>true</ForceDuplicate>'+
	                  //'<CustomerCode>ABC123</CustomerCode>'+
	                  //'<PoNumber>ABC123</PoNumber>'+
	                  '<TaxAmount>' + Tax + '</TaxAmount>'+
	                  '<TerminalId>' + this.TERMINAL_ID + '</TerminalId>'+ 
	                  
	                  transportWebFields +
	                  
	                  
	                '</request>'+
	              '</CreateTransaction>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",	            
	            url: this.STAGING_CALL_ENDPOINT,
	            'contentType': contentType,
	            crossDomain: true,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                //check for errors
	                var Information = xml.find("Information");
	                if(Information != null && Information.text().length > 0){
	                	
	                	dfd.reject( 'Failed to stage transaction. Error: ' + Information.text() );	  
	                	return;
	                }
	                
	                var TransportKey =  xml.find( "TransportKey" ).text();
	                var ValidationKey =  xml.find( "ValidationKey" ).text();	                
	                
	                
	                var response = {
	                        'TransportKey' : TransportKey,
	                        'ValidationKey' : ValidationKey
	                };
	                
	                dfd.resolve( response );
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();
	        
	    },
	    
	    /* Use GET to send the TransportKey to the Customer Engagement Device. The device will prompt 
	     * the customer to select the payment type and complete the transaction. 
	     * The Point of Sale will keep the port open to the device and wait for the GET request to complete. 
	     * The GET response will contain an XML, JSON or JSONP packet. 
	     * http://[CED-IP-Address]:8080/v2/pos?TransportKey= xxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxxx&Format=JSON*/
	    initiateTransaction : function( TransportKey, ValidationKey ){
	        
	        var dfd = new jQuery.Deferred();
	        
	        var url = 'http://' + this.CED_IP_Address + ':8080/v2/pos?TransportKey=' + TransportKey + '&Format=JSON';
	        
	        $.getJSON( url ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;
	        	
	        	if('Not Found' == error || 'timeout' == error || 'abort' == error){
	        		err = "Failed to connect to Customer Engagement Device! IP:" + CayanService.CED_IP_Address;
	        	}
	            
	            dfd.reject( err );
	        });         
	        
	        return dfd.promise();
	        
	    },
	    
	    /* The DetailsByTransportKey web service method allows the Point of Sale developers to send in 
	     * the original TransportKey and request additional payment information at a later time.
	     * Content-Type: text/xml; charset=utf-8
	     * SOAPAction: http://schemas.merchantwarehouse.com/genius/10/Reporting/DetailsByTransportKey
	    */
	    retrieveDetails : function( TransportKey ){
	        
	    	var dfd = new jQuery.Deferred();
	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/genius/10/Reporting/DetailsByTransportKey';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<DetailsByTransportKey xmlns="http://schemas.merchantwarehouse.com/genius/10/Reporting">'+
	            	'<Name>' + this.MERCHANT_NAME + '</Name>' +
	            	'<SiteID>' + this.SITE_ID + '</SiteID>' +
	            	'<Key>' + this.MERCHANT_KEY + '</Key>' +
	            	'<TransportKey>' + TransportKey + '</TransportKey>' +
	            '</DetailsByTransportKey>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.REPORT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                /*var response = {
	                        'Amount' : xml.find( "Amount" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'AuthorizationCode' : xml.find( "AuthorizationCode" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text(),
	                        'ExtraData' : xml.find( "ExtraData" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionType' : xml.find( "TransactionType" ).text(),
	                };*/
	                
	                dfd.resolve( response );
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();
	    },
	    
	    /*
	     *  Sends a request to the CED to cancel the current transaction.
	     *  
	     *  Note: If the original transaction request is still pending, sending in a cancel request will 
	     *  force the CED to return a result to the original request with a status of 'POS Cancelled'. 
	     *  Please note that if the payment authorization has already occured, the response to the 
	     *  original request will contain transaction data which will need to be used to 'Void' or 'Refund' the transaction.
	     *  
	     *  Status	-	The status of the cancel request. Possible values are Cancelled, TransactionApproved_NoSignatureCollected, Denied, Error.
	     *  ResponseMessage	-	Message for Denied or Error transactions. (ie. Can’t connect, can’t cancel while processing, terminal at idle screen).
	     */
	    cancelTransaction : function(){
	        
	        var dfd = new jQuery.Deferred();
	        
	        var url = 'http://' + this.CED_IP_Address + ':8080/v1/pos?Action=Cancel&Format=JSON';
	        
	        $.getJSON( url ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	var err = textStatus + ", " + error;
	        	
	        	if('Not Found' == error || 'timeout' == error || 'abort' == error){
	        		err = "Failed to connect to Customer Engagement Device! IP:" + CayanService.CED_IP_Address;
	        	}
	        	
	        	dfd.reject( err );
	        });        
	        
	        return dfd.promise();
	        
	    },
	    
	    /*
	     * There are two versions of the Status request available. Version 1 sends a request to the CED to check 
	     * which screen the device is on. Version 2 is analogous with version 1 but also includes any AdditionalParameters fields.
	     * 
	     * The status of the Genius CED. Possible values: Online, DOWNLOAD_NEEDED
	     * ResponseMessage : Message for Denied or Error transactions. (ie. No internet access).
	     */	    
	    statusCheck : function(){
	        
	        var dfd = new jQuery.Deferred();
	        
	        var url = 'http://' + this.CED_IP_Address + ':8080/v1/pos?Action=Status&Format=JSON';
	        
	        var timeout = setTimeout(function() {
				
				onTimeout();
				
		    }, 5000); // 5 seconds 
			
			var onTimeout = function(){
								
				ajax.abort();
				
				console.log('Connection timeout');
			};
	        
	        var ajax = $.getJSON( url ).done(function( response ){
	        	
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;
	        	
	        	if('Not Found' == error || 'timeout' == error || 'abort' == error || error == '' ){
	        		err = "Failed to connect to Customer Engagement Device! IP:" + CayanService.CED_IP_Address;
	        	}
	        	
	            dfd.reject( err );
	            
	        }).always(function(){
	        	
	        	clearTimeout( timeout );
	        	
	        });        
	        
	        return dfd.promise();	        
	    },
	    
	    /*
	     * The Void Cancels a prior credit transaction, such as a sale or refund. 
	     * Once the transaction is voided and settled, the authorization falls off the cardholder's card 
	     * and does not appear on their monthly statement. Once settled, depending on the issuing back of the card, 
	     * the authorization should disappear within 24-48 hours. The CREDIT ENDPOINT should be used.
	     * 
	     * Content-Type: text/xml; charset=utf-8
	     * SOAPAction: http://schemas.merchantwarehouse.com/merchantware/40/Credit/Void
	     * 
	     */	    
	    voidTransaction : function( token ){
	    		        
	        var dfd = new jQuery.Deferred();
	        	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/merchantware/40/Credit/Void';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<Void xmlns="http://schemas.merchantwarehouse.com/merchantware/40/Credit/">'+
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                '<token>' + token + '</token>'+
    	            '<registerNumber>' + this.TERMINAL_ID + '</registerNumber>'+
    	            '<merchantTransactionId></merchantTransactionId>'+
	              '</Void>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.CREDIT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                var response = {
	                        'Amount' : xml.find( "Amount" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'AuthorizationCode' : xml.find( "AuthorizationCode" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text(),
	                        'ExtraData' : xml.find( "ExtraData" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionType' : xml.find( "TransactionType" ).text(),
	                };
	                
	                dfd.resolve( response );
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();	    
	    },
	    
	    /*
	     * The Refund The Refund web method issues a credit card refund to a customer from a prior transaction reference. 
	     * The CREDIT ENDPOINT should be used.
	     */
	    refundTransaction : function( token, invoiceNumber, overrideAmount ){
	        
	        var dfd = new jQuery.Deferred();
	        	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/merchantware/40/Credit/Refund';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<Refund xmlns="http://schemas.merchantwarehouse.com/merchantware/40/Credit/">'+
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                '<token>' + token + '</token>'+
	                '<invoiceNumber>' + invoiceNumber + '</invoiceNumber>'+
    	            '<overrideAmount>' + overrideAmount + '</overrideAmount>'+
    	            '<registerNumber>' + this.TERMINAL_ID + '</registerNumber>'+
    	            '<merchantTransactionId></merchantTransactionId>'+    	            
	              '</Refund>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.CREDIT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                var response = {
	                        'Amount' : xml.find( "Amount" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'AuthorizationCode' : xml.find( "AuthorizationCode" ).text(),
	                        'AvsResponse' : xml.find( "AvsResponse" ).text(),
	                        'Cardholder' : xml.find( "Cardholder" ).text(),
	                        'CardNumber' : xml.find( "CardNumber" ).text(),
	                        'CardType' : xml.find( "CardType" ).text(),
	                        'CvResponse' : xml.find( "CvResponse" ).text(),
	                        'EntryMode' : xml.find( "EntryMode" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text(),
	                        'ExtraData' : xml.find( "ExtraData" ).text(),
	                        'InvoiceNumber' : xml.find( "InvoiceNumber" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionType' : xml.find( "TransactionType" ).text()
	                };
	                
	                if( response.ApprovalStatus != 'APPROVED' )
	                {
	                	dfd.reject( response.ApprovalStatus );
	                }
	                else
	                {
	                	dfd.resolve( response );
	                }
	                
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();
	        
	    
	    },
	    
	    /*
	     * Check whether device is ready
	    */
	    isDeviceReady : function(){
	    	
	    	var dfd = new jQuery.Deferred();
	    	
	    	CayanService.statusCheck().done(function(json){
	    		
	    		//https://cayan.com/developers/resources/status-check-possible-responses
	    		if(json['Status']){
	    			if(json['Status'] == 'Online'){
	    				dfd.resolve( "ready" );
		    			return;
	    			}
	    			else
	    			{
	    				dfd.reject( json['Status'] );
	    				return;
	    			}
	    		}
	    		
	    		if(json['StatusResult'])
	    		{
	    			var StatusResult = json['StatusResult'];
		    		
		    		if(StatusResult.CurrentScreen == "00"){
		    			dfd.resolve( "ready" );
		    			return;
		    		}
	    		}
	    		else
	    		{
	    			if(json['CurrentScreen'] == "00"){
		    			dfd.resolve( "ready" );
		    			return;
		    		}
	    		}	    		
	    		
	    		dfd.reject( "Device is busy" );
	    		
	    	}).fail(function(error){
	    		dfd.reject( error );
	    	});
	    	
	    	return dfd.promise();
	    	
	    },
	    
	    test : function( amount )
	    {
	    	var uuid = APP.UTILS.UUID.getUUID();
	    	
	    	var transactionType = "SALE";
			
			if(amount < 0){
				
				transactionType = "_REFUND";
				
				amount = 0 - amount;
				
			}
	    	
	        CayanService.stageTransaction( transactionType, uuid, uuid.substring(0,8), '1001', amount, 0 ).done(function(json){
	            
	            console.log(json);
	            
	            var TransportKey = json['TransportKey'];
	            var ValidationKey = json['ValidationKey'];
	            
	            CayanService.initiateTransaction( TransportKey, ValidationKey ).done(function(json){
	                
	                console.log( json );
	                
	            }).fail(function(error){
	                
	                console.error( json );
	                
	                });
	        }).fail(function(error){
	            
	            console.error( error );
	            
	        });
	    },
	    
	    
	    
	    /* START - CAYAN GIFT CARD */
	    
	    giftBalanceInquiry : function ( ordernumber, cardnumber ) {
	    		        
	        var dfd = new jQuery.Deferred();
	        	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/merchantware/40/Giftcard/BalanceInquiryKeyed';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<BalanceInquiryKeyed xmlns="http://schemas.merchantwarehouse.com/merchantware/40/Giftcard">'+
	            
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                
	                '<invoiceNumber>' + ordernumber + '</invoiceNumber>'+
    	            '<extraData></extraData>'+
    	            
    	            '<cardNumber>' + cardnumber + '</cardNumber>'+
    	            
	              '</BalanceInquiryKeyed>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.GIFT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	            	
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                var response = {
	                        'CardBalance' : xml.find( "CardBalance" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'Cardholder' : xml.find( "Cardholder" ).text(),	                        
	                        'ExpirationDate' : xml.find( "ExpirationDate" ).text(),
	                        'CardNumber' : xml.find( "CardNumber" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionID' : xml.find( "TransactionID" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text(),
	                        'ResponseMessage' : xml.find( "ResponseMessage" ).text()
	                };
	                
	                response.ApprovalStatus = response.ApprovalStatus.toUpperCase();
	                
	                dfd.resolve( response );
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();        
	    
	    },
	    
	    giftAddValue : function ( ordernumber, cardnumber, amount ) {
	        
	        var dfd = new jQuery.Deferred();
	        	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/merchantware/40/Giftcard/AddValueKeyed';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<AddValueKeyed xmlns="http://schemas.merchantwarehouse.com/merchantware/40/Giftcard">'+
	            
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                
	                '<invoiceNumber>' + ordernumber + '</invoiceNumber>'+
    	            '<extraData></extraData>'+
    	            
    	            '<cardNumber>' + cardnumber + '</cardNumber>'+
    	            '<amount>' + amount + '</amount>'+
    	            
	              '</AddValueKeyed>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.GIFT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                var response = {
	                        'CardBalance' : xml.find( "CardBalance" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'Cardholder' : xml.find( "Cardholder" ).text(),	                        
	                        'ExpirationDate' : xml.find( "ExpirationDate" ).text(),
	                        'CardNumber' : xml.find( "CardNumber" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionID' : xml.find( "TransactionID" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text()
	                };
	                
	                response.ApprovalStatus = response.ApprovalStatus.toUpperCase();
	                
	                if( response.ApprovalStatus == 'APPROVED' ){
	                	
	                	dfd.resolve( response );
	                }
	                else
	                {
	                	dfd.reject( response.ResponseMessage );
	                }
	                
	                
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();        
	    
	    },
	    
	    giftActivate : function ( ordernumber, cardnumber, amount ) {
	        
	        var dfd = new jQuery.Deferred();
	        	        
	        var contentType = 'text/xml; charset=utf-8';
	        var soapAction = 'http://schemas.merchantwarehouse.com/merchantware/40/Giftcard/ActivateCardKeyed';
	        
	        var soapBody = '<?xml version="1.0" encoding="utf-8"?>'+
	        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
	            '<soap:Body>'+
	            '<ActivateCardKeyed xmlns="http://schemas.merchantwarehouse.com/merchantware/40/Giftcard">'+
	            
	                '<merchantName>' + this.MERCHANT_NAME + '</merchantName>'+
	                '<merchantSiteId>' + this.SITE_ID + '</merchantSiteId>'+
	                '<merchantKey>' + this.MERCHANT_KEY + '</merchantKey>'+
	                
	                '<invoiceNumber>' + ordernumber +'</invoiceNumber>'+
    	            '<extraData></extraData>'+
    	            
    	            '<cardNumber>' + cardnumber + '</cardNumber>'+
    	            '<amount>' + amount + '</amount>'+
    	            
	              '</ActivateCardKeyed>'+
	            '</soap:Body>'+
	          '</soap:Envelope>';
	        
	        
	        
	        $.ajax({
	            type: "post",
	            headers : {"SOAPAction" : '"' + soapAction + '"'},
	            crossDomain: true,
	            url: this.GIFT_ENDPOINT,
	            'contentType': contentType,
	            data: soapBody,
	            dataType: "xml",
	            processData: false, 
	            timeout: 15000,
	            success: function( response ){ 	
	            	
	                
	                // Get a jQuery-ized version of the response.
	                var xml = $( response );
	                
	                var response = {
	                        'CardBalance' : xml.find( "CardBalance" ).text(),
	                        'ApprovalStatus' : xml.find( "ApprovalStatus" ).text(),
	                        'Cardholder' : xml.find( "Cardholder" ).text(),	                        
	                        'ExpirationDate' : xml.find( "ExpirationDate" ).text(),
	                        'CardNumber' : xml.find( "CardNumber" ).text(),
	                        'Token' : xml.find( "Token" ).text(),
	                        'TransactionDate' : xml.find( "TransactionDate" ).text(),
	                        'TransactionID' : xml.find( "TransactionID" ).text(),
	                        'ErrorMessage' : xml.find( "ErrorMessage" ).text()
	                };
	                
	                response.ApprovalStatus = response.ApprovalStatus.toUpperCase();
	                
	                if( response.ApprovalStatus == 'APPROVED' ){
	                	
	                	dfd.resolve( response );
	                }
	                else
	                {
	                	dfd.reject( response.ResponseMessage );
	                }
	            },
	            error: function( jqXHR, textStatus, errorThrown ){
	            	
	            	dfd.reject( textStatus );
	            }
	        });
	                
	        return dfd.promise();        
	    
	    }
	    
	    /* END - CAYAN GIFT CARD */
	    
	    
	    
	};
	
	var CayanCED = {
		
		/*Line Item Display*/
		
		getResponse : function( params ){
			
			var dfd = new jQuery.Deferred();
			
			if( CayanService.MODE == 'HOSTED' ){
                dfd.resolve( {} );
                return dfd.promise(); 
            }
	        
			$.getJSON( 'http://' + CayanService.CED_IP_Address + ':8080/v1/pos', params ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;	        	
	        	
	        	if('Not Found' == error || 'timeout' == error || 'abort' == error){
	        		err = "Failed to connect to Customer Engagement Device! IP:" + CayanService.CED_IP_Address;
	        	}
	            
	            dfd.reject( err );
	        });         
	        
	        return dfd.promise(); 
		},
	    
		startOrder : function( OrderNumber ) {
	        
			var params = {
					'Action' : 'StartOrder',
					'Order' : OrderNumber,
					'Format' : 'JSON'
			};
			
	        return this.getResponse( params );   	    
	    },
	    
	    endOrder : function( OrderNumber ) {
	        
			var params = {
					'Action' : 'EndOrder',
					'Order' : OrderNumber,
					'ExternalPaymentType' : 'Cash',
					'Format' : 'JSON'
			};
			
	        return this.getResponse( params ); 	    
	    },
	    
	    addItem : function( OrderNumber, OrderTotal, OrderTax, ItemId, UPC, Sku, Description, Qty, Amount, TaxAmount ) {
	        
	    	var params = {
					'Action' : 'AddItem',
					'Order' : OrderNumber,
					'TypeValue' : Sku,
					'UPC' : UPC,
					'ItemID' : ItemId,
					'Quantity' : Qty,
					'Description' : Description,
					'Amount' : Amount,
					'TaxAmount' : TaxAmount,
					'OrderTotal' : OrderTotal,
					'OrderTax' : OrderTax,
					'Type' : 'Sku',
					'Category' : 'None',
					'Format' : 'JSON'
			};
			
	        return this.getResponse( params ); 	    
	    },
	    
	    deleteAllItems : function( OrderNumber, OrderTotal, OrderTax ) {	    	
	    	
	    	var params = {
					'Action' : 'DeleteAllItems',
					'Order' : OrderNumber,
					'RetainPaymentData' : 'false',
					'OrderTotal' : OrderTotal,
					'OrderTax' : OrderTax,					
					'Format' : 'JSON'
			};
			
	        return this.getResponse( params );	        
	    },
	    
	    deleteItem : function( OrderNumber, ItemId, OrderTotal, OrderTax ) {
	    	
	    	var params = {
					'Action' : 'DeleteItem',
					'Order' : OrderNumber,
					'TargetItemID' : ItemId,
					'OrderTotal' : OrderTotal,
					'OrderTax' : OrderTax,					
					'Format' : 'JSON'
			};
			
	        return this.getResponse( params );
	    },
	    
	    updateItem : function( OrderNumber, ItemId, OrderTotal, OrderTax, Qty, Amount, TaxAmount ) {
	    	
	    	var params = {
	    			'Action' : 'UpdateItem',
	    			'Order' : OrderNumber,
	    			'TargetItemID' : ItemId,
	    			'OrderTotal' : OrderTotal,
	    			'OrderTax' : OrderTax,
	    			'Quantity' : Qty,
					'Amount' : Amount,
					'TaxAmount' : TaxAmount,
	    			'Category' : 'None',
					'Format' : 'JSON'
	    	};
	    	
	    	return this.getResponse( params );
	    },
	    
	    updateTotal : function( OrderNumber, OrderTotal, OrderTax ) {
	    	
	    	var params = {
	    			'Action' : 'UpdateTotal',
	    			'Order' : OrderNumber,
	    			'OrderTotal' : OrderTotal,
	    			'OrderTax' : OrderTax,
	    			'Format' : 'JSON'	    			
	    	};
	    	
	    	return this.getResponse( params );
	    },
	    
	    discountItem : function( OrderNumber, OrderTotal, OrderTax, ItemId, Sku, Description, Qty, Amount, TaxAmount) {
	    	
	    	var params = {
	    			'Action' : 'DiscountItem',
	    			'Order' : OrderNumber,
	    			'Type' : 'Sku',
	    			'TypeValue' : Sku,
	    			'TargetItemID' : ItemId,
	    			'Quantity' : Qty,
	    			'Description' : Description,
	    			'Amount' : Amount,
	    			'TaxAmount' : TaxAmount,
					'OrderTotal' : OrderTotal,
					'OrderTax' : OrderTax,
					'Category' : 'None',
					'Format' : 'JSON'	    			
	    	};
	    	
	    	return this.getResponse( params );
	    },
	    
	    cancel : function() {
	    	
	    	var params = {
	    		'Action' : 'Cancel',
	    		'Format' : 'JSON'
	    	};
	    	
	    	return this.getResponse( params );	    	
	    }
};

/*
if(CayanService.isConfigured == true && CayanService.MODE == 'CED')
{
		var c = jQuery( ShoppingCart );	
		
		c.on('cart.clear', function( event ){
			
			CayanCED.deleteAllItems(OrderScreen.orderNumber, 0, 0);			
			
		});

		c.on('cart.addLine', function( event, line ){
			
			console.log('cart.addLine');
			
			var cart = line.cart;
			
			var OrderNumber = APP.UTILS.ORDER.getDocumentNo();
			var OrderTotal = cart.grandtotal;
			var OrderTax = cart.taxtotal;
			var ItemId = line.index;
			var Sku = line.product_id;
			var Description = line.product.name;
			var Qty = line.qty;
			var Amount = line.lineAmt;
			var TaxAmount = line.taxAmt;
			
			CayanCED.addItem ( OrderNumber, OrderTotal, OrderTax, ItemId, Sku, Description, Qty, Amount, TaxAmount );
			
		});
		
		c.on('cart.updateLine', function( event, line ){
			
			console.log('cart.updateLine');
			CayanCED.updateItem( OrderNumber, ItemId, OrderTotal, OrderTax );
			
		});
		
		c.on('cart.removeLine', function( event, index ){
			
			console.log('cart.removeLine');
			
			var cart = this;
			
			var OrderNumber = OrderScreen.orderNumber;
			var OrderTotal = cart.grandtotal;
			var OrderTax = cart.taxtotal;
			var ItemId = index;
			
			CayanCED.deleteItem(OrderNumber, ItemId, OrderTotal, OrderTax);
			
		});
	}
*/

function xmlToJson(xml) {
    var attr,
        child,
        attrs = xml.attributes,
        children = xml.childNodes,
        key = xml.nodeType,
        obj = {},
        i = -1;

    if (key == 1 && attrs.length) {
      obj[key = '@attributes'] = {};
      while (attr = attrs.item(++i)) {
        obj[key][attr.nodeName] = attr.nodeValue;
      }
      i = -1;
    } else if (key == 3) {
      obj = xml.nodeValue;
    }
    while (child = children.item(++i)) {
      key = child.nodeName;
      if (obj.hasOwnProperty(key)) {
        if (obj.toString.call(obj[key]) != '[object Array]') {
          obj[key] = [obj[key]];
        }
        obj[key].push(xmlToJson(child));
      }
      else {
        obj[key] = xmlToJson(child);
      }
    }
    return obj;
}
/** CAYAN Enumerations **/
/**

	TransactionType

	The TransactionType enumeration describes the various types of transactions known to Merchantware. However, some of these transaction types may not be available. For example, some transaction types may be unavailable due to the type of merchant account, Merchantware setup, or type of payment used in a transaction.
	
	Enumeration Values
	
	Name	Value	Description
	UNKNOWN	0	This value is reserved.
	SALE	1	A SALE charges an amount of money to a customer's credit card.
	REFUND	2	A REFUND credits an amount of money to a customer's credit card.
	VOID	3	A VOID removes a SALE, REFUND, FORCE, POSTAUTH, or ADJUST transaction from the current credit card processing batch.
	FORCE	4	A FORCE forces a charge on a customer's credit card. It will not check the balance nor the authorization limit of money on a customer's card.
	AUTH	5	An AUTH reserves or holds an amount of money on a customer's credit card. The amount specified is unavailable for any other purchases until the AUTH expires or a POSTAUTH is issued for the AUTH amount.
	CAPTURE	6	A CAPTURE commits a single transaction as though it were batched. This feature is unsupported and the keyword is reserved for future use.
	ADJUST	7	An ADJUST is an adjustment on the amount of a prior sale or capture. Usually this is employed by restaurants and salons and other businesses where tip-adjust on credit transactions are allowed.
	REPEATSALE	8	A REPEATSALE is a repeated sale of a prior sale transaction. Most accounts and merchants do not use this transaction type.
	POSTAUTH	9	A POSTAUTH completes the transaction process for a prior Authorization and allows it to enter the batch. Once in the batch, a POSTAUTH has no characteristics differing from a SALE other than the transaction type label.
	LEVELUPSALE	11	A LEVELUPSALE charges an amount of money to a customer's LevelUp account.
	LEVELUPCREDIT	12	A LEVELUPCREDIT credits an amount of money to a customer's LevelUp account.

*/
CayanService.TransactionTypes = [
                                 
	 'UNKNOWN',
	 'SALE',
	 'REFUND',
	 'VOID',
	 'FORCE',
	 'AUTH',
	 'CAPTURE',
	 'ADJUST',
	 'REPEATSALE',
	 'POSTAUTH',
	 '',
	 'LEVELUPSALE',
	 'LEVELUPCREDIT'
 ];

/**

	POSEntryType

	The POSEntryType enumeration describes the various methods of card data entry for transactions.
	
	Enumeration Values
	
	Name	Value	Description
	UNKNOWN	0	This value is reserved.
	KEYED	1	A transaction keyed in using data read by a person off of a card.
	SWIPE	2	A transaction submitted from data swiped through a magnetic reader.
	AUTHORIZATION	3	A transaction keyed in with a phone or offline authorization from a processor.
	PROXIMITY	4	A transaction submitted from a contactless reader.
	LVLUP	5	A transaction submitted via a LevelUp scanner.					 

*/
CayanService.POSEntryTypes = [
                              
      'UNKNOWN',
      'KEYED',
      'SWIPE',
      'AUTHORIZATION',
      'PROXIMITY',
      'LVLUP'
      
  ];

/**
	CardType
	
	The CardType enumeration describes the various types of cards known to Merchantware. Some of these card types may not be available or applicable to your implementation. Also, some card types may encapsulate other card types due to industry changes. For example, Diner's Club cards are now handled by Mastercard.
	
	Enumeration Values
	
	Name	Value	Description
	UNKNOWN	0	This value is reserved.
	AMEX	1	A card issued by American Express.
	DISCOVER	2	A card issued by Discover or by a network affiliated with Discover.
	MASTERCARD	3	A card issued by Mastercard. Diner's Club cards also fall into this category.
	VISA	4	A card issued by Visa.
	DEBIT	5	A debit card, and depending on context, a card supporting debit or a card used for a debit transaction.
	EBT	6	An electronic balance transfer card. These cards are typically issued by government agencies.
	EGC	7	An electronic gift card.
	WEX	8	A fleet card issued by Wright Express.
	VOYAGER	9	A Voyager fleet card, issued by US Bank.
	JCB	10	A card issued by Japan Credit Bureau.
	CUP	11	A China Union Pay credit card.
	LVLUP	12	A LevelUp transaction.
*/
CayanService.CardTypes = [
	                          
		'UNKNOWN',
		'AMEX',
		'DISCOVER',
		'MASTERCARD',
		'VISA',
		'DEBIT',
		'EBT',
		'EGC',
		'WEX',
		'VOYAGER',
		'JCB',
		'CUP',
		'LVLUP'
		
	];
