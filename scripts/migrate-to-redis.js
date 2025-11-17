/**
 * Script to migrate spell mappings and prisms from file system to Redis
 * Run this after setting up Redis to migrate all existing data
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MAPPINGS_FILE = path.join(DATA_DIR, 'spell-prism-mappings.json');
const PRISMS_FILE = path.join(DATA_DIR, 'prisms.json');

async function migrateToRedis() {
  if (!process.env.REDIS_URL) {
    console.error('ERROR: REDIS_URL environment variable is not set');
    console.log('Please set REDIS_URL before running this script');
    process.exit(1);
  }

  try {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    
    console.log('Connected to Redis\n');

    // Migrate spell mappings
    if (fs.existsSync(MAPPINGS_FILE)) {
      const mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
      const count = Object.keys(mappings).length;
      
      console.log(`Migrating ${count} spell mappings...`);
      await redis.set('spell-prism-mappings', JSON.stringify(mappings));
      await redis.set('spell-prism-mappings-timestamp', Date.now().toString());
      console.log(`✓ Migrated ${count} spell mappings to Redis`);
    } else {
      console.log('⚠ No spell mappings file found');
    }

    // Migrate prisms
    if (fs.existsSync(PRISMS_FILE)) {
      const prisms = JSON.parse(fs.readFileSync(PRISMS_FILE, 'utf-8'));
      
      console.log(`\nMigrating ${prisms.length} prisms...`);
      await redis.set('prisms', JSON.stringify(prisms));
      await redis.set('prisms-timestamp', Date.now().toString());
      console.log(`✓ Migrated ${prisms.length} prisms to Redis`);
      console.log('  Prisms:', prisms.join(', '));
    } else {
      console.log('\n⚠ No prisms file found');
    }

    // Verify
    console.log('\n--- Verification ---');
    const redisMappings = JSON.parse(await redis.get('spell-prism-mappings') || '{}');
    const redisPrisms = JSON.parse(await redis.get('prisms') || '[]');
    
    console.log(`Mappings in Redis: ${Object.keys(redisMappings).length}`);
    console.log(`Prisms in Redis: ${redisPrisms.length}`);
    
    await redis.quit();
    console.log('\n✓ Migration complete!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateToRedis().catch(console.error);

