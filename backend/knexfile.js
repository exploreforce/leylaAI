const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'database', 'whatsapp_bot_dev.sqlite3')
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, 'database', 'migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'database', 'seeds')
    }
  },

  staging: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: path.join(__dirname, 'database', 'migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'database', 'seeds')
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      directory: path.join(__dirname, 'database', 'migrations'),
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: path.join(__dirname, 'database', 'seeds')
    }
  }
}; 