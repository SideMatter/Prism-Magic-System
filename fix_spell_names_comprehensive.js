const fs = require('fs');
const path = require('path');

const MAPPINGS_FILE = path.join(__dirname, "data", "spell-prism-mappings.json");

const mappings = JSON.parse(fs.readFileSync(MAPPINGS_FILE, 'utf-8'));
const fixedMappings = {};
const processed = new Set();

// Common split spell patterns to merge
const mergePatterns = [
  { parts: ["Toll The", "Dead"], result: "Toll the Dead" },
  { parts: ["Lesser", "Restoration"], result: "Lesser Restoration" },
  { parts: ["Holy", "Weapon"], result: "Holy Weapon" },
  { parts: ["Crown Of", "Stars"], result: "Crown of Stars" },
  { parts: ["Misty", "Step"], result: "Misty Step" },
  { parts: ["Find", "Traps"], result: "Find Traps" },
  { parts: ["Detect Poison", "And Disease"], result: "Detect Poison and Disease" },
  { parts: ["Pass", "Without Trace"], result: "Pass without Trace" },
  { parts: ["Speak", "With Plants"], result: "Speak with Plants" },
  { parts: ["Speak", "With Animals"], result: "Speak with Animals" },
  { parts: ["Commune", "With Nature"], result: "Commune with Nature" },
  { parts: ["Conjure", "Woodland Beings"], result: "Conjure Woodland Beings" },
  { parts: ["Conjure", "Volley"], result: "Conjure Volley" },
  { parts: ["Conjure", "Fey"], result: "Conjure Fey" },
  { parts: ["Conjure", "Animals"], result: "Conjure Animals" },
  { parts: ["Conjure", "Barrage"], result: "Conjure Barrage" },
  { parts: ["Conjure", "Minor Elementals"], result: "Conjure Minor Elementals" },
  { parts: ["Conjure", "Elemental"], result: "Conjure Elemental" },
  { parts: ["Conjure", "Celestial"], result: "Conjure Celestial" },
  { parts: ["Conjure", "Aberration"], result: "Summon Aberration" },
  { parts: ["Summon", "Beast"], result: "Summon Beast" },
  { parts: ["Summon", "Fey"], result: "Summon Fey" },
  { parts: ["Summon", "Elemental"], result: "Summon Elemental" },
  { parts: ["Summon", "Fiend"], result: "Summon Fiend" },
  { parts: ["Summon", "Shadowspawn"], result: "Summon Shadowspawn" },
  { parts: ["Summon", "Undead"], result: "Summon Undead" },
  { parts: ["Summon", "Construct"], result: "Summon Construct" },
  { parts: ["Wall Of", "Fire"], result: "Wall of Fire" },
  { parts: ["Wall Of", "Water"], result: "Wall of Water" },
  { parts: ["Wall Of", "Sand"], result: "Wall of Sand" },
  { parts: ["Wall Of", "Stone"], result: "Wall of Stone" },
  { parts: ["Wall Of", "Ice"], result: "Wall of Ice" },
  { parts: ["Wall Of", "Light"], result: "Wall of Light" },
  { parts: ["Wall Of", "Force"], result: "Wall of Force" },
  { parts: ["Protection From", "Energy"], result: "Protection from Energy" },
  { parts: ["Protection From", "Evil And Good"], result: "Protection from Evil and Good" },
];

// First, handle merge patterns
for (const pattern of mergePatterns) {
  const [first, second] = pattern.parts;
  const firstPrism = mappings[first];
  const secondPrism = mappings[second];
  
  if (firstPrism && secondPrism && firstPrism === secondPrism) {
    fixedMappings[pattern.result] = firstPrism;
    processed.add(first);
    processed.add(second);
  }
}

// Then, add all other mappings (excluding processed ones)
for (const [spell, prism] of Object.entries(mappings)) {
  if (!processed.has(spell)) {
    // Skip single words that are likely fragments
    if (spell.split(' ').length === 1 && 
        ['Dead', 'Lesser', 'Holy', 'Weapon', 'Mass', 'Find', 'Traps', 'Step', 'Misty', 
         'Crown', 'Of', 'Stars', 'And', 'Disease', 'Without', 'Trace', 'With', 'Plants',
         'Animals', 'Nature', 'Woodland', 'Beings', 'Volley', 'Fey', 'Animals', 'Barrage',
         'Minor', 'Elementals', 'Elemental', 'Celestial', 'Beast', 'Shadowspawn', 'Undead',
         'Construct', 'Fire', 'Water', 'Sand', 'Stone', 'Ice', 'Light', 'Force', 'Energy',
         'Evil', 'Good', 'Restoration'].includes(spell)) {
      continue;
    }
    fixedMappings[spell] = prism;
  }
}

// Write fixed mappings
fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(fixedMappings, null, 2));

console.log(`✅ Fixed mappings`);
console.log(`📊 Original: ${Object.keys(mappings).length} entries`);
console.log(`📊 Fixed: ${Object.keys(fixedMappings).length} entries`);
console.log(`\n📝 Sample fixed mappings (first 50):`);
const entries = Object.entries(fixedMappings).slice(0, 50);
for (const [spell, prism] of entries) {
  console.log(`  ${spell} → ${prism}`);
}

