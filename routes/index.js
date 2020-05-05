const express = require('express');
const router = express.Router();
const db = require('../database');


const fs = require('fs');
var products;

const Cart = require('../models/cart');

db.any('SELECT * FROM salesforce.products')
  .then(function (data) {
    products = data;
    console.log(products);
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
  db.one('SELECT * FROM products WHERE productcode = $1 AND IsActive = TRUE', [productSKU])
    .then(function (data) {
      let product = data;
      console.log(product);
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

module.exports = router;