/**
 * Migrate multi-prism mappings to Redis
 */
const fs = require('fs');
const Redis = require('ioredis');

// Read REDIS_URL from .env.local
function getRedisUrl() {
  const envPath = require('path').join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/REDIS_URL=([^\n]+)/);
    if (match) return match[1].trim();
  }
  return process.env.REDIS_URL;
}

async function migrate() {
  console.log('🔄 Migrating multi-prism spell mappings to Redis...\n');

  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    console.error('❌ ERROR: REDIS_URL not found');
    process.exit(1);
  }

  const redis = new Redis(redisUrl);

  try {
    // Load new mappings (with arrays for multi-prism spells)
    const mappings = JSON.parse(fs.readFileSync('data/spell-prism-mappings.json', 'utf-8'));
    
    const singlePrism = Object.values(mappings).filter(v => !Array.isArray(v)).length;
    const multiPrism = Object.values(mappings).filter(v => Array.isArray(v)).length;
    
    console.log(`📊 Statistics:`);
    console.log(`  - ${singlePrism} spells with single prism`);
    console.log(`  - ${multiPrism} spells with multiple prisms`);
    console.log(`  - ${Object.keys(mappings).length} total spells\n`);
    
    // Save to Redis
    console.log('💾 Saving to Redis...');
    await redis.set('spell-prism-mappings', JSON.stringify(mappings));
    await redis.set('spell-prism-mappings-timestamp', Date.now());
    
    // Verify
    console.log('\n✓ Verifying...');
    const stored = JSON.parse(await redis.get('spell-prism-mappings'));
    const storedMulti = Object.values(stored).filter(v => Array.isArray(v)).length;
    
    console.log(`✓ Verified: ${storedMulti} multi-prism spells in Redis`);
    
    // Show some examples
    console.log('\n📝 Examples of multi-prism spells:');
    let count = 0;
    for (const [spell, prisms] of Object.entries(stored)) {
      if (Array.isArray(prisms) && count < 5) {
        console.log(`  ${spell}: ${prisms.join(', ')}`);
        count++;
      }
    }
    
    console.log('\n✅ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

migrate();

