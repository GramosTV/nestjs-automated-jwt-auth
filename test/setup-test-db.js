const mysql = require('mysql2/promise');

async function setupTestDatabase() {
  console.log('Setting up test database...');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || 'admin';
  const testDbName = 'test_db';
  
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      authPlugins: {
        mysql_native_password: () => ({
          auth: async () => {
            return Buffer.from(`${password}\0`);
          }
        })
      }
    });
    
    await connection.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await connection.query(`CREATE DATABASE ${testDbName}`);
    
    console.log(`Test database '${testDbName}' created successfully`);
    await connection.end();
    
    return true;
  } catch (error) {
    console.error('Failed to set up test database:', error);
    console.log('Continuing with tests without database reset...');
    return true;
  }
}

if (require.main === module) {
  setupTestDatabase()
    .then(success => process.exit(success ? 0 : 1));
} else {
  module.exports = setupTestDatabase;
}