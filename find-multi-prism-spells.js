const fs = require('fs');
const pdf = require('pdf-parse/lib/pdf-parse.js');

const pdfPath = './Prism of Magic_ Homebrew System for D&D 5e - 11-17.pdf';

async function findMultiPrismSpells() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    
    // Extract pages 4-14
    const data = await pdf(dataBuffer, {
      max: 14,
    });

    const text = data.text;
    const lines = text.split('\n');
    
    // Define prism markers
    const prismMarkers = [
      'ARCANE PRISM',
      'DIVINE PRISM', 
      'ELEMENTAL PRISM',
      'FEY PRISM',
      'FIENDISH PRISM',
      'SHADOW PRISM',
      'SOLAR PRISM'
    ];
    
    let currentPrism = null;
    let allSpells = {};  // Track all occurrences of each spell
    let inSpellList = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Check if this line is a prism header
      for (let prism of prismMarkers) {
        if (line.includes(prism)) {
          currentPrism = prism;
          inSpellList = true;
          console.log(`\nFound prism: ${prism}`);
          break;
        }
      }
      
      // Skip if no current prism
      if (!currentPrism || !inSpellList) continue;
      
      // Stop at new prism or end of section
      if (line.includes('PRISM') && !prismMarkers.some(p => line.includes(p))) {
        inSpellList = false;
        continue;
      }
      
      // Skip empty lines, page numbers, headers
      if (!line || line.length < 3) continue;
      if (/^\d+$/.test(line)) continue;
      if (line.includes('Prism of Magic') || line.includes('Homebrew System')) continue;
      if (line.includes('Page')) continue;
      
      // Skip lines that are just prism names
      if (prismMarkers.some(p => line === p)) continue;
      
      // Clean spell name
      const spellName = line
        .replace(/[•◦▪]/g, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbering
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Filter valid spell names (reasonable length, not all caps unless it's a prism)
      if (spellName.length > 2 && spellName.length < 100 && 
          !prismMarkers.includes(spellName)) {
        
        // Track in allSpells for duplicate detection
        if (!allSpells[spellName]) {
          allSpells[spellName] = [];
        }
        if (!allSpells[spellName].includes(currentPrism)) {
          allSpells[spellName].push(currentPrism);
        }
      }
    }
    
    // Find spells with multiple prisms
    const multiPrismSpells = {};
    const singlePrismSpells = {};
    
    for (const [spell, prisms] of Object.entries(allSpells)) {
      const uniquePrisms = [...new Set(prisms)];
      if (uniquePrisms.length > 1) {
        multiPrismSpells[spell] = uniquePrisms;
      } else {
        singlePrismSpells[spell] = uniquePrisms[0];
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SPELLS WITH MULTIPLE PRISMS');
    console.log('='.repeat(60) + '\n');
    console.log(`Total spells with multiple prisms: ${Object.keys(multiPrismSpells).length}`);
    console.log('');
    
    const sorted = Object.entries(multiPrismSpells).sort((a, b) => 
      b[1].length - a[1].length || a[0].localeCompare(b[0])
    );
    
    for (const [spell, prisms] of sorted) {
      console.log(`${spell}:`);
      prisms.forEach(prism => console.log(`  - ${prism}`));
      console.log('');
    }
    
    // Save both files
    fs.writeFileSync('multi-prism-spells.json', JSON.stringify(multiPrismSpells, null, 2));
    console.log(`\nSaved ${Object.keys(multiPrismSpells).length} multi-prism spells to multi-prism-spells.json`);
    
    console.log(`\nTotal single-prism spells: ${Object.keys(singlePrismSpells).length}`);
    console.log(`Total multi-prism spells: ${Object.keys(multiPrismSpells).length}`);
    console.log(`Grand total: ${Object.keys(allSpells).length} unique spells found in PDF`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findMultiPrismSpells();

