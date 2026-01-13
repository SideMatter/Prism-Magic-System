/**
 * Export data from Redis/Upstash/files for migration to Convex
 * 
 * Usage: node scripts/export-data.js
 * 
 * This script exports all data to a JSON file that can be imported into Convex.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

async function exportData() {
  console.log('📤 Exporting data for migration...\n');
  
  const exportData = {
    prisms: [],
    spellMappings: {},
    players: [],
    customSpells: [],
    customClasses: [],
    exportedAt: new Date().toISOString(),
  };

  // 1. Export prisms
  const prismsFile = path.join(DATA_DIR, 'prisms.json');
  if (fs.existsSync(prismsFile)) {
    try {
      const prisms = JSON.parse(fs.readFileSync(prismsFile, 'utf-8'));
      exportData.prisms = prisms;
      console.log(`✓ Exported ${prisms.length} prisms`);
    } catch (e) {
      console.log('⚠ Could not read prisms.json');
    }
  } else {
    // Default prisms
    exportData.prisms = [
      "ARCANE PRISM",
      "DIVINE PRISM",
      "ELEMENTAL PRISM",
      "FEY PRISM",
      "FIENDISH PRISM",
      "SHADOW PRISM",
      "SOLAR PRISM",
    ];
    console.log(`✓ Using ${exportData.prisms.length} default prisms`);
  }

  // 2. Export spell-prism mappings
  const mappingsFile = path.join(DATA_DIR, 'spell-prism-mappings.json');
  if (fs.existsSync(mappingsFile)) {
    try {
      const mappings = JSON.parse(fs.readFileSync(mappingsFile, 'utf-8'));
      exportData.spellMappings = mappings;
      console.log(`✓ Exported ${Object.keys(mappings).length} spell mappings`);
    } catch (e) {
      console.log('⚠ Could not read spell-prism-mappings.json');
    }
  }

  // 3. Export players
  const playersFile = path.join(DATA_DIR, 'players.json');
  if (fs.existsSync(playersFile)) {
    try {
      const players = JSON.parse(fs.readFileSync(playersFile, 'utf-8'));
      exportData.players = players;
      console.log(`✓ Exported ${players.length} players`);
    } catch (e) {
      console.log('⚠ Could not read players.json');
    }
  }

  // 4. Export custom spells
  const customSpellsFile = path.join(DATA_DIR, 'custom-spells.json');
  if (fs.existsSync(customSpellsFile)) {
    try {
      const customSpells = JSON.parse(fs.readFileSync(customSpellsFile, 'utf-8'));
      exportData.customSpells = customSpells;
      console.log(`✓ Exported ${customSpells.length} custom spells`);
    } catch (e) {
      console.log('⚠ Could not read custom-spells.json');
    }
  }

  // 5. Export custom classes
  const classesFile = path.join(DATA_DIR, 'prism-classes.json');
  if (fs.existsSync(classesFile)) {
    try {
      const classesData = JSON.parse(fs.readFileSync(classesFile, 'utf-8'));
      exportData.customClasses = classesData.customClasses || [];
      console.log(`✓ Exported ${exportData.customClasses.length} custom classes`);
    } catch (e) {
      console.log('⚠ Could not read prism-classes.json');
    }
  }

  // Write export file
  const exportFile = path.join(DATA_DIR, 'migration-export.json');
  fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2), 'utf-8');
  
  console.log(`\n📁 Export saved to: ${exportFile}`);
  console.log('\n📋 Summary:');
  console.log(`   - Prisms: ${exportData.prisms.length}`);
  console.log(`   - Spell Mappings: ${Object.keys(exportData.spellMappings).length}`);
  console.log(`   - Players: ${exportData.players.length}`);
  console.log(`   - Custom Spells: ${exportData.customSpells.length}`);
  console.log(`   - Custom Classes: ${exportData.customClasses.length}`);
  
  console.log('\n✅ Export complete! Next step: Run the import script after setting up Convex.');
  console.log('   npx convex dev --once --configure=new');
  console.log('   node scripts/import-to-convex.js');
}

exportData().catch(console.error);
