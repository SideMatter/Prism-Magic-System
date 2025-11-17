/**
 * Manual extraction of spells that appear in multiple prisms
 * Based on pages 4-14 of the PDF
 */

const fs = require('fs');

// Based on careful reading of the PDF, these spells appear in multiple prisms:
const multiPrismSpells = {
  // Spells that explicitly appear in multiple lists
  "Shield": ["ARCANE PRISM", "DIVINE PRISM"],
  "Fireball": ["ELEMENTAL PRISM", "FIENDISH PRISM"],
  "Flame Strike": ["DIVINE PRISM", "ELEMENTAL PRISM"],
  "Wall of Fire": ["ELEMENTAL PRISM", "FIENDISH PRISM"],
  "Hellish Rebuke": ["FIENDISH PRISM", "ELEMENTAL PRISM"],
  "Scorching Ray": ["ELEMENTAL PRISM", "SOLAR PRISM"],
  "Cure Wounds": ["DIVINE PRISM", "FEY PRISM"],
  "Lesser Restoration": ["DIVINE PRISM", "FEY PRISM"],
  "Greater Restoration": ["DIVINE PRISM", "FEY PRISM"],
  "Revivify": ["DIVINE PRISM", "FEY PRISM"],
  "Raise Dead": ["DIVINE PRISM", "SHADOW PRISM"],
  "Resurrection": ["DIVINE PRISM", "SHADOW PRISM"],
  "True Resurrection": ["DIVINE PRISM", "SHADOW PRISM"],
  "Speak with Dead": ["SHADOW PRISM", "DIVINE PRISM"],
  "Gentle Repose": ["SHADOW PRISM", "DIVINE PRISM"],
  "Animate Dead": ["SHADOW PRISM", "FIENDISH PRISM"],
  "Create Undead": ["SHADOW PRISM", "FIENDISH PRISM"],
  "Darkness": ["FIENDISH PRISM", "SHADOW PRISM"],
  "Invisibility": ["SHADOW PRISM", "ARCANE PRISM"],
  "Greater Invisibility": ["SHADOW PRISM", "ARCANE PRISM"],
  "Disguise Self": ["SHADOW PRISM", "ARCANE PRISM"],
  "Alter Self": ["ARCANE PRISM", "FEY PRISM"],
  "Polymorph": ["ARCANE PRISM", "FEY PRISM"],
  "True Polymorph": ["ARCANE PRISM", "FEY PRISM"],
  "Shapechange": ["FEY PRISM", "ARCANE PRISM"],
  "Banishment": ["SOLAR PRISM", "DIVINE PRISM"],
  "Plane Shift": ["SOLAR PRISM", "DIVINE PRISM"],
  "Gate": ["SOLAR PRISM", "DIVINE PRISM", "FIENDISH PRISM"],
  "Teleport": ["SOLAR PRISM", "ARCANE PRISM"],
  "Dimension Door": ["SOLAR PRISM", "ARCANE PRISM"],
  "Misty Step": ["FEY PRISM", "ARCANE PRISM"],
  "Blink": ["SOLAR PRISM", "ARCANE PRISM"],
  "Etherealness": ["ARCANE PRISM", "SHADOW PRISM"],
  "Fear": ["SHADOW PRISM", "FIENDISH PRISM"],
  "Charm Person": ["FEY PRISM", "ARCANE PRISM"],
  "Dominate Person": ["FIENDISH PRISM", "FEY PRISM"],
  "Dominate Monster": ["FIENDISH PRISM", "FEY PRISM"],
  "Hold Person": ["FEY PRISM", "ARCANE PRISM"],
  "Suggestion": ["FEY PRISM", "ARCANE PRISM"],
  "Hypnotic Pattern": ["FEY PRISM", "ARCANE PRISM"],
  "Sleep": ["FEY PRISM", "ARCANE PRISM"],
};

console.log(`Found ${Object.keys(multiPrismSpells).length} spells with multiple prisms\n`);

// Now let's update the mappings to support arrays
const currentMappings = JSON.parse(fs.readFileSync('data/spell-prism-mappings.json', 'utf-8'));

// Convert to array format where needed
const updatedMappings = {};

for (const [spell, prism] of Object.entries(currentMappings)) {
  if (multiPrismSpells[spell]) {
    // This spell has multiple prisms
    updatedMappings[spell] = multiPrismSpells[spell];
    console.log(`✓ ${spell}: ${multiPrismSpells[spell].join(', ')}`);
  } else {
    // Keep as string for single-prism spells
    updatedMappings[spell] = prism;
  }
}

// Save the updated mappings
fs.writeFileSync('data/spell-prism-mappings-multi.json', JSON.stringify(updatedMappings, null, 2));
console.log(`\n✓ Saved updated mappings to spell-prism-mappings-multi.json`);
console.log(`  - ${Object.values(updatedMappings).filter(v => Array.isArray(v)).length} spells with multiple prisms`);
console.log(`  - ${Object.values(updatedMappings).filter(v => !Array.isArray(v)).length} spells with single prism`);

