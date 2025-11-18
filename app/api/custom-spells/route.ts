import { NextResponse } from "next/server";
import { storage, CustomSpell } from "@/lib/storage";

// GET - Load all custom spells
export async function GET() {
  try {
    const customSpells = await storage.loadCustomSpells();
    return NextResponse.json(customSpells);
  } catch (error) {
    console.error("Error loading custom spells:", error);
    return NextResponse.json({ error: "Failed to load custom spells" }, { status: 500 });
  }
}

// POST - Create a new custom spell
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received custom spell creation request:", body);
    const { name, level, school, casting_time, range, components, duration, description, prism } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Spell name is required" },
        { status: 400 }
      );
    }
    if (!school || !school.trim()) {
      return NextResponse.json(
        { error: "School is required" },
        { status: 400 }
      );
    }
    if (!casting_time || !casting_time.trim()) {
      return NextResponse.json(
        { error: "Casting time is required" },
        { status: 400 }
      );
    }
    if (!range || !range.trim()) {
      return NextResponse.json(
        { error: "Range is required" },
        { status: 400 }
      );
    }
    if (!components || !components.trim()) {
      return NextResponse.json(
        { error: "Components is required" },
        { status: 400 }
      );
    }
    if (!duration || !duration.trim()) {
      return NextResponse.json(
        { error: "Duration is required" },
        { status: 400 }
      );
    }
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    // Validate level - convert to number if it's a string
    const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
    if (typeof levelNum !== 'number' || isNaN(levelNum) || levelNum < 0 || levelNum > 9) {
      return NextResponse.json(
        { error: "Level must be a number between 0 and 9" },
        { status: 400 }
      );
    }

    const customSpells = await storage.loadCustomSpells();

    // Check if spell with this name already exists
    if (customSpells.some(spell => spell.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: "A custom spell with this name already exists" },
        { status: 400 }
      );
    }

    const newSpell: CustomSpell = {
      name: name.trim(),
      level: levelNum,
      school: school.trim(),
      casting_time: casting_time.trim(),
      range: range.trim(),
      components: components.trim(),
      duration: duration.trim(),
      description: description.trim(),
      prism: prism || undefined,
    };

    console.log("Creating custom spell:", newSpell);
    customSpells.push(newSpell);
    const saveResult = await storage.saveCustomSpells(customSpells);
    console.log("Save result:", saveResult);
    
    if (!saveResult) {
      return NextResponse.json(
        { error: "Failed to save custom spell to storage" },
        { status: 500 }
      );
    }

    // If prism is provided, also save it to mappings
    if (prism) {
      const mappings = await storage.loadMappings();
      if (Array.isArray(prism) && prism.length > 0) {
        mappings[newSpell.name] = prism;
      } else if (typeof prism === 'string' && prism.trim()) {
        mappings[newSpell.name] = prism.trim();
      }
      await storage.saveMappings(mappings);
    }

    return NextResponse.json({ success: true, spell: newSpell });
  } catch (error) {
    console.error("Error creating custom spell:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create custom spell", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Remove a custom spell
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Spell name is required" },
        { status: 400 }
      );
    }

    const customSpells = await storage.loadCustomSpells();
    const filteredSpells = customSpells.filter(spell => spell.name !== name);

    if (filteredSpells.length === customSpells.length) {
      return NextResponse.json(
        { error: "Custom spell not found" },
        { status: 404 }
      );
    }

    await storage.saveCustomSpells(filteredSpells);

    // Also remove from mappings if it exists
    const mappings = await storage.loadMappings();
    if (mappings[name]) {
      delete mappings[name];
      await storage.saveMappings(mappings);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting custom spell:", error);
    return NextResponse.json(
      { error: "Failed to delete custom spell" },
      { status: 500 }
    );
  }
}

