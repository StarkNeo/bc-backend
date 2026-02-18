const pg = require('pg');
const { Pool } = pg;
const dotenv = require('dotenv').config();


//PRODUCCION EN RENDER
const pool = new Pool({
connectionString:process.env.PGSTRING,
ssl: { rejectUnauthorized: false }
});

module.exports = pool; 


//const { Pool } = require('pg');
//local development
/*
const pool = new Pool({
  user: process.env.USERDB,
  host: process.env.HOSTDB,
  database: process.env.NAMEDB,
  password: process.env.PASSWORDDB,
  port: process.env.PORTDB,
});

module.exports = pool;
*/