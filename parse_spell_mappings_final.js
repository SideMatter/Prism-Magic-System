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

function normalizeSpellName(name) {
  return name
    .trim()
    .split(' ')
    .map(word => {
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
    
    // Manually parse based on the structure we saw
    // Split by prism sections
    const sections = fullText.split(/(?=\d+\.\s+[A-Z]+\s+PRISM)/);
    
    for (const section of sections) {
      const prismMatch = section.match(/(\d+)\.\s+([A-Z]+)\s+PRISM/);
      if (!prismMatch) continue;
      
      const prismName = prismMatch[2] + " PRISM";
      prisms.push(prismName);
      
      // Extract the spell list part (after "Level" and before next section or end)
      const levelIndex = section.indexOf('Level');
      if (levelIndex === -1) continue;
      
      const spellSection = section.substring(levelIndex);
      const lines = spellSection.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip headers, empty lines, page numbers
        if (!trimmed || 
            trimmed.match(/^(Level|Cantrips|Resonance:|Sources:|Key:)/) ||
            trimmed.match(/^-- \d+ of \d+ --/) ||
            trimmed.match(/^\d+\.\s+[A-Z]+\s+PRISM/)) {
          continue;
        }
        
        // Remove level indicators
        let cleanLine = trimmed.replace(/^\d+(st|nd|rd|th)\s+/, '').trim();
        
        // Split by comma, but handle parenthetical material
        const parts = [];
        let current = '';
        let depth = 0;
        
        for (let i = 0; i < cleanLine.length; i++) {
          const char = cleanLine[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          else if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
            continue;
          }
          current += char;
        }
        if (current.trim()) parts.push(current.trim());
        
        // Process each part as a potential spell
        for (let part of parts) {
          // Remove markers
          part = part.replace(/\s+D\s*$/, '')
                    .replace(/\s+R\s*$/, '')
                    .replace(/\s+Bold\s*$/, '')
                    .trim();
          
          // Skip if too short or common words
          if (part.length < 3 || 
              /^(and|or|the|a|an|in|on|at|to|for|of|with|from)$/i.test(part)) {
            continue;
          }
          
          const normalized = normalizeSpellName(part);
          if (normalized && normalized.length >= 3) {
            prismMappings[normalized] = prismName;
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
    console.log(`\n📝 Sample mappings (first 40):`);
    const entries = Object.entries(prismMappings).slice(0, 40);
    for (const [spell, prism] of entries) {
      console.log(`  ${spell} → ${prism}`);
    }
    
    return { prismMappings, prisms: uniquePrisms };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
}

extractAndParse().catch(console.error);

