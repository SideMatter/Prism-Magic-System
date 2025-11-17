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

async function extractAndParse() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText({ first: 4, last: 14 });
    
    const fullText = data.text;
    
    // Extract prism names and their spells
    const prismMappings = {};
    const prisms = [];
    
    // Split by prism sections
    const prismSections = fullText.split(/(?=\d+\.\s+[A-Z]+\s+PRISM)/);
    
    for (const section of prismSections) {
      // Extract prism name
      const prismMatch = section.match(/(\d+)\.\s+([A-Z]+)\s+PRISM/);
      if (!prismMatch) continue;
      
      const prismName = prismMatch[2] + " PRISM";
      prisms.push(prismName);
      
      // Extract all spell names from the section
      // Spells are listed after "Level" and before the next section
      const spellLines = section.split('\n').filter(line => {
        // Skip headers and empty lines
        return line.trim() && 
               !line.match(/^(Level|Cantrips|Resonance:|Sources:|Key:)/) &&
               !line.match(/^\d+\.\s+[A-Z]+\s+PRISM/) &&
               !line.match(/^-- \d+ of \d+ --/);
      });
      
      // Parse spell names from lines
      // Spells are comma-separated, may have "D" or "R" markers
      for (const line of spellLines) {
        // Remove level indicators like "1st", "2nd", etc. at the start
        const cleanLine = line.replace(/^\d+(st|nd|rd|th)\s+/, '').trim();
        
        // Split by commas and clean up
        const spellParts = cleanLine.split(',').map(s => s.trim());
        
        for (let spellPart of spellParts) {
          // Remove markers like "D", "R", "Bold" indicators
          spellPart = spellPart
            .replace(/\s+D\s*$/, '')
            .replace(/\s+R\s*$/, '')
            .replace(/\s+Bold\s*$/, '')
            .trim();
          
          // Skip if it's not a valid spell name (too short, contains special chars, etc.)
          if (spellPart.length < 3 || 
              spellPart.match(/^(and|or|the|a|an)$/i) ||
              spellPart.includes('(') && !spellPart.includes(')')) {
            continue;
          }
          
          // Handle spell names that might be split across lines
          // Remove common prefixes/suffixes that aren't part of spell names
          if (spellPart && spellPart.length > 2) {
            // Clean up spell name
            const spellName = spellPart
              .replace(/^[A-Z]\s+/, '') // Remove single capital letter at start
              .trim();
            
            if (spellName && spellName.length >= 3) {
              // Capitalize first letter of each word
              const formattedName = spellName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
              
              prismMappings[formattedName] = prismName;
            }
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
    console.log(`\n📝 Sample mappings (first 20):`);
    console.log(JSON.stringify(Object.fromEntries(Object.entries(prismMappings).slice(0, 20)), null, 2));
    
    return { prismMappings, prisms: uniquePrisms };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
}

extractAndParse().catch(console.error);

