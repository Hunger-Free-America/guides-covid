const express = require('express');
const router = express.Router();
const db = require('../database');


const fs = require('fs');
var products;

const Cart = require('../models/cart');

