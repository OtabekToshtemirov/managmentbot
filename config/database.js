require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

const connectDB = async () => {
  try {
    await client.connect();
    console.log('PostgreSQL connected successfully');
    
    // Create tasks table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline DATE NOT NULL,
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(100) DEFAULT 'General',
        completed BOOLEAN DEFAULT FALSE,
        userId BIGINT NOT NULL
      );
    `);
    console.log('Tasks table checked/created successfully');
  } catch (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
};

module.exports = { client, connectDB };
