const express = require('express');
const router = express.Router();
const db = require('../database');


const fs = require('fs');
var products;

const Cart = require('../models/cart');

db.any('SELECT * FROM salesforce.product2')
  .then(function (data) {
    products = data;
    console.log('products: ' + products);
  })
  .catch(function (error) {
    console.error(error);
  });

router.get('/', function (req, res, next) {
  res.render('index', {
    title: 'NodeJS Shopping Cart',
    products: products
  });
});

router.get('/add/:id', function (req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  var product = products.filter(function (item) {
    return item.id == productId;
  });
  cart.add(product[0], productId);
  req.session.cart = cart;
  res.redirect('/');
});

router.get('/product/:SKU', function (req, res, next) {
  var productSKU = req.params.SKU;
  db.one('SELECT * FROM salesforce.product2 WHERE productcode = $1 AND IsActive = TRUE', [productSKU])
    .then(function (data) {
      let product = data;
      console.log('current product: ' + product);
      res.render('product', {
        id: product.productcode,
        title: product.Name,
        description: product.description,
        //price: product.price
      });
    })
    .catch(function (error) {
      console.error(error);
    });

});

router.get('/cart', function (req, res, next) {
  if (!req.session.cart) {
    return res.render('cart', {
      products: null
    });
  }
  var cart = new Cart(req.session.cart);
  res.render('cart', {
    title: 'NodeJS Shopping Cart',
    products: cart.getItems(),
    totalPrice: cart.totalPrice
  });
});

router.get('/remove/:id', function (req, res, next) {
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  cart.remove(productId);
  req.session.cart = cart;
  res.redirect('/cart');
});

var pricebook;
var pricebookEntries;

//get active pricebook. will need refactoring in multiple pricebooks are used.
db.one('SELECT sfid FROM salesforce.pricebook2 WHERE isActive = TRUE')
  .then(data => {
    console.log('86: pricebook:' + data.sfid);
    pricebook = data.sfid;

    db.any('SELECT productcode, sfid FROM salesforce.pricebookEntry WHERE pricebook2Id = $1', [pricebook])
      .then(data => {
        console.log('91: pbe: ' + JSON.stringify(data));
        pricebookEntries = data;
      })
      .catch(error => {
        console.log(error);
      });

  })
  .catch(error => {
    console.log(error);
  });

router.get('/checkout', function (req, res, next) {
  res.render('checkout');
});

router.get('/submit', function (req, res, next) {
  const fname = req.body.firstName;
  const lname = req.body.lastName;
  const cname = req.body.companyName;
  const street = req.body.shippingStreet;
  const zip = req.body.shippingZip;
  const city = req.body.shippingCity;
  const state = req.body.ShippingState;
  var cart = new Cart(req.session.cart);
  let orderItems = [];

  var cartItems = cart.getItems();

  for (var item in cartItems) {
    //get price book entry id by product code
    let pbeId = pricebookEntries.filter(pbe => pbe.productcode === cartItems[item].item.productcode)[0].sfid;

    //add item to order items array
    orderItems.push({
      "attributes": {
        "type": "OrderItem"
      },
      "PricebookEntryId": pbeId,
      "quantity": cartItems[item].quantity,
      "UnitPrice": cartItems[item].price
    });
    console.log(orderItems);
  }

  var order = {
    attributes: {
      type: 'order'
    },
    EffectiveDate: Date.today(),
    Status: 'Draft',
    Pricebook2Id: pricebook,
    orderItems: orderItems,
  }
  console.log(order);
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
  res.redirect('/');
});

module.exports = router;