/**
 * Script to initialize prisms in Redis
 * Run this after setting up Redis to ensure all prisms are available
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRISMS_FILE = path.join(DATA_DIR, 'prisms.json');

// Default prisms based on what's used in the mappings
const DEFAULT_PRISMS = [
  "ARCANE PRISM",
  "DIVINE PRISM",
  "ELEMENTAL PRISM",
  "FEY PRISM",
  "FIENDISH PRISM",
  "SHADOW PRISM",
  "SOLAR PRISM"
];

async function initPrisms() {
  // First, ensure file system has the prisms
  if (!fs.existsSync(PRISMS_FILE)) {
    console.log('Creating prisms.json file...');
    fs.writeFileSync(PRISMS_FILE, JSON.stringify(DEFAULT_PRISMS, null, 2));
    console.log('✓ Created prisms.json with default prisms');
  } else {
    const existing = JSON.parse(fs.readFileSync(PRISMS_FILE, 'utf-8'));
    console.log(`✓ prisms.json already exists with ${existing.length} prisms`);
    console.log('  Prisms:', existing.join(', '));
  }

  // If Redis is configured, initialize there too
  if (process.env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL);
      
      console.log('\nInitializing prisms in Redis...');
      
      // Get current prisms from file
      const prisms = JSON.parse(fs.readFileSync(PRISMS_FILE, 'utf-8'));
      
      // Set in Redis
      await redis.set('prisms', JSON.stringify(prisms));
      await redis.set('prisms-timestamp', Date.now().toString());
      
      // Verify
      const redisPrisms = JSON.parse(await redis.get('prisms') || '[]');
      console.log(`✓ Initialized ${redisPrisms.length} prisms in Redis`);
      console.log('  Prisms:', redisPrisms.join(', '));
      
      await redis.quit();
    } catch (error) {
      console.error('Error initializing Redis:', error.message);
      console.log('(This is OK if Redis is not available)');
    }
  } else {
    console.log('\nRedis not configured (REDIS_URL not set)');
    console.log('Prisms will be stored in file system only');
  }
}

initPrisms().catch(console.error);

