import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all custom classes
export const list = query({
  args: {},
  handler: async (ctx) => {
    const classes = await ctx.db.query("customClasses").collect();
    return classes.map((c) => ({
      id: c.classId,
      name: c.name,
      hitDie: c.hitDie,
      primaryAbilities: c.primaryAbilities,
      savingThrows: c.savingThrows,
      statPriority: c.statPriority,
      description: c.description,
      prism: c.prism,
      type: c.type,
      spellList: c.spellList,
      features: c.features,
      isCustom: true,
    }));
  },
});

// Get custom class by ID
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const customClass = await ctx.db
      .query("customClasses")
      .withIndex("by_classId", (q) => q.eq("classId", args.id))
      .first();

    if (!customClass) return null;

    return {
      id: customClass.classId,
      name: customClass.name,
      hitDie: customClass.hitDie,
      primaryAbilities: customClass.primaryAbilities,
      savingThrows: customClass.savingThrows,
      statPriority: customClass.statPriority,
      description: customClass.description,
      prism: customClass.prism,
      type: customClass.type,
      spellList: customClass.spellList,
      features: customClass.features,
      isCustom: true,
    };
  },
});

// Create or update a custom class
export const upsert = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    hitDie: v.number(),
    primaryAbilities: v.array(v.string()),
    savingThrows: v.array(v.string()),
    statPriority: v.array(v.string()),
    description: v.string(),
    prism: v.optional(v.string()),
    type: v.optional(v.string()),
    spellList: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const {
      id,
      name,
      hitDie,
      primaryAbilities,
      savingThrows,
      statPriority,
      description,
      prism,
      type,
      spellList,
      features,
    } = args;

    // Validate required fields
    if (!id || !name || !hitDie || !statPriority || statPriority.length === 0) {
      throw new Error("Missing required fields");
    }

    const existing = await ctx.db
      .query("customClasses")
      .withIndex("by_classId", (q) => q.eq("classId", id))
      .first();

    if (existing) {
      // Update
      await ctx.db.patch(existing._id, {
        name,
        hitDie,
        primaryAbilities,
        savingThrows,
        statPriority,
        description,
        prism,
        type,
        spellList,
        features,
      });
    } else {
      // Create
      await ctx.db.insert("customClasses", {
        classId: id,
        name,
        hitDie,
        primaryAbilities,
        savingThrows,
        statPriority,
        description,
        prism,
        type,
        spellList,
        features,
      });
    }

    return {
      success: true,
      class: {
        id,
        name,
        hitDie,
        primaryAbilities,
        savingThrows,
        statPriority,
        description,
        prism,
        type,
        spellList,
        features,
        isCustom: true,
      },
    };
  },
});

// Delete a custom class
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const customClass = await ctx.db
      .query("customClasses")
      .withIndex("by_classId", (q) => q.eq("classId", args.id))
      .first();

    if (!customClass) {
      throw new Error("Custom class not found");
    }

    await ctx.db.delete(customClass._id);
    return { success: true };
  },
});

// Bulk import custom classes (for migration)
export const bulkImport = mutation({
  args: {
    classes: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        hitDie: v.number(),
        primaryAbilities: v.array(v.string()),
        savingThrows: v.array(v.string()),
        statPriority: v.array(v.string()),
        description: v.string(),
        prism: v.optional(v.string()),
        type: v.optional(v.string()),
        spellList: v.optional(v.string()),
        features: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    let imported = 0;
    let updated = 0;

    for (const customClass of args.classes) {
      const existing = await ctx.db
        .query("customClasses")
        .withIndex("by_classId", (q) => q.eq("classId", customClass.id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          name: customClass.name,
          hitDie: customClass.hitDie,
          primaryAbilities: customClass.primaryAbilities,
          savingThrows: customClass.savingThrows,
          statPriority: customClass.statPriority,
          description: customClass.description,
          prism: customClass.prism,
          type: customClass.type,
          spellList: customClass.spellList,
          features: customClass.features,
        });
        updated++;
      } else {
        await ctx.db.insert("customClasses", {
          classId: customClass.id,
          name: customClass.name,
          hitDie: customClass.hitDie,
          primaryAbilities: customClass.primaryAbilities,
          savingThrows: customClass.savingThrows,
          statPriority: customClass.statPriority,
          description: customClass.description,
          prism: customClass.prism,
          type: customClass.type,
          spellList: customClass.spellList,
          features: customClass.features,
        });
        imported++;
      }
    }

    return { imported, updated, total: args.classes.length };
  },
});
