const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.NAMEDB,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

module.exports = pool;