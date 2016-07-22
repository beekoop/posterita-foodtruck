var isCordovaApp = !!window.cordova;
var ShoppingCart = new Cart();

function closeApp(){
	navigator.notification.confirm(
           'Do you want to quit', 
           onConfirmQuit, 
           'Posterita Food POS', 
           'OK,Cancel'  
    );
}

function onConfirmQuit(button){
   if(button == "1"){
     navigator.app.exitApp(); 
   }
}

function backButtonHandler(){
	
}

function initializeCayan(){
	
	// initialize cayan
	CayanService.init();
	
	if(CayanService.isConfigured == true && CayanService.MODE == 'CED')
	{
		/*
		CayanService.cancelTransaction().always(function(){
			
			CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
			
		});	
		*/	
		
		var c = jQuery( ShoppingCart );	
		
		c.on('cart.clear', function( event ){
			
			console.log('cart.clear');
			
			var OrderNumber = APP.UTILS.ORDER.getDocumentNo();
			// CayanCED.deleteAllItems( OrderNumber, 0, 0);
			
			CayanCED.cancel().always(function(){
				CayanCED.startOrder( OrderNumber );
			});
			
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
			var Amount = new Number( line.grandtotal / line.qty ).toFixed(2);
			var TaxAmount = line.taxAmt;
			var UPC = line.product.upc; 
			
			CayanCED.addItem ( OrderNumber, OrderTotal, OrderTax, ItemId, UPC, Sku, Description, Qty, Amount, TaxAmount );
			
		});
		
		c.on('cart.updateLine', function( event, line ){
			
			console.log('cart.updateLine');
			
			var cart = line.cart;
			
			var OrderNumber = APP.UTILS.ORDER.getDocumentNo();
			var OrderTotal = cart.grandtotal;
			var OrderTax = cart.taxtotal;
			var ItemId = line.index;
			var Qty = line.qty;
			var Amount = new Number( line.grandtotal / line.qty ).toFixed(2);
			var TaxAmount = line.taxAmt;
			
			CayanCED.updateItem( OrderNumber, ItemId, OrderTotal, OrderTax, Qty, Amount, TaxAmount );
			
		});
		
		c.on('cart.removeLine', function( event, index ){
			
			console.log('cart.removeLine');
			
			var cart = this;
			
			var OrderNumber = APP.UTILS.ORDER.getDocumentNo();
			var OrderTotal = cart.grandtotal;
			var OrderTax = cart.taxtotal;
			var ItemId = index;
			
			CayanCED.deleteItem(OrderNumber, ItemId, OrderTotal, OrderTax);
			
		});
		
	}
	
	/* START CAYAN GIFT CARD */
	
	APP.GIFT_PRODUCT_CATEGORY_ID = -100;
	
	var results = APP.PRODUCT_CATEGORY.search({name:'Gift Card'});
	if( results.length > 0 ){
		var category = results[0];
		APP.GIFT_PRODUCT_CATEGORY_ID = category['productcategory_id'];
	}
	
	/* END CAYAN GIFT CARD */
}

function initializeBuffer(){
	
	BufferService.init().done(function(x){
		
		console.log(x);
		
	}).fail(function(e){
		
		console.error(e);
		
	});	
}

function initializeShoppingCart(){
	ShoppingCart.init();
}


function validateTerminal()
{
	var terminal_key = APP.TERMINAL_KEY;
	
	// validate terminal key
	var terminal = APP.TERMINAL.getById( terminal_key );
	
	if( terminal == null )
	{
		// go to select terminal
		menu.setMainPage('page/select-terminal.html', {closeMenu: true});		
	}
	else
	{
		var user_key = APP.USER_KEY;
		
		// validate user key
		var user = APP.USER.getById( user_key );
		
		if( user == null)
		{
			// go to select user
			menu.setMainPage('page/select-user.html', {closeMenu: true});
		}
		else
		{
			initializeShoppingCart();
			initializeBuffer();
			initializeCayan();
			
			ShoppingCart.clear();
			
			// check if till is open or close
			var tills = APP.TILL.search({'closingdate': null});
			
			if(tills.length == 0)
			{
				// go to open till
				menu.setMainPage('page/open-till.html', {closeMenu: true});
			}
			else
			{
				APP.TILL_KEY = tills[0].till_id;
				
				// go to order screen
				menu.setMainPage('page/order-screen.html', {closeMenu: true});
			}			
			
		}		
		
	}
	
	// close modal
	modal.hide();
}

function logout()
{
	ons.notification.confirm({
		  message: 'Do you want to log out?',
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Confirmation',
		  buttonLabels: ['Yes', 'No'],
		  animation: 'default', // or 'none'
		  primaryButtonIndex: 1,
		  cancelable: false,
		  callback: function(index) {
		    // -1: Cancel
		    // 0-: Button index from the left
		    if(index == 0){
		    	
		    	APP.logOut();
		    	
		    	menu.setSwipeable(false);
		    	// go to order screen
		    	menu.setMainPage('page/select-user.html', {closeMenu: true});		    	
		    }
		  }
		});		
	
}

function initDB(){
		
	// initialize database for account
	APP.initializeDB().done( function ( msg ){
		
		console.log( msg );
		
		// synchronize database
		APP.synchronizeDB().done( function ( msg ){
			
			console.log( msg );
			
			// init cache
			APP.initCache().done( function ( msg ){
				
				console.log( msg );
				
				validateTerminal();	
				
				
			}).fail( function ( e ){
				// failed to load cache
				console.error( e );
				
			});
			
			
		}).fail( function ( e ){
			// failed to synchronize db
			console.error( e );
			
		});
		
	}).fail( function ( e ){
		// failed to initialize db
		console.error( e );
		
	});
}

function synchronize(){
	
	modal.show();
	
	APP.pushData().done(function(msg){
		console.log(msg);
		
		ons.notification.alert({
			  message: 'Synchronization completed!',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Information',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
			  }
			});
		
	})
	.fail(function(msg){
		
		console.log(msg);
		
		ons.notification.alert({
			  message: 'Fail to synchronize! '+ msg,
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Error',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
			  }
			});
	})
	.always(function(){
		modal.hide();
	});
	
}

function initializeGooglePlaceSearch($scope)
{
    var input = document.getElementById('location');
    if(input == null) return;
    
    var options = {
			  types: ['address'],
			  componentRestrictions: {country: "us"}
			 };
    
    var autocomplete = new google.maps.places.Autocomplete( input, options );
    
    google.maps.event.addListener(autocomplete, 'place_changed', function() {
    	
        var place = autocomplete.getPlace();
        if (!place.geometry) {
            return;
        }
        
        $scope.location = input.value;
    });
}

var module = ons.bootstrap('my-app', ['onsen','ngScrollGlue','angularMoment']);

module.controller('AppController', function($scope) {
	
	// navigator.splashscreen.hide();
	if( navigator && navigator.notification ){
		
		window.alert = navigator.notification.alert;
		
	}	
	
});

// sync pos
module.controller('SyncController', function($scope) {
	
	// APP.pushData().done(function(msg){console.log(msg);}).fail(function(msg){console.log(msg);});
	// APP.pullData().done(function(msg){console.log(msg);}).fail(function(msg){console.log(msg);});
	
	var setStatus = function( status ){
		
		$scope.$apply(function(){
			$scope.status = status;
		});
		
	};
	
	$scope.status = "Please wait ...";
	// Requesting latest updates ...
	
	$scope.status = "Initializing application ...";
	
	APP.initializeDB().done( function ( msg ){
		
		console.log( msg );
		
		setStatus("Requesting latest updates ...");
		
		// synchronize database
		APP.synchronizeDB().done( function ( msg ){
			
			console.log( msg );
			
			setStatus("Applying updates ...");
			
			// init cache
			APP.initCache().done( function ( msg ){
				
				console.log( msg );
				
				setStatus("Synchronization completed.");
				
				validateTerminal();
				
				
			}).fail( function ( e ){
				// failed to load cache
				console.error( e );
				
				ons.notification.alert({
				  message: 'Fail to start application! ' + e,
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
					  
					  onConfirmQuit("1");
				  }
				});
				
			});
			
			
		}).fail( function ( e ){
			// failed to synchronize db
			console.error( e );
			
			ons.notification.alert({
			  message: e,
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Error',
			  buttonLabel: 'OK',
			  animation: 'default', // or 'none'
			  // modifier: 'optional-modifier'
			  callback: function() {
			    // Alert button is closed!
				  
				  setStatus("loading data from cache ...");
				  
				  APP.initCache().done( function ( msg ){
						
						console.log( msg );
						
						setStatus("Loading completed.");
						
						validateTerminal();
						
						
					}).fail( function ( e ){
						// failed to load cache
						console.error( e );
						
						ons.notification.alert({
						  message: 'Fail to start application! ' + e,
						  // or messageHTML: '<div>Message in HTML</div>',
						  title: 'Error',
						  buttonLabel: 'OK',
						  animation: 'default', // or 'none'
						  // modifier: 'optional-modifier'
						  callback: function() {
						    // Alert button is closed!
							  
							  onConfirmQuit("1");
						  }
						});
						
					});
			  }
			});
			
		});
		
	}).fail( function ( e ){
		// failed to initialize db
		console.error( e );
		
		ons.notification.alert({
		  message: 'Fail to start application! ' + e,
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Error',
		  buttonLabel: 'OK',
		  animation: 'default', // or 'none'
		  // modifier: 'optional-modifier'
		  callback: function() {
		    // Alert button is closed!
			  
			  onConfirmQuit("1");
		  }
		});
		
	});
	
});

// splashscreen
module.controller('SplashScreenController', function($scope) {
	
	// splash screen
	modal.show();
	
	// disable menu
   	menu.setSwipeable(false);
	
	// load application settings
   	APP.loadSettings();
	
	var server_endpoint_url = APP.SERVER_ENDPOINT_URL;
	// validate server endpoint url
	
	if( server_endpoint_url == null ){
		// go to settings
		menu.setMainPage('page/settings.html', {closeMenu: true});
		modal.hide();
		return;
	}
	
	var account_key = APP.ACCOUNT_KEY;
	// validate account key
	
	if( account_key == null || account_key == 0 ){
		// go to sign in
		menu.setMainPage('page/sign-in.html', {closeMenu: true});
		modal.hide();
		return;
	}
	else
	{
		menu.setMainPage('page/sync.html', {closeMenu: true});
		modal.hide();
		return;
	}	
	
});

