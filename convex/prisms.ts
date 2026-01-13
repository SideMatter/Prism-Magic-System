import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Default prisms to initialize with
const DEFAULT_PRISMS = [
  "ARCANE PRISM",
  "DIVINE PRISM",
  "ELEMENTAL PRISM",
  "FEY PRISM",
  "FIENDISH PRISM",
  "SHADOW PRISM",
  "SOLAR PRISM",
];

// Get all prisms
export const list = query({
  args: {},
  handler: async (ctx) => {
    const prisms = await ctx.db.query("prisms").collect();
    return prisms.map((p) => p.name);
  },
});

// Get prism by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const prism = await ctx.db
      .query("prisms")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    return prism;
  },
});

// Add a new prism
export const add = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) {
      throw new Error("Prism name is required");
    }

    // Check if prism already exists
    const existing = await ctx.db
      .query("prisms")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();

    if (existing) {
      throw new Error("Prism already exists");
    }

    const id = await ctx.db.insert("prisms", { name });
    return { id, name };
  },
});

// Delete a prism
export const remove = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const prism = await ctx.db
      .query("prisms")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!prism) {
      throw new Error("Prism not found");
    }

    await ctx.db.delete(prism._id);

    // Also remove from spell mappings
    const mappings = await ctx.db
      .query("spellMappings")
      .collect();

    for (const mapping of mappings) {
      if (mapping.prisms === args.name) {
        // Single prism match - delete the mapping
        await ctx.db.delete(mapping._id);
      } else if (Array.isArray(mapping.prisms) && mapping.prisms.includes(args.name)) {
        // Array prism - remove from array
        const newPrisms = mapping.prisms.filter((p) => p !== args.name);
        if (newPrisms.length === 0) {
          await ctx.db.delete(mapping._id);
        } else if (newPrisms.length === 1) {
          await ctx.db.patch(mapping._id, { prisms: newPrisms[0] });
        } else {
          await ctx.db.patch(mapping._id, { prisms: newPrisms });
        }
      }
    }

    return { success: true };
  },
});

// Initialize default prisms (for seeding)
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("prisms").collect();
    if (existing.length > 0) {
      return { message: "Prisms already initialized", count: existing.length };
    }

    for (const name of DEFAULT_PRISMS) {
      await ctx.db.insert("prisms", { name });
    }

    return { message: "Initialized default prisms", count: DEFAULT_PRISMS.length };
  },
});

// Bulk import prisms (for migration)
export const bulkImport = mutation({
  args: { prisms: v.array(v.string()) },
  handler: async (ctx, args) => {
    let imported = 0;
    for (const name of args.prisms) {
      const existing = await ctx.db
        .query("prisms")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (!existing) {
        await ctx.db.insert("prisms", { name });
        imported++;
      }
    }
    return { imported, total: args.prisms.length };
  },
});
