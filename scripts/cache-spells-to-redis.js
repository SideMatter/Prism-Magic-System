/**
 * Script to fetch all spells from D&D 5e API and cache them in Redis
 * This prevents timeout issues on Vercel by pre-populating the cache
 */

const http = require('http');
const https = require('https');

async function fetchAllSpells() {
  console.log('\n🔮 Fetching all spells from D&D 5e API...\n');
  console.log('='.repeat(60));
  
  // Step 1: Get list of all spells
  console.log('\n1️⃣  Getting spell list...');
  const spellListData = await new Promise((resolve, reject) => {
    const makeRequest = (url) => {
      https.get(url, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location.startsWith('http') 
            ? res.headers.location 
            : `https://www.dnd5eapi.co${res.headers.location}`;
          console.log(`   ↪ Following redirect to ${redirectUrl}`);
          return makeRequest(redirectUrl);
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
        res.on('error', reject);
      });
    };
    makeRequest('https://www.dnd5eapi.co/api/spells');
  });
  
  const spellList = spellListData.results;
  console.log(`   ✓ Found ${spellList.length} spells`);
  
  // Step 2: Fetch all spell details in batches
  console.log('\n2️⃣  Fetching spell details (this may take a few minutes)...');
  const BATCH_SIZE = 10;  // Smaller batches to avoid rate limiting
  const BATCH_DELAY = 500; // Longer delay between batches
  const allSpells = [];
  
  for (let i = 0; i < spellList.length; i += BATCH_SIZE) {
    const batch = spellList.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(spell => {
      return new Promise((resolve) => {
        const makeRequest = (url) => {
          https.get(url, (res) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
              const redirectUrl = res.headers.location.startsWith('http') 
                ? res.headers.location 
                : `https://www.dnd5eapi.co${res.headers.location}`;
              return makeRequest(redirectUrl);
            }
            
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
            try {
              const spellData = JSON.parse(data);
              
              // Format components
              const components = spellData.components?.join(", ") || "";
              const material = spellData.material ? `, M (${spellData.material})` : "";
              const componentsStr = components + material;
              
              // Format description
              const description = Array.isArray(spellData.desc)
                ? spellData.desc.join("\n\n")
                : spellData.desc || "";
              
              // Format higher level description if available
              const higherLevel = spellData.higher_level
                ? (Array.isArray(spellData.higher_level)
                    ? spellData.higher_level.join("\n\n")
                    : spellData.higher_level)
                : "";
              
              const fullDescription = higherLevel
                ? `${description}\n\n${higherLevel}`
                : description;
              
              resolve({
                name: spellData.name,
                level: spellData.level,
                school: spellData.school?.name || "Unknown",
                casting_time: spellData.casting_time || "Unknown",
                range: spellData.range || "Unknown",
                components: componentsStr || "Unknown",
                duration: spellData.duration || "Unknown",
                description: fullDescription,
              });
            } catch (error) {
              console.error(`   ❌ Error parsing spell ${spell.index}:`, error.message);
              resolve(null);
            }
          });
            res.on('error', () => resolve(null));
          });
        };
        makeRequest(`https://www.dnd5eapi.co${spell.url}`);
      });
    });
    
    const batchSpells = await Promise.all(batchPromises);
    allSpells.push(...batchSpells.filter(s => s !== null));
    
    const progress = Math.round((allSpells.length / spellList.length) * 100);
    process.stdout.write(`\r   Progress: ${allSpells.length}/${spellList.length} (${progress}%)`);
    
    // Add delay between batches
    if (i + BATCH_SIZE < spellList.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  console.log('\n   ✓ Successfully fetched all spell details');
  
  return allSpells;
}

async function cacheToRedis(spells) {
  console.log('\n3️⃣  Saving to Redis cache...');
  
  // Call the API endpoint with refresh=true to populate the cache
  const spellsJson = JSON.stringify(spells);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/spells?refresh=true',
      method: 'GET',
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`   ✓ API returned ${result.length} spells`);
          resolve(result);
        } catch (error) {
          console.error('   ❌ Error parsing API response');
          reject(error);
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function uploadDirectly(spells) {
  console.log('\n3️⃣  Uploading directly to Redis...');
  
  // Use the storage module to save directly
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  
  try {
    await redis.set('dnd-api-spells-cache', JSON.stringify(spells));
    await redis.set('dnd-api-spells-cache-timestamp', Date.now().toString());
    console.log(`   ✓ Saved ${spells.length} spells to Redis`);
    
    // Verify
    const cached = await redis.get('dnd-api-spells-cache');
    const cachedSpells = JSON.parse(cached);
    console.log(`   ✓ Verified: ${cachedSpells.length} spells in cache`);
    
    await redis.quit();
    return true;
  } catch (error) {
    console.error('   ❌ Error saving to Redis:', error.message);
    await redis.quit();
    return false;
  }
}

async function main() {
  try {
    // Fetch all spells from API
    const spells = await fetchAllSpells();
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✨ Successfully fetched ${spells.length} spells!\n`);
    
    // Upload directly to Redis
    const success = await uploadDirectly(spells);
    
    if (success) {
      console.log('\n' + '='.repeat(60));
      console.log('\n✅ SUCCESS! All spells cached in Redis.');
      console.log('   Deploy to Vercel and it will use this cache!\n');
    } else {
      console.log('\n❌ Failed to cache spells. Check Redis connection.');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