// server endpoint
module.controller('ServerEndpointController', function($scope) {
	
	$scope.endpoint = APP.SERVER_ENDPOINT_URL;
	
	$scope.continue = function(){
		
		var endpoint = $scope.endpoint;
		
		// TODO validate endpoint
		
		modal.show();
		
		ServerEndPointService.test( endpoint ).done(function(){
			
			APP.setServerEndPointURL( endpoint );
			menu.setMainPage('page/sign-in.html', {closeMenu: true});
			
		}).fail(function(error, timeout){
			
			if(timeout && timeout == true){
				// connection timeout
				
				ons.notification.alert({
		  			  message: error,
		  			  title: 'Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  			    // $('#email').focus();
		  			  }
			  	});
			}
			else
			{
				ons.notification.alert({
	  			  message: "Server endpoint entered is not a valid endpoint!",
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    // $('#email').focus();
	  			  }
		  		});
			}			
			
			
		}).always(function(){
			modal.hide();
		});
		
		
	};
	
});

// sign in
module.controller('SignInController', function($scope) {
		
	$scope.signIn = function(){
		
		var email = $scope.email;
		var password = $scope.password;
		
		modal.show();
		
		LoginService.login( email, password ).done(function(json){
			
			var account_key = json['account_key']; 
			
			APP.setAccountKey( account_key );
			
			menu.setMainPage('page/sync.html', {closeMenu: true});
			// menu.setMainPage('page/select-terminal.html', {closeMenu: true});
			
			modal.hide();
			
			// initDB();
			
		}).fail(function(error){
			
			modal.hide();
			
			ons.notification.alert({
	  			  message: error,
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    $('#email').focus();
	  			  }
	  			});			
			
		}).always(function(){
			
		});
	};
});

// terminal
module.controller('TerminalController', function($scope) {
	
	var truckList = APP.TRUCK.getAll();
	var terminalList = APP.TERMINAL.getAll();
	
	$scope.truck_id = 0;
	$scope.terminal_id = 0;	
	
	$scope.truckList = truckList;
	$scope.terminalList = [];	
	
	// called when user selects a truck
	$scope.renderTerminalSelect = function(){
		
		var truck_id = $scope.truck_id;
		
		// reset terminal list
		$scope.terminal_id = 0;
		
		var query = {'truck_id' : {'==' : truck_id}};
		
		$scope.terminalList = APP.TERMINAL.search( query );
	};
	
	
	if( APP.TERMINAL_KEY > 0 ){
		
		var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
		
		if( terminal != null ){
			
			$scope.truck_id = terminal['truck_id'];;
			$scope.terminal_id = terminal['terminal_id'];
			
			var query = {'truck_id' : {'==' : $scope.truck_id}};
			
			$scope.terminalList = APP.TERMINAL.search( query );
			
		}
	}
	
	// save terminal
	$scope.setTerminal = function(){
		
		var terminal_id = $scope.terminal_id;
		
		APP.setTerminalKey( terminal_id );
		
		// go to select user
		menu.setMainPage('page/select-user.html', {closeMenu: true});
		
		modal.hide();
	};
	
	// form validation
	$scope.validateForm = function(){
		return ( $scope.truck_id > 0 &&  $scope.terminal_id > 0);
	};
	
	$scope.signOut = function(){
		
		ons.notification.confirm({
			  message: 'Do you want to sign out?',
			  title: 'Sign Out Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	APP.signOut();
			    	
			    	menu.setMainPage('page/sign-in.html', {closeMenu: true});
			    	
			    }
			  }
			});	
	};
	
	$scope.close = function(){
		closeApp();
	};
	
});

// user
module.controller('UserController', function($scope) {
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var truck = APP.TRUCK.getById(terminal.truck_id);
	
	$scope.truck = truck;
	$scope.terminal = terminal;
	
	$scope.changeTerminal = function(){
		menu.setMainPage('page/select-terminal.html', {closeMenu: true});
	};
	
	$scope.logIn = function(){
		
		var user_id = $scope.user_id;
		var pin = $scope.pin;
		
		var user = APP.USER.getById( user_id );
		
		if(user == null){
			
			ons.notification.alert({
	  			  message: 'User not found!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    $('#user_id').focus();
	  			  }
	  			});
			
			return;
		}
		else
		{
			if( user['pin'] != pin ){
				
				ons.notification.alert({
		  			  message: 'Invalid PIN!',
		  			  // or messageHTML: '<div>Message in HTML</div>',
		  			  title: 'Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  			    $('#pin').focus();
		  			  }
		  			});
				
				return;
				
			}
			else
			{
				APP.setUserKey( user_id );
				
				initializeShoppingCart();
				initializeBuffer();
				initializeCayan();
				
				// check if till is open or close
				var tills = APP.TILL.search({'closingdate': null});
				
				if(tills.length == 0)
				{
					// go to open till
					menu.setMainPage('page/open-till.html', {closeMenu: true});
				}
				else
				{
					APP.TILL_KEY = tills[0].till_id;
					
					// go to order screen
					menu.setMainPage('page/order-screen.html', {closeMenu: true});
				}
				
				
				modal.hide();
			}
		}
			
		
	};
	
	var userList = APP.USER.getAll();
	$scope.userList = userList;
	
});

module.service('ShoppingCart', function() {
	
	return ShoppingCart;
	
});

module.service('Payments', function() {
	
	var payments = [];
	
	return payments;
});

module.service('OrderScreen', function() {
	
	var screen = this;
	
	screen.reset = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = true;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;	
		screen.shouldShowCustomerForm = false;
	};
		
	screen.viewLineDetails = function( lineId ){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = true;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		
		screen.lineId = lineId;
		
	};	
	
	/* customer related views */
	screen.searchCustomer = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = true;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = false;
		
	};
	
	screen.createCustomer = function(){
		
		var screen = this;
		
		screen.shouldShowProductSelector = false;
		screen.shouldShowLineDetails = false;
		screen.shouldShowSearchCustomer = false;
		screen.shouldShowCustomerDetails = false;
		screen.shouldShowCreateCustomer = false;
		screen.shouldShowOrderActions = false;
		screen.shouldShowCustomerForm = true;
		
	};
	
	screen.viewCustomer = function(){
		
		/*
		 * var screen = this;
		 * 
		 * screen.shouldShowProductSelector = false;
		 * screen.shouldShowLineDetails = false; screen.shouldShowSearchCustomer =
		 * false; screen.shouldShowCustomerDetails = true;
		 * screen.shouldShowCreateCustomer = false;
		 * screen.shouldShowOrderActions = false; screen.shouldShowCustomerForm =
		 * false;
		 */
		
	};
	
	screen.reset();
	
});

