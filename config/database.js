require('dotenv').config();

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete('sslmode');
    process.env.DATABASE_URL = url.toString();
  } catch (e) {
    // Ignore invalid URLs
  }
}

const sslConfig = isLocal ? {} : {
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};

const config = process.env.DATABASE_URL ? {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
} : {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false,
  ...sslConfig
};

module.exports = {
  development: config,
  test: config,
  production: config,
};
