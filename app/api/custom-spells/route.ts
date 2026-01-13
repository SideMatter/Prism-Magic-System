import { NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = 'force-dynamic';

// GET - Load all custom spells
export async function GET() {
  try {
    const convex = getConvexClient();
    const customSpells = await convex.query(api.customSpells.list, {});
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
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }
    if (!school || !school.trim()) {
      return NextResponse.json({ error: "School is required" }, { status: 400 });
    }
    if (!casting_time || !casting_time.trim()) {
      return NextResponse.json({ error: "Casting time is required" }, { status: 400 });
    }
    if (!range || !range.trim()) {
      return NextResponse.json({ error: "Range is required" }, { status: 400 });
    }
    if (!components || !components.trim()) {
      return NextResponse.json({ error: "Components is required" }, { status: 400 });
    }
    if (!duration || !duration.trim()) {
      return NextResponse.json({ error: "Duration is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Validate level
    const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
    if (typeof levelNum !== 'number' || isNaN(levelNum) || levelNum < 0 || levelNum > 9) {
      return NextResponse.json({ error: "Level must be a number between 0 and 9" }, { status: 400 });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.customSpells.create, {
      name: name.trim(),
      level: levelNum,
      school: school.trim(),
      casting_time: casting_time.trim(),
      range: range.trim(),
      components: components.trim(),
      duration: duration.trim(),
      description: description.trim(),
      prism: prism || undefined,
    });

    console.log("Custom spell created:", result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error creating custom spell:", error);
    const message = error?.message || "Failed to create custom spell";
    if (message.includes("already exists")) {
      return NextResponse.json({ error: "A custom spell with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create custom spell", details: message }, { status: 500 });
  }
}

// PUT - Update a custom spell
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    console.log("Received custom spell update request:", body);
    const { originalName, name, level, school, casting_time, range, components, duration, description, prism } = body;

    if (!originalName) {
      return NextResponse.json({ error: "Original spell name is required" }, { status: 400 });
    }

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }
    if (!school || !school.trim()) {
      return NextResponse.json({ error: "School is required" }, { status: 400 });
    }
    if (!casting_time || !casting_time.trim()) {
      return NextResponse.json({ error: "Casting time is required" }, { status: 400 });
    }
    if (!range || !range.trim()) {
      return NextResponse.json({ error: "Range is required" }, { status: 400 });
    }
    if (!components || !components.trim()) {
      return NextResponse.json({ error: "Components is required" }, { status: 400 });
    }
    if (!duration || !duration.trim()) {
      return NextResponse.json({ error: "Duration is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    // Validate level
    const levelNum = typeof level === 'string' ? parseInt(level, 10) : level;
    if (typeof levelNum !== 'number' || isNaN(levelNum) || levelNum < 0 || levelNum > 9) {
      return NextResponse.json({ error: "Level must be a number between 0 and 9" }, { status: 400 });
    }

    const convex = getConvexClient();
    const result = await convex.mutation(api.customSpells.update, {
      originalName,
      name: name.trim(),
      level: levelNum,
      school: school.trim(),
      casting_time: casting_time.trim(),
      range: range.trim(),
      components: components.trim(),
      duration: duration.trim(),
      description: description.trim(),
      prism: prism || undefined,
    });

    console.log("Custom spell updated:", result);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error updating custom spell:", error);
    const message = error?.message || "Failed to update custom spell";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Custom spell not found" }, { status: 404 });
    }
    if (message.includes("already exists")) {
      return NextResponse.json({ error: "A custom spell with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update custom spell", details: message }, { status: 500 });
  }
}

// DELETE - Remove a custom spell
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Spell name is required" }, { status: 400 });
    }

    const convex = getConvexClient();
    await convex.mutation(api.customSpells.remove, { name });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting custom spell:", error);
    const message = error?.message || "Failed to delete custom spell";
    if (message.includes("not found")) {
      return NextResponse.json({ error: "Custom spell not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