// sales
module.controller('OrderScreenController', function($scope, $timeout, ShoppingCart, OrderScreen, Payments) {
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var truck = APP.TRUCK.getById(terminal.truck_id);
	
	$scope.terminalInfo = truck.name + ", " + terminal.name;
	
	// enable menu
   	menu.setSwipeable(true);
   	
   	// last sales info
   	OrderScreen.lastSale = null;
	
	var productList = APP.PRODUCT.getAll();
	var categoryList = APP.PRODUCT_CATEGORY.getAll();
	var modifierList = APP.MODIFIER.getAll();
	
	$scope.productList = productList;
	$scope.categoryList = categoryList;
	$scope.modifierList = modifierList;
	
	$scope.currentcategory = {
		productcategory_id : -1
	};
	
	$scope.setCategory = function( category ){
		$scope.currentcategory = category;			
	};
	
	$scope.addLine = function( product_id, qty){
		
		/* START CAYAN GIFT CARD */
		var product = APP.PRODUCT.getById( product_id );
		var productcategory_id = product['productcategory_id'];
		
		var isGiftCard = ( APP.GIFT_PRODUCT_CATEGORY_ID == productcategory_id );
		
		if( isGiftCard == true ){
			
			var product_name = product['name'];
			
			if( 'Balance Inquiry' == product_name ){
				
				$scope.gift_card_balance_inquiry_dialog.show();
				
			}
			else if ( 'Activate' == product_name ){
				
				$scope.gift_card_activate_dialog.show();
				$scope.gift_card_activate_dialog.product = product;
				
			}
			else if ( 'Add Value' == product_name ){
				
				$scope.gift_card_add_value_dialog.show();
				$scope.gift_card_add_value_dialog.product = product;
				
			}
			
			return;
			
		}
		
		/* END CAYAN GIFT CARD */
		
		
		
		// clear last sales info from cart footer
		OrderScreen.lastSale = null;
		
		var line = ShoppingCart.addLine(product_id, qty);
		$scope.currentLineIndex = line.index;
	};
	
	$scope.addModifier = function( modifier_id ){	
		
		var index = $scope.currentLineIndex;
		
		var modifier = APP.MODIFIER.getById( modifier_id );
		
		if( index == null ) {
			return;
		}
		
		ShoppingCart.addModifier(index, modifier);
		
	};
	
	
	$scope.clearCart = function(){
		
		if( ShoppingCart.getLines().length == 0 ) return;
		
		ons.notification.confirm({
		  message: 'Do you want to clear order?',
		  // or messageHTML: '<div>Message in HTML</div>',
		  title: 'Confirmation',
		  buttonLabels: ['Yes', 'No'],
		  animation: 'default', // or 'none'
		  primaryButtonIndex: 1,
		  cancelable: false,
		  callback: function(index) {
		    // -1: Cancel
		    // 0-: Button index from the left
		    if(index == 0){
		    	
		    	$scope.$apply(function(){
		    		
		    		$scope.reset();
		    		
		    	});
		    	
		    }
		  }
		});		
		
	};
	
	$scope.screen = OrderScreen;	
	
	
	$scope.currentLineIndex = null;
	
	/* use to highlight active line */
	$scope.isLineSelected = function( index ){
		
		if( $scope.currentLineIndex != null && $scope.currentLineIndex == index){
			return "selected";
		}
		
		return "";
	};
	
	/* use to highlight active line */
	$scope.isCategorySelected = function( productcategory_id ){
		
		if( $scope.currentcategory != null && $scope.currentcategory.productcategory_id == productcategory_id){
			return "selected";
		}
		
		return "";
	};
	
	$scope.viewLine = function(index){
		
		var line = ShoppingCart.getLine(index);
		
		var currentLine = angular.copy(line);
		currentLine.selectedModifiers = [];
		
		var modifiers = line.getModifiers();
		for(var i=0; i<modifiers.length; i++){
			currentLine.selectedModifiers.push( modifiers[i].product_id );
		}
		
		currentLine.isModifierPresent = function( modifier_id ){
			
			var index = this.selectedModifiers.indexOf( modifier_id );
			
			return (index >= 0);
		};
		
		$scope.currentLine = currentLine;
		
		$scope.currentLine.selection = "general";
		// hack for switch
		$scope.enableTax = currentLine.enableTax;
		
		$scope.currentLineIndex = index;
		
		// show page
		$scope.screen.viewLineDetails( index );
		$scope.screen.currentLine = currentLine;
	};
	
	$scope.removeLine = function(index){		
		ShoppingCart.removeLine(index);
		
		// check view panel
		if(index == $scope.currentLineIndex){
			
			OrderScreen.shouldShowProductSelector = true;
			OrderScreen.shouldShowLineDetails = false;
			$scope.enableTax = true;
			
		}
	};
	
	$scope.fastCheckout = function(){	
		
		modal.show();
		
		var payments = [{
			type : 'CASH',
			amount : ShoppingCart.grandtotal
		}];
		
		APP.checkout( OrderScreen.customer, ShoppingCart, payments, OrderScreen.order_id, OrderScreen.uuid ).done(function( order ){
			
			var lastSale = {
					type : 'CASH',
					amount : ShoppingCart.grandtotal,
					change : ( ( ShoppingCart.grandtotal < 0 ) ? ( ShoppingCart.grandtotal * -1 ) : 0 )
			};
			
			/*
			CayanCED.endOrder( order.documentno ).always(function(){
				CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
			});
			*/
			
			$scope.$apply(function(){
				$scope.reset();	
				OrderScreen.lastSale = lastSale;
			});
			
			/* START - CAYAN GIFT CARD */
			$scope.processGiftCard( order );
			/* END - CAYAN GIFT CARD */
			
			
			
		}).fail(function(msg){
			
		}).always(function(msg){
			
			modal.hide();		
			
		});		
		
	};
	
	$scope.checkout = function(payments){
		
		modal.show();
				
		APP.checkout( OrderScreen.customer, ShoppingCart, payments, OrderScreen.order_id, OrderScreen.uuid ).done(function( order ){
			
			var lastSale = payments[0];
			
			if(lastSale.type == 'CASH'){
				/*
				CayanCED.endOrder( order.documentno ).always(function(){
					CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
				});
				*/
			}
			
			$scope.$apply(function(){
				$scope.reset();	
				OrderScreen.lastSale = lastSale;
			});	
			
			/* START - CAYAN GIFT CARD */
			$scope.processGiftCard( order );
			/* END - CAYAN GIFT CARD */
			
			setTimeout(function(){
				CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
				modal.hide();	
			}, 5000);
			
		}).fail(function(msg){
			
			modal.hide();	
			
		}).always(function(msg){
			
				
			
		});	
		
	};
	
	/* START - CAYAN GIFT CARD */
	$scope.processGiftCard = function( order ){
		
		var lines = order.lines;
		
		for( var i=0; i<lines.length; i++){
			
			var line = lines[i];
			
			if( !!line.gift ){
				
				var gift = line.gift;
				
				var action = gift.action;
				
				if( action == 'activate' ){
					
					CayanService.giftActivate( order.documentno , gift.cardnumber, gift.amount ).done(function( response ){
						
						modal.show();
						
						ons.notification.alert({
							
			  				title : 'Cayan - Gift Card',
			  				
			  			    'message': 'Gift card was successfully activated',
			  			    
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
						
					}).fail(function( error ){
						
						ons.notification.alert({
							
			  				title : 'Cayan - Gift Card Error',
			  				
			  			    'message': 'Failed to activate gift card! ' + error,
			  			    
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
						
					}).always(function(){
						
						modal.hide();
						
					}); 
					
				}
				else if( action == 'addvalue' ){
					
					CayanService.giftAddValue( order.documentno , gift.cardnumber, gift.amount ).done(function( response ){
						
						modal.show();
						
						ons.notification.alert({
							
			  				title : 'Cayan - Gift Card',
			  				
			  			    'message': 'Gift card balance was successfully updated',
			  			    
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
						
					}).fail(function( error ){
						
						ons.notification.alert({
							
			  				title : 'Cayan - Gift Card Error',
			  				
			  			    'message': 'Failed to update gift card balance! ' + error,
			  			    
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
						
					}).always(function(){
						
						modal.hide();
						
					}); 
					
				}
				
			}
			
		}
	};
	
	/* END - CAYAN GIFT CARD */
	
	$scope.showCheckoutDialog = function(){
		
		$scope.checkout_dialog.show({animation:'slide'});
	};
	
	$scope.showCashDialog = function(){
		
		$scope.checkout_dialog.hide({animation:'slide'});
		
		/* Check for refund */
		if( ShoppingCart.grandtotal < 0 ){
			
			$scope.fastCheckout();
			
			return;
		}
		
		$scope.cash_dialog.show({
			animation:'slide', 
			callback : function(){
				var input = document.getElementById('cash_dialog_amount');
				input.value = null;
				input.focus();
			} 
		});
	};
	
	$scope.showCayanDialog = function(){
		
		$scope.checkout_dialog.hide({animation:'slide'});
		
		/* Check for refund */
		if( ShoppingCart.grandtotal < 0 ){
			
			/* Look for original transaction */
			if( OrderScreen.ref_order_id != null ){
				
				var ref_order = APP.ORDER.getById( OrderScreen.ref_order_id );
				var ref_payment = ref_order.payments[0];
				
				if( ref_payment.Token && ref_payment.Token != null ){
					
					var amount = ShoppingCart.grandtotal * -1;
					var invoice = ref_order.uuid.substring(0,8);
					var token  = ref_payment.Token;
					
					if( amount > ref_payment.amount ){
						
						ons.notification.alert({
							
			  				title : 'Cayan Refund Error',
			  				
			  			    'message': 'Amount refunded cannot be greater than original amount!',
			  			    
			  			    callback: function() {
			  			    }
			  			});
						
											
					}
					else
					{
						modal.show();
						
						CayanService.refundTransaction( token, invoice, amount ).done(function( json ){
							
							json['EntryMode'] = CayanService.POSEntryTypes[ parseInt( json['EntryMode'] ) ];
							json['TransactionType'] = CayanService.TransactionTypes[ parseInt( json['TransactionType'] ) ];
							json['PaymentType'] = CayanService.CardTypes[ parseInt( json['CardType'] ) ]; 
							
							json['amount'] = parseFloat( json['Amount'] );										
							json['type'] = json['PaymentType'];
							
							// set merchant id
							json['MerchantId'] = CayanService.MERCHANT_KEY;
							
							// standardize fields
							json['AmountApproved'] = json['amount'];
							json['AccountNumber'] = ref_payment['AccountNumber'];
							
							$scope.checkout([json]);
														
							
						}).fail(function( error ){
							
							ons.notification.alert({
								
				  				title : 'Cayan Refund Error',
				  				
				  			    'message': error,
				  			    
				  			    callback: function() {
				  			    }
				  			});
							
						}).always(function(){
							
							modal.hide();
							
						});
					}
					
					return;	
					
				}
				else
				{
					ons.notification.alert({
						
		  				title : 'Cayan Refund Error',
		  				
		  			    'message': 'Cannot refund through CAYAN. Original transaction ID not found!',
		  			    
		  			    callback: function() {
		  			    }
		  			});
					
					return;
				}
			}			
			
		}
		
		if( CayanService.MODE == 'HOSTED')
		{
			// using transport web
			$scope.getCayanHostedPayment();
		}
		else
		{
			// using CED
			$scope.cayan_dialog.show({animation:'slide'});
			
			CayanService.isDeviceReady().done(function(status){
				
				$scope.getCayanCEDPayment();
				
			}).fail(function(error){
				
				ons.notification.alert({
					
	  				title : 'Cayan Error',
	  				
	  			    'message': error,
	  			    
	  			    callback: function() {
	  			    	// Do something here.
	  			    	$scope.cayan_dialog.hide({animation:'slide'});	
	  			    }
	  			});
				
			});
		}	
		
	};	
	
	$scope.setHostedPayment = function( json ){
		
		var status = json['Status'];
		
		if(status != 'APPROVED'){
			
			ons.notification.alert({
				
  				title : 'Cayan Error',
  				
  			    'message': status,
  			    
  			    callback: function() {
  			    	// Do something here.
  			    }
  			});
			
		}
		else
		{
			
			json['EntryMode'] = CayanService.POSEntryTypes[ parseInt( json['EntryMode'] ) ];
			json['TransactionType'] = CayanService.TransactionTypes[ parseInt( json['TransactionType'] ) ];
			json['PaymentType'] = CayanService.CardTypes[ parseInt( json['CardType'] ) ]; 
			
			
			json['amount'] = ShoppingCart.grandtotal;		
						
			json['type'] = json['PaymentType'];
			
			// set merchant id
			json['MerchantId'] = CayanService.MERCHANT_KEY;
			
			// standardize fields
			json['AmountApproved'] = json['amount'];
			json['AccountNumber'] = json['CardNumber'];
			json['AuthorizationCode'] = json['AuthCode'];
			
			$scope.checkout([json]);
		}
		
		
	};
	
	$scope.getCayanHostedPayment = function(){
		
		var amount = ShoppingCart.grandtotal;
		var tax = ShoppingCart.taxtotal;
	
		if( OrderScreen.uuid == null ){
			OrderScreen.uuid = APP.UTILS.UUID.getUUID();
		}
		
		var uuid = OrderScreen.uuid;
		var salesRep = APP.USER_KEY;
		
		var transactionType = "SALE";
		
		/*
		 * var ref_order_id = OrderScreen.ref_order_id; var ref_order =
		 * APP.ORDER.getById( ref_order_id );
		 * 
		 * var payment = ref_order.payments[0]; var token = payment.token; var
		 * invoiceNumber = ref_order.uuid.substring(0,8); var overrideAmount =
		 * amount;
		 * 
		 * CayanService.refundTransaction( token, invoiceNumber, overrideAmount
		 * ).done(function( json ){
		 * 
		 * var status = json['Status'];
		 * 
		 * if('APPROVED' == status){ dfd.resolve( json ); } else { dfd.reject(
		 * json ); }
		 * 
		 * }).fail(function(error){
		 * 
		 * dfd.reject( { 'ErrorMessage' : error } );
		 * 
		 * });
		 */
		
		modal.show();
		
		CayanService.stageTransaction(transactionType, uuid, uuid.substring(0,8), salesRep, amount, tax ).done(function(json){
            
            var TransportKey = json['TransportKey'];
            var ValidationKey = json['ValidationKey'];
            
            var url = "https://transport.merchantware.net/v4/transportmobile.aspx?transportKey=" + TransportKey; 
            
            if(isCordovaApp)
            {
            	modal.hide();
            	
            	var browser = window.open(url, '_blank', 'location=no');
                 
                var callbackUrl = CayanService.REDIRECT_LOCATION;
                 
                 browser.addEventListener('loadstart', function(event) {
                 	
                 	var url = event.url;            	
                 	
                 	var index = url.indexOf(callbackUrl);
                 	
                     if ( index >= 0 ) 
                     {     
                     	
                     	browser.close();
                     	
                     	var query = url.substring(url.indexOf('?') + 1);
                        var vars = query.split('&');
                         
                        var name, value;
                        var response = {};
                         
                        for (var i = 0; i < vars.length; i++) 
                        {                    	
                             var pair = vars[i].split('=');
                             
                             name = decodeURIComponent(pair[0]);
                             value = decodeURIComponent(pair[1]);
                             
                             if(name == 'Cardholder'){
                             	value = value.replace(/\+/g, ' ');
                             }
                             
                             response[ name ] = value;
                        }
                        
                        $scope.setHostedPayment( response );
                     	                	
                     }
                     
                   });            	
            }
            else
            {
            	var frame = document.getElementById('cayan-hosted-frame');
                frame.src = url;
                
                $(frame).on("load", function(){
                	modal.hide();
                });
                
                $scope.cayan_hosted_dialog.show({animation:'slide'});
                
                $(window).on('message', function( event ){
                	
                	$scope.cayan_hosted_dialog.hide({animation:'slide'});
                	var response = event.originalEvent.data;
                	console.log( response );
                	$scope.setHostedPayment( response );
                	
                });
            }
		
		}).fail(function(error){
        	
        	if(error == 'error'){
        		error = "Failed to stage transcation.";
        	}
        	
        	ons.notification.alert({
				
  				title : 'Cayan Error',
  				
  			    'message': error,
  			    
  			    callback: function() {
  			    	// Do something here.
  			    }
  			});
            
        });
		
	};
	
	$scope.getCayanCEDPayment = function(){
		
		var amount = ShoppingCart.grandtotal;
		var tax = ShoppingCart.taxtotal;
	
		if( OrderScreen.uuid == null ){
			OrderScreen.uuid = APP.UTILS.UUID.getUUID();
		}
		
		var uuid = OrderScreen.uuid;
		var salesRep = APP.USER_KEY;
		
		
		
		var transactionType = "SALE";
		
		if(amount < 0){
			
			transactionType = "_REFUND";
			
			amount = -amount;
			tax = -tax;
			
			if( !! OrderScreen.ref_uuid ){
				
				$scope.cayan_dialog.hide({animation:'slide'});	
				
				ons.notification.alert({
					
	  				title : 'Cayan Refund Error',
	  				
	  			    'message': 'Original Cayan transation ID not found!',
	  			    
	  			    callback: function() {
	  			    	// Do something here.
	  			    }
	  			});
				
				return;				
			}
			else
			{
				uuid = OrderScreen.ref_uuid;
			}
			
		}	
		
		var dfd = new jQuery.Deferred();

		/* Process sale transaction */
		CayanService.stageTransaction(transactionType, uuid, uuid.substring(0,8), salesRep, amount, tax ).done(function(json){
            
            var TransportKey = json['TransportKey'];
            var ValidationKey = json['ValidationKey'];
            
            CayanService.initiateTransaction( TransportKey, ValidationKey ).done(function(json){
                
            	var status = json['Status'];
            	json['TransactionType'] = transactionType;
            	
            	if('APPROVED' == status){
            		dfd.resolve( json );
            	}
            	else
            	{
            		dfd.reject( json );
            	}    
            	
            	console.log('CayanService.initiateTransaction response');
            	console.log(json);
                
            }).fail(function(error){
            	
            	if(error == 'error'){
            		error = "Failed to initiate transcation.";
            	}
                
            	dfd.reject( { 'ErrorMessage' : error } );
                
                });
        }).fail(function(error){
        	
        	if(error == 'error'){
        		error = "Failed to stage transcation.";
        	}
            
        	dfd.reject( { 'ErrorMessage' : error } );
            
        });			
		
		
		var p = dfd.promise();
		
		p.done(function(json){
			
			var AmountApproved = json['AmountApproved'];
			// parse value
			AmountApproved = parseFloat( AmountApproved );
			
			json['amount'] = AmountApproved;
			json['type'] = json['PaymentType'];	
			
			var errorMessage = json['ErrorMessage'];
			
			
			if( 'APPROVED_No_Signature' == errorMessage ){
				
				// need to void payment
				var token = json['Token'];
				
				CayanService.voidTransaction( token ).done(function( json ){
					
				}).fail(function(e){
					
					ons.notification.alert({
						
		  				title : 'Cayan Error',
		  				
		  			    'message': 'Failed to void cancelled payment! ' + e,
		  			    
		  			    callback: function() {
		  			    	// Do something here.
		  			    }
		  			});
					
				}).always(function(){
					
					$scope.cayan_dialog.hide({animation:'slide'});	
					
				});
				
			}
			else if( AmountApproved <  amount ){
				
				// need to void payment
				var token = json['Token'];
				
				CayanService.voidTransaction( token ).done(function( json ){
					
					$scope.cayan_dialog.hide({animation:'slide'});	
					
					ons.notification.alert({
						
		  				title : 'Cayan Error',
		  				
		  			    'message': 'The card has insufficient funds to cover the cost of the transaction.',
		  			    
		  			    callback: function() {
		  			    	// Do something here.
		  			    }
		  			});
					
				}).fail(function(e){
					
					ons.notification.alert({
						
		  				title : 'Cayan Error',
		  				
		  			    'message': 'Failed to void partial payment! ' + e,
		  			    
		  			    callback: function() {
		  			    	// Do something here.
		  			    }
		  			});
					
				}).always(function(){
					
					$scope.cayan_dialog.hide({animation:'slide'});	
					
				});
				
			}
			else
			{
				$scope.cayan_dialog.hide({animation:'slide'});	
				
				// set merchant id
				json['MerchantId'] = CayanService.MERCHANT_KEY;
				
				$scope.checkout([json]);
			}
			
			
			
		}).fail(function(json){
			
			$scope.cayan_dialog.hide({animation:'slide'});	
			
			var message = json['ErrorMessage'];
			if(message.length == 0){
				message = json['Status'];
			}
			
			// EMV declined payment receipt
			if( json.AdditionalParameters && json.AdditionalParameters.EMV ){
				
				// set merchant id
				json['MerchantId'] = CayanService.MERCHANT_KEY;
				json['amount'] = amount;
				
				APP.printDeclineEMV( json );
			}
			
			ons.notification.alert({
				
  				title : 'Cayan Error',
  				
  			    'message': message,
  			    
  			    callback: function() {
  			    	// Do something here.
  			    }
  			});
			
		}).always(function(){
			
			
			
		});
		
	};
	
	$scope.reset = function(){
		
		//CayanCED.startOrder( APP.UTILS.ORDER.getDocumentNo() );
		
		ShoppingCart.clear();	
		OrderScreen.reset();
		
		OrderScreen.order_id = null;
		OrderScreen.uuid = null;
		OrderScreen.customer = null;
		OrderScreen.ref_uuid = null;
		OrderScreen.ref_order_id = null;
		
		$scope.currentLineIndex = null;
		
	};	
	
	
	$scope.searchCustomer = function(){
		$scope.shouldShowProductSelector = false;
		$scope.shouldShowSearchCustomer = true;
	};
		
		
	$scope.cart = ShoppingCart;
	
	/*
	 * $scope.cart.onUpdate(function(){ });
	 */
	
	// order screen more popover
	$scope.showMorePopUp = function (){
		
		var targetElement = document.getElementById('order-screen-more-button');
		$scope.more_popover.show(targetElement);
		
	};
	
	$scope.showAddNoteDialog = function ( shouldHoldOrder ){
		
		$scope.shouldHoldOrder =  shouldHoldOrder;
		
		var textarea = document.getElementById('add-note-textarea');
		textarea.value = $scope.cart.note;
		
		$scope.add_note_dialog.show();
		
	};
	
	$scope.updateNote = function ( note ) {
		$scope.cart.note = note;		
	};
	
	
	$scope.holdOrder = function(){
		
		console.log('holdOrder');	
		
		modal.show();
		
		APP.holdOrder(OrderScreen.customer, ShoppingCart, OrderScreen.order_id, OrderScreen.uuid ).done(function(msg){
			
			$scope.$apply(function(){
				$scope.reset();
			});
			
		}).fail(function(msg){
			
		}).always(function(msg){
			
			modal.hide();		
			
		});		
	};
	
	$scope.showOrderHistory = function(){
		console.log('showOrderHistory');
	};
	
	ons.ready(function() {
		
		ons.createDialog('page/checkout-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.checkout_dialog = dialog;
	    });
		
		ons.createDialog('page/cayan-hosted-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.cayan_hosted_dialog = dialog;
	    });
		
		ons.createDialog('page/cash-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.cash_dialog = dialog;
		      
		      $scope.cash_dialog_validate = function(){
		    	  
		    	  var textfield = document.getElementById('cash_dialog_amount');
		    	  
		    	  if(textfield.value == ''){
		    		  
		    		  /*
						 * ons.notification.alert({ title : 'Error', message:
						 * 'Invalid amount', callback: function() { // Do
						 * something here. textfield.focus(); } });
						 */
		    		  
		    		  $scope.cash_dialog_error = true;
			    	  $scope.cash_dialog_error_message = 'Invalid amount';
		    		  
		    		  return;
		    	  }
		    	  
		    	  var cart = $scope.cart;
		    	  
		    	  var amountEntered = parseFloat(textfield.value);
		    	  
		    	  if(cart.grandtotal > amountEntered){
		    		
		    		  $scope.cash_dialog_error = true;
			    	  $scope.cash_dialog_error_message = 'Amount tendered cannot be less that ' + new Number(cart.grandtotal).toFixed(2);
		    		  
		    		return;
		    		  
		    	  }
		    	  
		    	  $scope.cash_dialog.hide({animation:'slide'});		    	  
		    	  $scope.cash_dialog_amount = null;
		    	  $scope.cash_dialog_error = false;
		    	  $scope.cash_dialog_error_message = null;
		    	  
		    	  $scope.checkout([{
		    		  amount : cart.grandtotal,
		    		  type : 'CASH',
		    		  tendered : amountEntered,
		    		  change : parseFloat( new Number(amountEntered - cart.grandtotal).toFixed(2) )
		    	  }]);
		    	  
		      };
	    });
		
		ons.createDialog('page/cayan-dialog.html', {parentScope: $scope}).then(function(dialog) {
			
		      $scope.cayan_dialog = dialog;	
		      
		      $scope.cancelCayan = function(){
		    	  
		    	  CayanService.cancelTransaction().done(function(json){
		    		  
		    		  console.log('CayanService.cancelTransaction response');
	    			  console.log(json);
		    		  
		    		  var status = json['Status'];
		    		  
		    		  if( 'Cancelled' == status ){
		    			  
		    			  $scope.cayan_dialog.hide();
		    			  
		    			  return;
		    		  }
		    		  
		    		  if( 'Denied' == status || 'Error' == status ){
		    			  
		    			  var responseMessage = json['ResponseMessage'];
		    			  
		    			  ons.notification.alert({
		    				  'title' : 'Error',
				  			  'message': responseMessage,
				  			  callback: function() {
				  			    // Do something here.
				  			  }
		    			  });
		    			  
		    			  return;
		    		  }	
		    		  
		    		  if( 'TransactionApproved_NoSignatureCollected' == status ){
		    			  
		    			  $scope.cayan_dialog.hide();
		    			  
		    			  ons.notification.alert({
		    				  'title' : 'Error',
				  			  'message': 'Current transaction was cancelled!',
				  			  callback: function() {
				  			    // Do something here.
				  			  }
		    			  });
		    			  
		    			  return;
		    		  }
		    		 
		    		  
		    		  if( 'APPROVED' == status){		    			  
		    			  
		    			  var token = json['Token'];
		    			  
		    			  CayanService.voidTransaction( token ).done(function(json){
		    					
		    					var status = json['ApprovalStatus'];
		    					
		    					if(status == 'APPROVED'){
		    						
		    						$scope.cayan_dialog.hide();
		    					}
		    					else
		    					{
		    						$scope.cayan_dialog.hide();
		    						
		    						ons.notification.alert({
		    			  				'title' : 'Error',
		    			  			    'message': 'Void Cayan Payment Error - ' + status,
		    			  			    callback: function() {
		    			  			    	// Do something here.
		    			  			    }
		    			  			});
		    					}
		    					
		    				}).fail(function(err){
		    					
		    					$scope.cayan_dialog.hide();
		    					
		    					ons.notification.alert({
	    			  				'title' : 'Error',
	    			  			    'message': 'Void Cayan Payment Error - ' + err,
	    			  			    callback: function() {
	    			  			    	// Do something here.
	    			  			    }
	    			  			});
		    					
		    				});
		    			  
		    		  }		
		    		  
		    	  }).fail(function(error){
		    		  
		    		  	ons.notification.alert({
			  				'title' : 'Error',
			  			    'message': error,
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
		    		  
		    	  });		    	  
		    	  
		      };
		      
	    });
		
	    ons.createPopover('page/order-screen-popover.html', {parentScope: $scope}).then(function(popover) {
	      $scope.more_popover = popover;	      
	      
	      $scope.cancelMore = function(){
	    	  $scope.more_popover.hide();
	      };
	    });
	    
	    
	    ons.createDialog('page/add-note-dialog.html', {parentScope: $scope}).then(function(dialog) {
		      $scope.add_note_dialog = dialog;
		      
		      $scope.saveNote = function(){
		    	  var note = document.getElementById('add-note-textarea').value;
		    	  
		    	  $scope.updateNote( note );
		    	  
		    	  $scope.add_note_dialog.hide();
		      };
		      
		      $scope.saveNoteAndHoldOrder = function(){
		    	  var note = document.getElementById('add-note-textarea').value;
		    	  
		    	  $scope.saveNote( note );
		    	  
		    	  $scope.holdOrder();
		    	  
		    	  $scope.add_note_dialog.hide();
		      };
		      
		      $scope.cancelNote = function(){	
		    	  $scope.note = null;
		    	  $scope.add_note_dialog.hide();
		      };
		});
	    
	    
	    /* START - CAYAN GIFT CARD */
	    
	    ons.createDialog('page/gift-card/activate-dialog.html', {parentScope: $scope}).then(function(dialog) {
	    	
		      $scope.gift_card_activate_dialog = dialog;
		      
		      dialog.on('posthide', function(event){
		    	  
		    	  document.getElementById('gift_card_activate_number').value = '';
		    	  document.getElementById('gift_card_activate_value').value = '';
		      });
		      
		      $scope.activateGiftCard = function( cardnumber , amount ){
		    	  
		    	  var ordernumber = APP.UTILS.ORDER.getDocumentNo();
		    	  
		    	  modal.show();
		    	  
		    	  CayanService.giftBalanceInquiry( ordernumber, cardnumber ).done(function( response ){
		    		  
		    		  if( response['ApprovalStatus'] == 'APPROVED'){
		    			  
		    			  ons.notification.alert({
				  				'title' : 'Gift Card - Error',
				  			    'message': 'INVALID CARD NUMBER! Card already activated.',
				  			    callback: function() {
				  			    	// Do something here.
				  			    }
				  			});
		    			  
		    		  }
		    		  else if( response['ApprovalStatus'] == 'DECLINED' && response['ResponseMessage'] == 'CARD NOT ISSUED' )
		    		  {
		    			  var product = $scope.gift_card_activate_dialog.product;		    			  
		    			  
		    			  $scope.$apply(function(){
		    				  
		    				  var product_id = product['product_id']; 
			    			  
			    			  var line = ShoppingCart.addLine( product_id, 1 );
			    			  var index = line.index;
			    			  
			    			  line.gift = {
			    					  action : 'activate',
			    					  cardnumber : document.getElementById('gift_card_activate_number').value,
			    					  amount : document.getElementById('gift_card_activate_value').value
			    			  };
			    			  
			    			  ShoppingCart.updatePrice( index, amount );
			    			  
			    			  $scope.currentLineIndex = index;
			    			  OrderScreen.lastSale = null;
		    				  
		    			  });
		    		  }
		    		  else
		    		  {
		    			  var error = response['ResponseMessage'];
		    			  
		    			  ons.notification.alert({
				  				'title' : 'Gift Card - Error',
				  			    'message': error,
				  			    callback: function() {
				  			    	// Do something here.
				  			    }
				  			});
		    		  }
		    		  
		    	  }).fail(function( error ){
		    		  
		    		  ons.notification.alert({
			  				'title' : 'Gift Card - Error',
			  			    'message': error,
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
		    		  
		    	  }).always(function(){
		    		  
		    		  $scope.gift_card_activate_dialog.hide();
		    		  modal.hide();
		    		  
		    	  });	    	  
		    	  
		      };
	    });
	    
	    ons.createDialog('page/gift-card/add-value-dialog.html', {parentScope: $scope}).then(function(dialog) {
	    	
		      $scope.gift_card_add_value_dialog = dialog;
		      
		      dialog.on('posthide', function(event){
		    	  
		    	  document.getElementById('gift_card_add_value_number').value = '';
		    	  document.getElementById('gift_card_add_value_value').value = '';
		      });
		      
		      $scope.addValueGiftCard = function( cardnumber, amount ){
		    	  
		    	  var ordernumber = APP.UTILS.ORDER.getDocumentNo();
		    	  
		    	  modal.show();
		    	  
		    	  CayanService.giftBalanceInquiry( ordernumber, cardnumber ).done(function( response ){
		    		  		    		  
		    		  if( response['ApprovalStatus'] == 'APPROVED'){
		    			  
		    			  var product = $scope.gift_card_add_value_dialog.product;		    			  
		    			  
		    			  $scope.$apply(function(){
		    				  
		    				  var product_id = product['product_id']; 
			    			  
			    			  var line = ShoppingCart.addLine( product_id, 1 );
			    			  var index = line.index;
			    			  
			    			  line.gift = {
			    					  action : 'addvalue',
			    					  cardnumber : document.getElementById('gift_card_add_value_number').value,
			    					  amount : document.getElementById('gift_card_add_value_value').value
			    			  };
			    			  
			    			  ShoppingCart.updatePrice( index, amount );
			    			  
			    			  $scope.currentLineIndex = index;
			    			  OrderScreen.lastSale = null;
		    				  
		    			  });
		    			  
		    		  }
		    		  else
		    		  {
		    			  var error = response['ResponseMessage'];
		    			  
		    			  ons.notification.alert({
				  				'title' : 'Gift Card - Error',
				  			    'message': error,
				  			    callback: function() {
				  			    	// Do something here.
				  			    }
				  			});
		    		  }
		    		  
		    	  }).fail(function( error ){
		    		  
		    		  ons.notification.alert({
			  				'title' : 'Gift Card - Error',
			  			    'message': error,
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
		    		  
		    	  }).always(function(){
		    		  
		    		  $scope.gift_card_add_value_dialog.hide();
		    		  modal.hide();
		    		  
		    	  });
		    	  
		      };		      
		      
	    });
	    
	    ons.createDialog('page/gift-card/balance-inquiry-dialog.html', {parentScope: $scope}).then(function(dialog) {
	    	
		      $scope.gift_card_balance_inquiry_dialog = dialog;
		      
		      dialog.on('posthide', function(event){
		    	  document.getElementById('gift_card_balance_inquiry_number').value = '';
		      });
		      
		      $scope.balanceInquiryGiftCard = function( cardnumber ){
		    	  
		    	  modal.show();
		    	  
		    	  $scope.gift_card_balance_inquiry_dialog.hide();
		    	  
		    	  var ordernumber = APP.UTILS.ORDER.getDocumentNo();
		    	  
		    	  CayanService.giftBalanceInquiry( ordernumber, cardnumber ).done(function( response ){
		    		  
		    		  if( response.ApprovalStatus == 'APPROVED' ){
		    			  
		    			  $scope.$apply(function(){
		    				  
		    				  $scope.gift_card_info = response;			    		  
				    		  $scope.gift_card_balance_dialog.show();
				    		  
		    			  });
		    			  
		    		  }
		    		  else
		    		  {
		    			  var error = response.ResponseMessage;
		    			  
		    			  ons.notification.alert({
				  				'title' : 'Gift Card - Error',
				  			    'message': error,
				  			    callback: function() {
				  			    	// Do something here.
				  			    }
				  			});
		    		  }
		    		  
		    		 
		    		  
		    	  }).fail(function( error ){
		    		  
		    		  ons.notification.alert({
			  				'title' : 'Gift Card - Error',
			  			    'message': error,
			  			    callback: function() {
			  			    	// Do something here.
			  			    }
			  			});
		    		  
		    	  }).always(function(){
		    		  
		    		  $scope.gift_card_balance_inquiry_dialog.hide();
		    		  jQuery('#gift_card_balance_inquiry_number').val('');
		    		  
		    		  modal.hide();
		    		  
		    	  });	    	  
		    	  
		      };
	    });
	    
	    ons.createDialog('page/gift-card/balance-dialog.html', {parentScope: $scope}).then(function(dialog) {
	    	
		      $scope.gift_card_balance_dialog = dialog;
	    });
	    
	    /* END - CAYAN GIFT CARD */
	    
	});
	
	
	// event - from CreateCustomerController
	$scope.$on("CUSTOMER_UPDATED", function(event, customer){
		
		$scope.$broadcast("UPDATE_CUSTOMER_LIST", {});
		
	});
});

// shopping cart
module.controller('ShoppingCartController', function($scope) {});

// search customer
module.controller('SearchCustomerController', function($scope, OrderScreen) {
	
	// event - from OrderScreenController
	$scope.$on('UPDATE_CUSTOMER_LIST', function(event, data){
		
		console.log("refreshing customer list ..");
		
		$scope.getCustomerList();
		
	});
	
	$scope.getCustomerList = function(){
		var customerList = APP.CUSTOMER.getAll();
		this.customerList = customerList;
	};
	
	$scope.getCustomerList();
	
	$scope.setCustomer = function(customer){
		var customer_id = customer.customer_id;
		
		OrderScreen.customer = APP.CUSTOMER.getById( customer_id );
		
		back();
	};
	
	var back = function(){
		
		OrderScreen.shouldShowProductSelector = true;
		OrderScreen.shouldShowSearchCustomer = false;
		
		$scope.searchText = ''; /* clear search box */
		
	};
	
	var clear = function(){
		
		OrderScreen.customer = null;
		
		back();
		
	};
	
	$scope.back = back;
	$scope.clear = clear;
	
});

// create or edit customer
module.controller('CustomerFormController', function($scope, OrderScreen, APP) {
	
	$scope.back = function(){
		
		$scope.reset();
		OrderScreen.reset();		
	};
	
	$scope.reset = function(){	
		
		$scope.name = null;
		$scope.email = null;
		$scope.phone = null;
		
		$scope.ccform.$pristine = true;
		$scope.ccform.$dirty = false;
		
	};
	
	$scope.save = function(){
		
		if($scope.ccform.name.$error.required){
			
			ons.notification.alert({
				title : 'Error',
			    message: 'Name is required!',
			    callback: function() {
			    	// Do something here.
			    }
			});
			
			return;
		}
		
		if($scope.ccform.email.$error.email){
			
			ons.notification.alert({
				title : 'Error',
			    message: 'Please enter a valid e-mail.',
			    callback: function() {
			    	// Do something here.
			    }
			});
			
			return;
		}
		
		var customer = {
				name : $scope.name,
				email : $scope.email,
				phone : $scope.phone,
				customer_id : 0
		};
		
		APP.CUSTOMER.saveCustomer( customer ).done(function( msg ){
			
			console.log( msg );
			
			$scope.$apply(function(){
				OrderScreen.customer = customer;			
				$scope.$emit("CUSTOMER_UPDATED", customer);			
				$scope.back();
			});
			
			
		}).fail(function(e){
						
			ons.notification.alert({
				  message: e,
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				  }
				});
			
		});		
		
	};
	
});

// customer details
module.controller('CustomerDetailsController', function($scope, OrderScreen) {
	
});


module.controller('LineDetailsController', function($scope, ShoppingCart, OrderScreen) {	
	
	$scope.applyChanges = function( index, price, qty, enableTax, note){
		
		var modifierChks = jQuery(".modifier-checkbox");
		var modifiers = [];
		var chk;
		var modifier_id;
		var modifier;
		
		for(var i=0; i<modifierChks.length; i++){
			
			chk = modifierChks[i];
			chk = jQuery(chk);
			
			if(chk.is(':checked')){
				
				modifier_id = chk.val();
				
				modifier = APP.MODIFIER.getById( modifier_id );
				
				modifiers.push( modifier );
			}
		}
		
		ShoppingCart.updateLine( index, price, qty , note, modifiers, enableTax);
		
		$scope.back();
	};
	
	$scope.back = function(){
		OrderScreen.shouldShowProductSelector = true;
		OrderScreen.shouldShowLineDetails = false;
		$scope.enableTax = true;
	};
	
	$scope.remove = function( index ){
		
		ShoppingCart.removeLine( index );
		
		$scope.back();
	};
	
	$scope.adjustPrice = function( price ){		
		
		$scope.adjust_price_dialog.hide();
		
		var unitPrice = price / $scope.currentLine.qty;
		
		$scope.currentLine.price = new Number( unitPrice ).toFixed(2);
		
	};
	
	$scope.showAdjustPriceDialog = function( lineTotal ){
		
		$scope.adjust_price_dialog.show({
			
			animation:'slide', 
			callback : function(){
				var input = document.getElementById('adjust_price_dialog_amount');
				input.value = parseFloat(new Number( lineTotal ).toFixed(2));
				input.focus();
			} 
		});
	};
	
	$scope.enableTax = true;
	
	ons.ready(function() {
		
		ons.createDialog('page/adjust-price-dialog.html', {parentScope: $scope}).then(function(dialog) {
			
	      	$scope.adjust_price_dialog = dialog;
	      
	    });
		
	});
	
});


// till
module.controller('TillController', function($scope, APP) {
	
	var terminal = APP.TERMINAL.getById(APP.TERMINAL_KEY);
	var truck = APP.TRUCK.getById(terminal.truck_id);
	
	$scope.terminalInfo = truck.name + ", " + terminal.name;
	
	initializeGooglePlaceSearch( $scope );
	
	var till_id = APP.TILL_KEY;
	var till = APP.TILL.getById( till_id );
	
	$scope.till = till;
	
	if(till != null){
		var openby_id  = till['openby'];
		var openby = APP.USER.getById( openby_id );

		$scope.openby = openby;
		$scope.today = new Date();
	}
	else
	{
		// update location
		var terminal_id = APP.TERMINAL_KEY;
		var terminal = APP.TERMINAL.getById(terminal_id);
		
		var truck_id = terminal['truck_id'];		
		var truck = APP.TRUCK.getById( truck_id );
		
		$scope.location = truck['address'];
	}
	
	$scope.adjustTill = function (paytype, amount, reason) {
		
		if(reason == null){
			ons.notification.alert({
				  message: 'Please enter a reason',
				  // or messageHTML: '<div>Message in HTML</div>',
				  title: 'Error',
				  buttonLabel: 'OK',
				  animation: 'default', // or 'none'
				  // modifier: 'optional-modifier'
				  callback: function() {
				    // Alert button is closed!
				   	
				  }
				});
			
			return;
		}
		
		var till_id = APP.TILL_KEY;
		
		var till = APP.TILL.getById( till_id );
		
		if( till == null ){
			
			ons.notification.alert({
	  			  message: 'Failed to adjust till! Could not load till.',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   	
	  			  }
	  			});
			
			return;			
		}
		
		var adjustments = till.adjustments || [];
				
		var adjustment = {
				'datepaid' : new Date().getTime(),
				'user_id' : APP.USER_KEY,
				'paytype' : paytype,
				'reason' : reason,
				'amount' : amount
		};
		
		adjustments.push( adjustment );
		
		till.adjustments = adjustments;
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			// todo push sales
			// synchronize();
			
			ons.notification.alert({
	  			  message: 'Till successfully adjusted!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  				menu.setMainPage('page/till.html', {closeMenu: true});
	  			  }
	  		});// alert
			
		})
		.fail(function(error){
			console.error('Failed to adjust till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to adjust til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
		
	};
		
	$scope.openTill = function (openingamt) {
		
		var terminal_id = APP.TERMINAL_KEY;
		var terminal = APP.TERMINAL.getById(terminal_id);
		var terminal_name = terminal['name'];
		
		var truck_id = 0;
		var truck_name = null;
		
		truck_id = terminal['truck_id'];
		var truck = APP.TRUCK.getById(truck_id);
		truck_name = truck['name'];
		
		var account_id = 0;
		account_id = terminal['account_id']; 
		
		var openby_id = APP.USER_KEY;
		var openby_user = APP.USER.getById( openby_id );
		var openby_name = openby_user['username'];
		
		var date = moment();	
		var openingdate = date.valueOf();
		var openingdatetext = date.format('DD-MM-YYYY HH:mm:ss');
		var openingdatefull = date.format('MMM Do YYYY, HH:mm');
		
		var till = {
				'account_id' : account_id,
				'truck_id' : truck_id,
				'truck_name' : truck_name,
				'terminal_id' : terminal_id,
				'terminal_name' : terminal_name,
				'uuid' : APP.UTILS.UUID.getUUID(),
				'openingdate' : openingdate,
				'openingdatetext' : openingdatetext,
				'openingdatefull' : openingdatefull,
				'openby' : openby_id,
				'openby_name' : openby_name,
				'closingdate' : null,
				'closeby' : null,
				'openingamt' : openingamt,
				'closingamt' : 0,	
				'shift': $scope.shift,
				'isspecialevent': $scope.isSpecialEvent == undefined ? false : $scope.isSpecialEvent,
				'eventname': $scope.eventName == undefined ? null : $scope.eventName,
				'location': $scope.location == undefined ? null : $scope.location,
				'weather': $scope.weather == undefined ? null : $scope.weather,
				'temperature': $scope.temperature == undefined ? null : $scope.temperature,
				'message': $scope.message == undefined ? null : $scope.message,
				'issync' : 'N',
				'adjustments' : []
		};
		
		var message = till['message'];
		if(message != null && message.length > 0){
			
			// post message to social media
			if( BufferService.isConfigured == true ){
				
				BufferService.updateStatus(BufferService.profile_ids, message, true).done( function ( response ){
					
					console.log( response );
					
				}).fail( function ( error ){
					
					console.log( error );
					
				});
				
			}			
		}
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			var till_id = record.till_id;
			APP.TILL_KEY = till_id;
			
			menu.setSwipeable(true);
			menu.setMainPage('page/order-screen.html', {closeMenu: true});
			
		})
		.fail(function(error){
			console.error('Failed to open till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to open til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
		
	};
	
	$scope.showCloseTillError = false;
	$scope.closeTillErrorMessage = "";
	
	$scope.closeTill = function (closingamt) {
		
		var till_id = APP.TILL_KEY;
		
		var till = APP.TILL.getById( till_id );
		
		if( till == null ){
			
			ons.notification.alert({
	  			  message: 'Failed to close till! Could not load till.',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   	
	  			  }
	  			});
			
			return;			
		}
		
		// close till
		
		// get orders
		var orders = APP.ORDER.search({
			'till_id' : till_id, 
			'status' : 'CO'
		});
		
		var cashtotal = 0;
		
		var subtotal = 0;
		var taxtotal = 0;
		var discounttotal = 0;
		var grandtotal = 0;
		var nooforders = orders.length;
		
		for(var i=0; i<orders.length; i++)
		{
			if( 'CASH' == orders[i].paymenttype ){
				
				cashtotal = cashtotal + orders[i].grandtotal;
			}
			
			subtotal = subtotal + orders[i].subtotal;
			taxtotal = taxtotal + orders[i].taxtotal;
			discounttotal = discounttotal + orders[i].discountamt;
			grandtotal = grandtotal + orders[i].grandtotal;
		}
		
		// get adjustments
		var adjustmenttotal = 0;
		
		var adjustments = till.adjustments || [];
		var adjustment;
		
		for(var i=0; i<adjustments.length; i++)
		{
			adjustment = adjustments[i];
			
			if(adjustment.paytype == 'payin')
			{
				adjustmenttotal = adjustmenttotal + adjustment.amount;
			}
			else
			{
				adjustmenttotal = adjustmenttotal - adjustment.amount;
			}
		}
		
		var expectedamt = till.openingamt + cashtotal + adjustmenttotal;
		expectedamt = new Number(expectedamt).toFixed(2);
		expectedamt = parseFloat(expectedamt);		
		
		/*
		 * if( expectedamt != closingamt ) { $scope.showCloseTillError = true;
		 * $scope.expectedAmt = expectedamt;
		 * 
		 * return; }
		 */
		
		var date = moment();	
		var closingdate = date.valueOf();
		var closingdatetext = date.format('DD-MM-YYYY HH:mm:ss');
		var closingdatefull = date.format('MMM Do YYYY, HH:mm');
		
		var closeby_id = APP.USER_KEY;
		var closeby_user = APP.USER.getById( closeby_id );
		var closeby_name = closeby_user[ 'username' ];
		
		till.closeby = closeby_id;
		till.closeby_name = closeby_name;
		till.closingdate = closingdate;
		till.closingdatetext = closingdatetext;
		till.closingdatefull = closingdatefull;
		
		till.closingamt = closingamt;
		
		// other amounts
		till.cashamt = cashtotal;		
		till.adjustmenttotal = adjustmenttotal;
		
		till.subtotal = subtotal;
		till.taxtotal = taxtotal;
		till.discounttotal = discounttotal;
		till.grandtotal = grandtotal;
		
		till.nooforders = nooforders;
		
		APP.TILL.saveTill( till ).done(function(record, msg){
			console.log( msg );
			
			// todo push sales
			// synchronize();
			
			if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
				// print receipt
				
				APP.printTill( record ).done(function(msg){
					
					
					
				}).fail(function(error){			
					APP.showError(error, 'Printer Error');
					/* dfd.reject(error); */
					
				});
			}
			
			ons.notification.alert({
	  			  message: 'Till successfully closed!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  				
	  				modal.show();
	  				
	  				APP.pushData().done(function(){
	  					
	  					ons.notification.alert({
	  					  message: 'Synchronization completed!',
	  					  // or messageHTML: '<div>Message in HTML</div>',
	  					  title: 'Information',
	  					  buttonLabel: 'OK',
	  					  animation: 'default', // or 'none'
	  					  // modifier: 'optional-modifier'
	  					  callback: function() {
	  					    // Alert button is closed!
	  						menu.setSwipeable(false);
			  				menu.setMainPage('page/open-till.html', {closeMenu: true});
	  					  }
	  					});
	  					
	  				}).fail(function(){
	  					
	  					ons.notification.alert({
		  					  message: 'Failed to synchronize till and orders!',
		  					  // or messageHTML: '<div>Message in HTML</div>',
		  					  title: 'Error',
		  					  buttonLabel: 'OK',
		  					  animation: 'default', // or 'none'
		  					  // modifier: 'optional-modifier'
		  					  callback: function() {
		  					    // Alert button is closed!
		  						menu.setSwipeable(false);
				  				menu.setMainPage('page/open-till.html', {closeMenu: true});
		  					  }
		  					});
	  					
	  				}).always(function(){
	  					modal.hide();
	  				});
	  				
	  			  }
	  			});
			
		})
		.fail(function(error){
			console.error('Failed to close till. ' + error);
			
			ons.notification.alert({
	  			  message: 'Failed to close til!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			   
	  			  }
	  			});
		});
	};
	
	
	$scope.goToCloseTillPage = function(){
		menu.setMainPage('page/close-till.html', {closeMenu: true, callback:function(){
			
			document.getElementById('close-till-amount').focus();
			
		}});
	};
	
});

// Printing
module.controller('PrinterSettingsController', function($scope, OrderScreen, APP) {
	
	$scope.settings = APP.PRINTER_SETTINGS.getSettings();
	
	$scope.save = function(){
		if(this.validate()){
			
			APP.PRINTER_SETTINGS.saveSettings( $scope.settings );
			
			ons.notification.alert({
	  			  message: 'Printer settings successfully saved.',
	  			  title: 'Information',
	  			  callback: function() {
	  			    // Alert button is closed!
	  				// menu.setMainPage('page/order-screen.html', {closeMenu:
					// true});
	  			  }
	  			});
		}
		
	};
	
	$scope.test = function(){	
		if(this.validate()){
			
			modal.show();
			
			APP.PRINTER_SETTINGS.testSettings( $scope.settings ).done(function(){
				
			}).fail(function(){
				
				ons.notification.alert({
		  			  message: 'Failed to test printer.',
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				// menu.setMainPage('page/order-screen.html',
						// {closeMenu: true});
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});			
		}
	};
	
	$scope.validate = function(){
		if(!this.settings.enablePrinter){
			return true;
		}
		
		// validate printer type
		if(this.form.printerType.$error.required){
			
			ons.notification.alert({
	  			  message: 'Choose a printer type.',
	  			  title: 'Error',
	  			  callback: function() {
	  			    // Alert button is closed!
	  			  }
	  			});
			
			return false;
		}
		
		// validate ip address
		if(this.form.ipAddress.$error.pattern || this.form.ipAddress.$error.required){
			
			ons.notification.alert({
	  			  message: 'Please enter a valid ip address.',
	  			  title: 'Error',
	  			  callback: function() {
	  			    // Alert button is closed!
	  				document.getElementById('printer-ip-address-text').select();
	  			  }
	  			});
			
			return false;
		}
		
		return true;
	};
});

// Cayan Settings
module.controller('CayanSettingsController', function($scope, OrderScreen, APP) {
	
	$scope.settings = APP.CAYAN_SETTINGS.getSettings();
	
	// set default mode
	$scope.settings.mode = $scope.settings.mode || 'HOSTED';
	
	$scope.merchantName = CayanService.MERCHANT_NAME;
	$scope.siteId = CayanService.SITE_ID;
	$scope.terminalId = CayanService.TERMINAL_ID;
	
	$scope.save = function(){
		if(this.validate()){
			
			APP.CAYAN_SETTINGS.saveSettings( $scope.settings );
			
			CayanService.init();
			
			ons.notification.alert({
	  			  message: 'Cayan settings successfully saved.',
	  			  title: 'Information',
	  			  callback: function() {
	  			    // Alert button is closed!
	  				// menu.setMainPage('page/order-screen.html', {closeMenu:
					// true});
	  			  }
	  			});
		}
		
	};
	
	$scope.test = function(){	
		if(this.validate()){
			
			modal.show();
			
			APP.CAYAN_SETTINGS.testSettings( $scope.settings ).done(function( msg ){
				
				ons.notification.alert({
		  			  message: 'Successfully connected.',
		  			  title: 'Information',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				// menu.setMainPage('page/order-screen.html',
						// {closeMenu: true});
		  			  }
		  			});
				
			}).fail(function(e){
				
				ons.notification.alert({
		  			  message: 'Failed to test Cayan. ' + e,
		  			  title: 'Error',
		  			  callback: function() {
		  			    // Alert button is closed!
		  				// menu.setMainPage('page/order-screen.html',
						// {closeMenu: true});
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});			
		}
	};
	
	$scope.validate = function(){
		
		if(!this.settings.enableCayan){
			return true;
		}
		
		if(this.settings.mode == 'HOSTED'){
			return true;
		}
				
		// validate ip address
		if(this.form.ipAddress.$error.pattern || this.form.ipAddress.$error.required){
			
			ons.notification.alert({
	  			  message: 'Please enter a valid ip address.',
	  			  title: 'Error',
	  			  callback: function() {
	  			    // Alert button is closed!
	  				document.getElementById('cayan-ip-address-text').select();
	  			  }
	  			});
			
			return false;
		}
		
		return true;
	};
});

// Hold Order History
module.controller('HoldOrdersController', function($scope, ShoppingCart, OrderScreen) {
	
		
	$scope.loadOrders = function(){
		$scope.orders  = APP.ORDER.search({status : 'DR'});
	};
	
	// initialise orders
	$scope.loadOrders();
	
	$scope.viewOrder = function ( order ){
		$scope.current_order = order;
	};
	
	$scope.isSelected = function( order ){
		
		if( $scope.current_order != null && $scope.current_order.order_id == order.order_id){
			
			return "selected";
			
		}
		
		return "";
	};
	
	$scope.recallOrder = function( order ){
		
		var customer_id = order["customer_id"];
		var customer = APP.CUSTOMER.getById( customer_id );
		
		OrderScreen.customer = customer;
		OrderScreen.order_id = order["order_id"];
		OrderScreen.uuid = order["uuid"];		
		
		var cart = ShoppingCart;
		cart.clear();
		
		// add note
		cart.addNote( order.note );
		
		// add lines
		var olines = order.lines;
		var oline = null;
		var l = null;
		
		for(var i = 0; i < olines.length; i++){
			oline = olines[i];
			
			l = cart.addLine(oline.product_id, oline.qtyentered);
			cart.updateLine(l.index, oline.priceentered, oline.qtyentered, oline.note, oline.modifiers);
		}
		
		menu.setMainPage('page/order-screen.html', {closeMenu: true});
		
	};
	
	$scope.closeOrder = function( order ){
		
		var order_id = order["order_id"];
		
		APP.ORDER.remove( order_id ).done(function(){
			
			$scope.$apply(function(){
				$scope.loadOrders();
				$scope.current_order = null;
			});
			
		});
	};
	
	$scope.closeAllOrders = function(){
		var orders = APP.ORDER.search({status : 'DR'});		
		
		if(orders.length == 0){
			return;
		}
		
		var order = null;
		var promises = [];
		
		for(var i=0; i< orders.length; i++){
			
			order = orders[i];
			var order_id = order['order_id'];
			
			promises.push( APP.ORDER.remove( order_id ));
		}
		
		jQuery.when.apply( jQuery, promises ).done(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.log(arguments[i]);
	        }
	        
	        console.log('orders cleared.');
	        
	        APP.ORDER.cache({status : 'DR'}).remove();
	        
	        $scope.$apply(function(){
	        	$scope.loadOrders();
	        	$scope.current_order = null;
			});
	        
	    }).fail(function() {        
	        for (var i = 0, j = arguments.length; i < j; i++) {
	        	if(arguments[i]) console.error(arguments[i]);
	        }
	        
	        console.log('Failed to clear orders!');
	    });
	};
	
});

// Today Orders
module.controller('TodayOrdersController', function($scope, ShoppingCart, OrderScreen) {
	
	var today = moment().startOf('day').valueOf();	
	
	$scope.loadOrders = function(){
		var orders  = APP.ORDER.search({status : ['CO','VO'], dateordered : {'>' : today}});
		
		// use moment js
		for(var i=0; i<orders.length; i++){
			orders[i].xxx = new Date(orders[i].dateordered);
		}
		
		$scope.orders = orders;
	};
	
	$scope.viewOrder = function ( order ){
		$scope.current_order = order;
	};
	
	$scope.isSelected = function( order ){
		
		if( $scope.current_order != null && $scope.current_order.order_id == order.order_id){
			
			return "selected";
			
		}
		
		return "";
	};
	
	$scope.loadOrders();
	
	$scope.refundOrderConfirmation = function( order ){
		
		ons.notification.confirm({
			  message: 'Do you want to refund order?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	$scope.refundOrder( order );			    			    	
			    }
			  }
			});	
		
	};
	
	$scope.voidOrderConfirmation = function( order ){
		
		ons.notification.confirm({
			  message: 'Do you want to void order?',
			  // or messageHTML: '<div>Message in HTML</div>',
			  title: 'Confirmation',
			  buttonLabels: ['Yes', 'No'],
			  animation: 'default', // or 'none'
			  primaryButtonIndex: 1,
			  cancelable: false,
			  callback: function(index) {
			    // -1: Cancel
			    // 0-: Button index from the left
			    if(index == 0){
			    	
			    	$scope.voidOrder( order );
			    	
			    }
			  }
			});	
		
	};
	
	$scope.voidOrder = function( order ){
		
		var order_id = order["order_id"];
		
		modal.show();
		
		APP.voidOrder( order_id ).done(function(msg){
						
			ons.notification.alert({
	  			  message: 'Order successfully voided!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Information',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			    
	  			    $scope.$apply(function(){
	  			    	
	  			    	$scope.loadOrders();
	  			    	
	  			    });	  				
	  			    
	  			  }
	  			});
			
			
			
		}).fail(function(error){
			
			ons.notification.alert({
	  			  message: 'Failed to void order!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			  }
	  			});
			
		}).always(function(){
			
			modal.hide();
			
		});
		
	};
	
	$scope.refundOrder = function( order ){
		
		var order_id = order["order_id"];		
		var customer_id = order["customer_id"];
		
		var customer = APP.CUSTOMER.getById( customer_id );
		
		OrderScreen.customer = customer;
		OrderScreen.ref_order_id = order["order_id"];
		OrderScreen.ref_uuid = order['uuid'];		
		
		var cart = ShoppingCart;
		cart.clear();
		
		// add refund note
		// cart.addNote( order.note );
		
		// add lines
		var olines = order.lines;
		var oline = null;
		var l = null;
		
		for(var i = 0; i < olines.length; i++){
			oline = olines[i];
			
			if( oline.qtyentered < 0) continue; /* cannot refund negative */
			
			l = cart.addLine(oline.product_id, oline.qtyentered * -1, false);
			
			// index, price, qty, note, modifiers, enableTax
			cart.updateLine(l.index, oline.priceentered, oline.qtyentered * -1, oline.note, oline.modifiers, oline.enabletax);
		}
		
		menu.setMainPage('page/order-screen.html', {closeMenu: true});
	};
	
	$scope.reprintOrder = function( order ){
		
		if(APP.PRINTER_SETTINGS.isPrinterEnabled()){
			// print receipt
			
			APP.printOrder( order ).done(function(msg){
				
			}).fail(function(error){			
				APP.showError(error, 'Printer Error');
			});
		}
		
	};
	
});

module.service('APP', function() {return APP;});



module.controller('SocialMediaController', function($scope) {
	
	$scope.publish = function(){
		
		var message = $scope.message;
		
		// post message to social media
		if( BufferService.isConfigured == true ){
			
			modal.show();
			
			BufferService.updateStatus(BufferService.profile_ids, message, true).done( function ( response ){
				
				ons.notification.alert({
					  message: 'Message has been posted',
					  // or messageHTML: '<div>Message in HTML</div>',
					  title: 'Information',
					  buttonLabel: 'OK',
					  animation: 'default', // or 'none'
					  // modifier: 'optional-modifier'
					  callback: function() {
					    // Alert button is closed!
					  }
					});
				
			}).fail( function ( error ){
				
				ons.notification.alert({
		  			  message: 'Failed to post message! ' + error,
		  			  // or messageHTML: '<div>Message in HTML</div>',
		  			  title: 'Social Post Error',
		  			  buttonLabel: 'OK',
		  			  animation: 'default', // or 'none'
		  			  // modifier: 'optional-modifier'
		  			  callback: function() {
		  			    // Alert button is closed!
		  			  }
		  			});
				
			}).always(function(){
				
				modal.hide();
				
			});
			
		}
		else
		{
			ons.notification.alert({
	  			  message: 'Buffer is not configured for this account!',
	  			  // or messageHTML: '<div>Message in HTML</div>',
	  			  title: 'Social Post Error',
	  			  buttonLabel: 'OK',
	  			  animation: 'default', // or 'none'
	  			  // modifier: 'optional-modifier'
	  			  callback: function() {
	  			    // Alert button is closed!
	  			  }
	  			});
		}
		
	};
	
});



function transportwebcallback( response ){
	
	console.log( response );
	
}


/*
 * 
 * ons.setDefaultDeviceBackButtonListener(function() { if
 * (navigator.notification.confirm("Are you sure to close the app?",
 * function(index) { if (index === 1) { // OK button navigator.app.exitApp(); //
 * Close the app } } )); });
 * 
 * <ons-page ng-device-backbutton="doSomething()"> Some page content </ons-page>
 */

