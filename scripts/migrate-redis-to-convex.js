/**
 * Migrate remaining data from Redis to Convex
 * 
 * Usage: node scripts/migrate-redis-to-convex.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

async function migrate() {
  loadEnv();
  
  const redisUrl = process.env.REDIS_URL;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL not found in .env.local');
    process.exit(1);
  }
  
  if (!convexUrl) {
    console.error('❌ NEXT_PUBLIC_CONVEX_URL not found in .env.local');
    process.exit(1);
  }
  
  console.log('🔄 Migrating data from Redis to Convex...\n');
  
  // Connect to Redis
  const Redis = require('ioredis');
  const redis = new Redis(redisUrl);
  
  console.log('✓ Connected to Redis');
  
  // Import Convex client
  const { ConvexHttpClient } = require('convex/browser');
  const { api } = require('../convex/_generated/api.js');
  const convex = new ConvexHttpClient(convexUrl);
  
  console.log('✓ Connected to Convex\n');
  
  // 1. Migrate custom spells
  console.log('📜 Checking for custom spells in Redis...');
  try {
    const customSpellsData = await redis.get('custom-spells');
    if (customSpellsData) {
      const customSpells = JSON.parse(customSpellsData);
      console.log(`   Found ${customSpells.length} custom spells in Redis`);
      
      if (customSpells.length > 0) {
        // Format for Convex
        const formattedSpells = customSpells.map(spell => ({
          name: spell.name,
          level: spell.level,
          school: spell.school,
          casting_time: spell.casting_time,
          range: spell.range,
          components: spell.components,
          duration: spell.duration,
          description: spell.description,
          prism: spell.prism,
        }));
        
        const result = await convex.mutation(api.customSpells.bulkImport, { spells: formattedSpells });
        console.log(`   ✓ Imported ${result.imported} custom spells (${result.skipped} already existed)`);
      }
    } else {
      console.log('   No custom spells found in Redis');
    }
  } catch (error) {
    console.error('   ❌ Error migrating custom spells:', error.message);
  }
  
  // 2. Double-check players
  console.log('\n👥 Checking for players in Redis...');
  try {
    const playersData = await redis.get('prism:players');
    if (playersData) {
      const players = JSON.parse(playersData);
      console.log(`   Found ${players.length} players in Redis`);
      
      if (players.length > 0) {
        const result = await convex.mutation(api.players.bulkImport, { players });
        console.log(`   ✓ Imported ${result.imported} players (${result.skipped} already existed)`);
      }
    } else {
      console.log('   No players found in Redis');
    }
  } catch (error) {
    console.error('   ❌ Error migrating players:', error.message);
  }
  
  // 3. Double-check spell mappings
  console.log('\n🗺️  Checking for spell mappings in Redis...');
  try {
    const mappingsData = await redis.get('spell-prism-mappings');
    if (mappingsData) {
      const mappings = JSON.parse(mappingsData);
      const count = Object.keys(mappings).length;
      console.log(`   Found ${count} spell mappings in Redis`);
      
      if (count > 0) {
        const mappingsArray = Object.entries(mappings).map(([spellName, prisms]) => ({
          spellName,
          prisms,
        }));
        const result = await convex.mutation(api.spellMappings.bulkImport, { mappings: mappingsArray });
        console.log(`   ✓ Imported ${result.imported} new, ${result.updated} updated mappings`);
      }
    } else {
      console.log('   No spell mappings found in Redis');
    }
  } catch (error) {
    console.error('   ❌ Error migrating spell mappings:', error.message);
  }
  
  // 4. Check for prisms
  console.log('\n💎 Checking for prisms in Redis...');
  try {
    const prismsData = await redis.get('prisms');
    if (prismsData) {
      const prisms = JSON.parse(prismsData);
      console.log(`   Found ${prisms.length} prisms in Redis`);
      
      if (prisms.length > 0) {
        const result = await convex.mutation(api.prisms.bulkImport, { prisms });
        console.log(`   ✓ Imported ${result.imported} prisms`);
      }
    } else {
      console.log('   No prisms found in Redis');
    }
  } catch (error) {
    console.error('   ❌ Error migrating prisms:', error.message);
  }
  
  // 5. Check for custom classes
  console.log('\n⚔️  Checking for custom classes in Redis...');
  try {
    const classesData = await redis.get('classes');
    if (classesData) {
      const classesObj = JSON.parse(classesData);
      const customClasses = classesObj.customClasses || [];
      console.log(`   Found ${customClasses.length} custom classes in Redis`);
      
      if (customClasses.length > 0) {
        const result = await convex.mutation(api.customClasses.bulkImport, { classes: customClasses });
        console.log(`   ✓ Imported ${result.imported} new, ${result.updated} updated custom classes`);
      }
    } else {
      console.log('   No custom classes found in Redis');
    }
  } catch (error) {
    console.error('   ❌ Error migrating custom classes:', error.message);
  }
  
  // Close Redis connection
  await redis.quit();
  
  console.log('\n✅ Migration complete!');
  console.log('\n📝 You can now safely remove Redis dependencies if desired.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
