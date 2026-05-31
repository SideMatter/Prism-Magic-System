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

// Rename a prism (cascades to all references)
export const rename = mutation({
  args: { oldName: v.string(), newName: v.string() },
  handler: async (ctx, args) => {
    const newName = args.newName.trim();
    if (!newName) {
      throw new Error("Prism name is required");
    }

    const prism = await ctx.db
      .query("prisms")
      .withIndex("by_name", (q) => q.eq("name", args.oldName))
      .first();

    if (!prism) {
      throw new Error("Prism not found");
    }

    if (newName !== args.oldName) {
      const existing = await ctx.db
        .query("prisms")
        .withIndex("by_name", (q) => q.eq("name", newName))
        .first();
      if (existing) {
        throw new Error("A prism with that name already exists");
      }
    }

    await ctx.db.patch(prism._id, { name: newName });

    // Cascade to spellMappings
    const mappings = await ctx.db.query("spellMappings").collect();
    for (const mapping of mappings) {
      if (mapping.prisms === args.oldName) {
        await ctx.db.patch(mapping._id, { prisms: newName });
      } else if (Array.isArray(mapping.prisms) && mapping.prisms.includes(args.oldName)) {
        const updated = mapping.prisms.map((p) => (p === args.oldName ? newName : p));
        await ctx.db.patch(mapping._id, { prisms: updated });
      }
    }

    // Cascade to players
    const players = await ctx.db.query("players").collect();
    for (const player of players) {
      if (player.prisms.includes(args.oldName)) {
        const updated = player.prisms.map((p) => (p === args.oldName ? newName : p));
        await ctx.db.patch(player._id, { prisms: updated });
      }
    }

    // Cascade to customSpells
    const customSpells = await ctx.db.query("customSpells").collect();
    for (const spell of customSpells) {
      if (spell.prism === args.oldName) {
        await ctx.db.patch(spell._id, { prism: newName });
      } else if (Array.isArray(spell.prism) && spell.prism.includes(args.oldName)) {
        const updated = spell.prism.map((p) => (p === args.oldName ? newName : p));
        await ctx.db.patch(spell._id, { prism: updated });
      }
    }

    // Cascade to customClasses
    const customClasses = await ctx.db.query("customClasses").collect();
    for (const cls of customClasses) {
      if (cls.prism === args.oldName) {
        await ctx.db.patch(cls._id, { prism: newName });
      }
    }

    return { success: true, oldName: args.oldName, newName };
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
