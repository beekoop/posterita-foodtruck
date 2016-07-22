/* https://buffer.com/developers/api */

var BufferService = {
		
		isConfigured : false,
		
		init : function(){
			
			var dfd = new jQuery.Deferred();
			
			var integrations = APP.INTEGRATION.search({name : 'buffer'});
			
			if( integrations.length == 0 ){
				
				dfd.resolve( 'Buffer is not configured!' );
				return dfd.promise();				
			}
			
			var integration = integrations[0];
			var settings = integration.json;
			
			settings = JSON.parse( settings );
			
			this.access_token = settings['accesstoken'];
			
			//load profiles
			BufferService.getProfiles().done(function( profiles ){
				
				var ids = [];
				var profile = null;
				
				for( var i=0; i<profiles.length; i++ ){
					profile = profiles[i];
					
					ids[i] = profile["id"];
				}
				
				BufferService.profile_ids = ids;
				BufferService.isConfigured = true;
				
				dfd.resolve( 'Loaded ' + ids.length + ' profile(s)' );
				
			}).fail(function( error ){
				
				dfd.reject( 'Failed to get profiles!' );
				
			});
			
			return dfd.promise();
			
			//this.profile_ids = [ "575949642b9656de56a7c814", "5759499fbbbaa3875e22f64c" ];
			
		},		
		
		/*
		 * GET /user 
		 * Returns a single user.
		 */
		
		getUser : function(){
			
			var url = "https://api.bufferapp.com/1/user.json?access_token=" + this.access_token;
			
			var dfd = new jQuery.Deferred();
	        	        
	        $.getJSON( url ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;
	            
	            dfd.reject( err );
	        });         
	        
	        return dfd.promise();
		},
		
		/*
		 * GET /profiles
		 * Returns an array of social media profiles connected to a users account.
		 */
		
		getProfiles : function(){
			
			var url = "https://api.bufferapp.com/1/profiles.json?access_token=" + this.access_token;
			
			var dfd = new jQuery.Deferred();
	        	        
	        $.getJSON( url ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;
	            
	            dfd.reject( err );
	        });         
	        
	        return dfd.promise();
		},
		
		/*
		 * POST /updates/create
		 * Create a new status update for one or more profiles. 
		 */
		
		updateStatus : function( profile_ids, text, now ){
			
			var url = "https://api.bufferapp.com/1/updates/create.json?access_token=" + this.access_token;
			
			var dfd = new jQuery.Deferred();
			
			var params = {
					"profile_ids" : profile_ids,
					"text" : text,
					"now" : now,
					"top" : true
			};
	        	        
	        $.post( url, params ).done(function( response ){
	            dfd.resolve( response );
	            
	        }).fail(function( jqxhr, textStatus, error ) {
	        	
	        	var err = textStatus + ", " + error;
	            
	            dfd.reject( err );
	        });         
	        
	        return dfd.promise();
			
		}
};