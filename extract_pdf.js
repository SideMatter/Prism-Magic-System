const { PDFParse } = require('pdf-parse');
const fs = require('fs');

const pdfPath = './Prism of Magic_ Homebrew System for D&D 5e - 11-17.pdf';

async function extractPages() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText({ first: 4, last: 14 });
    
    // Extract text from all pages
    const fullText = data.text;
    
    // Try to identify pages 4-14
    // PDF-parse doesn't give us page-by-page, so we'll get all text
    // and look for patterns that indicate spell lists
    console.log('=== PDF Text Extraction ===');
    console.log('Total pages:', data.numpages);
    console.log('\n=== Full Text (looking for spell-to-prism mappings) ===\n');
    console.log(fullText);
    
    // Also try to extract structured data
    const lines = fullText.split('\n');
    const spellMappings = {};
    let currentPrism = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for prism names (might be in all caps or title case)
      if (line.match(/^(ABJURATION|CONJURATION|DIVINATION|ENCHANTMENT|EVOCATION|ILLUSION|NECROMANCY|TRANSMUTATION|Prism|PRISM)/i)) {
        currentPrism = line;
        continue;
      }
      
      // Look for spell names (common pattern: spell name followed by level)
      // Spell names are usually title case and might be followed by numbers or other info
      if (line && currentPrism && line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*/)) {
        // This might be a spell name
        const spellName = line.split(/\s+/)[0] + (line.split(/\s+/)[1] ? ' ' + line.split(/\s+/)[1] : '');
        if (spellName.length > 2 && spellName.length < 50) {
          spellMappings[spellName] = currentPrism;
        }
      }
    }
    
    console.log('\n=== Extracted Spell Mappings ===');
    console.log(JSON.stringify(spellMappings, null, 2));
    
  } catch (error) {
    console.error('Error extracting PDF:', error);
  }
}

extractPages();

