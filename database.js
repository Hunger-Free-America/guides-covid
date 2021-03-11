const { Pool } = require('pg');
const pool = new Pool({
    connectionString: ProcessingInstruction.env.DATABASE_URL,
    ssl:true
})
module.exports = {pool};
