#!/usr/bin/env node

/**
 * Copy data from dev Convex to prod Convex
 */

const { ConvexHttpClient } = require('convex/browser');

const DEV_URL = 'https://decisive-ram-913.convex.cloud';
const PROD_URL = 'https://astute-mole-891.convex.cloud';

async function main() {
  console.log('Copying data from dev to prod Convex...\n');
  
  const devClient = new ConvexHttpClient(DEV_URL);
  const prodClient = new ConvexHttpClient(PROD_URL);
  
  // 1. Copy prisms
  console.log('📋 Copying prisms...');
  const prisms = await devClient.query('prisms:list', {});
  for (const prism of prisms) {
    try {
      await prodClient.mutation('prisms:add', { name: prism });
      console.log(`  ✓ Added prism: ${prism}`);
    } catch (e) {
      console.log(`  - Skipped prism: ${prism} (may already exist)`);
    }
  }
  
  // 2. Copy spell mappings
  console.log('\n📋 Copying spell mappings...');
  const mappings = await devClient.query('spellMappings:getAll', {});
  let mappingCount = 0;
  for (const mapping of mappings) {
    try {
      await prodClient.mutation('spellMappings:set', {
        spellName: mapping.spellName,
        prisms: mapping.prisms,
      });
      mappingCount++;
    } catch (e) {
      // Ignore errors for existing mappings
    }
  }
  console.log(`  ✓ Copied ${mappingCount} spell mappings`);
  
  // 3. Copy players
  console.log('\n📋 Copying players...');
  const players = await devClient.query('players:list', {});
  for (const player of players) {
    try {
      await prodClient.mutation('players:create', {
        playerId: player.playerId,
        name: player.name,
        maxSpellLevel: player.maxSpellLevel,
        prisms: player.prisms,
      });
      console.log(`  ✓ Added player: ${player.name}`);
    } catch (e) {
      console.log(`  - Skipped player: ${player.name} (may already exist)`);
    }
  }
  
  // 4. Copy custom spells
  console.log('\n📋 Copying custom spells...');
  const customSpells = await devClient.query('customSpells:list', {});
  for (const spell of customSpells) {
    try {
      await prodClient.mutation('customSpells:create', {
        name: spell.name,
        level: spell.level,
        school: spell.school,
        castingTime: spell.castingTime || spell.casting_time,
        range: spell.range,
        components: spell.components,
        duration: spell.duration,
        description: spell.description,
        prism: spell.prism,
      });
      console.log(`  ✓ Added custom spell: ${spell.name}`);
    } catch (e) {
      console.log(`  - Skipped custom spell: ${spell.name} (may already exist)`);
    }
  }
  
  // 5. Copy custom classes
  console.log('\n📋 Copying custom classes...');
  const customClasses = await devClient.query('customClasses:list', {});
  for (const cls of customClasses) {
    try {
      await prodClient.mutation('customClasses:create', {
        classId: cls.classId,
        name: cls.name,
        hitDie: cls.hitDie,
        primaryAbilities: cls.primaryAbilities,
        savingThrows: cls.savingThrows,
        statPriority: cls.statPriority,
        description: cls.description,
        prism: cls.prism,
        type: cls.type,
        spellList: cls.spellList,
        features: cls.features,
      });
      console.log(`  ✓ Added custom class: ${cls.name}`);
    } catch (e) {
      console.log(`  - Skipped custom class: ${cls.name} (may already exist)`);
    }
  }
  
  console.log('\n✅ Data copy complete!');
}

main().catch(console.error);
