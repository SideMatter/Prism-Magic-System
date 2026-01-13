import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get all cached spells
export const list = query({
  args: {},
  handler: async (ctx) => {
    const spells = await ctx.db.query("cachedSpells").collect();
    return spells.map((s) => ({
      name: s.name,
      level: s.level,
      school: s.school,
      casting_time: s.castingTime,
      range: s.range,
      components: s.components,
      duration: s.duration,
      description: s.description,
    }));
  },
});

// Get cached spell count
export const count = query({
  args: {},
  handler: async (ctx) => {
    const spells = await ctx.db.query("cachedSpells").collect();
    return spells.length;
  },
});

// Check if cache is valid (has enough spells)
export const isCacheValid = query({
  args: {},
  handler: async (ctx) => {
    // Check if we have all spells (319 from D&D 5e API)
    const spells = await ctx.db.query("cachedSpells").collect();
    // Cache is valid if we have at least 315 spells (allowing for small variations)
    return spells.length >= 315;
  },
});

// Get cache timestamp
export const getTimestamp = query({
  args: {},
  handler: async (ctx) => {
    const metadata = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "cachedSpells"))
      .first();
    return metadata?.timestamp ?? 0;
  },
});

// Bulk import cached spells (for migration or API cache)
export const bulkImport = mutation({
  args: {
    spells: v.array(
      v.object({
        name: v.string(),
        level: v.number(),
        school: v.string(),
        casting_time: v.string(),
        range: v.string(),
        components: v.string(),
        duration: v.string(),
        description: v.string(),
      })
    ),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Optionally clear existing cache
    if (args.clearExisting) {
      const existing = await ctx.db.query("cachedSpells").collect();
      for (const spell of existing) {
        await ctx.db.delete(spell._id);
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const spell of args.spells) {
      const existing = await ctx.db
        .query("cachedSpells")
        .withIndex("by_name", (q) => q.eq("name", spell.name))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("cachedSpells", {
        name: spell.name,
        level: spell.level,
        school: spell.school,
        castingTime: spell.casting_time,
        range: spell.range,
        components: spell.components,
        duration: spell.duration,
        description: spell.description,
      });
      imported++;
    }

    // Update cache timestamp
    const now = Date.now();
    const existingMetadata = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "cachedSpells"))
      .first();

    if (existingMetadata) {
      await ctx.db.patch(existingMetadata._id, { timestamp: now });
    } else {
      await ctx.db.insert("cacheMetadata", { key: "cachedSpells", timestamp: now });
    }

    return { imported, skipped, total: args.spells.length };
  },
});

// Clear cached spells
export const clearCache = mutation({
  args: {},
  handler: async (ctx) => {
    const spells = await ctx.db.query("cachedSpells").collect();
    for (const spell of spells) {
      await ctx.db.delete(spell._id);
    }

    // Reset timestamp
    const existingMetadata = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "cachedSpells"))
      .first();

    if (existingMetadata) {
      await ctx.db.patch(existingMetadata._id, { timestamp: 0 });
    }

    return { cleared: spells.length };
  },
});
