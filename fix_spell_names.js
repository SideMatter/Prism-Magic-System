const fs = require('fs');
const path = require('path');

const MAPPINGS_FILE = path.join(__dirname, "data", "spell-prism-mappings.json");

// Read current mappings
const mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));

// Common fixes for split spell names
const fixes = {
  // Merge common fragments
  "Dead": null, // Will be merged with "Toll The"
  "Toll The": "Toll the Dead",
  "Lesser": null,
  "Restoration": "Lesser Restoration", 
  "Holy": null,
  "Weapon": "Holy Weapon",
  "Mass": null, // Context dependent
  "Cure Wounds": "Mass Cure Wounds", // If "Mass" exists separately
  // Add more as needed
};

// Fix known issues
const fixedMappings = {};
const toRemove = new Set();

for (const [spell, prism] of Object.entries(mappings)) {
  // Handle "Toll the Dead" - if we have "Dead" and "Toll The", merge them
  if (spell === "Dead" && mappings["Toll The"]) {
    fixedMappings["Toll the Dead"] = mappings["Toll The"];
    toRemove.add("Dead");
    toRemove.add("Toll The");
    continue;
  }
  
  // Handle "Lesser Restoration"
  if (spell === "Restoration" && mappings["Lesser"]) {
    fixedMappings["Lesser Restoration"] = mappings["Lesser"];
    toRemove.add("Restoration");
    toRemove.add("Lesser");
    continue;
  }
  
  // Handle "Holy Weapon"
  if (spell === "Weapon" && mappings["Holy"]) {
    fixedMappings["Holy Weapon"] = mappings["Holy"];
    toRemove.add("Weapon");
    toRemove.add("Holy");
    continue;
  }
  
  // Skip if marked for removal
  if (toRemove.has(spell)) continue;
  
  // Keep the original
  fixedMappings[spell] = prism;
}

// Write fixed mappings
fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(fixedMappings, null, 2));

console.log(`✅ Fixed mappings. Removed ${Object.keys(mappings).length - Object.keys(fixedMappings).length} duplicate/split entries`);
console.log(`📊 Total spells: ${Object.keys(fixedMappings).length}`);

