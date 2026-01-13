#!/usr/bin/env node

/**
 * Script to import spells from JSON file to Convex
 */

const { ConvexHttpClient } = require('convex/browser');
const fs = require('fs');
const path = require('path');

const SPELLS_FILE = path.join(__dirname, '..', 'data', 'all-spells.json');

async function main() {
  // Get Convex URL from environment
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    // Try to read from .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/);
      if (match) {
        process.env.NEXT_PUBLIC_CONVEX_URL = match[1].trim();
      }
    }
  }
  
  const finalUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!finalUrl) {
    console.error('Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable not set');
    console.error('Set it in .env.local or pass it as an environment variable');
    process.exit(1);
  }
  
  console.log(`Connecting to Convex at ${finalUrl}`);
  const client = new ConvexHttpClient(finalUrl);
  
  // Load spells from file
  if (!fs.existsSync(SPELLS_FILE)) {
    console.error(`Error: Spells file not found at ${SPELLS_FILE}`);
    console.error('Run "node scripts/fetch-all-spells.js" first to fetch spells');
    process.exit(1);
  }
  
  const spells = JSON.parse(fs.readFileSync(SPELLS_FILE, 'utf-8'));
  console.log(`Loaded ${spells.length} spells from ${SPELLS_FILE}`);
  
  // Import in batches to avoid hitting limits
  const BATCH_SIZE = 50;
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (let i = 0; i < spells.length; i += BATCH_SIZE) {
    const batch = spells.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(spells.length / BATCH_SIZE);
    
    console.log(`Importing batch ${batchNum}/${totalBatches} (${batch.length} spells)...`);
    
    try {
      const result = await client.mutation('cachedSpells:bulkImport', {
        spells: batch,
        clearExisting: i === 0, // Only clear on first batch
      });
      
      totalImported += result.imported;
      totalSkipped += result.skipped;
      
      console.log(`  ✓ Imported: ${result.imported}, Skipped: ${result.skipped}`);
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    
    // Small delay between batches
    if (i + BATCH_SIZE < spells.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\nImport complete!`);
  console.log(`  Total imported: ${totalImported}`);
  console.log(`  Total skipped: ${totalSkipped}`);
}

main().catch(console.error);
