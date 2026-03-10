const { Pool } = require('pg');
require('dotenv').config();
const logger = require('../utils/logger');

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Bağlantı hatası olursa konsola yazdır
pool.on('error', (err) => {
    logger.error('❌ Beklenmedik veritabanı hatası!', err);
    process.exit(-1); 
});

module.exports = pool;