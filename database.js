const pgp = require('pg-promise')();
const cn = process.env.DATABASE_URL + '?sslmode=require';
const db = pgp(cn);
module.exports = db;