const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'store_admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'collection',
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    timezone: 'Z'
});

module.exports = pool;
