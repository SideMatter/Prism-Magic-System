import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all spell-prism mappings as an array (to avoid special character issues in keys)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const mappings = await ctx.db.query("spellMappings").collect();
    return mappings.map((m) => ({
      spellName: m.spellName,
      prisms: m.prisms,
    }));
  },
});

// Get prism(s) for a specific spell
export const getBySpellName = query({
  args: { spellName: v.string() },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("spellMappings")
      .withIndex("by_spellName", (q) => q.eq("spellName", args.spellName))
      .first();
    return mapping?.prisms ?? null;
  },
});

// Update or create a spell-prism mapping
export const update = mutation({
  args: {
    spellName: v.string(),
    prism: v.optional(v.union(v.string(), v.array(v.string()), v.null())),
  },
  handler: async (ctx, args) => {
    const { spellName, prism } = args;

    if (!spellName) {
      throw new Error("Spell name is required");
    }

    const existing = await ctx.db
      .query("spellMappings")
      .withIndex("by_spellName", (q) => q.eq("spellName", spellName))
      .first();

    // Determine if we should delete or update
    const shouldDelete =
      prism === null ||
      prism === undefined ||
      (typeof prism === "string" && !prism.trim()) ||
      (Array.isArray(prism) && prism.length === 0);

    if (shouldDelete) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return { success: true, spellName, prism: null };
    }

    // Normalize the prism value
    const normalizedPrism =
      typeof prism === "string" ? prism.trim() : prism;

    if (existing) {
      await ctx.db.patch(existing._id, { prisms: normalizedPrism });
    } else {
      await ctx.db.insert("spellMappings", {
        spellName,
        prisms: normalizedPrism,
      });
    }

    return { success: true, spellName, prism: normalizedPrism };
  },
});

// Bulk import spell mappings (for migration)
export const bulkImport = mutation({
  args: {
    mappings: v.array(
      v.object({
        spellName: v.string(),
        prisms: v.union(v.string(), v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let updated = 0;

    for (const { spellName, prisms } of args.mappings) {
      const existing = await ctx.db
        .query("spellMappings")
        .withIndex("by_spellName", (q) => q.eq("spellName", spellName))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, { prisms });
        updated++;
      } else {
        await ctx.db.insert("spellMappings", { spellName, prisms });
        imported++;
      }
    }

    return { imported, updated, total: args.mappings.length };
  },
});

// Get cache timestamp
export const getTimestamp = query({
  args: {},
  handler: async (ctx) => {
    const metadata = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "spellMappings"))
      .first();
    return metadata?.timestamp ?? 0;
  },
});

// Update cache timestamp (called after mutations)
export const updateTimestamp = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "spellMappings"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { timestamp: now });
    } else {
      await ctx.db.insert("cacheMetadata", { key: "spellMappings", timestamp: now });
    }
    return now;
  },
});
