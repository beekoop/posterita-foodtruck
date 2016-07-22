function HashMap()
{
	var keys = [];
	var data = {};
	
	this.size = function() {
		return keys.length;
	}
	this.get = function(key) {
		return data[key] || null;
	}
	this.remove = function(key) {
		var index = keys.indexOf(key);
		if (index != -1) {
			keys.splice(index, 1);
			data[key] = null;
		}
	}
	this.toArray = function() {
		var r = [];
		for(var k in data)
			if (data[k]) r.push(data[k]);
		return r;
	}
	this.put = function(key, value) {
		if (keys.indexOf(key) == -1)
			keys.push(key);
		data[key] = value;
	}
	this.clear = function() {
		keys = [];
		data = {};
	}
	this.hasItem = function (key) {
		return (keys.indexOf(key) != -1);
	}
	this.limit = function(start, num) {
		var sub = keys.slice(start, num),
			result = [];
		for(var i=0,len=sub.length; i<len; i++) {
			result.push(data[sub[i]]);
		}
		return result;
	}
	this.each = function(fn) {
		if (typeof fn != 'function') {
			return false;
		} else {
			var len = this.size();
			for(var i=0; i<len; i++) {
				var k = keys[i];
				fn(k, data[k], i);
			}
		}
	}
}

function Cart()
{	
		this.index = 0;
		this.qtytotal = 0;
		this.taxtotal = 0;
		this.subtotal = 0;
		this.grandtotal = 0;		
		this.costtotal = 0;
		this.note = "";
		
		this.lines = new HashMap();
		
		this.callbacks = jQuery.Callbacks();
		
		this.init = function(){
			
			var terminal = APP.TERMINAL.getById( APP.TERMINAL_KEY );
			if( terminal == null){
				
				alert('Failed to load terminal ==> ' + APP.TERMINAL_KEY );
				return null;
				
			}
			else
			{
				var tax_id = terminal[ 'tax_id' ];
				var tax = APP.TAX.getById( APP.tax_id );
				
				this.tax = tax;
			}
			
			jQuery(this).trigger('cart.init');
			
		};
		
		this.getLines = function() {
			
			return this.lines.toArray();			
		};
		
		this.onUpdate = function(fn) {
			this.callbacks.add(fn);
		};
		
		this.clear = function(){
			
			this.index = 0;
			this.qtytotal = 0;
			this.taxtotal = 0;
			this.subtotal = 0;
			this.grandtotal = 0;
			this.costtotal = 0;
			
			this.note = "";
			
			this.lines = new HashMap();
			
			jQuery(this).trigger('cart.clear');
			this.callbacks.fire(this, 'clear');
			
		};
		
		this.addNote = function(note){
			
			this.note = note;
			
			jQuery(this).trigger('cart.addNote');			
			this.callbacks.fire(this, 'update note');
			
		};
		
		this.addLine = function(product_id, qty){
			
			var line = new Cartline(this, this.index, product_id, qty, false);	
			
			this.lines.put(this.index, line);
			
			this.index = this.index + 1;
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.addLine', line);
			this.callbacks.fire(this, 'new line');			
			
			return line;
			
		};
		
		this.removeLine = function(index){
			
			this.lines.remove(index);
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.removeLine', index);
			this.callbacks.fire(this, 'remove line');
			
		};
		
		this.updatePrice = function(index, price){
			
			var line = this.lines.get(index);
			line.setPrice(price);
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.updatePrice', line);
			jQuery(this).trigger('cart.updateLine', line);
			
			this.callbacks.fire(this, 'update price');
			
			return line;
			
		};
		
		this.updateLine = function( index, price, qty, note, modifiers, enableTax ){
			
			var line = this.lines.get(index);
			line.setPrice(price);
			line.setQty(qty);
			line.setNote(note);
			line.setModifiers(modifiers);
			line.setEnableTax(enableTax);
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.updateLine', line);
			this.callbacks.fire(this, 'update line');
			
			return line;
			
		};
		
		this.addModifier = function(index, modifier){
			
			var line = this.lines.get(index);
			line.addModifier(modifier);
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.addModifier', line);
			jQuery(this).trigger('cart.updateLine', line);
			
			this.callbacks.fire(this, 'add modifier');
			
			return line;
			
		};	
		
		this.getLine = function( index ){
			return this.lines.get(index);
		};
		
		this.updateQty = function(index, qty){
			
			var line = this.lines.get(index);
			line.setQty(qty);
			
			this.updateTotal();	
			
			jQuery(this).trigger('cart.updateQty', line);
			jQuery(this).trigger('cart.updateLine', line);
			
			this.callbacks.fire(this, 'update qty');
			
			return line;
		};		
		
		
		this.updateTotal = function(){
			
			var cart = this;
			
			var qtytotal = 0;
			var taxtotal = 0;
			var subtotal = 0;
			var grandtotal = 0;
			var costtotal = 0;
			
			this.lines.each(function(key, data, index){
				
				var line = data;
				
				taxtotal += line.taxAmt;
				subtotal += line.lineAmt;
				grandtotal += line.lineNetAmt;
				qtytotal += line.qty;
				
				costtotal += line.costAmt
				
				// add line grandtotal
				line.grandtotal = line.lineAmt;
				
				//modifiers
				var modifiers = line.getModifiers();
				var modifier = null;
				
				for(var i = 0; i<modifiers.length; i ++){
					modifier = modifiers[i];
					
					taxtotal += modifier.taxAmt;
					subtotal += modifier.lineAmt;
					grandtotal += modifier.lineNetAmt;
					//qtytotal += modifier.qty;
					
					costtotal += modifier.costAmt
					
					// add line grandtotal
					line.grandtotal += modifier.lineAmt;
					
				}
				
			}); 
			
			cart.qtytotal = qtytotal;
			cart.taxtotal = parseFloat(new Number(taxtotal).toFixed(2));
			cart.subtotal = parseFloat(new Number(subtotal).toFixed(2));
			cart.grandtotal = parseFloat(new Number(grandtotal).toFixed(2));
			
			cart.costtotal = parseFloat(new Number(costtotal).toFixed(2));
		};		
		
};

