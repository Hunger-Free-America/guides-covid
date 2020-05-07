const express = require('express');
const router = express.Router();
const db = require('../database');


const fs = require('fs');
var products;

const Cart = require('../models/cart');

var pricebook;
var pricebookEntries;

//get active pricebook. will need refactoring in multiple pricebooks are used.
db.one('SELECT sfid FROM salesforce.pricebook2 WHERE isActive = TRUE')
    .then(data => {
        console.log(data);
        pricebook = data;
    })
    .catch(error => {
        console.log(error);
    });


db.any('SELECT productcode, sfid FROM salesforce.pricebook2Entries WHERE pricebook2Id = $1', [pricebook])
    .then(data => {
        console.log(data);
        pricebookEntries = data;
    })
    .catch(error => {
        console.log(error);
    });

console.log(typeof (pricebookEntries));
console.log(pricebookEntries);
//var pbes = new Map(pricebookEntries.map(i => [i.productCode, i.sfid]));
var pbe = pricebookEntries;
router.get('/checkout', function (req, res) {
    res.render('checkout');
});

router.post('/submit', function (req, res) {
    const fname = req.body.firstName;
    const lname = req.body.lastName;
    const cname = req.body.companyName;
    const street = req.body.shippingStreet;
    const zip = req.body.shippingZip;
    const city = req.body.shippingCity;
    const state = req.body.ShippingState;
    console.log('foo');
    var cart = new Cart(req.session.cart);
    let orderItems = [];

    for (var item in cart.getItems()) {
        let pbeId = pbes.get(item.productCode);
        orderItems.push({
            "attributes": {
                "type": "OrderItem"
            },
            "PricebookEntryId": pbeId,
            "quantity": item.quantity,
            "UnitPrice": item.price
        });
    }

    /*
     * If company name field is blank order account id = household account.
     * order authorized by id = contact id.
     * Check if contact/household account exists. if no create it.
     * check if company account exists. if not create it.
     * shipping address = address
     * pricebook2Id = pbeId
     * efective date = today
     * status = draft
     */

});

module.exports = router;