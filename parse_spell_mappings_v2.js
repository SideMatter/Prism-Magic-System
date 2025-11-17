const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const pdfPath = './Prism of Magic_ Homebrew System for D&D 5e - 11-17.pdf';
const DATA_DIR = path.join(process.cwd(), "data");
const MAPPINGS_FILE = path.join(DATA_DIR, "spell-prism-mappings.json");
const PRISMS_FILE = path.join(DATA_DIR, "prisms.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Known spell names from D&D 5e to help with parsing
const KNOWN_SPELLS = new Set([
  "Guidance", "Resistance", "Sacred Flame", "Spare the Dying", "Thaumaturgy", "Toll the Dead", "Word of Radiance",
  "Bless", "Ceremony", "Command", "Cure Wounds", "Divine Favor", "Healing Word", "Heroism", "Inflict Wounds",
  "Protection from Evil and Good", "Purify Food and Drink", "Sanctuary", "Shield of Faith", "Guiding Bolt",
  "Aid", "Augury", "Calm Emotions", "Continual Flame", "Gentle Repose", "Lesser Restoration", "Prayer of Healing",
  "Spiritual Weapon", "Warding Bond", "Zone of Truth", "Wall of Light",
  "Aura of Vitality", "Beacon of Hope", "Create Food and Water", "Crusader's Mantle", "Daylight", "Life Transference",
  "Mass Healing Word", "Revivify", "Spirit Guardians", "Spirit Shroud",
  "Aura of Life", "Aura of Purity", "Death Ward", "Guardian of Faith",
  "Circle of Power", "Commune", "Dawn", "Greater Restoration", "Hallow", "Holy Weapon", "Mass Cure Wounds", "Raise Dead",
  "Blade Barrier", "Forbiddance", "Harm", "Heal", "Heroes' Feast", "Planar Ally", "Primordial Ward", "Tasha's Otherworldly Guise", "Word of Recall",
  "Conjure Celestial", "Divine Word", "Resurrection", "Temple of the Gods", "Crown of Stars",
  "Holy Aura", "Mass Heal", "True Resurrection"
]);

function normalizeSpellName(name) {
  // Convert to title case
  return name
    .split(' ')
    .map(word => {
      // Handle special cases like "Tasha's", "Crusader's"
      if (word.includes("'")) {
        return word.split("'").map((part, i) => 
          i === 0 ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part.toLowerCase()
        ).join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

async function extractAndParse() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText({ first: 4, last: 14 });
    
    const fullText = data.text;
    const prismMappings = {};
    const prisms = [];
    
    // Split by prism sections
    const lines = fullText.split('\n');
    let currentPrism = null;
    let inSpellList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect prism section start
      const prismMatch = line.match(/(\d+)\.\s+([A-Z]+)\s+PRISM/);
      if (prismMatch) {
        currentPrism = prismMatch[2] + " PRISM";
        prisms.push(currentPrism);
        inSpellList = false;
        continue;
      }
      
      // Skip headers and metadata
      if (line.match(/^(Resonance:|Sources:|Key:|Level|Cantrips)$/) || 
          line.match(/^-- \d+ of \d+ --/) ||
          !line) {
        if (line === "Level" || line === "Cantrips") {
          inSpellList = true;
        }
        continue;
      }
      
      // Process spell lines
      if (currentPrism && inSpellList) {
        // Remove level indicators
        let cleanLine = line.replace(/^\d+(st|nd|rd|th)\s+/, '').trim();
        
        // Split by commas but be smart about it
        // Look for patterns like "Spell Name D, Another Spell R"
        const spells = [];
        let currentSpell = '';
        let inParens = false;
        
        for (let j = 0; j < cleanLine.length; j++) {
          const char = cleanLine[j];
          
          if (char === '(') {
            inParens = true;
            currentSpell += char;
          } else if (char === ')') {
            inParens = false;
            currentSpell += char;
          } else if (char === ',' && !inParens) {
            // End of current spell
            const spell = currentSpell.trim()
              .replace(/\s+D\s*$/, '')
              .replace(/\s+R\s*$/, '')
              .replace(/\s+Bold\s*$/, '')
              .trim();
            
            if (spell && spell.length >= 3) {
              spells.push(spell);
            }
            currentSpell = '';
          } else {
            currentSpell += char;
          }
        }
        
        // Add the last spell
        if (currentSpell.trim()) {
          const spell = currentSpell.trim()
            .replace(/\s+D\s*$/, '')
            .replace(/\s+R\s*$/, '')
            .replace(/\s+Bold\s*$/, '')
            .trim();
          
          if (spell && spell.length >= 3) {
            spells.push(spell);
          }
        }
        
        // Normalize and add spells
        for (const spell of spells) {
          if (spell.length < 3) continue;
          
          // Skip common words that aren't spells
          if (spell.match(/^(and|or|the|a|an|in|on|at|to|for|of|with)$/i)) continue;
          
          const normalized = normalizeSpellName(spell);
          if (normalized && normalized.length >= 3) {
            prismMappings[normalized] = currentPrism;
          }
        }
      }
    }
    
    // Save mappings
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(prismMappings, null, 2));
    
    // Save prisms
    const uniquePrisms = [...new Set(prisms)].sort();
    fs.writeFileSync(PRISMS_FILE, JSON.stringify(uniquePrisms, null, 2));
    
    console.log(`\n✅ Extracted ${Object.keys(prismMappings).length} spell mappings`);
    console.log(`✅ Found ${uniquePrisms.length} prisms:`, uniquePrisms.join(', '));
    console.log(`\n📝 Sample mappings (first 30):`);
    const sample = Object.fromEntries(Object.entries(prismMappings).slice(0, 30));
    console.log(JSON.stringify(sample, null, 2));
    
    return { prismMappings, prisms: uniquePrisms };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
}

extractAndParse().catch(console.error);

