/**
 * Define all services
 */
var Service = {
		
		getServerEndPointUrl : function(){
			return APP.SERVER_ENDPOINT_URL;
		},
		
		call : function(url, params, errorMessage){
						
			var timeout = setTimeout(function() {
				
				onTimeout();
				
		    }, 15000); // 15 seconds 
			
			var onTimeout = function(){
								
				ajax.abort();
				
				console.log('Connection timeout');
			};
			
			var dfd = new jQuery.Deferred();
			
			var ajax = jQuery.post( this.getServerEndPointUrl() + '/' + url,
					
				params,
				
	    		function(json, textStatus, jqXHR){	
	    			
					clearTimeout( timeout );
				
	    			if(json == null || jqXHR.status != 200){
	    				dfd.reject(errorMessage); 
	    				return;
	    			}  
	    			
	    			if(json.error){
	    				dfd.reject(json.error);
	    				return;
	    			}
	    			
	    			dfd.resolve(json); 					    		    			
	    			
	    		},
			"json").fail(function( jqXHR, textStatus, errorThrown ){
				
				clearTimeout( timeout );
				
				if( 'abort' == textStatus )
				{
					dfd.reject(errorMessage + " Connection timeout.", true);
				} 
				else
				{
					dfd.reject(errorMessage);
				}				
				
			});
			
			return dfd;
		}
};

var ServerEndPointService = jQuery.extend({	
	
	test : function( endpoint ){
		
		var url = "app/test";
		var errorMessage = "Failed to test server endpoint!";
		
		this.getServerEndPointUrl = function(){
			return endpoint;
		};
		
		return this.call(url, {}, errorMessage);
	},
	
}, Service);

var LoginService = jQuery.extend({	
	
	login : function( email, password ){		
		var url = "app/login";
		var errorMessage = "Failed to sign in!";
		
		var params = {
				'email' : email,
				'password' : password
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var CustomerService = jQuery.extend({	
	
	update : function( customer ){		
		var url = "app/update-customer";
		var errorMessage = "Failed to create/update customer!";
		
		var params = {
				'customer' : JSON.stringify(customer),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var OrderService = jQuery.extend({	
	
	sync : function( orders ){		
		var url = "app/sync-order";
		var errorMessage = "Failed to sync orders!";
		
		var params = {
				'orders' : JSON.stringify(orders),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
	voidOrder : function ( uuid ){
		var url = "app/void-order";
		var errorMessage = "Failed to void order!";
		
		var params = {
				'uuid' : uuid,
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	}
	
}, Service);

var TillService = jQuery.extend({	
	
	sync : function( tills ){		
		var url = "app/sync-till";
		var errorMessage = "Failed to sync tills!";
		
		var params = {
				'tills' : JSON.stringify(tills),
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);

var DatabaseService = jQuery.extend({	
	
	requestUpdates : function(){		
		var url = "app/pull-data";
		var errorMessage = "Failed to request updates!";
		
		var params = {
				'account_key' : APP.ACCOUNT_KEY
		};
		
		return this.call(url, params, errorMessage);
	},
	
}, Service);