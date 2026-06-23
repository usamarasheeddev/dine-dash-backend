const { sequelize } = require('./models');

async function run() {
  try {
    await sequelize.query('ALTER TABLE "OrderItems" ADD COLUMN "costPrice" DECIMAL DEFAULT 0');
    console.log('Added costPrice to OrderItems');
  } catch(e) {
    console.log('OrderItems costPrice error (might already exist):', e.message);
  }

  try {
    await sequelize.query('ALTER TABLE "InventoryLedgers" ADD COLUMN "purchaseCost" DECIMAL DEFAULT 0');
    console.log('Added purchaseCost to InventoryLedgers');
  } catch(e) {
    console.log('InventoryLedgers purchaseCost error (might already exist):', e.message);
  }
}

run().then(() => process.exit(0)).catch(e => console.error(e));
