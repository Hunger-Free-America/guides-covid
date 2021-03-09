const pgp = require('pg-promise')();
const cn = process.env.DATABASE_URL + '?ssl=true';
const db = pgp(cn);
module.exports = db;