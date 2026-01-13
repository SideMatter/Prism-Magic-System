/**
 * Import data into Convex from migration export
 * 
 * Usage: node scripts/import-to-convex.js
 * 
 * Prerequisites:
 * 1. Run npx convex dev --once --configure=new to create a Convex project
 * 2. Ensure NEXT_PUBLIC_CONVEX_URL is set in .env.local
 * 3. Run node scripts/export-data.js to create migration-export.json
 */

const fs = require('fs');
const path = require('path');
const { ConvexHttpClient } = require('convex/browser');

const DATA_DIR = path.join(process.cwd(), 'data');

// Load environment variables from .env.local
function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }
}

async function importData() {
  loadEnv();
  
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error('❌ NEXT_PUBLIC_CONVEX_URL is not set in .env.local');
    console.log('\nTo fix this:');
    console.log('1. Run: npx convex dev --once --configure=new');
    console.log('2. This will create .env.local with your Convex URL');
    process.exit(1);
  }

  const exportFile = path.join(DATA_DIR, 'migration-export.json');
  if (!fs.existsSync(exportFile)) {
    console.error('❌ migration-export.json not found');
    console.log('\nRun first: node scripts/export-data.js');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
  console.log('📥 Importing data to Convex...\n');
  console.log(`Convex URL: ${convexUrl}\n`);

  // We need to dynamically import the api since it's generated
  const apiPath = path.join(process.cwd(), 'convex', '_generated', 'api.js');
  if (!fs.existsSync(apiPath)) {
    console.error('❌ Convex API not generated yet');
    console.log('\nRun first: npx convex dev --once');
    process.exit(1);
  }
  
  const { api } = require('../convex/_generated/api.js');
  const client = new ConvexHttpClient(convexUrl);

  // 1. Import prisms
  if (data.prisms && data.prisms.length > 0) {
    try {
      const result = await client.mutation(api.prisms.bulkImport, { prisms: data.prisms });
      console.log(`✓ Imported ${result.imported}/${result.total} prisms`);
    } catch (e) {
      console.error('❌ Error importing prisms:', e.message);
    }
  }

  // 2. Import spell mappings
  if (data.spellMappings && Object.keys(data.spellMappings).length > 0) {
    try {
      const mappingsArray = Object.entries(data.spellMappings).map(([spellName, prisms]) => ({
        spellName,
        prisms,
      }));
      const result = await client.mutation(api.spellMappings.bulkImport, { mappings: mappingsArray });
      console.log(`✓ Imported ${result.imported} new, ${result.updated} updated spell mappings`);
    } catch (e) {
      console.error('❌ Error importing spell mappings:', e.message);
    }
  }

  // 3. Import players
  if (data.players && data.players.length > 0) {
    try {
      const result = await client.mutation(api.players.bulkImport, { players: data.players });
      console.log(`✓ Imported ${result.imported}/${result.total} players (${result.skipped} skipped)`);
    } catch (e) {
      console.error('❌ Error importing players:', e.message);
    }
  }

  // 4. Import custom spells
  if (data.customSpells && data.customSpells.length > 0) {
    try {
      const result = await client.mutation(api.customSpells.bulkImport, { spells: data.customSpells });
      console.log(`✓ Imported ${result.imported}/${result.total} custom spells (${result.skipped} skipped)`);
    } catch (e) {
      console.error('❌ Error importing custom spells:', e.message);
    }
  }

  // 5. Import custom classes
  if (data.customClasses && data.customClasses.length > 0) {
    try {
      const result = await client.mutation(api.customClasses.bulkImport, { classes: data.customClasses });
      console.log(`✓ Imported ${result.imported} new, ${result.updated} updated custom classes`);
    } catch (e) {
      console.error('❌ Error importing custom classes:', e.message);
    }
  }

  console.log('\n✅ Import complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Verify data in Convex dashboard: https://dashboard.convex.dev');
  console.log('2. Test the app: npm run dev');
}

importData().catch(console.error);
