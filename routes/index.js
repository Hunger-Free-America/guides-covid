const express = require('express');
const router = express.Router();
const db = require('../database');
var jsforce = require('jsforce');

var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl : 'https://test.salesforce.com'
});

conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD, process.env.SF_SEC_TOKEN, function(err, userInfo) {
  if (err) { return console.error(err); }
  // Now you can get the access token and instance URL information.
  // Save them to establish connection next time.
  console.log(conn.accessToken);
  console.log(conn.instanceUrl);
  // logged in user property
  console.log("User ID: " + userInfo.id);
  console.log("Org ID: " + userInfo.organizationId);
  // ...
});

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
    console.log('pricebook:' + data.sfid);
    pricebook = data.sfid;

    db.any('SELECT productcode, sfid FROM salesforce.pricebookEntry WHERE pricebook2Id = $1', [pricebook])
      .then(data => {
        //console.log('91: pbe: ' + JSON.stringify(data));
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
  var date = new Date(Date.now());
  var order = []
  order.push({
    attributes: {
      type: 'order'
    },
    EffectiveDate: date.toISOString(),
    Status: 'Draft',
    accountId: '001R000001aJOrXIAW',
    Pricebook2Id: pricebook,
    orderItems: {
      records: orderItems
    }
  });
  var body = JSON.stringify(order);

  console.log('fuck u');
  console.log('instance url:' + conn.instanceUrl);

  conn.request({
    method: 'post',
    url: '/services/data/v48.0/commerce/sale/order',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  }, function (err, res) {
    if (err) {
      return console.error(err);
    }
    console.log("response: ", res);
    // the response object structure depends on the definition of apex class
  });
  //console.log('order: ' + JSON.stringify(order));
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