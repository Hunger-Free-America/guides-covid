module.exports = function Cart(cart) {
    this.items = cart.items || {};
    this.totalItems = cart.totalItems || 0;
    this.totalPrice = cart.totalPrice || 0;

    this.add = function(item, id, quantity) {
        var cartItem = this.items[id];
        if (!cartItem) {
            cartItem = this.items[id] = {item: item, quantity: 0, price: 0};
        }
        cartItem.quantity += quantity;
        if(cartItem.quantity >= 250){
            cartItem.quantity = 250;
        }
        cartItem.price = cartItem.item.price * cartItem.quantity;
        this.totalItems = Object.keys(this.items).length;
        this.totalPrice += cartItem.item.price;
        console.log('cart: ' + JSON.stringify(this.items));
    };

    this.remove = function(id) {
        this.totalPrice -= this.items[id].price;
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
};