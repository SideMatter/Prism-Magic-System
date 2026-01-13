import { query } from "./_generated/server";

// Combined query to get all spell data in one call
export const getAllSpellData = query({
  args: {},
  handler: async (ctx) => {
    // Run all queries in parallel
    const [cachedSpells, customSpells, spellMappings, prisms] = await Promise.all([
      ctx.db.query("cachedSpells").collect(),
      ctx.db.query("customSpells").collect(),
      ctx.db.query("spellMappings").collect(),
      ctx.db.query("prisms").collect(),
    ]);

    // Build mappings lookup
    const mappingsLookup: Record<string, string | string[]> = {};
    for (const m of spellMappings) {
      mappingsLookup[m.spellName] = m.prisms;
    }

    // Normalize spell name for matching
    const normalizeSpellName = (name: string): string => {
      if (!name) return '';
      return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[''"]/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/[^\w\s'\-]/g, '');
    };

    // Find prism for spell (with fuzzy matching)
    const findPrism = (spellName: string): string | string[] | undefined => {
      // Exact match first
      if (mappingsLookup[spellName]) {
        return mappingsLookup[spellName];
      }
      
      // Normalized match
      const normalized = normalizeSpellName(spellName);
      for (const [key, value] of Object.entries(mappingsLookup)) {
        if (normalizeSpellName(key) === normalized) {
          return value;
        }
      }
      
      return undefined;
    };

    // Format cached spells
    const formattedCachedSpells = cachedSpells.map((s) => ({
      name: s.name,
      level: s.level,
      school: s.school,
      casting_time: s.castingTime,
      range: s.range,
      components: s.components,
      duration: s.duration,
      description: s.description,
      prism: findPrism(s.name),
      isCustom: false,
    }));

    // Format custom spells
    const formattedCustomSpells = customSpells.map((s) => ({
      name: s.name,
      level: s.level,
      school: s.school,
      casting_time: s.castingTime,
      range: s.range,
      components: s.components,
      duration: s.duration,
      description: s.description,
      prism: s.prism || findPrism(s.name),
      isCustom: true,
    }));

    // Combine all spells
    const allSpells = [...formattedCachedSpells, ...formattedCustomSpells];

    return {
      spells: allSpells,
      prisms: prisms.map((p) => p.name),
      spellCount: allSpells.length,
      cachedCount: cachedSpells.length,
      customCount: customSpells.length,
    };
  },
});

// Lighter query for just prisms (fast)
export const getPrisms = query({
  args: {},
  handler: async (ctx) => {
    const prisms = await ctx.db.query("prisms").collect();
    return prisms.map((p) => p.name);
  },
});