function Cartline( cart, index, product_id, qty, ismodifier){
	
	this.cart = cart;
	this.index = index + 0;
	this.product_id = product_id;
	this.qty = qty;	
	this.discountAmt = 0;
	this.discountPercentage = 0;
	this.enableTax = true;
	this.ismodifier = ismodifier;
	
	this.modifiers = new HashMap();

	this.note = "";
	
	var product = null;
	
	if(ismodifier == true){
		product = APP.MODIFIER.getById( product_id );
	}
	else
	{
		product = APP.PRODUCT.getById( product_id );
	}	
	
	if( product == null){
		
		alert('Failed to load product ==> ' + product_id );
		return null;
		
	}
	else
	{
		this.product = product;
		this.price = product.sellingprice;
		this.costprice = product.costprice;
		this.productcategory_id = product.productcategory_id;
		
		this.tax = cart.tax;
		
		if(this.tax == null){
			
			var tax_id = product[ 'tax_id' ];
			
			var tax = null;
			
			if(tax_id > 0){
				
				tax = APP.TAX.getById( tax_id );
				
				if(tax == null){
					
					alert('Failed to load tax ==> ' + tax_id );
					return null;					
				}
				else
				{
					this.tax = tax;
				}			
			}
			else
			{	// no tax
				this.tax = {
						tax_id : 0,
						name : 'No Tax',
						rate : 0
				};
			}
			
			
			
		}		
	};
	
	this.addModifier = function(modifier){
		
		/*validate product category*/
		if( this.product.productcategory_id != modifier.productcategory_id ){
			return;
		}
		
		var modifier_id = modifier.modifier_id;
		
		if( this.modifiers.hasItem( modifier_id ) ){
			return;
		}
		
		var modifierline = new Cartline(this.cart, this.modifiers.size(), modifier.product_id, this.qty, true);	
		
		this.modifiers.put( modifier_id, modifierline );
		
		this.updateTotal();
		
		return this;
	};
	
	this.setModifiers = function(modifiers) {
		this.modifiers.clear();
		
		var modifier, modifier_id;
		
		for(var i=0; i<modifiers.length; i++){
			
			modifier = modifiers[i];
			modifier_id = modifier.modifier_id;
			
			var modifierline = new Cartline(this.cart, this.modifiers.size(), modifier.product_id, this.qty, true);	
			
			this.modifiers.put( modifier_id, modifierline );	
		}
		

		this.updateTotal();
		
		return this;
	};
	
	this.getModifiers = function(){
		return this.modifiers.toArray();
	};
	
	this.setPrice = function(price){
		this.price = price;
		this.updateTotal();
		
		return this;
	};
	
	this.setQty = function(qty){
		this.qty = qty;
		
		//update modifier qty
		this.modifiers.each(function(modifier_id, modifier, index){
			modifier.setQty(qty);
		});
		
		this.updateTotal();
		
		return this;
	};
	
	this.setNote = function(note){
		this.note = note;
		
		return this;
	};
	
	this.setEnableTax = function(enableTax){
		this.enableTax = enableTax;
		
		//update modifier qty
		this.modifiers.each(function(modifier_id, modifier, index){
			modifier.setEnableTax(enableTax);
		});
		
		this.updateTotal();
		
		return this;
	};
	
	this.updateTotal = function(){
		if(this.enableTax)
		{
			this.taxAmt = parseFloat(new Number((this.tax.rate * this.qty * this.price)/100).toFixed(2));
		}
		else
		{
			this.taxAmt = 0;
		}
		
		
		this.lineAmt = parseFloat(new Number(this.qty * this.price).toFixed(2));
		this.lineNetAmt = parseFloat(new Number(this.lineAmt + this.taxAmt).toFixed(2));
		
		this.discountAmt = parseFloat((new Number((this.product.sellingprice - this.price) * this.qty).toFixed(2)));
		this.discountPercentage = parseFloat((new Number((this.product.sellingprice - this.price) / this.product.sellingprice ).toFixed(2)));
		
		this.costAmt = parseFloat(new Number(this.qty * this.costprice).toFixed(2));
	};
	
	this.updateTotal();	
	
};