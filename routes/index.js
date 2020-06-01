/**
 * I don't like this but basically everything is in this one file and I don't have time to fix it because I am on a time budget! 
 * Sorry future Atticus!
 */
const express = require('express');
var router = express.Router();
const db = require('../database');
var jsforce = require('jsforce');

var title = 'Hunger Free America Orders';
var successMsg = 'Your order has been placed! Thank you! '


var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl: process.env.SF_LOGIN_URL,
  instanceUrl: process.env.SF_INSTANCE_URL
});

conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD + process.env.SF_SEC_TOKEN, function (err, userInfo) {
  if (err) {
    return console.error(err);
  }
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
var pricebook;
var pricebookEntries;

const Cart = require('../models/cart');

// Get active products
db.any('SELECT * FROM salesforce.product2 WHERE isActive = TRUE ORDER BY Name ASC')
  .then(function (data) {
    products = data;
    console.log('products: ' + products);
  })
  .catch(function (error) {
    console.error(error);
  });

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

router.get('/', function (req, res, next) {
  res.render('index', {
    title: title,
    products: products
  });
});

router.get('/add/:id', function (req, res, next) {
  var productId = req.params.id;
  var quantity = req.query['qty'];
  var cart = new Cart(req.session.cart ? req.session.cart : {});
  var product = products.filter(function (item) {
    return item.id == productId;
  });
  cart.add(product[0], productId, quantity);
  req.session.cart = cart;
  res.redirect('/');
});

router.get('/product/:SKU', function (req, res, next) {
  var productSKU = req.params.SKU;
  db.one('SELECT * FROM salesforce.product2 WHERE productcode = $1 AND IsActive = TRUE', [productSKU])
    .then(function (data) {
      let product = data;
      console.log('current product: ' + product.name);
      res.render('product', {
        sku: productSKU,
        title: product.name,
        description: product.description,
        price: product.price
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
    title: title,
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

router.get('/checkout', function (req, res, next) {
  res.render('checkout', {
    title: "Checkout"
  });
});


router.route('/submit').get(function (req, res, next) {
  console.log(req.body);
  var fname = req.query['firstName'];
  var lname = req.query['lastName'];
  var cname = req.query['company'];
  var email = req.query['email'];
  var phone = req.query['phone'];
  var street = req.query['shippingStreet'];
  var zip = req.query['shippingZip'];
  var city = req.query['shippingCity'];
  var state = req.query['shippingState'];
  var cart = new Cart(req.session.cart);


  console.log('frick');
  accConHelper(cname, fname, lname, street, state, city, zip, email, phone, cart, postOrder);

  res.render('index', {
    title: title,
    message: successMsg,
    products: products
  });
});

function postOrder(error, ids, cart) {
  console.log('posting');
  if (error) {
    return console.log('error: ' + error);
  } else {
    var orderItems = [];
    var cartItems = cart.getItems();

    for (var item in cartItems) {
      //get price book entry id by product code
      let pbe = pricebookEntries.filter(pbe => pbe.productcode === cartItems[item].item.productcode)[0];
      console.log('pbe' + JSON.stringify(pbe));
      console.log(cartItems[item].item.productcode);
      //add item to order items array
      orderItems.push({
        "attributes": {
          "type": "OrderItem"
        },
        "PricebookEntryId": pbe.sfid,
        "quantity": cartItems[item].quantity,
        "UnitPrice": 0, //pbe.UnitPrice || 0
        "shippingCity": city,
        "shippingStreet": street,
        "shippingState": state,
        "shippingPostalCode": zip
      });
      //console.log(orderItems);
    }

    var date = new Date(Date.now());
    var order = []
    order.push({
      attributes: {
        type: 'order'
      },
      EffectiveDate: date.toISOString(),
      Status: 'Draft',
      accountId: ids[0],
      CustomerAuthorizedById: ids[1],
      Pricebook2Id: pricebook,
      orderItems: {
        records: orderItems
      }
    });
    var body = {
      order: order
    };

    console.log(JSON.stringify(body));
    console.log('access Token:' + conn.accessToken);

    conn.request({
      method: 'post',
      url: '/services/data/v48.0/commerce/sale/order',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }, function (err, res) {
      if (err) {
        return console.error(err);
      }
      console.log("response: ", res);
    });
  }
}

/**
 * Queries Salesforce to check if an Account exists by Account Name
 * @param {String} accountName 
 * @returns {Object} Account Name and Id
 */
function checkAccount(accountName, callback) {
  console.log('checkAccount...');
  conn.query("SELECT Id, Name FROM Account WHERE Name LIKE '%" + accountName + "%'", function (err, result) {
    if (err) {
      callback(err);
    }
    console.log("total : " + result.totalSize);
    console.log("fetched : " + result.records.length);
    //  console.log("First Reccord Name: " + result.records[0].Name);

    if (result.records.length === 0) {
      callback(new Error('no reccords found'));
      console.log('check account no reccords found error');
      return;
    }
    callback(null, result.records[0].Id);
  });
}

function checkContact(fname, lname, callback) {
  console.log('checkContact...');
  conn.query("SELECT Id, FirstName, LastName, Name FROM Contact WHERE FirstName LIKE '%" + fname + "%' AND LastName LIKE '%" + lname + "%'", function (err, result) {
    if (err) {
      callback(err);
    }
    console.log("total : " + result.totalSize);
    console.log("fetched : " + result.records.length);
    //  console.log("First Reccord Name: " + result.records[0].Name);

    if (result.records.length === 0) {
      callback(new Error('no reccords found'));
      console.log('check contacts no reccords found error');
      return;
    }
    callback(null, result.records[0].Id);
  });
}

/**
 * Creates an Account
 * @param {String} accountName 
 * @param {String} street 
 * @param {String} zip 
 * @param {String} city 
 * @param {String} state 
 * @returns {String} AccountId
 */
function createAccount(accountName, street, zip, city, state, callback) {
  console.log('createAccount...');
  var id;
  var error;
  conn.sobject("Account").create({
    Name: accountName,
    ShippingStreet: street,
    ShippingCity: city,
    ShippingState: state,
    ShippingPostalCode: zip,

  }, function (err, ret) {
    if (err || !ret.success) {
      console.error('create account error: ' + err + 'ret: ' + ret)
      error = err ? err : new Error(ret);
      callback(error);
    }
    console.log("Created Account record id: " + ret.id);
    id = ret.id;
    console.log('fuck u ' + id);
    callback(null, id);
  });
}

/**
 * Creates a Contact that is linked to an Account
 * @param {String} firstName 
 * @param {String} lastName 
 * @param {String} accountId 
 * @returns {String} ContactId
 */
function createContactWithAccount(firstName, lastName, accountId, email, phone, callback) {
  console.log('createContactWithAccount...');
  var id;
  conn.sobject("Contact").create({
    FirstName: firstName,
    LastName: lastName,
    AccountId: accountId,
    Email: email,
    Phone: phone
  }, function (err, ret) {
    if (err || !ret.success) {
      console.error('create contact with account error: ' + err + 'ret: ' + ret)
      callback(err ? err : new Error(ret));
    }
    console.log("Created Contact reccord id: " + ret.id);
    id = ret.id;
    callback(null, id);
  });
}

function createContact(firstName, lastName, street, state, city, zip, email, phone, callback) {
  var id;
  conn.sobject("Contact").create({
    FirstName: firstName,
    LastName: lastName,
    Email: email,
    Phone: phone,
    MailingStreet: street,
    MailingCity: city,
    MailingState: state,
    MailingPostalCode: zip
  }, function (err, ret) {
    if (err || !ret.success) {
      console.error('create contact error: ' + err + 'ret: ' + ret)
      callback(err ? err : new Error(ret));
    }
    console.log("Created Contact reccord id: " + ret.id);
    id = ret.id;
    callback(null, id);
  });
}

function accConHelper(accountname, firstName, lastName, street, state, city, zip, email, phone, cart, callback) {
  console.log('helping!')
  var accId;
  var contactId;

  if (accountname != undefined && accountname !== '') {
    //console.log('check account 1 err: ' + err + 'data: ' + data);
    checkAccount(accountname, (error, data) => {
      console.log('calling back from check acc 1...');
      if (error) {
        console.error('error: ' + error);
        console.log('creating Account on like 358');
        createAccount(accountname, street, zip, city, state, (err, data) => {
          console.log('calling back to from create acc 1...');
          if (err) {
            console.error(err);
            callback(err);
          }
          accId = data;
          console.log('account id: ' + accId);
        });
      }
      accId = data;
      console.log('account Id: ' + accId);

      checkContact(firstName, lastName, (err, data) => {
        console.log('calling back from check contact 1...');
        if (err) {
          console.error(err);
          console.log(accId);
          createContactWithAccount(firstName, lastName, accId, email, phone, (err, data) => {
            console.log('calling back from create contact with account 1...')
            if (err) {
              console.error(err);
              callback(err);
            }
            contactId = data;
            console.log('Contact Id: ' + contactId)
          });
        }
        contactId = data;
        console.log('Contact Id: ' + contactId);
      });
    });

  } else {
    checkContact(firstName, lastName, (err, data) => {
      console.log('check contact 2 err' + err + 'data: ' + data);
      if (err) {
        console.error(err);
        createContact(firstName, lastName, street, state, city, zip, email, phone, (err, data) => {
          if (err) {
            callback(err);
          }
          contactId = data;
          console.log('contact id: ' + contactId);

          checkAccount(lastName + ' Household', (err, data) => {
            if (err) {
              callback(err);
            }
            console.log('check acc data 2: ' + data);
            accId = data;
          });
        });
      }
      contactId = data;
      checkAccount(lastName, (err, data) => {
        if (err) {
          callback(err);
        }
        console.log('check acc data 3: ' + data);
        accId = data;
        console.log('contact id: ' + contactId);
      });
    });
  }
  setTimeout(() => {
    console.log(accId, contactId);
    callback(null, [accId, contactId], cart)
  }, 15000);
}

module.exports = router;