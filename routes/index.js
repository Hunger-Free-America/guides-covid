/**
 * I don't like this but basically everything is in this one file and I don't have time to fix it because I am on a time budget! 
 * Sorry future Atticus!
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
var jsforce = require('jsforce');

var conn = new jsforce.Connection({
  // you can change loginUrl to connect to sandbox or prerelease env.
  loginUrl: 'https://test.salesforce.com',
  instanceUrl: 'https://cs2.salesforce.com'
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
db.any('SELECT * FROM salesforce.product2 WHERE isActive = TRUE')
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

router.get('/checkout', function (req, res, next) {
  res.render('checkout');
});

router.get('/submit', function (req, res, next) {
  const fname = req.body.firstName;
  const lname = req.body.lastName;
  const cname = req.body.companyName;
  const email = req.body.email;
  const phone = req.body.phone;
  const street = req.body.shippingStreet;
  const zip = req.body.shippingZip;
  const city = req.body.shippingCity;
  const state = req.body.ShippingState;

  console.log('frick');
  accConHelper(cname, fname, lname, street, state, city, zip, email, phone, postOrder);

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

function processOrder(order, postOrder) {

};

function postOrder(error, ids) {
  console.log('posting');
  if (error) {
    return console.log('error: ' + error);
  } else {
    var cart = new Cart(req.session.cart);
    var orderItems = [];
    var cartItems = cart.getItems();

    for (var item in cartItems) {
      //get price book entry id by product code
      let pbe = pricebookEntries.filter(pbe => pbe.productcode === cartItems[item].item.productcode)[0];
      //add item to order items array
      orderItems.push({
        "attributes": {
          "type": "OrderItem"
        },
        "PricebookEntryId": pbe.sfid,
        "quantity": cartItems[item].quantity,
        "UnitPrice": pbe.UnitPrice
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
  console.log('checkContact');
  var records = [];
  conn.query("SELECT Id, Name FROM Account WHERE Name LIKE '%" + accountName + "%'", function (err, result) {
    if (err) {
      callback(err);
    }
    console.log("total : " + result.totalSize);
    console.log("fetched : " + result.records.length);
    console.log("First Reccord Name: " + result[0].Name);
    if (result.records.length === 0) {
      callback(new Error('no reccords found'));
    }
    callback(null, result[0].Id);
  });
}

function checkContact(fname, lname, callback) {
  console.log('checkContact...');
  var records = [];
  conn.query("SELECT Id, FirstName, LastName, Name FROM Contact WHERE FirstName LIKE '%" + fname + "%' AND LastName LIKE '%" + lname + "%'", function (err, result) {
    console.log('error:' + err + "res: " + JSON.stringify(result));
    if (err) {
      console.log(err);
      callback(err);
    }
    console.log("total contacts: " + result.totalSize);
    console.log("fetched contacts: " + result.records.length);
    console.log("First contact Name: " + result[0].Name);
    if (result.totalSize === 0) {
      callback(new Error('no reccords found!'));
    }
    callback(null, result[0].Id);
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
  conn.sobject("Account").create({
    Name: accountName,
    ShippingStreet: street,
    ShippingCity: city,
    ShippingState: state,
    ShippingPostalCode: zip,

  }, function (err, ret) {
    if (err || !ret.success) {
      console.error('create account error: ' + err + 'ret: ' + ret)
      callback(err);
    }
    console.log("Created Account record id: " + ret.id);
    id = ret.id;
  });
  callback(null, id);
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
      callback(err);
    }
    console.log("Created Contact reccord id: " + ret.id);
    id = ret.id;
  });
  callback(null, id);
}

function createContact(firstName, lastName, street, state, city, zip, email, phone, callback) {
  var id;
  conn.sobject("Contact").create({
    FirstName: firstName,
    LastName: lastName,
    Email: email,
    Phone: phone,
    MaillingStreet: street,
    MailingCity: city,
    MailingState: state,
    MailingPostalCode: zip
  }, function (err, ret) {
    if (err || !ret.success) {
      console.error('create contact error: ' + err + 'ret: ' + ret)
      callback(err);
    }
    console.log("Created Contact reccord id: " + ret.id);
    id = ret.id;
  });
  callback(null, id);
}

function accConHelper(accountname, firstName, lastName, street, state, city, zip, email, phone, callback) {
  console.log('helping!')
  var accId = '';
  var contactId = '';

  if (accountname != null && accountname !== '') {
    console.log('checking account on line 354');
    checkAccount(accountname, (error, data) => {
      if (error) {
        console.error('error: ' + error);
        console.log('creating Account on like 358');
        createAccount(accountname, street, zip, city, state, (err, data) => {
          if (err) {
            console.error(err);
            callback(err);
          }
          accId = data;
        });
        console.log('account id: ' + accId);
      }
      accId = data;
    });
    console.log(accId);

    checkContact(firstName, lastName, (err, data) => {
      console.log('checking contcact on line 366');
      if (err) {
        console.error(err);
        createContactWithAccount(firstName, lastName, accId, email, phone, (err, data) => {
          console.log('creating contact')
          if (err) {
            console.error(err);
            callback(err);
          }
          contactId = data;
        });
        console.log(contactId)
      }
      contactId = data;
    });
    console.log(contactId);

  } else {
    checkContact(firstName, lastName, (err, data) => {
      if (err) {
        console.error(err);
        createContact(firstName, lastName, street, state, city, zip, email, phone, (err, data) => {
          if (err) {
            callback(err);
          }
          contactId = data;
        });
        checkAccount(lastName, (err, data) => {
          if (err) {
            callback(err);
          }
          accId = data;
        });
      }
      contactId = data;
      checkAccount(lastName, (err, data) => {
        if (err) {
          callback(err);
        }
        accId = data;
      });
    });
    console.log(contactId);
  }
  console.log(accId, contactId);
  setTimeout(() => {
    callback(null, [accId, contactId])
  }, 1000);
}

module.exports = router;