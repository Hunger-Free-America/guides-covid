model.exports = function Order(order){
    this.orderItems = order.orderItems || [];
    this.accountId = order.AccountId;
    this.pricebook2Id = order.pricebook2Id;
    this.status = order.status || 'draft';
    this.shippingCity = order.shippingCity;
    this.shippingState = order.shippingState;
    this.shippingStreet = order.shippingStreet;
    this.fullfillBy = order.fullfillBy;


    this.add = function(item, PBE){
        var orderItem = this.orderItems.get(PBE);
        if(!orderItem){
            orderItem = {
                pricebookEntryId: PBE,
                quantity: 0,
                price = 0
            };
        }
        item.quantity++;
    }
}