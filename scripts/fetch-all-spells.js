#!/usr/bin/env node

/**
 * Script to fetch all spells from D&D 5e API slowly and save to a JSON file
 * This avoids rate limiting by using generous delays
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.dnd5eapi.co/api/2014';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'all-spells.json');

// Very generous delay to avoid rate limiting
const DELAY_MS = 300;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait longer
        const waitTime = 2000 * Math.pow(2, attempt);
        console.log(`  Rate limited, waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`  Error: ${error.message}, retrying in ${waitTime}ms...`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
}

async function main() {
  console.log('Fetching spell list from D&D 5e API...');
  
  const listData = await fetchWithRetry(`${BASE_URL}/spells`);
  const spellList = listData.results;
  
  console.log(`Found ${spellList.length} spells to fetch`);
  
  const allSpells = [];
  const failedSpells = [];
  
  for (let i = 0; i < spellList.length; i++) {
    const spell = spellList[i];
    const progress = `[${i + 1}/${spellList.length}]`;
    
    try {
      process.stdout.write(`${progress} Fetching ${spell.name}...`);
      
      const spellData = await fetchWithRetry(`${BASE_URL}${spell.url.replace('/api/2014', '')}`);
      
      // Format spell data
      const components = spellData.components?.join(', ') || '';
      const material = spellData.material ? `, M (${spellData.material})` : '';
      const componentsStr = components + material;
      
      const description = Array.isArray(spellData.desc)
        ? spellData.desc.join('\n\n')
        : spellData.desc || '';
      
      const higherLevel = spellData.higher_level
        ? (Array.isArray(spellData.higher_level)
            ? spellData.higher_level.join('\n\n')
            : spellData.higher_level)
        : '';
      
      const fullDescription = higherLevel
        ? `${description}\n\n**At Higher Levels.** ${higherLevel}`
        : description;
      
      allSpells.push({
        name: spellData.name,
        level: spellData.level,
        school: spellData.school?.name || 'Unknown',
        casting_time: spellData.casting_time || 'Unknown',
        range: spellData.range || 'Unknown',
        components: componentsStr || 'Unknown',
        duration: spellData.duration || 'Unknown',
        description: fullDescription,
      });
      
      console.log(' ✓');
      
      // Delay between requests
      await sleep(DELAY_MS);
      
    } catch (error) {
      console.log(` ✗ ${error.message}`);
      failedSpells.push(spell.name);
    }
  }
  
  console.log(`\nSuccessfully fetched ${allSpells.length}/${spellList.length} spells`);
  
  if (failedSpells.length > 0) {
    console.log(`Failed to fetch: ${failedSpells.join(', ')}`);
  }
  
  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allSpells, null, 2));
  console.log(`\nSaved to ${OUTPUT_FILE}`);
  
  // Also output stats
  console.log('\nSpell breakdown by level:');
  for (let level = 0; level <= 9; level++) {
    const count = allSpells.filter(s => s.level === level).length;
    console.log(`  Level ${level}: ${count} spells`);
  }
}

main().catch(console.error);
