const { Client } = require('pg');
const pool = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true
})
module.exports = {pool};
