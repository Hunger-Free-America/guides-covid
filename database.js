const pgp = require('pg-promise')();
const cn = process.env.DATABASE_URL || "postgres://atticus:Mockingbird101!@localhost:5432/guidesdb";
const db = pgp(cn);
module.exports = db;