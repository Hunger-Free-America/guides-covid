const { Client } = require('pg');
const pool = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false 
})
module.exports = {pool};
