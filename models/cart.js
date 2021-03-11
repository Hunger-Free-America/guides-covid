module.exports = function Cart(cart) {
    this.items = cart.items || {};
    this.totalItems = cart.totalItems || 0;
    this.totalPrice = 0 //cart.totalPrice || 0;

    this.add = function(item, id, quantity) {
        var cartItem = this.items[id];
        if (!cartItem) {
            cartItem = this.items[id] = {item: item, quantity: 0, price: 0};
        }
        cartItem.quantity += quantity;
        if(cartItem.quantity >= 250){
            cartItem.quantity = 250;
        }
        cartItem.price =  0; //cartItem.item.price * cartItem.quantity;
        this.totalItems = Object.keys(this.items).length;
        //this.totalPrice += cartItem.item.price;
        this.totalPrice = 0;
        console.log('cart: ' + JSON.stringify(this.items));
    };

    this.remove = function(id) {
        this.totalPrice -= 0 //this.items[id].price;
        delete this.items[id];
        this.totalItems = Object.keys(this.items).length;
    };
    
    this.getItems = function() {
        var arr = [];
        for (var id in this.items) {
            arr.push(this.items[id]);
        }
        return arr;
    };

    this.clearCart = function (){
        this.items = {};
        this.totalItems = 0;
        this.totalPrice = 0;
        console.log('cart cleared');
    }
};