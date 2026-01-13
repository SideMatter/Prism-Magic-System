import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all custom spells
export const list = query({
  args: {},
  handler: async (ctx) => {
    const spells = await ctx.db.query("customSpells").collect();
    return spells.map((s) => ({
      name: s.name,
      level: s.level,
      school: s.school,
      casting_time: s.castingTime,
      range: s.range,
      components: s.components,
      duration: s.duration,
      description: s.description,
      prism: s.prism,
    }));
  },
});

// Get custom spell by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const spell = await ctx.db
      .query("customSpells")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!spell) return null;

    return {
      name: spell.name,
      level: spell.level,
      school: spell.school,
      casting_time: spell.castingTime,
      range: spell.range,
      components: spell.components,
      duration: spell.duration,
      description: spell.description,
      prism: spell.prism,
    };
  },
});

// Create a new custom spell
export const create = mutation({
  args: {
    name: v.string(),
    level: v.number(),
    school: v.string(),
    casting_time: v.string(),
    range: v.string(),
    components: v.string(),
    duration: v.string(),
    description: v.string(),
    prism: v.optional(v.union(v.string(), v.array(v.string()))),
  },
  handler: async (ctx, args) => {
    const {
      name,
      level,
      school,
      casting_time,
      range,
      components,
      duration,
      description,
      prism,
    } = args;

    // Validate required fields
    if (!name?.trim()) throw new Error("Spell name is required");
    if (!school?.trim()) throw new Error("School is required");
    if (!casting_time?.trim()) throw new Error("Casting time is required");
    if (!range?.trim()) throw new Error("Range is required");
    if (!components?.trim()) throw new Error("Components is required");
    if (!duration?.trim()) throw new Error("Duration is required");
    if (!description?.trim()) throw new Error("Description is required");

    if (level < 0 || level > 9) {
      throw new Error("Level must be between 0 and 9");
    }

    // Check for duplicate name
    const existing = await ctx.db
      .query("customSpells")
      .withIndex("by_name", (q) => q.eq("name", name.trim()))
      .first();

    // Also do case-insensitive check
    const allSpells = await ctx.db.query("customSpells").collect();
    const duplicate = allSpells.find(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (duplicate) {
      throw new Error("A custom spell with this name already exists");
    }

    await ctx.db.insert("customSpells", {
      name: name.trim(),
      level,
      school: school.trim(),
      castingTime: casting_time.trim(),
      range: range.trim(),
      components: components.trim(),
      duration: duration.trim(),
      description: description.trim(),
      prism: prism || undefined,
    });

    // If prism is provided, also update spell mappings
    if (prism) {
      const existingMapping = await ctx.db
        .query("spellMappings")
        .withIndex("by_spellName", (q) => q.eq("spellName", name.trim()))
        .first();

      if (existingMapping) {
        await ctx.db.patch(existingMapping._id, { prisms: prism });
      } else {
        await ctx.db.insert("spellMappings", {
          spellName: name.trim(),
          prisms: prism,
        });
      }
    }

    return {
      success: true,
      spell: {
        name: name.trim(),
        level,
        school: school.trim(),
        casting_time: casting_time.trim(),
        range: range.trim(),
        components: components.trim(),
        duration: duration.trim(),
        description: description.trim(),
        prism,
      },
    };
  },
});

// Update a custom spell
export const update = mutation({
  args: {
    originalName: v.string(),
    name: v.string(),
    level: v.number(),
    school: v.string(),
    casting_time: v.string(),
    range: v.string(),
    components: v.string(),
    duration: v.string(),
    description: v.string(),
    prism: v.optional(v.union(v.string(), v.array(v.string()))),
  },
  handler: async (ctx, args) => {
    const {
      originalName,
      name,
      level,
      school,
      casting_time,
      range,
      components,
      duration,
      description,
      prism,
    } = args;

    if (!originalName) {
      throw new Error("Original spell name is required");
    }

    // Validate required fields
    if (!name?.trim()) throw new Error("Spell name is required");
    if (!school?.trim()) throw new Error("School is required");
    if (!casting_time?.trim()) throw new Error("Casting time is required");
    if (!range?.trim()) throw new Error("Range is required");
    if (!components?.trim()) throw new Error("Components is required");
    if (!duration?.trim()) throw new Error("Duration is required");
    if (!description?.trim()) throw new Error("Description is required");

    if (level < 0 || level > 9) {
      throw new Error("Level must be between 0 and 9");
    }

    // Find the spell to update
    const spell = await ctx.db
      .query("customSpells")
      .withIndex("by_name", (q) => q.eq("name", originalName))
      .first();

    if (!spell) {
      throw new Error("Custom spell not found");
    }

    // Check if new name already exists (if name changed)
    if (originalName !== name.trim()) {
      const allSpells = await ctx.db.query("customSpells").collect();
      const duplicate = allSpells.find(
        (s) =>
          s._id !== spell._id &&
          s.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error("A custom spell with this name already exists");
      }
    }

    await ctx.db.patch(spell._id, {
      name: name.trim(),
      level,
      school: school.trim(),
      castingTime: casting_time.trim(),
      range: range.trim(),
      components: components.trim(),
      duration: duration.trim(),
      description: description.trim(),
      prism: prism || undefined,
    });

    // Update spell mappings
    if (originalName !== name.trim()) {
      // Remove old mapping
      const oldMapping = await ctx.db
        .query("spellMappings")
        .withIndex("by_spellName", (q) => q.eq("spellName", originalName))
        .first();
      if (oldMapping) {
        await ctx.db.delete(oldMapping._id);
      }
    }

    // Update or create new mapping
    const existingMapping = await ctx.db
      .query("spellMappings")
      .withIndex("by_spellName", (q) => q.eq("spellName", name.trim()))
      .first();

    if (prism) {
      if (existingMapping) {
        await ctx.db.patch(existingMapping._id, { prisms: prism });
      } else {
        await ctx.db.insert("spellMappings", {
          spellName: name.trim(),
          prisms: prism,
        });
      }
    } else if (existingMapping) {
      await ctx.db.delete(existingMapping._id);
    }

    return {
      success: true,
      spell: {
        name: name.trim(),
        level,
        school: school.trim(),
        casting_time: casting_time.trim(),
        range: range.trim(),
        components: components.trim(),
        duration: duration.trim(),
        description: description.trim(),
        prism,
      },
    };
  },
});

// Delete a custom spell
export const remove = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const spell = await ctx.db
      .query("customSpells")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!spell) {
      throw new Error("Custom spell not found");
    }

    await ctx.db.delete(spell._id);

    // Also remove from mappings
    const mapping = await ctx.db
      .query("spellMappings")
      .withIndex("by_spellName", (q) => q.eq("spellName", args.name))
      .first();

    if (mapping) {
      await ctx.db.delete(mapping._id);
    }

    return { success: true };
  },
});

// Bulk import custom spells (for migration)
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
        prism: v.optional(v.union(v.string(), v.array(v.string()))),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;

    for (const spell of args.spells) {
      const existing = await ctx.db
        .query("customSpells")
        .withIndex("by_name", (q) => q.eq("name", spell.name))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("customSpells", {
        name: spell.name,
        level: spell.level,
        school: spell.school,
        castingTime: spell.casting_time,
        range: spell.range,
        components: spell.components,
        duration: spell.duration,
        description: spell.description,
        prism: spell.prism,
      });
      imported++;
    }

    return { imported, skipped, total: args.spells.length };
  },
});

// Get cache timestamp
export const getTimestamp = query({
  args: {},
  handler: async (ctx) => {
    const metadata = await ctx.db
      .query("cacheMetadata")
      .withIndex("by_key", (q) => q.eq("key", "customSpells"))
      .first();
    return metadata?.timestamp ?? 0;
  },
});
